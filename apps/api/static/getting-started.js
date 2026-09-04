(() => {
  const STORAGE_KEY = "serre-studio-getting-started-v0.2.9";
  const POSITION_KEY = "serre-studio-getting-started-position-v1";
  const LANGUAGE_KEY = "serre-studio-getting-started-language-v1";
  const STEP_COUNT = 9;
  const EDGE_GAP = 12;
  const DESKTOP_TOP = 64;
  const MOBILE_MEDIA = "(max-width: 680px)";
  let dialog = null;
  let currentStep = 0;
  let furthestStep = 0;
  let currentStatus = null;
  let contextual = false;
  let pendingNewProject = false;
  let activationRevision = 0;
  let language = preferredLanguage();
  let drag = null;
  let lastFocused = null;
  let resizeFrame = 0;
  const tour = { episodeId: null, shotId: null, expectedNodeId: null };

  const UI_COPY = {
    fr: {
      brand: "Bien démarrer", subtitle: "PARCOURS SUR LE GRAPHE · STUDIO 0.2.9",
      drag: "Déplacer le guide. Flèches : déplacer, Maj + flèches : déplacement rapide, Origine : recentrer, Fin : ancrer à droite.",
      close: "Fermer le guide", reset: "Recentrer la fenêtre", skip: "Fermer",
      previous: "Précédent", next: "Suivant", languageGroup: "Langue du guide",
      openEpisode: "Ouvrir l’épisode",
      openShot: "Ouvrir le plan", settings: "Vérifier", nav: "Étapes du guide",
      navStep: "Étape {number} : {label}", progress: "{current} / {total}",
      centered: "Guide recentré.", docked: "Guide ancré sur le bord {edge}.",
      left: "gauche", right: "droit", top: "haut", bottom: "bas",
      expected: "ÉTAPE DU GUIDE", connecting: "Connexion au graphe…",
      nodeStatus: "État : {status}{progress}", doThis: "À FAIRE",
      tip: "Le halo bleu montre le nœud attendu. Le guide reste ouvert pendant que tu manipules le graphe.",
      readinessLoading: "Diagnostic local en cours…",
      readiness: "Atelier local : {ready}/4 prêts · {installed}/{total} modèles",
      discover: "Découvrir le Studio", discoverDetail: "Explorer Belladone et produire un premier plan.",
      expressDemo: "Produire une mini-vidéo", expressDemoDetail: "Cinq étapes guidées, validations humaines, 0 GPU.",
      newProject: "Nouveau projet", newProjectDetail: "Commencer dans un catalogue vierge et isolé.",
      createMine: "Créer mon projet", createMineDetail: "Catalogue vierge, sorties isolées, aucun média recopié.",
      remove: "Retirer Découverte", removeReady: "Retirer seulement la démonstration de la liste.",
      removeBlocked: "Crée d’abord ton projet pour garder un espace actif.",
      removeDone: "Découverte a déjà été retiré.",
    },
    en: {
      brand: "Getting started", subtitle: "LIVE GRAPH TOUR · STUDIO 0.2.9",
      drag: "Move the guide. Arrow keys: move, Shift + arrows: move faster, Home: center, End: dock right.",
      close: "Close the guide", reset: "Center the window", skip: "Close",
      previous: "Previous", next: "Next", languageGroup: "Guide language",
      openEpisode: "Open episode", openShot: "Open shot",
      settings: "Check", nav: "Guide steps", navStep: "Step {number}: {label}",
      progress: "{current} / {total}", centered: "Guide centered.",
      docked: "Guide docked to the {edge} edge.", left: "left", right: "right",
      top: "top", bottom: "bottom", expected: "GUIDE STEP", connecting: "Connecting to the graph…",
      nodeStatus: "Status: {status}{progress}", doThis: "DO THIS",
      tip: "The blue halo marks the expected node. The guide stays open while you use the graph.",
      readinessLoading: "Checking the local setup…",
      readiness: "Local setup: {ready}/4 ready · {installed}/{total} models",
      discover: "Discover the Studio", discoverDetail: "Explore Belladone and produce a first shot.",
      expressDemo: "Make a mini-video", expressDemoDetail: "Five guided steps, human approvals, zero GPU.",
      newProject: "New project", newProjectDetail: "Start with a blank, isolated catalogue.",
      createMine: "Create my project", createMineDetail: "Blank catalogue, isolated outputs, no copied demo media.",
      remove: "Remove Discovery", removeReady: "Remove only the demo entry from the list.",
      removeBlocked: "Create your project first to keep an active workspace.",
      removeDone: "Discovery has already been removed.",
    },
  };

  const STEP_COPY = {
    fr: [
      ["Départ", "CHOISIS TON POINT DE DÉPART", "Commence comme tu veux.", "Explore la démo ou ouvre un espace vierge. Les deux restent séparés."],
      ["Série", "SCOPE SÉRIE", "Ouvre la série.", "Le graphe présente les épisodes dans leur ordre narratif.", "ÉPISODE ATTENDU", "Ouvre le conteneur bleu qui pulse, ou utilise le bouton suivant."],
      ["Épisode", "SCOPE ÉPISODE", "Choisis un plan.", "Chaque conteneur résume l’avancement réel de son plan.", "PREMIER PLAN", "Ouvre le premier plan pour voir son pipeline complet."],
      ["Histoire", "PLAN · SOURCE", "Pose l’intention.", "L’Histoire contient la matière narrative utilisée par le plan.", "HISTOIRE", "Relis ou modifie le texte. Cette visite ne lance aucune génération."],
      ["Director", "PLAN · MISE EN SCÈNE", "Découpe l’action.", "Le Director structure caméra, action, personnages et jeu.", "DIRECTOR", "La flèche bleue mène de l’Histoire au contrat Shot JSON."],
      ["Contrat", "PLAN · VALIDATION", "Valide le contrat.", "Le Shot JSON relie le scénario aux moteurs image, voix et vidéo.", "SHOT JSON", "Vérifie-le avant de générer : ses changements peuvent périmer la suite."],
      ["Poses", "PLAN · TROIS IMAGES", "Cadre trois poses.", "Début, milieu et fin donnent une trajectoire claire à la vidéo.", "KEYFRAMES", "Génère ou importe trois images, puis contrôle leur progression ici."],
      ["Clip", "PLAN · MOUVEMENT", "Anime les poses.", "Le mouvement utilise les poses validées et les intentions caméra.", "MOUVEMENT", "Anime ou importe le clip. Voix, musique et montage restent indépendants."],
      ["À toi", "TON PROPRE UNIVERS", "Passe à ton histoire.", "Crée un projet vierge, puis retire Découverte si tu n’en as plus besoin."],
    ],
    en: [
      ["Start", "CHOOSE YOUR STARTING POINT", "Start your way.", "Explore the demo or open a blank workspace. They remain separate."],
      ["Series", "SERIES SCOPE", "Open the series.", "The graph presents episodes in narrative order.", "EXPECTED EPISODE", "Open the pulsing blue container, or use the next button."],
      ["Episode", "EPISODE SCOPE", "Choose a shot.", "Each container summarizes its shot’s real progress.", "FIRST SHOT", "Open the first shot to see its full pipeline."],
      ["Story", "SHOT · SOURCE", "Set the intent.", "Story contains the narrative material used by the shot.", "STORY", "Review or edit the text. This tour never starts generation."],
      ["Director", "SHOT · STAGING", "Stage the action.", "Director structures camera, action, characters, and performance.", "DIRECTOR", "The blue arrow leads from Story to the Shot JSON contract."],
      ["Contract", "SHOT · VALIDATION", "Validate the contract.", "Shot JSON connects the script to image, voice, and video engines.", "SHOT JSON", "Review it before generating: changes can make later outputs stale."],
      ["Poses", "SHOT · THREE IMAGES", "Frame three poses.", "Start, middle, and end give the video a clear action path.", "KEYFRAMES", "Generate or import three images, then check their progress here."],
      ["Clip", "SHOT · MOTION", "Animate the poses.", "Motion uses approved poses and camera intent.", "MOTION", "Animate or import the clip. Voice, music, and editing stay independent."],
      ["Your turn", "YOUR OWN WORLD", "Move to your story.", "Create a blank project, then remove Discovery when you no longer need it."],
    ],
  };

  const STEP_IDS = ["start", "series", "episode", "story", "director", "contract", "keyframes", "motion", "finish"];
  const STEP_FIELDS = ["label", "kicker", "title", "lead", "badge", "action"];
  const steps = STEP_IDS.map((id, index) => ({ id, index }));

  function normalizeLanguage(value) {
    return String(value || "").toLowerCase().startsWith("en") ? "en" : "fr";
  }

  function preferredLanguage() {
    try {
      const stored = localStorage.getItem(LANGUAGE_KEY);
      if (stored) return normalizeLanguage(stored);
    } catch (_error) {
      // Storage can be disabled in hardened desktop contexts.
    }
    const i18n = window.SerreI18n;
    const external = typeof i18n?.locale === "function" ? i18n.locale() : i18n?.locale;
    return normalizeLanguage(external || document.documentElement.lang || navigator.language);
  }

  function interpolate(value, variables) {
    return Object.entries(variables).reduce(
      (copy, [name, replacement]) => copy.replaceAll(`{${name}}`, String(replacement)),
      value,
    );
  }

  function builtInCopy(key) {
    if (!key.startsWith("step.")) return UI_COPY[language]?.[key] ?? UI_COPY.fr[key];
    const [, stepId, field] = key.split(".");
    const stepIndex = STEP_IDS.indexOf(stepId);
    const fieldIndex = STEP_FIELDS.indexOf(field);
    return STEP_COPY[language]?.[stepIndex]?.[fieldIndex]
      ?? STEP_COPY.fr[stepIndex]?.[fieldIndex];
  }

  function t(key, variables = {}) {
    const translationKey = `gettingStarted.${key}`;
    try {
      const external = window.SerreI18n?.t?.(translationKey, variables);
      if (typeof external === "string" && external && external !== translationKey) {
        return interpolate(external, variables);
      }
    } catch (_error) {
      // The built-in dictionary keeps the guide autonomous.
    }
    return interpolate(builtInCopy(key) ?? key, variables);
  }

  function h(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function stepText(step, field) {
    return t(`step.${step.id}.${field}`);
  }

  function renderStart() {
    return `
      <div class="guide-choice-grid">
        <button type="button" data-guide-action="discover">
          <span aria-hidden="true">✦</span><strong>${h(t("discover"))}</strong>
          <small>${h(t("discoverDetail"))}</small>
        </button>
        <button type="button" data-guide-action="new-project">
          <span aria-hidden="true">＋</span><strong>${h(t("newProject"))}</strong>
          <small>${h(t("newProjectDetail"))}</small>
        </button>
        <button type="button" data-guide-action="express-demo">
          <span aria-hidden="true">✦</span><strong>${h(t("expressDemo"))}</strong>
          <small>${h(t("expressDemoDetail"))}</small>
        </button>
      </div>
      ${renderReadiness()}`;
  }

  function renderContext(step) {
    return `
      <div class="guide-context-card">
        <span class="guide-context-badge">${h(t("doThis"))}</span>
        <strong>${h(stepText(step, "badge"))}</strong>
        <p>${h(stepText(step, "action"))}</p>
        <small data-guide-node-state aria-live="polite">${h(t("connecting"))}</small>
      </div>
      <p class="guide-tip">${h(t("tip"))}</p>`;
  }

  function renderFinish() {
    const projects = window.SerreProjects?.current?.()?.projects || [];
    const discovery = projects.find((project) => project.kind === "discovery");
    const userProjects = projects.filter((project) => project.kind === "user");
    const disabled = !discovery || !userProjects.length ? "disabled" : "";
    const removalCopy = discovery
      ? userProjects.length
        ? t("removeReady")
        : t("removeBlocked")
      : t("removeDone");
    return `
      <div class="guide-choice-grid">
        <button type="button" data-guide-action="new-project">
          <span aria-hidden="true">＋</span><strong>${h(t("createMine"))}</strong>
          <small>${h(t("createMineDetail"))}</small>
        </button>
        <button type="button" data-guide-action="remove-discovery" ${disabled}>
          <span aria-hidden="true">×</span><strong>${h(t("remove"))}</strong>
          <small>${h(removalCopy)}</small>
        </button>
      </div>`;
  }

  function installedModelCount(status) {
    const models = Array.isArray(status?.models) ? status.models : [];
    return models.filter((model) => model.installed || model.state === "installed").length;
  }

  function renderReadiness() {
    if (!currentStatus) {
      return `<p class="guide-readiness-summary">${h(t("readinessLoading"))}</p>`;
    }
    const models = Array.isArray(currentStatus.models) ? currentStatus.models : [];
    const ready = [
      currentStatus.comfyui,
      currentStatus.profiles_configured,
      currentStatus.models_ready,
      (currentStatus.missing_nodes || []).length === 0,
    ].filter(Boolean).length;
    return `<p class="guide-readiness-summary ${ready === 4 ? "ready" : ""}">
      <span>${h(t("readiness", { ready, installed: installedModelCount(currentStatus), total: models.length }))}</span>
      <button type="button" data-guide-action="settings">${h(t("settings"))}</button>
    </p>`;
  }

  function createDialog() {
    dialog = document.createElement("dialog");
    dialog.id = "getting-started-dialog";
    dialog.className = "getting-started-dialog";
    dialog.setAttribute("aria-labelledby", "getting-started-title");
    dialog.setAttribute("aria-modal", "false");
    dialog.innerHTML = `
      <section class="getting-started-shell">
        <header class="getting-started-heading" data-guide-drag-handle tabindex="0">
          <div class="getting-started-brand">
            <span aria-hidden="true">SV</span>
            <div><strong data-guide-brand></strong><small data-guide-subtitle></small></div>
          </div>
          <div class="getting-started-window-actions">
            <div class="guide-language" role="group">
              <button type="button" data-guide-language="fr">FR</button>
              <button type="button" data-guide-language="en">EN</button>
            </div>
            <button class="getting-started-reset" type="button" data-guide-action="reset-position">◎</button>
            <button class="getting-started-dismiss" type="button" data-guide-action="close">×</button>
          </div>
        </header>
        <div class="getting-started-body">
          <nav class="getting-started-nav"></nav>
          <article class="getting-started-content"></article>
        </div>
        <footer class="getting-started-footer">
          <small data-guide-progress></small>
          <div class="getting-started-controls">
            <button class="button ghost" type="button" data-guide-action="skip"></button>
            <div>
              <button class="button ghost" type="button" data-guide-action="previous"></button>
              <button class="button primary" type="button" data-guide-action="next"></button>
            </div>
          </div>
        </footer>
      </section>
      <span class="guide-sr-only" data-guide-announcement aria-live="polite"></span>`;
    document.body.append(dialog);
    const nav = dialog.querySelector(".getting-started-nav");
    steps.forEach((_step, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.guideStep = String(index);
      const number = document.createElement("span");
      const label = document.createElement("strong");
      number.textContent = String(index + 1).padStart(2, "0");
      button.append(number, label);
      button.addEventListener("click", () => goTo(index));
      nav.append(button);
    });
    const heading = dialog.querySelector("[data-guide-drag-handle]");
    heading.addEventListener("pointerdown", beginDrag);
    heading.addEventListener("pointermove", continueDrag);
    heading.addEventListener("pointerup", endDrag);
    heading.addEventListener("pointercancel", cancelDrag);
    heading.addEventListener("keydown", handlePositionKey);
    heading.addEventListener("dblclick", (event) => {
      if (!event.target.closest("button")) resetPosition();
    });
    dialog.addEventListener("click", (event) => {
      handleAction(event).catch(reportError);
    });
    dialog.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close(true);
      }
    });
    dialog.addEventListener("cancel", (event) => {
      event.preventDefault();
      close(true);
    });
    render();
  }

  function renderChrome() {
    if (!dialog) return;
    dialog.lang = language;
    const heading = dialog.querySelector("[data-guide-drag-handle]");
    heading.setAttribute("aria-label", t("drag"));
    heading.title = t("drag");
    dialog.querySelector("[data-guide-brand]").textContent = t("brand");
    dialog.querySelector("[data-guide-subtitle]").textContent = t("subtitle");
    const nav = dialog.querySelector(".getting-started-nav");
    nav.setAttribute("aria-label", t("nav"));
    dialog.querySelector(".guide-language").setAttribute("aria-label", t("languageGroup"));
    dialog.querySelectorAll("[data-guide-step]").forEach((button, index) => {
      const label = stepText(steps[index], "label");
      button.querySelector("strong").textContent = label;
      button.setAttribute("aria-label", t("navStep", { number: index + 1, label }));
    });
    const reset = dialog.querySelector('[data-guide-action="reset-position"]');
    reset.title = t("reset");
    reset.setAttribute("aria-label", t("reset"));
    const dismiss = dialog.querySelector('[data-guide-action="close"]');
    dismiss.title = t("close");
    dismiss.setAttribute("aria-label", t("close"));
    dialog.querySelector('[data-guide-action="skip"]').textContent = t("skip");
    dialog.querySelector('[data-guide-action="previous"]').textContent = t("previous");
    dialog.querySelectorAll("[data-guide-language]").forEach((button) => {
      const selected = button.dataset.guideLanguage === language;
      button.classList.toggle("selected", selected);
      button.setAttribute("aria-pressed", String(selected));
    });
  }

  function render() {
    if (!dialog) return;
    renderChrome();
    const step = steps[currentStep];
    const content = dialog.querySelector(".getting-started-content");
    const body = step.id === "start"
      ? renderStart()
      : step.id === "finish"
        ? renderFinish()
        : renderContext(step);
    content.innerHTML = `<p class="guide-kicker"></p><h2 id="getting-started-title" tabindex="-1"></h2><p class="guide-lead"></p>${body}`;
    content.querySelector(".guide-kicker").textContent = stepText(step, "kicker");
    content.querySelector("h2").textContent = stepText(step, "title");
    content.querySelector(".guide-lead").textContent = stepText(step, "lead");
    content.scrollTop = 0;
    dialog.querySelectorAll("[data-guide-step]").forEach((button, index) => {
      button.classList.toggle("selected", index === currentStep);
      button.classList.toggle("visited", index <= furthestStep);
      button.setAttribute("aria-current", index === currentStep ? "step" : "false");
    });
    dialog.querySelector("[data-guide-progress]").textContent = t("progress", {
      current: currentStep + 1,
      total: STEP_COUNT,
    });
    const previous = dialog.querySelector('[data-guide-action="previous"]');
    const next = dialog.querySelector('[data-guide-action="next"]');
    previous.disabled = currentStep === 0;
    next.disabled = currentStep === 0;
    next.classList.toggle("hidden", currentStep === 0 || currentStep === STEP_COUNT - 1);
    previous.classList.toggle("hidden", currentStep === 0);
    next.textContent = currentStep === 1
      ? t("openEpisode")
      : currentStep === 2
        ? t("openShot")
        : t("next");
  }

  function setLanguage(value, requestExternal = true) {
    language = normalizeLanguage(value);
    try {
      localStorage.setItem(LANGUAGE_KEY, language);
    } catch (_error) {
      // The in-memory choice still works when persistence is unavailable.
    }
    if (requestExternal) {
      window.SerreI18n?.setLocale?.(language);
      window.dispatchEvent(new CustomEvent("studio:language-change-request", {
        detail: { locale: language, source: "getting-started" },
      }));
    }
    render();
    const expected = document.querySelector(".graph-node.guide-expected");
    if (expected) expected.dataset.guideLabel = t("expected");
    if (contextual && currentStep > 0 && currentStep < STEP_COUNT - 1) {
      activateContextStep().catch(reportError);
    }
  }

  function isMobile() {
    return window.matchMedia(MOBILE_MEDIA).matches;
  }

  function boundsFor(rect) {
    const top = window.innerHeight >= rect.height + DESKTOP_TOP + EDGE_GAP
      ? DESKTOP_TOP
      : EDGE_GAP;
    return {
      left: EDGE_GAP,
      right: Math.max(EDGE_GAP, window.innerWidth - rect.width - EDGE_GAP),
      top,
      bottom: Math.max(top, window.innerHeight - rect.height - EDGE_GAP),
    };
  }

  function clamp(value, minimum, maximum) {
    return Math.min(Math.max(value, minimum), maximum);
  }

  function currentPosition() {
    const rect = dialog.getBoundingClientRect();
    return { x: rect.left, y: rect.top };
  }

  function readPosition() {
    try {
      const value = JSON.parse(localStorage.getItem(POSITION_KEY) || "null");
      if (Number.isFinite(value?.x) && Number.isFinite(value?.y)) return value;
    } catch (_error) {
      // Invalid storage falls back to the right edge.
    }
    return null;
  }

  function savePosition(position, dock = "free") {
    try {
      localStorage.setItem(POSITION_KEY, JSON.stringify({ ...position, dock }));
    } catch (_error) {
      // Position persistence is optional when storage is unavailable.
    }
  }

  function applyPosition(position, { persist = false, dock = "free" } = {}) {
    if (!dialog || isMobile()) {
      dialog?.classList.remove("positioned", "dragging");
      if (dialog) {
        dialog.style.removeProperty("left");
        dialog.style.removeProperty("top");
      }
      return null;
    }
    const bounds = boundsFor(dialog.getBoundingClientRect());
    const next = {
      x: clamp(position.x, bounds.left, bounds.right),
      y: clamp(position.y, bounds.top, bounds.bottom),
    };
    dialog.style.left = `${Math.round(next.x)}px`;
    dialog.style.top = `${Math.round(next.y)}px`;
    dialog.classList.add("positioned");
    dialog.dataset.dock = dock;
    if (persist) savePosition(next, dock);
    return next;
  }

  function defaultPosition() {
    const bounds = boundsFor(dialog.getBoundingClientRect());
    return { x: bounds.right, y: bounds.top };
  }

  function centerPosition() {
    const rect = dialog.getBoundingClientRect();
    const bounds = boundsFor(rect);
    return {
      x: clamp((window.innerWidth - rect.width) / 2, bounds.left, bounds.right),
      y: clamp((window.innerHeight - rect.height) / 2, bounds.top, bounds.bottom),
    };
  }

  function snapToEdge(position) {
    const bounds = boundsFor(dialog.getBoundingClientRect());
    const candidates = [
      { edge: "left", distance: Math.abs(position.x - bounds.left) },
      { edge: "right", distance: Math.abs(position.x - bounds.right) },
      { edge: "top", distance: Math.abs(position.y - bounds.top) },
      { edge: "bottom", distance: Math.abs(position.y - bounds.bottom) },
    ];
    const nearest = candidates.sort((a, b) => a.distance - b.distance)[0];
    const next = { ...position };
    if (nearest.edge === "left") next.x = bounds.left;
    if (nearest.edge === "right") next.x = bounds.right;
    if (nearest.edge === "top") next.y = bounds.top;
    if (nearest.edge === "bottom") next.y = bounds.bottom;
    return { position: next, edge: nearest.edge };
  }

  function placeDialog() {
    if (!dialog?.open) return;
    if (isMobile()) {
      applyPosition({ x: 0, y: 0 });
      return;
    }
    const saved = readPosition();
    applyPosition(saved || defaultPosition(), { dock: saved?.dock || "right" });
  }

  function announce(message) {
    const region = dialog?.querySelector("[data-guide-announcement]");
    if (!region) return;
    region.textContent = "";
    window.setTimeout(() => { region.textContent = message; }, 0);
  }

  function resetPosition() {
    if (!dialog || isMobile()) return;
    const next = applyPosition(centerPosition(), { persist: true, dock: "center" });
    if (next) announce(t("centered"));
  }

  function beginDrag(event) {
    if (isMobile() || event.button !== 0 || event.target.closest("button")) return;
    const position = currentPosition();
    drag = {
      pointerId: event.pointerId,
      originX: event.clientX,
      originY: event.clientY,
      x: position.x,
      y: position.y,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    dialog.classList.add("dragging");
    event.preventDefault();
  }

  function continueDrag(event) {
    if (!drag || event.pointerId !== drag.pointerId) return;
    applyPosition({
      x: drag.x + event.clientX - drag.originX,
      y: drag.y + event.clientY - drag.originY,
    });
  }

  function finishDrag(event, snap) {
    if (!drag || event.pointerId !== drag.pointerId) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    dialog.classList.remove("dragging");
    const position = currentPosition();
    drag = null;
    if (!snap) return;
    const snapped = snapToEdge(position);
    applyPosition(snapped.position, { persist: true, dock: snapped.edge });
    announce(t("docked", { edge: t(snapped.edge) }));
  }

  function endDrag(event) {
    finishDrag(event, true);
  }

  function cancelDrag(event) {
    finishDrag(event, false);
  }

  function handlePositionKey(event) {
    if (event.target !== event.currentTarget || isMobile()) return;
    if (event.key === "Home") {
      event.preventDefault();
      resetPosition();
      return;
    }
    if (event.key === "End") {
      event.preventDefault();
      applyPosition(defaultPosition(), { persist: true, dock: "right" });
      announce(t("docked", { edge: t("right") }));
      return;
    }
    const directions = {
      ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1],
    };
    const direction = directions[event.key];
    if (!direction) return;
    event.preventDefault();
    const distance = event.shiftKey ? 64 : 20;
    const current = currentPosition();
    applyPosition({
      x: current.x + direction[0] * distance,
      y: current.y + direction[1] * distance,
    }, { persist: true, dock: "free" });
  }

  function goTo(step) {
    currentStep = Math.max(0, Math.min(STEP_COUNT - 1, Number(step) || 0));
    furthestStep = Math.max(furthestStep, currentStep);
    render();
    activateContextStep().catch(reportError);
  }

  function clearExpectedNode() {
    document.querySelectorAll(".graph-node.guide-expected").forEach((node) => {
      node.classList.remove("guide-expected");
      delete node.dataset.guideLabel;
    });
    tour.expectedNodeId = null;
  }

  function firstContainer(graph, scope) {
    return graph?.nodes?.find((node) => node.container?.scope === scope) || null;
  }

  async function resolveEpisodeId() {
    if (tour.episodeId) return tour.episodeId;
    const series = await window.SerreGraph.load("series", "series");
    const episode = firstContainer(series, "episode");
    tour.episodeId = episode?.container?.id || null;
    return tour.episodeId;
  }

  async function resolveShotId() {
    if (tour.shotId) return tour.shotId;
    const episodeId = await resolveEpisodeId();
    if (!episodeId) return null;
    const episode = await window.SerreGraph.load("episode", episodeId);
    const shot = firstContainer(episode, "shot");
    tour.shotId = shot?.container?.id || null;
    return tour.shotId;
  }

  async function activateContextStep() {
    const revision = ++activationRevision;
    clearExpectedNode();
    if (!contextual || currentStep === 0 || currentStep === STEP_COUNT - 1) return;
    window.SerreWorkspace?.show("graph");
    let graph = null;
    let expected = null;
    if (currentStep === 1) {
      graph = await window.SerreGraph?.load("series", "series");
      expected = firstContainer(graph, "episode");
      tour.episodeId = expected?.container?.id || tour.episodeId;
    } else if (currentStep === 2) {
      const episodeId = await resolveEpisodeId();
      if (!episodeId) return;
      graph = await window.SerreGraph?.load("episode", episodeId);
      expected = firstContainer(graph, "shot");
      tour.shotId = expected?.container?.id || tour.shotId;
    } else {
      const shotId = await resolveShotId();
      if (!shotId) return;
      graph = await window.SerreGraph?.load("shot", shotId);
      const expectedIds = {
        3: "story",
        4: "director",
        5: "shot",
        6: "keyframe",
        7: "motion",
      };
      expected = graph?.nodes?.find((node) => node.id === expectedIds[currentStep]);
    }
    if (revision !== activationRevision || !expected) return;
    tour.expectedNodeId = expected.id;
    const node = Array.from(document.querySelectorAll(".graph-node"))
      .find((item) => item.dataset.nodeId === expected.id);
    if (node) {
      node.classList.add("guide-expected");
      node.dataset.guideLabel = t("expected");
    }
    window.SerreGraph?.selectNode(expected.id);
    const status = dialog?.querySelector("[data-guide-node-state]");
    if (status) {
      const progress = expected.progress ? ` · ${expected.progress.percent}%` : "";
      status.textContent = t("nodeStatus", {
        status: expected.status || expected.state,
        progress,
      });
    }
  }

  async function requestStatus() {
    if (currentStatus || !window.SerreStudio?.api) return;
    try {
      currentStatus = await window.SerreStudio.api("/api/status");
    } catch (_error) {
      currentStatus = {
        comfyui: false,
        profiles_configured: false,
        models_ready: false,
        missing_nodes: ["unavailable"],
        models: [],
      };
    }
    if (dialog?.open && currentStep === 0) render();
  }

  function markSeen() {
    try {
      localStorage.setItem(STORAGE_KEY, "seen");
    } catch (_error) {
      // Storage may be disabled in hardened desktop contexts.
    }
  }

  function setContextual(active) {
    contextual = active;
    if (!dialog) return;
    dialog.classList.toggle("contextual", active);
    ensureOpen();
  }

  function ensureOpen() {
    if (!dialog.open) dialog.show();
    document.documentElement.classList.add("getting-started-open");
    window.requestAnimationFrame(placeDialog);
  }

  async function startDiscovery() {
    await window.SerreProjects?.ready;
    const state = window.SerreProjects?.current?.() || { projects: [] };
    const discovery = state.projects.find((project) => project.kind === "discovery");
    if (discovery && discovery.id !== state.active_id) {
      await window.SerreProjects.activate(discovery.id);
    }
    tour.episodeId = null;
    tour.shotId = null;
    setContextual(true);
    goTo(1);
  }

  function startNewProject() {
    pendingNewProject = true;
    markSeen();
    clearExpectedNode();
    if (dialog?.open) dialog.close();
    document.documentElement.classList.remove("getting-started-open");
    window.SerreProjects?.openCreate({ cloneContent: false });
  }

  async function removeDiscovery() {
    const state = window.SerreProjects?.current?.() || { projects: [] };
    const discovery = state.projects.find((project) => project.kind === "discovery");
    if (!discovery) return;
    if (discovery.id === state.active_id) {
      const userProject = state.projects.find((project) => project.kind === "user");
      if (!userProject) return;
      await window.SerreProjects.activate(userProject.id);
    }
    await window.SerreProjects.deleteDiscovery(discovery.id);
    render();
  }

  async function advance() {
    const origin = currentStep;
    if ([1, 2].includes(origin) && tour.expectedNodeId) {
      const definition = window.SerreGraph?.current?.()?.nodes
        ?.find((node) => node.id === tour.expectedNodeId);
      if (definition?.container) {
        await window.SerreGraph.navigate(definition.container);
      }
    }
    if (currentStep === origin) goTo(origin + 1);
  }

  async function handleAction(event) {
    const languageButton = event.target.closest("[data-guide-language]");
    if (languageButton) {
      setLanguage(languageButton.dataset.guideLanguage);
      return;
    }
    const action = event.target.closest("[data-guide-action]")?.dataset.guideAction;
    if (!action) return;
    if (action === "close" || action === "skip") close(true);
    if (action === "reset-position") resetPosition();
    if (action === "previous") goTo(currentStep - 1);
    if (action === "next") await advance();
    if (action === "discover") await startDiscovery();
    if (action === "express-demo") {
      close(true);
      window.dispatchEvent(new CustomEvent("studio:open-demo"));
    }
    if (action === "new-project") startNewProject();
    if (action === "remove-discovery") await removeDiscovery();
    if (action === "settings") {
      close(true);
      window.SerreWorkspace?.show("settings");
    }
  }

  function open(options = {}) {
    if (!dialog) createDialog();
    if (!dialog.open && document.activeElement instanceof HTMLElement) {
      lastFocused = document.activeElement;
    }
    const requestedStep = Number.isInteger(options.step) ? options.step : 0;
    if (options.reset !== false) currentStep = requestedStep;
    contextual = currentStep > 0;
    dialog.classList.toggle("contextual", contextual);
    ensureOpen();
    goTo(currentStep);
    requestStatus();
    window.requestAnimationFrame(() => {
      dialog.querySelector("#getting-started-title")?.focus({ preventScroll: true });
    });
  }

  function close(remember = true) {
    activationRevision += 1;
    clearExpectedNode();
    contextual = false;
    drag = null;
    if (remember) markSeen();
    if (dialog?.open) dialog.close();
    document.documentElement.classList.remove("getting-started-open");
    const returnTarget = lastFocused?.isConnected && lastFocused.getClientRects().length
      ? lastFocused
      : document.querySelector("#studio-tools-menu-toggle");
    returnTarget?.focus({ preventScroll: true });
  }

  function shouldAutoOpen() {
    try {
      if (new URLSearchParams(window.location.search).has("view")) return false;
      return localStorage.getItem(STORAGE_KEY) !== "seen";
    } catch (_error) {
      return false;
    }
  }

  function reportError(error) {
    window.SerreStudio?.notify?.(error.message || String(error), true);
  }

  function handleGlobalKey(event) {
    if (event.key !== "Escape" || !dialog?.open || event.defaultPrevented) return;
    event.preventDefault();
    close(true);
  }

  function init() {
    createDialog();
    document.querySelector("#getting-started-open")?.addEventListener("click", () => open());
    window.addEventListener("studio:status", (event) => {
      currentStatus = event.detail;
      if (dialog.open && currentStep === 0) render();
    });
    window.addEventListener("studio:graph-context", (event) => {
      if (!contextual) return;
      const scope = event.detail?.scope;
      if (currentStep === 1 && scope === "episode") goTo(2);
      if (currentStep === 2 && scope === "shot") goTo(3);
    });
    window.addEventListener("studio:project-changed", () => {
      tour.episodeId = null;
      tour.shotId = null;
      if (!pendingNewProject) return;
      pendingNewProject = false;
      setContextual(true);
      goTo(STEP_COUNT - 1);
    });
    ["studio:language-changed", "serre:i18n-changed"].forEach((eventName) => {
      window.addEventListener(eventName, (event) => {
        const locale = event.detail?.locale || event.detail?.language;
        if (locale) setLanguage(locale, false);
      });
    });
    window.addEventListener("resize", () => {
      window.cancelAnimationFrame(resizeFrame);
      resizeFrame = window.requestAnimationFrame(placeDialog);
    });
    window.addEventListener("keydown", handleGlobalKey);
    if (shouldAutoOpen()) window.setTimeout(() => open(), 250);
  }

  window.SerreGettingStarted = {
    open,
    close,
    goTo,
    startDiscovery,
    resetPosition,
    setLanguage,
  };
  document.addEventListener("DOMContentLoaded", init);
})();
