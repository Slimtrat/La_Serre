(() => {
  const STORAGE_KEY = "serre-studio-getting-started-v0.2.7";
  const STEP_COUNT = 9;
  let dialog = null;
  let currentStep = 0;
  let furthestStep = 0;
  let currentStatus = null;
  let contextual = false;
  let pendingNewProject = false;
  let activationRevision = 0;
  const tour = { episodeId: null, shotId: null, expectedNodeId: null };

  const steps = [
    {
      label: "Commencer",
      kicker: "CHOISIS TON POINT DE DÉPART",
      title: "Une histoire prête à explorer, ou la tienne.",
      lead: "Découverte ouvre immédiatement Belladone, Aconit et leur premier épisode. Nouveau projet crée un espace vierge et isolé, sans recopier le scénario de démonstration.",
      body: () => `
        <div class="guide-choice-grid">
          <button type="button" data-guide-action="discover">
            <span>✦</span><strong>Découvrir le Studio</strong>
            <small>Parcourir la vraie Série de démonstration, puis produire son premier plan.</small>
          </button>
          <button type="button" data-guide-action="new-project">
            <span>＋</span><strong>Nouveau projet</strong>
            <small>Partir d’un catalogue vierge, dans un dossier entièrement séparé.</small>
          </button>
        </div>
        ${renderReadiness()}`,
    },
    {
      label: "Série",
      kicker: "SCOPE SÉRIE",
      title: "Entre dans l’univers.",
      lead: "Le graphe montre les épisodes dans leur ordre narratif. Le conteneur bleu qui pulse est la porte d’entrée de la démonstration.",
      body: () => contextualBody(
        "Double-clique le conteneur Épisode, ou utilise Suivant. Le même moteur de graphe va descendre d’un niveau sans changer d’outil.",
        "ÉPISODE ATTENDU",
      ),
    },
    {
      label: "Épisode",
      kicker: "SCOPE ÉPISODE",
      title: "Lis la progression plan par plan.",
      lead: "Chaque plan est un conteneur ouvrable. Sa barre indique ce qui a déjà été produit ; la branche orange porte la bande-son optionnelle.",
      body: () => contextualBody(
        "Ouvre le premier plan mis en évidence pour retrouver son histoire, son Director, ses trois poses et son clip.",
        "PREMIER PLAN",
      ),
    },
    {
      label: "Histoire",
      kicker: "SCOPE PLAN · SOURCE",
      title: "Garde l’histoire ou fais-la dévier.",
      lead: "Le nœud Histoire contient la matière narrative du plan. Son action ouvre directement le texte courant dans l’atelier.",
      body: () => contextualBody(
        "Tu peux modifier le texte, ou conserver celui de la démonstration. Rien n’est généré automatiquement pendant cette visite.",
        "HISTOIRE",
      ),
    },
    {
      label: "Director",
      kicker: "SCOPE PLAN · MISE EN SCÈNE",
      title: "Transforme l’intention en découpage.",
      lead: "Le Director structure la caméra, l’action, les personnages et le jeu. Clique son action dans l’inspecteur quand tu veux proposer un nouveau Shot.",
      body: () => contextualBody(
        "La flèche bleue explique le passage obligatoire Histoire → Director → Shot JSON.",
        "DIRECTOR",
      ),
    },
    {
      label: "Contrat",
      kicker: "SCOPE PLAN · VALIDATION",
      title: "Le Shot JSON verrouille la cohérence.",
      lead: "Ce contrat reproductible relie le scénario aux moteurs image, voix et vidéo. Tu peux le relire et le valider avant de dépenser du calcul.",
      body: () => contextualBody(
        "Une modification de ce contrat peut rendre les sorties suivantes périmées, sans relancer automatiquement leur génération.",
        "SHOT JSON",
      ),
    },
    {
      label: "Poses",
      kicker: "SCOPE PLAN · TROIS IMAGES",
      title: "Cadre le début, le milieu et la fin.",
      lead: "Le nœud Keyframes produit ou importe trois poses. Elles donnent au modèle vidéo une trajectoire d’action claire.",
      body: () => contextualBody(
        "Utilise « Générer les poses » ou « Importer une image » dans l’inspecteur. La progression du nœud suit les fichiers réellement présents.",
        "KEYFRAMES",
      ),
    },
    {
      label: "Clip",
      kicker: "SCOPE PLAN · MOUVEMENT",
      title: "Anime seulement après validation.",
      lead: "Le nœud Mouvement reçoit les poses approuvées et les intentions caméra. Son edge actif montre la propagation en cours.",
      body: () => contextualBody(
        "Lance « Animer les poses » ou importe ton clip. Voix, musique et montage restent accessibles comme étapes indépendantes.",
        "MOUVEMENT",
      ),
    },
    {
      label: "À toi",
      kicker: "TON PROPRE UNIVERS",
      title: "La démonstration n’est jamais une prison.",
      lead: "Crée maintenant ton projet vierge. Une fois ton projet créé, tu peux retirer Découverte du sélecteur : aucun fichier ni projet utilisateur ne sera touché.",
      body: renderFinish,
    },
  ];

  function contextualBody(copy, badge) {
    return `
      <div class="guide-context-card">
        <span class="guide-context-badge">${badge}</span>
        <p>${copy}</p>
        <small data-guide-node-state>Connexion au graphe…</small>
      </div>
      <p class="guide-tip">Le halo bleu désigne l’objet attendu. La fenêtre reste ouverte pendant que tu zoomes, sélectionnes ou ouvres les nœuds.</p>`;
  }

  function renderFinish() {
    const projects = window.SerreProjects?.current?.()?.projects || [];
    const discovery = projects.find((project) => project.kind === "discovery");
    const userProjects = projects.filter((project) => project.kind === "user");
    const disabled = !discovery || !userProjects.length ? "disabled" : "";
    const removalCopy = discovery
      ? userProjects.length
        ? "Retire seulement le raccourci de démonstration."
        : "Crée d’abord ton projet pour conserver un espace actif."
      : "Découverte a déjà été retiré.";
    return `
      <div class="guide-choice-grid">
        <button type="button" data-guide-action="new-project">
          <span>＋</span><strong>Créer mon projet</strong>
          <small>Catalogue vierge, sorties isolées, aucun média de démonstration recopié.</small>
        </button>
        <button type="button" data-guide-action="remove-discovery" ${disabled}>
          <span>×</span><strong>Retirer Découverte</strong>
          <small>${removalCopy}</small>
        </button>
      </div>`;
  }

  function installedModelCount(status) {
    const models = Array.isArray(status?.models) ? status.models : [];
    return models.filter((model) => model.installed || model.state === "installed").length;
  }

  function renderReadiness() {
    if (!currentStatus) {
      return '<p class="guide-readiness-summary">Diagnostic local en cours…</p>';
    }
    const models = Array.isArray(currentStatus.models) ? currentStatus.models : [];
    const ready = [
      currentStatus.comfyui,
      currentStatus.profiles_configured,
      currentStatus.models_ready,
      (currentStatus.missing_nodes || []).length === 0,
    ].filter(Boolean).length;
    return `<p class="guide-readiness-summary ${ready === 4 ? "ready" : ""}">
      Atelier local : ${ready} / 4 prérequis prêts · ${installedModelCount(currentStatus)} / ${models.length} modèles
      <button type="button" data-guide-action="settings">Vérifier</button>
    </p>`;
  }

  function createDialog() {
    dialog = document.createElement("dialog");
    dialog.id = "getting-started-dialog";
    dialog.className = "getting-started-dialog";
    dialog.setAttribute("aria-labelledby", "getting-started-title");
    dialog.innerHTML = `
      <section class="getting-started-shell">
        <header class="getting-started-heading">
          <div class="getting-started-brand"><span>SV</span><div><strong>Bien démarrer</strong><small>PARCOURS SUR LE GRAPHE · STUDIO 0.2.7</small></div></div>
          <button class="getting-started-dismiss" type="button" data-guide-action="close" aria-label="Fermer le guide">×</button>
        </header>
        <div class="getting-started-body">
          <nav class="getting-started-nav" aria-label="Étapes du guide"></nav>
          <article class="getting-started-content"></article>
        </div>
        <footer class="getting-started-footer">
          <small data-guide-progress>1 / ${STEP_COUNT}</small>
          <div class="getting-started-controls">
            <button class="button ghost" type="button" data-guide-action="skip">Quitter le parcours</button>
            <div>
              <button class="button ghost" type="button" data-guide-action="previous">Précédent</button>
              <button class="button primary" type="button" data-guide-action="next">Suivant</button>
            </div>
          </div>
        </footer>
      </section>`;
    document.body.append(dialog);
    const nav = dialog.querySelector(".getting-started-nav");
    steps.forEach((step, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.guideStep = String(index);
      const number = document.createElement("span");
      const label = document.createElement("strong");
      number.textContent = String(index + 1).padStart(2, "0");
      label.textContent = step.label;
      button.append(number, label);
      button.addEventListener("click", () => goTo(index));
      nav.append(button);
    });
    dialog.addEventListener("click", (event) => {
      handleAction(event).catch(reportError);
    });
    dialog.addEventListener("cancel", (event) => {
      event.preventDefault();
      close(true);
    });
    render();
  }

  function render() {
    if (!dialog) return;
    const step = steps[currentStep];
    const content = dialog.querySelector(".getting-started-content");
    content.innerHTML = `<p class="guide-kicker"></p><h2 id="getting-started-title"></h2><p class="guide-lead"></p>${step.body()}`;
    content.querySelector(".guide-kicker").textContent = step.kicker;
    content.querySelector("h2").textContent = step.title;
    content.querySelector(".guide-lead").textContent = step.lead;
    content.scrollTop = 0;
    dialog.querySelectorAll("[data-guide-step]").forEach((button, index) => {
      button.classList.toggle("selected", index === currentStep);
      button.classList.toggle("visited", index <= furthestStep);
      button.setAttribute("aria-current", index === currentStep ? "step" : "false");
    });
    dialog.querySelector("[data-guide-progress]").textContent =
      `${currentStep + 1} / ${STEP_COUNT}`;
    const previous = dialog.querySelector('[data-guide-action="previous"]');
    const next = dialog.querySelector('[data-guide-action="next"]');
    previous.disabled = currentStep === 0;
    next.disabled = currentStep === 0;
    next.classList.toggle("hidden", currentStep === 0 || currentStep === STEP_COUNT - 1);
    previous.classList.toggle("hidden", currentStep === 0);
    if (currentStep > 0 && currentStep < STEP_COUNT - 1) {
      next.textContent = currentStep === 1
        ? "Ouvrir l’épisode"
        : currentStep === 2
          ? "Ouvrir le plan"
          : "Suivant";
    }
  }

  function goTo(step) {
    currentStep = Math.max(0, Math.min(STEP_COUNT - 1, Number(step) || 0));
    furthestStep = Math.max(furthestStep, currentStep);
    render();
    activateContextStep().catch(reportError);
  }

  function clearExpectedNode() {
    document.querySelectorAll(".graph-node.guide-expected")
      .forEach((node) => node.classList.remove("guide-expected"));
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
    node?.classList.add("guide-expected");
    window.SerreGraph?.selectNode(expected.id);
    const status = dialog?.querySelector("[data-guide-node-state]");
    if (status) {
      const progress = expected.progress ? ` · ${expected.progress.percent} %` : "";
      status.textContent = `${expected.status || expected.state}${progress}`;
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
        missing_nodes: ["Diagnostic indisponible"],
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
    if (dialog.open) dialog.close();
    dialog.classList.toggle("contextual", active);
    if (active) dialog.show();
    else dialog.showModal();
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
    const action = event.target.closest("[data-guide-action]")?.dataset.guideAction;
    if (!action) return;
    if (action === "close" || action === "skip") close(true);
    if (action === "previous") goTo(currentStep - 1);
    if (action === "next") await advance();
    if (action === "discover") await startDiscovery();
    if (action === "new-project") startNewProject();
    if (action === "remove-discovery") await removeDiscovery();
    if (action === "settings") {
      close(true);
      window.SerreWorkspace?.show("settings");
    }
  }

  function open(options = {}) {
    if (!dialog) createDialog();
    const requestedStep = Number.isInteger(options.step) ? options.step : 0;
    if (options.reset !== false) currentStep = requestedStep;
    if (currentStep > 0) {
      setContextual(true);
      goTo(currentStep);
    } else {
      contextual = false;
      dialog.classList.remove("contextual");
      if (!dialog.open) dialog.showModal();
      goTo(0);
    }
    requestStatus();
  }

  function close(remember = true) {
    activationRevision += 1;
    clearExpectedNode();
    contextual = false;
    if (remember) markSeen();
    if (dialog?.open) dialog.close();
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
    if (shouldAutoOpen()) window.setTimeout(() => open(), 250);
  }

  window.SerreGettingStarted = {
    open,
    close,
    goTo,
    startDiscovery,
  };
  document.addEventListener("DOMContentLoaded", init);
})();
