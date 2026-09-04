const serreActivity = (() => {
  const STORAGE_KEY = "serre-studio-activity-position-v1";
  const TERMINAL = new Set([
    "GENERATED",
    "AWAITING_KEYFRAME_APPROVAL",
    "FINAL",
    "COMPLETED",
    "FAILED",
  ]);
  const STAGE_LABELS = {
    input: "Entrée",
    prompt: "Prompt",
    references: "Références",
    keyframe: "Images",
    video: "Vidéo",
    artifacts: "Fichiers",
    voice: "Voix",
    mix: "Mixage",
    montage: "Montage",
    export: "Export",
    music: "Musique",
    director: "Director",
    story: "Histoire",
    plan: "Découpage",
    frames: "Images",
    sound: "Son",
    video: "Mini-vidéo",
    job: "Pipeline",
  };
  const KIND_LABELS = {
    shot: "Plan",
    episode: "Épisode",
    narrative: "Director",
    prompt: "Prompt",
    voice: "Voix",
    music: "Musique",
    demo: "Démo express",
  };

  const overlay = document.createElement("aside");
  overlay.id = "activity-overlay";
  overlay.className = "activity-overlay hidden";
  overlay.setAttribute("role", "status");
  overlay.setAttribute("aria-live", "polite");
  overlay.innerHTML = `
    <header id="activity-handle" class="activity-handle" title="Déplacer la fenêtre — double-clic pour la recentrer">
      <i class="activity-pulse" aria-hidden="true"></i>
      <div class="activity-handle-title">
        <strong id="activity-title">Activité</strong>
        <small id="activity-state">Initialisation…</small>
      </div>
      <div class="activity-actions">
        <button id="activity-log-toggle" class="activity-action" type="button" aria-expanded="false">Journal</button>
        <button id="activity-close" class="activity-action activity-close" type="button" aria-label="Fermer l’activité" title="Fermer">×</button>
      </div>
    </header>
    <section class="activity-main">
      <div class="activity-copy">
        <strong id="activity-stage">En attente</strong>
        <span id="activity-message">Aucune activité en cours.</span>
      </div>
      <output id="activity-numbers" class="activity-numbers">0 % · 0:00</output>
      <div id="activity-progress" class="activity-progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">
        <span id="activity-progress-value"></span>
      </div>
      <div id="activity-segments" class="activity-segments" aria-hidden="true"></div>
    </section>
    <section id="activity-log" class="activity-log hidden" aria-label="Journal de l’activité">
      <ol id="activity-events"></ol>
    </section>
  `;
  document.body.append(overlay);

  const handle = overlay.querySelector("#activity-handle");
  const title = overlay.querySelector("#activity-title");
  const state = overlay.querySelector("#activity-state");
  const stage = overlay.querySelector("#activity-stage");
  const message = overlay.querySelector("#activity-message");
  const numbers = overlay.querySelector("#activity-numbers");
  const progressTrack = overlay.querySelector("#activity-progress");
  const progressValue = overlay.querySelector("#activity-progress-value");
  const segments = overlay.querySelector("#activity-segments");
  const log = overlay.querySelector("#activity-log");
  const events = overlay.querySelector("#activity-events");
  const logToggle = overlay.querySelector("#activity-log-toggle");
  const closeButton = overlay.querySelector("#activity-close");

  let current = null;
  let dismissedId = null;
  let polling = false;
  let pollTimer = null;

  function isTerminal(status) {
    return TERMINAL.has(String(status || "").toUpperCase());
  }

  function statusClass(activity) {
    if (String(activity.status).toUpperCase() === "FAILED") return "is-failed";
    if (isTerminal(activity.status)) return "is-complete";
    return "is-running";
  }

  function calculateProgress(job) {
    if (job.progress) return job.progress;
    const usable = (job.stages || []).filter((item) => item.status !== "skipped");
    const completed = usable.filter((item) => item.status === "completed").length;
    const active = usable.find((item) => ["running", "failed"].includes(item.status));
    const success = ["GENERATED", "AWAITING_KEYFRAME_APPROVAL", "FINAL", "COMPLETED"].includes(
      String(job.status || "").toUpperCase(),
    );
    return {
      percent: success ? 100 : Math.round(100 * completed / Math.max(1, usable.length)),
      completed: success ? usable.length : completed,
      total: usable.length,
      active_stage: active?.id || active?.stage || null,
      elapsed_seconds: 0,
      indeterminate: Boolean(active && active.status === "running"),
    };
  }

  function normalizeJob(job, kind) {
    const subject = kind === "episode" ? job.episode_id : job.shot_id;
    return {
      id: job.id,
      kind,
      title: (KIND_LABELS[kind] || "Activité") + (subject ? " · " + subject : ""),
      status: job.status || "GENERATING",
      message: job.message || "Traitement en cours",
      createdAt: job.created_at || current?.createdAt || new Date().toISOString(),
      completedAt: job.completed_at || null,
      progress: calculateProgress(job),
      stages: job.stages || [],
      events: job.events || [],
      remote: kind === "shot" || kind === "episode",
    };
  }

  function appendSyntheticEvent(activity, item) {
    const list = activity.events.slice();
    const previous = list[list.length - 1];
    if (
      previous?.status !== item.status
      || previous?.stage !== item.stage
      || previous?.message !== item.message
    ) {
      list.push({
        timestamp: new Date().toISOString(),
        stage: item.stage,
        status: item.status,
        message: item.message,
      });
    }
    return list;
  }

  function normalizeStageJob(detail) {
    const existing = current?.id === detail.id ? current : null;
    const status = detail.status || "GENERATING";
    const stageId = detail.stage || detail.kind || "job";
    const terminal = isTerminal(status);
    const result = {
      id: detail.id,
      kind: detail.kind,
      title: (KIND_LABELS[detail.kind] || "Étape") + " · génération",
      status,
      message: detail.message || "Traitement en cours",
      createdAt: detail.created_at || existing?.createdAt || new Date().toISOString(),
      completedAt: terminal ? new Date().toISOString() : null,
      progress: {
        percent: terminal && status !== "FAILED" ? 100 : terminal ? 0 : 8,
        completed: terminal && status !== "FAILED" ? 1 : 0,
        total: 1,
        active_stage: stageId,
        elapsed_seconds: existing?.progress?.elapsed_seconds || 0,
        indeterminate: !terminal,
      },
      stages: [{ id: stageId, status: status === "COMPLETED" ? "completed" : status.toLowerCase(), message: detail.message }],
      events: existing?.events || [],
      remote: false,
    };
    result.events = appendSyntheticEvent(result, {
      stage: stageId,
      status: status.toLowerCase(),
      message: result.message,
    });
    return result;
  }

  function normalizeNarrative(detail) {
    const running = detail.state === "running";
    const failed = detail.state === "failed";
    const existing = current?.kind === "narrative" ? current : null;
    const runId = running ? "director-" + Date.now() : existing?.id || "director-" + Date.now();
    const result = {
      id: runId,
      kind: "narrative",
      title: "Director · découpage du plan",
      status: running ? "GENERATING" : failed ? "FAILED" : "COMPLETED",
      message: running ? "Analyse du texte et construction du plan" : failed ? "Le Director a échoué" : "Proposition de plan prête",
      createdAt: existing?.createdAt || new Date().toISOString(),
      completedAt: running ? null : new Date().toISOString(),
      progress: {
        percent: running ? 8 : failed ? 0 : 100,
        completed: running || failed ? 0 : 1,
        total: 1,
        active_stage: "director",
        elapsed_seconds: existing?.progress?.elapsed_seconds || 0,
        indeterminate: running,
      },
      stages: [{ id: "director", status: running ? "running" : failed ? "failed" : "completed", message: detail.message }],
      events: existing?.events || [],
      remote: false,
    };
    result.events = appendSyntheticEvent(result, {
      stage: "director",
      status: result.stages[0].status,
      message: result.message,
    });
    return result;
  }

  function normalizeDemo(detail) {
    const existing = current?.kind === "demo" ? current : null;
    const stageMap = { story: "story", plan: "director", frames: "keyframe", sound: "music", video: "montage" };
    const items = detail.state?.stages || [];
    const approved = items.filter((item) => item.status === "approved").length;
    const active = detail.activeStage || items.find((item) => ["generating", "generated", "rejected"].includes(item.status))?.id || "story";
    const result = {
      id: "express-demo",
      kind: "demo",
      title: "Démo express · chaîne 0 GPU",
      status: detail.status || "AWAITING_REVIEW",
      message: detail.message || "Contrôle humain requis",
      createdAt: detail.state?.created_at || existing?.createdAt || new Date().toISOString(),
      completedAt: detail.status === "COMPLETED" ? new Date().toISOString() : null,
      progress: {
        percent: Math.min(100, approved * 20 + (detail.status === "GENERATING" ? 8 : 0)),
        completed: approved,
        total: items.length || 5,
        active_stage: stageMap[active] || active,
        elapsed_seconds: existing?.progress?.elapsed_seconds || 0,
        indeterminate: detail.status === "GENERATING",
      },
      stages: items.map((item) => ({
        id: stageMap[item.id] || item.id,
        status: item.status === "approved" ? "completed"
          : item.status === "generating" ? "running"
            : item.status === "rejected" || item.status === "failed" ? "failed"
              : item.status === "locked" ? "skipped" : "pending",
        message: item.status,
      })),
      events: detail.state?.events || [],
      remote: false,
    };
    return result;
  }

  function stageLabel(value) {
    return STAGE_LABELS[value] || value || "Préparation";
  }

  function stateLabel(activity) {
    const value = String(activity.status || "").toUpperCase();
    if (value === "FAILED") return "Échec";
    if (value === "QUEUED") return "Dans la file d’attente";
    if (value === "AWAITING_REVIEW") return "Validation requise";
    if (value === "AWAITING_KEYFRAME_APPROVAL") return "Validation requise";
    if (isTerminal(value)) return "Terminé";
    return "En cours";
  }

  function formatElapsed(seconds) {
    const safe = Math.max(0, Math.floor(Number(seconds) || 0));
    const minutes = Math.floor(safe / 60);
    return minutes + ":" + String(safe % 60).padStart(2, "0");
  }

  function elapsedSeconds(activity) {
    const reported = Number(activity.progress?.elapsed_seconds) || 0;
    if (isTerminal(activity.status)) return reported;
    const started = Date.parse(activity.createdAt);
    return Number.isFinite(started)
      ? Math.max(reported, Math.floor((Date.now() - started) / 1000))
      : reported;
  }

  function renderSegments(items) {
    segments.replaceChildren();
    for (const item of items) {
      const marker = document.createElement("i");
      marker.className = item.status || "pending";
      marker.title = stageLabel(item.id || item.stage) + " · " + (item.message || item.status);
      segments.append(marker);
    }
  }

  function renderEvents(items) {
    events.replaceChildren();
    if (!items.length) {
      const empty = document.createElement("li");
      empty.className = "activity-log-empty";
      empty.textContent = "Le premier événement apparaîtra ici.";
      events.append(empty);
      return;
    }
    for (const item of items.slice().reverse()) {
      const row = document.createElement("li");
      row.className = item.status || "";
      const time = document.createElement("time");
      const parsed = new Date(item.timestamp);
      time.textContent = Number.isNaN(parsed.valueOf())
        ? "—"
        : parsed.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
      const stageName = document.createElement("em");
      stageName.textContent = stageLabel(item.stage);
      const copy = document.createElement("span");
      copy.textContent = item.message || item.status;
      row.append(time, stageName, copy);
      events.append(row);
    }
  }

  function render(activity) {
    const changed = current?.id !== activity.id;
    current = activity;
    if (changed) dismissedId = null;
    if (dismissedId !== activity.id) overlay.classList.remove("hidden");
    overlay.classList.remove("is-running", "is-complete", "is-failed");
    overlay.classList.add(statusClass(activity));
    title.textContent = activity.title;
    state.textContent = stateLabel(activity) + " · " + activity.progress.completed + "/" + activity.progress.total + " étape(s)";
    stage.textContent = stageLabel(activity.progress.active_stage)
      + (activity.progress.indeterminate ? " · traitement en cours" : "");
    message.textContent = activity.message;
    const percent = Math.min(100, Math.max(0, Number(activity.progress.percent) || 0));
    numbers.textContent = percent + " % · " + formatElapsed(elapsedSeconds(activity));
    progressTrack.setAttribute("aria-valuenow", String(percent));
    progressTrack.setAttribute("aria-valuetext", state.textContent);
    progressTrack.classList.toggle("is-indeterminate", Boolean(activity.progress.indeterminate));
    progressValue.style.width = percent + "%";
    renderSegments(activity.stages);
    renderEvents(activity.events);
    window.SerreGraph?.focusActivityStage(activity.progress.active_stage);
    logToggle.textContent = "Journal · " + activity.events.length;
  }

  function updateClock() {
    if (!current || overlay.classList.contains("hidden")) return;
    const percent = Math.min(100, Math.max(0, Number(current.progress.percent) || 0));
    numbers.textContent = percent + " % · " + formatElapsed(elapsedSeconds(current));
  }

  function toggleLog() {
    const expanded = log.classList.toggle("hidden") === false;
    logToggle.setAttribute("aria-expanded", String(expanded));
    keepInsideViewport();
  }

  function savedPosition() {
    try {
      const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      return Number.isFinite(value?.x) && Number.isFinite(value?.y) ? value : null;
    } catch (_error) {
      return null;
    }
  }

  function applyPosition(x, y) {
    const width = overlay.offsetWidth;
    const height = overlay.offsetHeight;
    const nextX = Math.min(Math.max(6, x), Math.max(6, window.innerWidth - width - 6));
    const nextY = Math.min(Math.max(68, y), Math.max(68, window.innerHeight - height - 6));
    overlay.style.left = Math.round(nextX) + "px";
    overlay.style.top = Math.round(nextY) + "px";
    overlay.style.right = "auto";
    overlay.style.bottom = "auto";
    overlay.style.transform = "none";
    return { x: nextX, y: nextY };
  }

  function persistPosition(position) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(position)); } catch (_error) { /* no-op */ }
  }

  function keepInsideViewport() {
    if (!overlay.style.top) return;
    const rectangle = overlay.getBoundingClientRect();
    persistPosition(applyPosition(rectangle.left, rectangle.top));
  }

  function resetPosition() {
    overlay.removeAttribute("style");
    try { localStorage.removeItem(STORAGE_KEY); } catch (_error) { /* no-op */ }
  }

  function startDrag(event) {
    if (event.button !== 0 || event.target.closest("button")) return;
    event.preventDefault();
    const rectangle = overlay.getBoundingClientRect();
    const offsetX = event.clientX - rectangle.left;
    const offsetY = event.clientY - rectangle.top;
    applyPosition(rectangle.left, rectangle.top);
    overlay.classList.add("is-dragging");
    handle.setPointerCapture(event.pointerId);
    const move = (moveEvent) => {
      applyPosition(moveEvent.clientX - offsetX, moveEvent.clientY - offsetY);
    };
    const stop = () => {
      overlay.classList.remove("is-dragging");
      handle.removeEventListener("pointermove", move);
      handle.removeEventListener("pointerup", stop);
      handle.removeEventListener("pointercancel", stop);
      const currentPosition = overlay.getBoundingClientRect();
      persistPosition({ x: currentPosition.left, y: currentPosition.top });
    };
    handle.addEventListener("pointermove", move);
    handle.addEventListener("pointerup", stop);
    handle.addEventListener("pointercancel", stop);
  }

  async function request(path) {
    const response = await fetch(path);
    if (!response.ok) {
      const error = new Error("Activity request failed");
      error.status = response.status;
      throw error;
    }
    return response.json();
  }

  async function pollActivity() {
    if (polling || document.hidden) return;
    polling = true;
    try {
      if (current?.remote && !isTerminal(current.status)) {
        const prefix = current.kind === "episode" ? "/api/episode-jobs/" : "/api/jobs/";
        const job = await request(prefix + current.id);
        render(normalizeJob(job, current.kind));
      } else {
        const payload = await request("/api/activity");
        if (payload.activity && payload.activity.id !== current?.id) {
          render(normalizeJob(payload.activity, payload.activity.kind));
        }
      }
    } catch (error) {
      if (error.status !== 404) console.debug("Suivi d’activité momentanément indisponible", error);
    } finally {
      polling = false;
    }
  }

  function schedulePoll() {
    window.clearTimeout(pollTimer);
    pollTimer = window.setTimeout(async () => {
      await pollActivity();
      schedulePoll();
    }, 1200);
  }

  logToggle.addEventListener("click", toggleLog);
  closeButton.addEventListener("click", () => {
    dismissedId = current?.id || null;
    overlay.classList.add("hidden");
  });
  handle.addEventListener("pointerdown", startDrag);
  handle.addEventListener("dblclick", (event) => {
    if (!event.target.closest("button")) resetPosition();
  });
  window.addEventListener("resize", keepInsideViewport);
  window.addEventListener("studio:job", (event) => render(normalizeJob(event.detail, "shot")));
  window.addEventListener("studio:episode-job", (event) => render(normalizeJob(event.detail, "episode")));
  window.addEventListener("studio:stage-job", (event) => render(normalizeStageJob(event.detail)));
  window.addEventListener("studio:narrative-job", (event) => render(normalizeNarrative(event.detail)));
  window.addEventListener("studio:demo-job", (event) => render(normalizeDemo(event.detail)));
  window.addEventListener("studio:project-changing", () => {
    current = null;
    dismissedId = null;
    overlay.classList.add("hidden");
    window.SerreGraph?.focusActivityStage(null);
  });

  const position = savedPosition();
  if (position) requestAnimationFrame(() => applyPosition(position.x, position.y));
  window.setInterval(updateClock, 1000);
  pollActivity().finally(schedulePoll);

  return {
    close: () => closeButton.click(),
    current: () => current,
    openLog: () => {
      overlay.classList.remove("hidden");
      if (log.classList.contains("hidden")) toggleLog();
    },
  };
})();

window.SerreActivity = serreActivity;
