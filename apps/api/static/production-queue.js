const productionQueue = (() => {
  const topbar = document.querySelector(".topbar");
  if (!topbar || document.querySelector("#production-queue")) return null;

  const STATUS = {
    queued: ["En attente", "queued"],
    running: ["En cours", "running"],
    awaiting_approval: ["À valider", "approval"],
    completed: ["Terminé", "completed"],
    failed: ["Erreur", "failed"],
    cancelled: ["Annulé", "cancelled"],
  };
  const KIND = {
    keyframe: "Keyframes",
    video: "Vidéo",
    voice: "Voix",
    music: "Musique",
  };

  const toggle = document.createElement("button");
  toggle.id = "production-queue-toggle";
  toggle.className = "production-queue-toggle";
  toggle.type = "button";
  toggle.setAttribute("aria-controls", "production-queue");
  toggle.setAttribute("aria-expanded", "false");
  toggle.title = "File globale de production";
  toggle.innerHTML = '<span aria-hidden="true">≋</span><strong>File</strong><i class="hidden">0</i>';
  topbar.insertBefore(toggle, document.querySelector(".project-switcher"));

  const drawer = document.createElement("aside");
  drawer.id = "production-queue";
  drawer.className = "production-queue";
  drawer.setAttribute("aria-hidden", "true");
  drawer.setAttribute("aria-label", "File globale de production");
  drawer.innerHTML = `
    <header class="production-queue-heading">
      <div><p>PRODUCTION GLOBALE</p><h2>File de génération</h2></div>
      <button data-queue-action="close" type="button" aria-label="Fermer">×</button>
    </header>
    <section class="production-queue-summary" aria-live="polite">
      <div class="production-queue-summary-copy">
        <strong id="production-queue-summary-label">File vide</strong>
        <span id="production-queue-summary-state">Aucune génération batch implicite</span>
      </div>
      <output id="production-queue-summary-percent">0 %</output>
      <div class="production-queue-progress" role="progressbar" aria-label="Progression globale" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><i></i></div>
    </section>
    <section class="production-queue-batch" aria-label="Actions batch explicites">
      <button data-queue-action="missing" type="button">Produire les manquants</button>
      <button data-queue-action="approved" type="button">Produire les plans validés</button>
      <button data-queue-action="pause" type="button">Pause</button>
    </section>
    <form id="production-queue-add" class="production-queue-add">
      <label>Plan actif<select name="kind"><option value="keyframe">Keyframes</option><option value="video">Vidéo validée</option><option value="voice">Voix</option><option value="music">Musique</option></select></label>
      <label>Priorité<input name="priority" type="number" min="-100" max="100" value="0" /></label>
      <button type="submit">Ajouter</button>
    </form>
    <div id="production-queue-episodes" class="production-queue-episodes"></div>
    <ol id="production-queue-items" class="production-queue-items"><li class="production-queue-empty">La file est vide.</li></ol>
    <footer class="production-queue-footer">
      <span>Une erreur n’arrête jamais les tâches suivantes.</span>
      <button data-queue-action="clear" type="button">Nettoyer les tâches finies</button>
    </footer>`;
  document.body.append(drawer);

  const list = drawer.querySelector("#production-queue-items");
  const episodes = drawer.querySelector("#production-queue-episodes");
  const summaryLabel = drawer.querySelector("#production-queue-summary-label");
  const summaryState = drawer.querySelector("#production-queue-summary-state");
  const summaryPercent = drawer.querySelector("#production-queue-summary-percent");
  const summaryProgress = drawer.querySelector(".production-queue-progress");
  const pauseButton = drawer.querySelector('[data-queue-action="pause"]');
  const addForm = drawer.querySelector("#production-queue-add");
  let state = null;
  let currentEpisodeId = "";
  let currentShotId = "";
  let open = false;
  let timer = null;
  let requestVersion = 0;

  async function request(path, options = {}) {
    if (window.SerreStudio?.api) return window.SerreStudio.api(path, options);
    const response = await fetch(path, options);
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.detail || "Erreur HTTP " + response.status);
    return body;
  }

  function notify(message, error = false) {
    window.SerreStudio?.notify(message, error);
  }

  function setOpen(value) {
    open = Boolean(value);
    drawer.classList.toggle("is-open", open);
    drawer.setAttribute("aria-hidden", String(!open));
    toggle.setAttribute("aria-expanded", String(open));
    toggle.classList.toggle("selected", open);
    if (open) refresh().catch(showError);
  }

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function action(label, name, item, title = label) {
    const button = element("button", "production-queue-item-action", label);
    button.type = "button";
    button.dataset.queueAction = name;
    button.dataset.itemId = item.id;
    button.title = title;
    return button;
  }

  function renderEpisodes(payload) {
    episodes.replaceChildren();
    for (const episode of payload.episodes || []) {
      const card = element("article", "production-queue-episode");
      const label = element("span", "", episode.id);
      const progress = element(
        "strong",
        "",
        episode.completed + " / " + episode.total + " · " + episode.percent + " %",
      );
      const track = element("i");
      track.style.setProperty("--queue-progress", episode.percent + "%");
      card.classList.toggle("has-error", episode.failed > 0);
      card.classList.toggle("needs-approval", episode.awaiting_approval > 0);
      card.append(label, progress, track);
      episodes.append(card);
    }
  }

  function renderItem(item) {
    const meta = STATUS[item.status] || [item.status, ""];
    const row = element("li", "production-queue-item " + meta[1]);
    row.dataset.itemId = item.id;

    const order = element("span", "production-queue-order", "#" + item.position);
    order.title = "Position dans la file";
    const body = element("div", "production-queue-item-body");
    const heading = element("div", "production-queue-item-heading");
    const title = element("strong", "", item.shot_id + " · " + (KIND[item.kind] || item.kind));
    const badge = element("span", "production-queue-status", meta[0]);
    heading.append(title, badge);
    const message = element("p", "", item.message);
    if (item.error) message.title = item.error;
    const progress = element("div", "production-queue-item-progress");
    const fill = element("i");
    fill.style.width = item.progress + "%";
    progress.append(fill);
    body.append(heading, message, progress);

    const controls = element("div", "production-queue-item-controls");
    const priority = element("span", "production-queue-priority", "P" + (item.priority >= 0 ? "+" : "") + item.priority);
    priority.title = "Priorité " + item.priority;
    controls.append(priority, action("Ouvrir", "open-plan", item));
    if (item.status === "queued") {
      controls.append(
        action("−", "priority-down", item, "Baisser la priorité"),
        action("+", "priority-up", item, "Augmenter la priorité"),
      );
    }
    if (["queued", "running"].includes(item.status)) controls.append(action("Annuler", "cancel", item));
    if (item.status === "awaiting_approval") controls.append(action("Valider", "approve", item, "Approuver cette version de keyframe"));
    if (["failed", "cancelled", "awaiting_approval"].includes(item.status)) controls.append(action("Relancer", "retry", item));
    row.append(order, body, controls);
    return row;
  }

  function render(payload) {
    state = payload;
    const progress = payload.progress || { completed: 0, total: 0, percent: 0 };
    summaryLabel.textContent = progress.total
      ? progress.completed + " / " + progress.total + " tâches traitées"
      : "File vide";
    summaryState.textContent = payload.paused
      ? payload.recovered
        ? "Reprise manuelle requise après redémarrage"
        : "En pause · la tâche active termine son opération atomique"
      : payload.active_item_id
        ? "Production en cours"
        : "Prête";
    summaryPercent.textContent = progress.percent + " %";
    summaryProgress.setAttribute("aria-valuenow", String(progress.percent));
    summaryProgress.querySelector("i").style.width = progress.percent + "%";
    pauseButton.textContent = payload.paused ? "Reprendre" : "Pause";
    pauseButton.dataset.queueAction = payload.paused ? "resume" : "pause";
    renderEpisodes(payload);
    list.replaceChildren();
    for (const item of payload.items || []) list.append(renderItem(item));
    if (!payload.items?.length) list.append(element("li", "production-queue-empty", "La file est vide."));
    const pending = (payload.counts?.queued || 0) + (payload.counts?.running || 0) + (payload.counts?.awaiting_approval || 0);
    const counter = toggle.querySelector("i");
    counter.textContent = String(pending);
    counter.classList.toggle("hidden", pending === 0);
    counter.classList.toggle("has-error", Boolean(payload.counts?.failed));
    window.dispatchEvent(new CustomEvent("studio:production-queue", { detail: payload }));
    schedule(payload.active_item_id || payload.counts?.queued ? 900 : 4000);
  }

  function showError(error) {
    list.replaceChildren(element("li", "production-queue-empty error", error.message || "File indisponible"));
    schedule(5000);
  }

  function schedule(delay) {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      if (!document.hidden || open) refresh().catch(showError);
      else schedule(delay);
    }, delay);
  }

  async function refresh() {
    const version = ++requestVersion;
    const payload = await request("/api/production-queue");
    if (version === requestVersion) render(payload);
    return payload;
  }

  async function mutate(path, options = {}) {
    const result = await request(path, { method: "POST", ...options });
    await refresh();
    return result;
  }

  async function batch(kind) {
    if (!currentEpisodeId) throw new Error("Sélectionne d’abord un épisode.");
    const result = await mutate("/api/production-queue/batch/" + kind, {
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ episode_id: currentEpisodeId }),
    });
    const count = result.batch?.enqueued?.length || 0;
    const skipped = result.batch?.skipped?.length || 0;
    notify(count + " tâche(s) ajoutée(s)" + (skipped ? " · " + skipped + " bloquée(s) par validation ou déjà en file" : ""));
  }

  function openPlan(item) {
    window.SerreWorkspace?.show("graph");
    const select = document.querySelector("#episode-select");
    if (!select || select.value === item.episode_id) {
      window.selectEpisodeShot?.(item.shot_id);
      return;
    }
    const selectAfterLoad = (event) => {
      if (event.detail?.episode?.id === item.episode_id) window.selectEpisodeShot?.(item.shot_id);
    };
    window.addEventListener("studio:episode-loaded", selectAfterLoad, { once: true });
    select.value = item.episode_id;
    select.dispatchEvent(new Event("change"));
  }

  async function itemAction(name, item) {
    if (name === "open-plan") {
      setOpen(false);
      openPlan(item);
      return;
    }
    if (name === "cancel" || name === "retry") {
      await mutate("/api/production-queue/items/" + encodeURIComponent(item.id) + "/" + name);
      return;
    }
    if (name === "approve") {
      if (!window.confirm("Approuver cette version de keyframe pour autoriser sa vidéo ?")) return;
      await mutate("/api/production-queue/shots/" + encodeURIComponent(item.shot_id) + "/approve");
      notify(item.shot_id + " validé. La vidéo peut maintenant être mise en file.");
      return;
    }
    if (["priority-up", "priority-down"].includes(name)) {
      const priority = Math.max(-100, Math.min(100, item.priority + (name === "priority-up" ? 10 : -10)));
      await request("/api/production-queue/items/" + encodeURIComponent(item.id) + "/priority", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priority }),
      });
      await refresh();
    }
  }

  toggle.addEventListener("click", () => setOpen(!open));
  drawer.addEventListener("click", (event) => {
    const button = event.target.closest("[data-queue-action]");
    if (!button) return;
    const name = button.dataset.queueAction;
    if (name === "close") return setOpen(false);
    if (name === "missing" || name === "approved") return batch(name).catch((error) => notify(error.message, true));
    if (name === "pause" || name === "resume") return mutate("/api/production-queue/" + name).catch((error) => notify(error.message, true));
    if (name === "clear") return request("/api/production-queue/finished", { method: "DELETE" }).then(refresh).catch((error) => notify(error.message, true));
    const item = state?.items?.find((candidate) => candidate.id === button.dataset.itemId);
    if (item) itemAction(name, item).catch((error) => notify(error.message, true));
  });
  addForm.addEventListener("submit", (event) => {
    event.preventDefault();
    let shot;
    try { shot = window.SerreStudio?.shot(); } catch (error) { notify(error.message, true); return; }
    if (!shot) { notify("Sélectionne d’abord un plan.", true); return; }
    const data = new FormData(addForm);
    mutate("/api/production-queue/items", {
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shot, kind: data.get("kind"), priority: Number(data.get("priority")) }),
    }).then(() => notify(shot.id + " ajouté à la file.")).catch((error) => notify(error.message, true));
  });
  document.addEventListener("keydown", (event) => {
    if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === "q") {
      event.preventDefault();
      setOpen(!open);
    } else if (event.key === "Escape" && open) {
      setOpen(false);
      toggle.focus();
    }
  });
  window.addEventListener("studio:episode-loaded", (event) => {
    currentEpisodeId = event.detail?.episode?.id || "";
  });
  window.addEventListener("studio:episode-cleared", () => {
    currentEpisodeId = "";
    currentShotId = "";
  });
  window.addEventListener("studio:shot-selected", (event) => {
    currentShotId = event.detail?.shot?.id || "";
    currentEpisodeId = event.detail?.episode?.id || currentEpisodeId;
  });
  window.addEventListener("studio:project-changing", () => {
    requestVersion += 1;
    state = null;
    currentEpisodeId = "";
    currentShotId = "";
    render({ paused: false, counts: {}, progress: { completed: 0, total: 0, percent: 0 }, episodes: [], items: [] });
  });
  window.addEventListener("studio:project-changed", () => refresh().catch(showError));

  window.SerreProductionQueue = Object.freeze({ open: () => setOpen(true), close: () => setOpen(false), refresh });
  const projectsReady = window.SerreProjects?.ready;
  if (projectsReady) projectsReady.then(refresh).catch(showError);
  else refresh().catch(showError);
  return window.SerreProductionQueue;
})();
