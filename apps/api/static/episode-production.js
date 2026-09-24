const episodeProduction = (() => {
  const graphControls = document.querySelector(".graph-controls");
  if (!graphControls || document.querySelector("#episode-build-open")) return null;

  const openButton = document.createElement("button");
  openButton.id = "episode-build-open";
  openButton.type = "button";
  openButton.className = "button primary";
  openButton.textContent = "Assembler l’épisode";
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
          <h2 id="episode-production-title">Assembler l’épisode</h2>
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
          <div class="episode-music-panel">
            <h4>Musique d’ambiance</h4>
            <p id="episode-music-status" aria-live="polite">Aucune piste préparée.</p>
            <label>Source
              <select id="episode-music-source">
                <option value="existing">Conserver la piste actuelle</option>
                <option value="generate">Générer avec ACE-Step (local)</option>
                <option value="import">Importer une piste</option>
              </select>
            </label>
            <div id="episode-music-generate" class="hidden">
              <label>Description musicale<textarea id="episode-music-prompt" rows="3" maxlength="2000" placeholder="Instrumental, atmosphère, tempo, instruments…"></textarea></label>
              <label>Seed<input id="episode-music-seed" type="number" min="0" max="2147483647" value="42" /></label>
            </div>
            <div id="episode-music-import" class="hidden">
              <label>Fichier audio<input id="episode-music-file" type="file" accept=".wav,.mp3,.flac,.ogg,.m4a,audio/*" /></label>
              <label>Licence ou origine<input id="episode-music-license" type="text" placeholder="Commande originale, licence commerciale…" /></label>
              <label class="episode-music-rights"><input id="episode-music-rights" type="checkbox" /> Je confirme détenir les droits commerciaux.</label>
            </div>
            <label class="episode-music-rights"><input id="episode-music-force" type="checkbox" /> Remplacer la piste actuelle</label>
            <button id="episode-music-prepare" class="button secondary hidden" type="button">Préparer la musique</button>
            <audio id="episode-music-preview" class="hidden" controls preload="none"></audio>
          </div>
          <label class="episode-check">
            <input id="episode-allow-stills" type="checkbox" />
            <span><strong>Créer une animatique avec les plans fixes</strong><small>Le résultat restera ANIMATIC tant qu’un clip manque.</small></span>
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
          <h3 id="episode-run-title">Chaîne de montage</h3>
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
          <h3 id="episode-final-title">Résultat prêt</h3>
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
        <button id="episode-build-start" class="button primary" type="button" disabled>Assembler l’épisode</button>
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
  const musicSource = $("#episode-music-source");
  const musicPrepare = $("#episode-music-prepare");
  const musicStatus = $("#episode-music-status");
  let episodePackage = null;
  let readiness = null;
  let activeJob = null;
  let pollTimer = null;
  let musicBusy = false;

  function updateMusicSource() {
    const source = musicSource.value;
    $("#episode-music-generate").classList.toggle("hidden", source !== "generate");
    $("#episode-music-import").classList.toggle("hidden", source !== "import");
    musicPrepare.classList.toggle("hidden", source === "existing");
  }

  async function inspectMusic() {
    if (!episodePackage) return;
    const episodeId = episodePackage.episode.id;
    const state = await window.SerreStudio.api("/api/episodes/" + episodeId + "/music");
    const source = state.record?.source || (state.exists ? "piste existante" : null);
    musicStatus.textContent = source ? "Piste prête · " + source : "Aucune piste préparée ; le mixage peut rester sans musique.";
    const preview = $("#episode-music-preview");
    preview.classList.toggle("hidden", !state.exists);
    if (state.exists) preview.src = state.audio + "?v=" + Date.now();
    else preview.removeAttribute("src");
  }

  async function prepareMusic() {
    if (!episodePackage || musicBusy) return;
    const episodeId = episodePackage.episode.id;
    const source = musicSource.value;
    if (source === "existing") return;
    const root = "/api/episodes/" + episodeId + "/music";
    musicBusy = true;
    musicPrepare.disabled = true;
    startButton.disabled = true;
    musicStatus.textContent = source === "generate" ? "ACE-Step génère la piste…" : "Import et normalisation de la piste…";
    try {
      if (source === "generate") {
        const prompt = $("#episode-music-prompt").value.trim();
        if (!prompt) throw new Error("Décris la musique à générer.");
        await window.SerreStudio.api(root + "/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt, seed: Number($("#episode-music-seed").value), force: $("#episode-music-force").checked }),
        });
      } else {
        const file = $("#episode-music-file").files[0];
        const license = $("#episode-music-license").value.trim();
        if (!file || !license || !$("#episode-music-rights").checked) throw new Error("Choisis un fichier, indique son origine et confirme les droits commerciaux.");
        const params = new URLSearchParams({ filename: file.name, license_id: license, rights_confirmed: "true", force: String($("#episode-music-force").checked) });
        await window.SerreStudio.api(root + "/import?" + params, {
          method: "POST", headers: { "Content-Type": file.type || "application/octet-stream" }, body: file,
        });
      }
      $("#episode-music-force").checked = false;
      await inspectMusic();
      await inspectReadiness();
    } catch (error) {
      musicStatus.textContent = error.message;
      window.SerreStudio.notify(error.message, true);
    } finally {
      musicBusy = false;
      musicPrepare.disabled = false;
      setRunning(Boolean(activeJob && !["ANIMATIC", "PREVIEW", "FINAL", "FAILED"].includes(activeJob.status)));
    }
  }

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
    startButton.disabled = musicBusy || running || !readiness?.ready;
    startButton.textContent = running
      ? "Production en cours…"
      : readiness?.finalExists
        ? "Regénérer le résultat"
        : allowStills.checked
          ? "Créer l’animatique"
          : "Assembler le master";
  }

  function showFinal(media, status = "FINAL") {
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
    const labels = {
      ANIMATIC: "Animatique prête",
      PREVIEW: "Prévisualisation prête",
      FINAL: "Épisode final prêt",
    };
    const label = labels[status] || "Résultat prêt";
    $("#episode-final-title").textContent = label;
    openButton.textContent = label;
    openButton.classList.add("episode-ready");
    graphNodeState("montage", "ready", status === "FINAL" ? "Master assemblé" : "Prévisualisation assemblée");
    graphNodeState("export", "ready", status === "FINAL" ? "MP4 final vérifié" : "MP4 de travail vérifié");
  }

  function renderJob(job) {
    activeJob = job;
    (job.stages || []).forEach(renderStage);
    messageLabel.textContent = job.message;
    errorLabel.classList.toggle("hidden", job.status !== "FAILED");
    if (job.status === "FAILED") errorLabel.textContent = job.message;
    const running = !["ANIMATIC", "PREVIEW", "FINAL", "FAILED"].includes(job.status);
    setRunning(running);
    window.dispatchEvent(new CustomEvent("studio:episode-job", { detail: job }));
    if (["ANIMATIC", "PREVIEW", "FINAL"].includes(job.status)) {
      if (readiness) readiness.finalExists = true;
      force.checked = false;
      showFinal(job.media, job.status);
      window.SerreStudio.notify(job.message);
    }
  }

  async function pollJob() {
    if (!activeJob || ["ANIMATIC", "PREVIEW", "FINAL", "FAILED"].includes(activeJob.status)) return;
    try {
      const job = await window.SerreStudio.api("/api/episode-jobs/" + activeJob.id);
      renderJob(job);
      if (!["ANIMATIC", "PREVIEW", "FINAL", "FAILED"].includes(job.status)) pollTimer = window.setTimeout(pollJob, 900);
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
    startButton.disabled = !readiness.ready || Boolean(activeJob && !["ANIMATIC", "PREVIEW", "FINAL", "FAILED"].includes(activeJob.status));
    startButton.textContent = finalExists
      ? "Regénérer le résultat"
      : allowStills.checked
        ? "Créer l’animatique"
        : "Assembler le master";
    force.checked = finalExists;
    if (finalExists) {
      showFinal({
        video: "/api/episode-media/" + episodePackage.episode.id + "/episode.mp4",
        manifest: "/api/episode-media/" + episodePackage.episode.id + "/episode-generation.json",
        subtitles: finalStatus.subtitles ? "/api/episode-media/" + episodePackage.episode.id + "/subtitles.fr.srt" : null,
      }, finalStatus.status || "PREVIEW");
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
    await Promise.all([inspectReadiness(), inspectMusic()]);
  });
  musicSource.addEventListener("change", updateMusicSource);
  musicPrepare.addEventListener("click", prepareMusic);
  startButton.addEventListener("click", startEpisode);
  allowStills.addEventListener("change", inspectReadiness);
  [$("#episode-width"), $("#episode-height"), $("#episode-fps")].forEach((input) => input.addEventListener("input", updateFormat));
  dialog.addEventListener("close", () => {
    if (!activeJob || ["ANIMATIC", "PREVIEW", "FINAL", "FAILED"].includes(activeJob.status)) window.clearTimeout(pollTimer);
  });
  window.addEventListener("studio:episode-loaded", (event) => {
    episodePackage = event.detail;
    $("#episode-production-title").textContent = "Assembler " + episodePackage.episode.id;
    inspectReadiness().catch(() => {});
    inspectMusic().catch(() => {});
  });
  window.addEventListener("studio:assets", () => inspectReadiness().catch(() => {}));

  return { inspectReadiness, renderJob };
})();
