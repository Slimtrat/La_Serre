const projectExplorer = (() => {
  const STATE_META = {
    idea: { label: "Idée", symbol: "◌", weight: 0 },
    draft: { label: "Brouillon", symbol: "○", weight: 15 },
    review: { label: "À valider", symbol: "◐", weight: 55 },
    approved: { label: "Validé", symbol: "✓", weight: 75 },
    production: { label: "En production", symbol: "●", weight: 80 },
    complete: { label: "Terminé", symbol: "✓", weight: 100 },
    error: { label: "Erreur", symbol: "!", weight: 0 },
    stale: { label: "Obsolète", symbol: "↻", weight: 65 },
  };
  const STORAGE_KEY = "serre-studio-project-explorer-open";
  const EXPANDED_KEY = "serre-studio-project-explorer-expanded";
  const projectSelect = document.querySelector("#project-select");
  const topbar = document.querySelector(".topbar");
  if (!projectSelect || !topbar) return null;

  const toggle = document.createElement("button");
  toggle.id = "project-explorer-toggle";
  toggle.className = "project-explorer-toggle";
  toggle.type = "button";
  toggle.setAttribute("aria-controls", "project-explorer");
  toggle.setAttribute("aria-expanded", "false");
  toggle.title = "Explorateur du projet (Ctrl+Maj+E)";
  toggle.innerHTML = '<strong aria-hidden="true">⌘</strong><span>Explorer</span>';
  const toolRail = document.querySelector(".studio-tools");
  if (toolRail) toolRail.insertBefore(toggle, toolRail.firstChild);
  else topbar.append(toggle);

  const drawer = document.createElement("aside");
  drawer.id = "project-explorer";
  drawer.className = "project-explorer";
  drawer.setAttribute("aria-label", "Explorateur du projet");
  drawer.setAttribute("aria-hidden", "true");
  drawer.innerHTML =
    '<header class="project-explorer-header"><div><p>PROJET ACTIF</p>' +
    '<h2 id="project-explorer-project">Chargement…</h2></div>' +
    '<div class="project-explorer-header-actions">' +
    '<button id="project-explorer-refresh" type="button" title="Actualiser les états" aria-label="Actualiser les états">↻</button>' +
    '<button id="project-explorer-close" type="button" title="Fermer" aria-label="Fermer l’explorateur">×</button>' +
    '</div></header>' +
    '<section id="project-explorer-summary" class="project-explorer-summary" aria-live="polite"></section>' +
    '<nav id="project-explorer-tree" class="project-explorer-tree" aria-label="Saisons, épisodes et plans">' +
    '<p class="project-explorer-loading">Lecture du projet…</p></nav>' +
    '<footer class="project-explorer-legend"></footer>';
  document.body.append(drawer);

  const tree = drawer.querySelector("#project-explorer-tree");
  const summary = drawer.querySelector("#project-explorer-summary");
  const projectName = drawer.querySelector("#project-explorer-project");
  const legend = drawer.querySelector(".project-explorer-legend");
  for (const [state, meta] of Object.entries(STATE_META)) {
    const entry = document.createElement("span");
    entry.dataset.state = state;
    const symbol = document.createElement("i");
    symbol.textContent = meta.symbol;
    entry.append(symbol, document.createTextNode(meta.label));
    legend.append(entry);
  }

  let payload = null;
  let loadingVersion = 0;
  let currentEpisodeId = "";
  let currentShotId = "";
  let pendingShotId = "";
  let expanded = readExpanded();

  function readExpanded() {
    try {
      const value = JSON.parse(localStorage.getItem(EXPANDED_KEY) || "[]");
      return new Set(Array.isArray(value) ? value : []);
    } catch (_error) {
      return new Set();
    }
  }

  function saveExpanded() {
    try { localStorage.setItem(EXPANDED_KEY, JSON.stringify(Array.from(expanded))); } catch (_error) { /* no-op */ }
  }

  function setOpen(open, persist = true) {
    drawer.classList.toggle("is-open", open);
    drawer.setAttribute("aria-hidden", String(!open));
    toggle.setAttribute("aria-expanded", String(open));
    toggle.classList.toggle("selected", open);
    if (persist) {
      try { localStorage.setItem(STORAGE_KEY, String(open)); } catch (_error) { /* no-op */ }
    }
    if (open) {
      refresh(false).catch(showError);
      window.setTimeout(() => tree.querySelector('[aria-current="true"]')?.scrollIntoView({ block: "nearest" }), 30);
    }
  }

  function stateBadge(state, compact = false) {
    const meta = STATE_META[state] || STATE_META.idea;
    const badge = document.createElement("span");
    badge.className = "project-explorer-state" + (compact ? " compact" : "");
    badge.dataset.state = state;
    badge.title = meta.label;
    const symbol = document.createElement("i");
    symbol.textContent = meta.symbol;
    badge.append(symbol);
    if (!compact) badge.append(document.createTextNode(meta.label));
    return badge;
  }

  function progressView(progress, label) {
    const root = document.createElement("div");
    root.className = "project-explorer-progress";
    const text = document.createElement("span");
    text.textContent = progress.completed + " / " + progress.total + " " + label;
    const percent = document.createElement("strong");
    percent.textContent = progress.percent + " %";
    const track = document.createElement("div");
    track.setAttribute("role", "progressbar");
    track.setAttribute("aria-label", progress.percent + " % · " + text.textContent);
    track.setAttribute("aria-valuenow", String(progress.percent));
    track.setAttribute("aria-valuemin", "0");
    track.setAttribute("aria-valuemax", "100");
    const fill = document.createElement("i");
    fill.style.width = progress.percent + "%";
    track.append(fill);
    root.append(text, percent, track);
    return root;
  }

  function disclosure(id, label, open) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "project-explorer-disclosure";
    button.dataset.explorerDisclosure = id;
    button.setAttribute("aria-expanded", String(open));
    button.setAttribute("aria-label", (open ? "Replier " : "Déplier ") + label);
    button.textContent = "›";
    return button;
  }

  function toggleExpanded(id) {
    if (expanded.has(id)) expanded.delete(id);
    else expanded.add(id);
    saveExpanded();
    render();
  }

  function jumpButton(label, title, click) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "project-explorer-jump";
    button.title = title;
    button.setAttribute("aria-label", title);
    button.textContent = label;
    button.addEventListener("click", click);
    return button;
  }

  function renderShot(shot, episode) {
    const item = document.createElement("li");
    const selected = shot.id === currentShotId;
    item.className = "project-explorer-shot";
    item.dataset.state = shot.state;
    const branch = document.createElement("span");
    branch.className = "project-explorer-branch";
    branch.textContent = "└";
    const button = jumpButton(
      "S" + String(shot.number).padStart(2, "0"),
      "Ouvrir " + shot.id + " dans le graphe",
      () => activateEpisode(episode.id, shot.id),
    );
    button.classList.add("project-explorer-shot-name");
    button.dataset.episodeId = episode.id;
    button.dataset.shotId = shot.id;
    button.setAttribute("aria-current", selected ? "true" : "false");
    const duration = document.createElement("span");
    duration.className = "project-explorer-duration";
    duration.textContent = shot.duration + " s";
    item.append(branch, button, duration, stateBadge(shot.state));
    return item;
  }

  function renderEpisode(episode) {
    const article = document.createElement("article");
    article.className = "project-explorer-episode";
    article.dataset.state = episode.state;
    const open = expanded.has(episode.id) || episode.id === currentEpisodeId;
    const row = document.createElement("div");
    row.className = "project-explorer-episode-row";
    row.append(disclosure(episode.id, episode.title, open));
    const name = jumpButton(
      "E" + String(episode.number).padStart(2, "0") + " — " + episode.title,
      "Ouvrir " + episode.id,
      () => activateEpisode(episode.id),
    );
    name.classList.add("project-explorer-episode-name");
    name.dataset.episodeId = episode.id;
    name.setAttribute("aria-current", episode.id === currentEpisodeId ? "true" : "false");
    row.append(name, stateBadge(episode.state, true));
    const count = document.createElement("span");
    count.className = "project-explorer-count";
    count.textContent = episode.progress.completed + "/" + episode.progress.total;
    count.title = episode.progress.completed + " plans terminés sur " + episode.progress.total;
    row.append(count);

    const body = document.createElement("div");
    body.className = "project-explorer-episode-body";
    body.hidden = !open;
    body.append(progressView(episode.progress, "plans terminés"));
    const shots = document.createElement("ol");
    shots.className = "project-explorer-shots";
    episode.shots.forEach((shot) => shots.append(renderShot(shot, episode)));
    body.append(shots);
    article.append(row, body);
    return article;
  }

  function renderSeason(season) {
    const section = document.createElement("section");
    section.className = "project-explorer-season";
    section.dataset.state = season.state;
    const containsCurrent = season.episodes.some((episode) => episode.id === currentEpisodeId);
    const open = expanded.has(season.id) || containsCurrent;
    const row = document.createElement("div");
    row.className = "project-explorer-season-row";
    row.append(disclosure(season.id, season.title, open));
    const title = document.createElement("strong");
    title.textContent = season.title;
    row.append(title, stateBadge(season.state, true));
    const progress = document.createElement("span");
    progress.textContent = season.progress.percent + " %";
    row.append(progress);
    const episodes = document.createElement("div");
    episodes.className = "project-explorer-episodes";
    episodes.hidden = !open;
    season.episodes.forEach((episode) => episodes.append(renderEpisode(episode)));
    section.append(row, episodes);
    return section;
  }

  function render() {
    projectName.textContent = projectSelect.selectedOptions[0]?.textContent || "Projet actif";
    tree.replaceChildren();
    summary.replaceChildren();
    if (!payload) {
      const loading = document.createElement("p");
      loading.className = "project-explorer-loading";
      loading.textContent = "Lecture du projet…";
      tree.append(loading);
      return;
    }
    const heading = document.createElement("div");
    const title = document.createElement("strong");
    title.textContent = payload.title;
    heading.append(title, stateBadge(payload.state, true));
    summary.append(heading, progressView(payload.progress, "plans terminés"));
    if (!payload.seasons.length) {
      const empty = document.createElement("div");
      empty.className = "project-explorer-empty";
      const title = document.createElement("strong");
      title.textContent = "Projet sans épisode";
      const text = document.createElement("p");
      text.textContent = "Ajoute ou clone un scénario pour faire apparaître ses saisons, épisodes et plans.";
      empty.append(title, text);
      tree.append(empty);
      return;
    }
    payload.seasons.forEach((season) => tree.append(renderSeason(season)));
  }

  function showError(error) {
    tree.replaceChildren();
    const box = document.createElement("div");
    box.className = "project-explorer-empty error";
    const title = document.createElement("strong");
    title.textContent = "Explorateur indisponible";
    const text = document.createElement("p");
    text.textContent = error.message || "Impossible de lire le projet.";
    box.append(title, text);
    tree.append(box);
  }

  async function refresh(showLoading = true) {
    const version = ++loadingVersion;
    if (showLoading) {
      payload = null;
      render();
    }
    const response = await fetch("/api/episodes/project-explorer");
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.detail || "Erreur HTTP " + response.status);
    if (version !== loadingVersion) return;
    payload = body;
    if (!currentEpisodeId) currentEpisodeId = document.querySelector("#episode-select")?.value || "";
    if (!currentShotId) {
      try { currentShotId = window.SerreStudio?.shot()?.id || ""; } catch (_error) { /* no-op */ }
    }
    const currentSeason = payload.seasons.find((season) =>
      season.episodes.some((episode) => episode.id === currentEpisodeId)
    );
    if (currentSeason) {
      expanded.add(currentSeason.id);
      expanded.add(currentEpisodeId);
    }
    render();
  }

  function activateEpisode(episodeId, shotId = "") {
    pendingShotId = shotId;
    const select = document.querySelector("#episode-select");
    if (!select) return;
    expanded.add(episodeId.slice(0, 3));
    expanded.add(episodeId);
    saveExpanded();
    setOpen(false);
    window.SerreWorkspace?.show("graph");
    if (select.value === episodeId && currentEpisodeId === episodeId) {
      if (shotId) window.selectEpisodeShot?.(shotId);
      return;
    }
    select.value = episodeId;
    select.dispatchEvent(new Event("change"));
  }

  function recomputeProgress(states) {
    const completed = states.filter((state) => state === "complete").length;
    const percent = states.length
      ? Math.round(states.reduce((sum, state) => sum + (STATE_META[state]?.weight || 0), 0) / states.length)
      : 0;
    const counts = {};
    states.forEach((state) => { counts[state] = (counts[state] || 0) + 1; });
    return { completed, total: states.length, percent, states: counts };
  }

  function aggregateState(states) {
    if (!states.length) return "idea";
    for (const state of ["error", "production", "stale", "review"]) {
      if (states.includes(state)) return state;
    }
    if (states.every((state) => state === "complete")) return "complete";
    if (states.every((state) => ["approved", "complete"].includes(state))) return "approved";
    return "draft";
  }

  function updateShotState(shotId, state) {
    if (!payload || !shotId) return;
    for (const season of payload.seasons) {
      for (const episode of season.episodes) {
        const shot = episode.shots.find((candidate) => candidate.id === shotId);
        if (!shot) continue;
        shot.state = state;
        const episodeStates = episode.shots.map((candidate) => candidate.state);
        episode.progress = recomputeProgress(episodeStates);
        episode.state = aggregateState(episodeStates);
        const seasonStates = season.episodes.flatMap((candidate) => candidate.shots.map((item) => item.state));
        season.progress = recomputeProgress(seasonStates);
        season.state = aggregateState(seasonStates);
        const projectStates = payload.seasons.flatMap((candidate) =>
          candidate.episodes.flatMap((item) => item.shots.map((shotItem) => shotItem.state))
        );
        payload.progress = recomputeProgress(projectStates);
        payload.state = aggregateState(projectStates);
        render();
        return;
      }
    }
  }

  function updateEpisodeState(episodeId, state) {
    if (!payload || !episodeId) return;
    for (const season of payload.seasons) {
      const episode = season.episodes.find((candidate) => candidate.id === episodeId);
      if (episode) {
        episode.state = state;
        render();
        return;
      }
    }
  }

  drawer.addEventListener("click", (event) => {
    const button = event.target.closest("[data-explorer-disclosure]");
    if (button) toggleExpanded(button.dataset.explorerDisclosure);
  });
  toggle.addEventListener("click", () => setOpen(!drawer.classList.contains("is-open")));
  drawer.querySelector("#project-explorer-close").addEventListener("click", () => setOpen(false));
  drawer.querySelector("#project-explorer-refresh").addEventListener("click", () => refresh().catch(showError));
  document.addEventListener("keydown", (event) => {
    if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === "e") {
      event.preventDefault();
      setOpen(!drawer.classList.contains("is-open"));
    } else if (event.key === "Escape" && drawer.classList.contains("is-open")) {
      setOpen(false);
      toggle.focus();
    }
  });

  window.addEventListener("studio:episode-loaded", (event) => {
    currentEpisodeId = event.detail?.episode?.id || "";
    expanded.add(currentEpisodeId.slice(0, 3));
    expanded.add(currentEpisodeId);
    if (pendingShotId) {
      const shotId = pendingShotId;
      pendingShotId = "";
      // episode.js selects the first shot immediately after publishing this event.
      // Defer our cross-episode target so the explicit explorer choice wins.
      window.setTimeout(() => window.selectEpisodeShot?.(shotId), 0);
    }
    if (payload) render();
  });
  window.addEventListener("studio:shot-selected", (event) => {
    currentEpisodeId = event.detail?.episode?.id || currentEpisodeId;
    currentShotId = event.detail?.shot?.id || "";
    if (payload) render();
  });
  window.addEventListener("studio:project-changing", () => {
    loadingVersion += 1;
    payload = null;
    currentEpisodeId = "";
    currentShotId = "";
    pendingShotId = "";
    render();
  });
  window.addEventListener("studio:project-changed", () => refresh().catch(showError));
  window.addEventListener("studio:asset", (event) => {
    const shotId = currentShotId;
    if (!shotId) return;
    updateShotState(shotId, event.detail?.slot === "video" ? "complete" : "review");
  });
  window.addEventListener("studio:stage-job", (event) => {
    if (!currentShotId) return;
    const status = event.detail?.status;
    if (status === "FAILED") updateShotState(currentShotId, "error");
    else if (status === "GENERATING") updateShotState(currentShotId, "production");
    else if (status === "COMPLETED") window.setTimeout(() => refresh(false).catch(() => {}), 120);
  });
  window.addEventListener("studio:job", (event) => {
    const job = event.detail?.job || event.detail;
    if (!job?.shot_id) return;
    if (job.status === "FAILED") updateShotState(job.shot_id, "error");
    else if (["QUEUED", "GENERATING"].includes(job.status)) updateShotState(job.shot_id, "production");
    else if (job.status === "AWAITING_KEYFRAME_APPROVAL") updateShotState(job.shot_id, "review");
    else if (job.status === "GENERATED") {
      updateShotState(job.shot_id, "complete");
      window.setTimeout(() => refresh(false).catch(() => {}), 120);
    }
  });
  window.addEventListener("studio:episode-job", (event) => {
    const job = event.detail;
    if (!job?.episode_id) return;
    if (job.status === "FAILED") updateEpisodeState(job.episode_id, "error");
    else if (["QUEUED", "GENERATING"].includes(job.status)) updateEpisodeState(job.episode_id, "production");
    else if (job.status === "FINAL") {
      updateEpisodeState(job.episode_id, "complete");
      window.setTimeout(() => refresh(false).catch(() => {}), 120);
    }
  });

  let initiallyOpen = false;
  try { initiallyOpen = localStorage.getItem(STORAGE_KEY) === "true"; } catch (_error) { /* no-op */ }
  setOpen(initiallyOpen, false);
  window.SerreProjects?.ready
    .then(() => refresh())
    .catch(showError);

  window.SerreProjectExplorer = { open: () => setOpen(true), close: () => setOpen(false), refresh };
  return window.SerreProjectExplorer;
})();
