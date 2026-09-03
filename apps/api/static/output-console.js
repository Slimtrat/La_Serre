const outputConsole = (() => {
  const historySelect = document.querySelector("#run-history-select");
  const restoreButton = document.querySelector("#restore-run");
  const logRoot = document.querySelector("#run-log");
  if (!historySelect || !restoreButton || !logRoot) return null;

  let episode = null;
  let currentShot = null;
  let runs = [];

  function formatDate(value) {
    if (!value) return "date inconnue";
    return new Intl.DateTimeFormat("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).format(new Date(value));
  }

  function renderScene(detail) {
    episode = detail.episode;
    currentShot = detail.shot;
    const shot = currentShot;
    document.querySelector("#scene-title").textContent =
      `Plan ${String(detail.index).padStart(2, "0")} · ${shot.duration} s`;
    document.querySelector("#scene-source").textContent =
      episode.shot_sources?.[shot.id] || episode.narrative_source || "";
    document.querySelector("#scene-action").textContent = shot.action;
    document.querySelector("#scene-camera").textContent =
      `${shot.camera.shot_type} · ${shot.camera.movement} · ${shot.camera.lens}`;
    const voiceButton = document.querySelector('[data-stage-action="voice"]');
    voiceButton.disabled = !shot.dialogue;
    voiceButton.title = shot.dialogue ? "Générer cette réplique" : "Ce plan ne contient pas de dialogue";
    renderDialogue(shot.dialogue);
    const beats = document.querySelector("#scene-beats");
    beats.replaceChildren();
    for (const beat of shot.visual_beats || []) {
      const item = document.createElement("li");
      const label = document.createElement("strong");
      label.textContent = `${Math.round(beat.at * 100)} % · ${beat.id}`;
      const text = document.createElement("span");
      text.textContent = beat.description.replace(/^POSE (START|MIDDLE|END) — /, "");
      item.append(label, text);
      beats.append(item);
    }
  }

  function renderDialogue(dialogue) {
    const root = document.querySelector("#scene-dialogue");
    root.replaceChildren();
    if (!dialogue) {
      root.className = "scene-dialogue empty";
      root.textContent = "Plan sans dialogue.";
      return;
    }
    root.className = "scene-dialogue";
    const speaker = document.createElement("strong");
    speaker.textContent = dialogue.speaker;
    const quote = document.createElement("blockquote");
    quote.textContent = `« ${dialogue.text} »`;
    root.append(speaker, quote);
    if (dialogue.performance) {
      const intention = document.createElement("p");
      intention.textContent = "Intention · " + dialogue.performance.intention;
      const emotion = document.createElement("p");
      emotion.textContent = "Émotion · " + dialogue.performance.emotion;
      root.append(intention, emotion);
    }
  }

  function renderLog(events, title = "Journal de la version") {
    document.querySelector("#run-log-title").textContent = title;
    logRoot.replaceChildren();
    if (!events.length) {
      const empty = document.createElement("li");
      empty.className = "empty";
      empty.textContent = "Aucun événement enregistré pour cette version.";
      logRoot.append(empty);
      return;
    }
    for (const event of events.slice().reverse()) {
      const item = document.createElement("li");
      item.className = "state-" + event.status;
      const head = document.createElement("div");
      const stage = document.createElement("strong");
      stage.textContent = event.stage;
      const time = document.createElement("time");
      time.textContent = formatDate(event.timestamp);
      head.append(stage, time);
      const message = document.createElement("span");
      message.textContent = event.message;
      item.append(head, message);
      logRoot.append(item);
    }
  }

  function renderRun(run) {
    window.SerreStudio.clearMedia();
    if (!run) {
      restoreButton.disabled = true;
      renderLog([], "Aucune exécution");
      return;
    }
    const media = run.media || {};
    if (media.keyframes?.length) window.SerreStudio.showKeyframes(media.keyframes);
    if (media.video) window.SerreStudio.showVideo(media.video + "?history=" + Date.now());
    if (media.audio) window.SerreStudio.showAudio(media.audio + "?history=" + Date.now());
    restoreButton.disabled = run.current;
    document.querySelector("#job-badge").textContent = run.current ? "Version active" : "Archive";
    renderLog(run.events || [], run.current ? "Version active" : "Version archivée");
  }

  async function refreshHistory(preferredId = null) {
    if (!currentShot) return;
    const previous = preferredId || historySelect.value;
    const payload = await window.SerreStudio.api("/api/history/" + currentShot.id);
    runs = payload.runs || [];
    historySelect.replaceChildren();
    if (!runs.length) {
      historySelect.append(new Option("Aucun rendu", ""));
      renderRun(null);
      return;
    }
    runs.forEach((run, index) => {
      const label = run.current
        ? `Actuelle · ${formatDate(run.created_at)}`
        : `Archive ${index} · ${formatDate(run.archived_at || run.created_at)}`;
      historySelect.append(new Option(label, run.id));
    });
    const selected = runs.some((run) => run.id === previous) ? previous : runs[0].id;
    historySelect.value = selected;
    renderRun(runs.find((run) => run.id === selected));
  }

  async function restoreSelected() {
    if (!currentShot) return;
    const run = runs.find((candidate) => candidate.id === historySelect.value);
    if (!run || run.current) return;
    if (!window.confirm("Restaurer cette version ? La version actuelle sera archivée.")) return;
    restoreButton.disabled = true;
    await window.SerreStudio.api(
      `/api/history/${currentShot.id}/${run.id}/restore`,
      { method: "POST" },
    );
    await window.SerreStudio.refreshAssets();
    await refreshHistory("current");
    window.SerreStudio.notify("Version restaurée ; l’ancienne version active reste archivée.");
  }

  historySelect.addEventListener("change", () => {
    renderRun(runs.find((run) => run.id === historySelect.value));
  });
  restoreButton.addEventListener("click", () => {
    restoreSelected().catch((error) => window.SerreStudio.notify(error.message, true));
  });
  window.addEventListener("studio:shot-selected", (event) => {
    renderScene(event.detail);
    refreshHistory().catch((error) => window.SerreStudio.notify(error.message, true));
  });
  window.addEventListener("studio:assets", (event) => {
    if (event.detail?.shotId === currentShot?.id) refreshHistory().catch(() => {});
  });
  window.addEventListener("studio:job", (event) => {
    const job = event.detail?.job || event.detail;
    if (job?.shot_id !== currentShot?.id) return;
    renderLog(job.events || [], "Exécution en cours");
    if (["GENERATED", "AWAITING_KEYFRAME_APPROVAL", "FAILED"].includes(job.status)) {
      window.setTimeout(() => refreshHistory("current").catch(() => {}), 150);
    }
  });
  window.addEventListener("studio:stage", (event) => {
    renderLog([event.detail.event], "Dernière action");
    refreshHistory("current").catch(() => {});
  });

  window.SerreOutputConsole = { refreshHistory, renderLog };
  return window.SerreOutputConsole;
})();
