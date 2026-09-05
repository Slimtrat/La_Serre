const episodeProduction = (() => {
  const graphControls = document.querySelector(".graph-controls");
  if (!graphControls || document.querySelector("#episode-build-open")) return null;

  const openButton = document.createElement("button");
  openButton.id = "episode-build-open";
  openButton.type = "button";
  openButton.className = "button primary";
  openButton.textContent = "Finaliser l’épisode";
  graphControls.append(openButton);

  const dialog = document.createElement("dialog");
  dialog.id = "episode-production-dialog";
  dialog.className = "episode-production-dialog";
  dialog.setAttribute("aria-labelledby", "episode-production-title");
  dialog.innerHTML = `
    <form method="dialog" class="episode-production-shell">
      <header class="episode-production-heading">
        <div>
          <p class="eyebrow">MASTER D’ÉPISODE</p>
          <h2 id="episode-production-title">Finaliser l’épisode</h2>
          <p id="episode-production-readiness">Vérification des médias disponibles…</p>
        </div>
        <button class="button ghost" type="submit" value="cancel" aria-label="Fermer">Fermer</button>
      </header>

      <div class="episode-production-grid">
        <section class="episode-production-options" aria-labelledby="episode-options-title">
          <h3 id="episode-options-title">Configuration</h3>
          <label>
            Voix locale
            <select id="episode-tts">
              <option value="auto">Automatique — SAPI sous Windows</option>
              <option value="sapi">Forcer Microsoft SAPI</option>
              <option value="none">Sans synthèse vocale</option>
            </select>
          </label>
          <label class="episode-check">
            <input id="episode-allow-stills" type="checkbox" />
            <span><strong>Autoriser les plans fixes</strong><small>Utilise une keyframe lorsqu’un clip manque.</small></span>
          </label>
          <label class="episode-check">
            <input id="episode-force" type="checkbox" />
            <span><strong>Remplacer le master existant</strong><small>Nécessaire uniquement pour une nouvelle version.</small></span>
          </label>
          <details class="episode-production-advanced">
            <summary>Format avancé</summary>
            <div>
              <label>Largeur<input id="episode-width" type="number" min="256" max="2160" step="8" value="576" /></label>
              <label>Hauteur<input id="episode-height" type="number" min="256" max="3840" step="8" value="1024" /></label>
              <label>Images/s<input id="episode-fps" type="number" min="1" max="120" value="24" /></label>
            </div>
          </details>
        </section>

        <section class="episode-production-run" aria-labelledby="episode-run-title">
          <h3 id="episode-run-title">Chaîne finale</h3>
          <div class="episode-production-stages">
            <article data-episode-stage="voice"><span>01</span><div><strong>Voix</strong><small>En attente</small></div></article>
            <article data-episode-stage="mix"><span>02</span><div><strong>Mixage</strong><small>En attente</small></div></article>
            <article data-episode-stage="montage"><span>03</span><div><strong>Montage</strong><small>En attente</small></div></article>
            <article data-episode-stage="export"><span>04</span><div><strong>Export</strong><small>En attente</small></div></article>
          </div>
          <p id="episode-production-message" class="episode-production-message" aria-live="polite">Prêt à vérifier les sources.</p>
          <p id="episode-production-error" class="episode-production-error hidden" role="alert"></p>
        </section>
      </div>

      <section id="episode-final-output" class="episode-final-output hidden" aria-labelledby="episode-final-title">
        <div>
          <p class="eyebrow">MASTER VÉRIFIÉ</p>
          <h3 id="episode-final-title">Épisode final prêt</h3>
          <div class="episode-final-links">
            <a id="episode-final-video-link" class="button secondary" href="#">Télécharger le MP4</a>
            <a id="episode-final-manifest-link" class="button ghost" href="#">Manifeste</a>
            <a id="episode-final-subtitles-link" class="button ghost hidden" href="#">Sous-titres</a>
          </div>
        </div>
        <video id="episode-final-video" controls preload="metadata"></video>
      </section>

      <footer class="episode-production-footer">
        <small id="episode-production-format">576 × 1024 · 24 fps · MP4</small>
        <button id="episode-build-start" class="button primary" type="button" disabled>Finaliser l’épisode</button>
      </footer>
    </form>`;
  document.body.append(dialog);

  const $ = (selector) => dialog.querySelector(selector);
  const startButton = $("#episode-build-start");
  const readinessLabel = $("#episode-production-readiness");
  const messageLabel = $("#episode-production-message");
  const errorLabel = $("#episode-production-error");
  const allowStills = $("#episode-allow-stills");
  const force = $("#episode-force");
  let episodePackage = null;
  let readiness = null;
  let activeJob = null;
  let pollTimer = null;

  function graphNodeState(id, state, message) {
    if (typeof studioGraph !== "undefined" && studioGraph?.nodeState) studioGraph.nodeState(id, state, message);
  }

  function stageState(status) {
    if (status === "completed") return "ready";
    if (status === "running") return "running";
    if (status === "failed") return "failed";
    return "pending";
  }

  function renderStage(stage) {
    const card = dialog.querySelector("[data-episode-stage='" + stage.id + "']");
    if (!card) return;
    card.classList.remove("pending", "running", "completed", "failed");
    card.classList.add(stage.status);
    card.querySelector("small").textContent = stage.message;
    graphNodeState(stage.id, stageState(stage.status), stage.message);
  }

  function setRunning(running) {
    startButton.disabled = running || !readiness?.ready;
    startButton.textContent = running ? "Production en cours…" : readiness?.finalExists ? "Regénérer le master" : "Finaliser l’épisode";
  }

  function showFinal(media) {
    const episodeId = episodePackage?.episode?.id;
    if (!episodeId) return;
    const urls = {
      video: media?.video || "/api/episode-media/" + episodeId + "/episode.mp4",
      manifest: media?.manifest || "/api/episode-media/" + episodeId + "/episode-generation.json",
      subtitles: media?.subtitles || null,
    };
    const section = $("#episode-final-output");
    section.classList.remove("hidden");
    const video = $("#episode-final-video");
    video.src = urls.video + "?v=" + Date.now();
    $("#episode-final-video-link").href = urls.video;
    $("#episode-final-manifest-link").href = urls.manifest;
    const subtitles = $("#episode-final-subtitles-link");
    subtitles.classList.toggle("hidden", !urls.subtitles);
    if (urls.subtitles) subtitles.href = urls.subtitles;
    openButton.textContent = "Épisode final prêt";
    openButton.classList.add("episode-ready");
    graphNodeState("montage", "ready", "Master assemblé");
    graphNodeState("export", "ready", "MP4 vérifié");
  }

  function renderJob(job) {
    activeJob = job;
    (job.stages || []).forEach(renderStage);
    messageLabel.textContent = job.message;
    errorLabel.classList.toggle("hidden", job.status !== "FAILED");
    if (job.status === "FAILED") errorLabel.textContent = job.message;
    const running = !["FINAL", "FAILED"].includes(job.status);
    setRunning(running);
    window.dispatchEvent(new CustomEvent("studio:episode-job", { detail: job }));
    if (job.status === "FINAL") {
      if (readiness) readiness.finalExists = true;
      force.checked = false;
      showFinal(job.media);
      window.SerreStudio.notify("Épisode final assemblé et vérifié.");
    }
  }

  async function pollJob() {
    if (!activeJob || ["FINAL", "FAILED"].includes(activeJob.status)) return;
    try {
      const job = await window.SerreStudio.api("/api/episode-jobs/" + activeJob.id);
      renderJob(job);
      if (!["FINAL", "FAILED"].includes(job.status)) pollTimer = window.setTimeout(pollJob, 900);
    } catch (error) {
      errorLabel.textContent = error.message;
      errorLabel.classList.remove("hidden");
      setRunning(false);
    }
  }

  async function inspectReadiness() {
    if (!episodePackage) return;
    const shots = episodePackage.shots;
    const outputs = await Promise.all(shots.map((shot) => window.SerreStudio.api("/api/outputs/" + shot.id).catch(() => null)));
    const clips = outputs.filter((output) => output?.video).length;
    const keyframes = outputs.filter((output) => output?.keyframe).length;
    const covered = outputs.filter((output) => output?.video || (allowStills.checked && output?.keyframe)).length;
    const finalStatus = await window.SerreStudio.api(
      "/api/episodes/" + episodePackage.episode.id + "/media-status",
    );
    const finalExists = Boolean(finalStatus.exists && finalStatus.video);
    readiness = { clips, keyframes, covered, total: shots.length, ready: covered === shots.length, finalExists };
    readinessLabel.textContent = clips + " clip(s) · " + keyframes + " keyframe(s) · " + covered + " / " + shots.length + " plans exploitables";
    if (!readiness.ready) {
      messageLabel.textContent = "Il manque " + (shots.length - covered) + " plan(s). Génère un clip ou active les plans fixes lorsque toutes les keyframes existent.";
    } else {
      messageLabel.textContent = finalExists ? "Un master existe déjà. Active son remplacement pour produire une nouvelle version." : "Toutes les sources nécessaires sont disponibles.";
    }
    startButton.disabled = !readiness.ready || Boolean(activeJob && !["FINAL", "FAILED"].includes(activeJob.status));
    startButton.textContent = finalExists ? "Regénérer le master" : "Finaliser l’épisode";
    force.checked = finalExists;
    if (finalExists) {
      showFinal({
        video: "/api/episode-media/" + episodePackage.episode.id + "/episode.mp4",
        manifest: "/api/episode-media/" + episodePackage.episode.id + "/episode-generation.json",
        subtitles: finalStatus.subtitles ? "/api/episode-media/" + episodePackage.episode.id + "/subtitles.fr.srt" : null,
      });
    }
  }

  async function startEpisode() {
    if (!episodePackage || !readiness?.ready) return;
    errorLabel.classList.add("hidden");
    setRunning(true);
    try {
      const job = await window.SerreStudio.api("/api/episodes/" + episodePackage.episode.id + "/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tts: $("#episode-tts").value,
          allow_stills: allowStills.checked,
          force: force.checked,
          width: Number($("#episode-width").value),
          height: Number($("#episode-height").value),
          fps: Number($("#episode-fps").value),
        }),
      });
      renderJob(job);
      pollTimer = window.setTimeout(pollJob, 250);
    } catch (error) {
      errorLabel.textContent = error.message;
      errorLabel.classList.remove("hidden");
      setRunning(false);
    }
  }

  function updateFormat() {
    $("#episode-production-format").textContent = $("#episode-width").value + " × " + $("#episode-height").value + " · " + $("#episode-fps").value + " fps · MP4";
  }

  openButton.addEventListener("click", async () => {
    dialog.showModal();
    await inspectReadiness();
  });
  startButton.addEventListener("click", startEpisode);
  allowStills.addEventListener("change", inspectReadiness);
  [$("#episode-width"), $("#episode-height"), $("#episode-fps")].forEach((input) => input.addEventListener("input", updateFormat));
  dialog.addEventListener("close", () => {
    if (!activeJob || ["FINAL", "FAILED"].includes(activeJob.status)) window.clearTimeout(pollTimer);
  });
  window.addEventListener("studio:episode-loaded", (event) => {
    episodePackage = event.detail;
    $("#episode-production-title").textContent = "Finaliser " + episodePackage.episode.id;
    inspectReadiness().catch(() => {});
  });
  window.addEventListener("studio:assets", () => inspectReadiness().catch(() => {}));

  return { inspectReadiness, renderJob };
})();
