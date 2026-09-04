(() => {
  const STORAGE_KEY = "serre-studio-getting-started-v0.2.4";
  const STEP_COUNT = 5;
  let dialog = null;
  let currentStep = 0;
  let furthestStep = 0;
  let currentStatus = null;

  const steps = [
    {
      label: "Bienvenue",
      kicker: "BIENVENUE DANS LE STUDIO",
      title: "Fabrique un épisode, plan par plan.",
      lead: "La Serre des Venins garde le récit, les images, les voix, le mouvement et le montage dans une seule chaîne de production locale. Tu peux générer chaque étape ou importer ton propre média.",
      body: () => `
        <div class="guide-card-grid">
          <article class="guide-card"><span>01</span><strong>Choisis ton plan</strong><small>Le scénario, les dialogues et les intentions restent visibles pendant toute la production.</small></article>
          <article class="guide-card"><span>02</span><strong>Crée trois poses</strong><small>Début, milieu et fin donnent une trajectoire claire au modèle vidéo.</small></article>
          <article class="guide-card"><span>03</span><strong>Assemble l’épisode</strong><small>Voix, musique, sous-titres et clips rejoignent le master final.</small></article>
        </div>
        <p class="guide-tip">Tout reste remplaçable : les boutons <strong>Générer</strong> utilisent les moteurs locaux, tandis que <strong>Importer</strong> accepte un média créé ailleurs.</p>`,
    },
    {
      label: "Préparer",
      kicker: "DIAGNOSTIC EN DIRECT",
      title: "Vérifie ton atelier local.",
      lead: "Le Studio contrôle les quatre prérequis nécessaires avant une génération. Les indicateurs ci-dessous se mettent à jour avec l’état réel de ComfyUI.",
      body: renderReadiness,
    },
    {
      label: "Créer un plan",
      kicker: "IMAGES → MOUVEMENT",
      title: "Donne une vraie action à la scène.",
      lead: "Chaque plan suit un chemin lisible. Les trois images d’action servent de repères au mouvement et évitent les clips statiques ou incohérents.",
      body: () => `
        <ol class="guide-sequence">
          <li><span>01</span><div><strong>Sélectionne un plan</strong><small>Choisis-le dans la piste au-dessus du graphe. Son action, sa caméra et ses dialogues apparaissent dans Sorties.</small></div></li>
          <li><span>02</span><div><strong>Génère les 3 poses</strong><small>Le début installe la scène, le milieu porte l’action, la fin prépare le raccord suivant.</small></div></li>
          <li><span>03</span><div><strong>Contrôle et relance si besoin</strong><small>Parcours les images dans Sorties. L’historique conserve les anciennes générations.</small></div></li>
          <li><span>04</span><div><strong>Génère le mouvement</strong><small>Le workflow vidéo reçoit les poses et les intentions de caméra du plan.</small></div></li>
        </ol>
        <p class="guide-tip">Survole une flèche du graphe pour voir exactement quelles données passent d’un nœud au suivant.</p>`,
    },
    {
      label: "Son & montage",
      kicker: "INTERPRÉTATION → ÉPISODE",
      title: "Fais entendre la scène.",
      lead: "Les dialogues portent une intention de jeu. Le fond musical et les sous-titres complètent ensuite chaque clip avant l’assemblage de l’épisode.",
      body: () => `
        <ol class="guide-sequence">
          <li><span>A</span><div><strong>Voix</strong><small>Ouvre le nœud Voix & son puis lance la voix du plan. Le texte et l’intention guident l’interprétation.</small></div></li>
          <li><span>B</span><div><strong>Musique et ambiance</strong><small>Génère ou importe le fond sonore sans couvrir les dialogues.</small></div></li>
          <li><span>C</span><div><strong>Sous-titres</strong><small>Ils sont produits à partir des répliques de la scène et synchronisés avec le montage.</small></div></li>
          <li><span>D</span><div><strong>Master final</strong><small>Le montage réunit les clips approuvés, le mixage et les sous-titres au format vertical.</small></div></li>
        </ol>`,
    },
    {
      label: "Se repérer",
      kicker: "TOUT RESTE VISIBLE",
      title: "Pilote le Studio sans perdre le fil.",
      lead: "L’interface est organisée comme un atelier : le graphe explique les dépendances, les panneaux montrent les médias et le journal raconte ce que les moteurs exécutent.",
      body: () => `
        <div class="guide-card-grid">
          <article class="guide-card"><span>⌁</span><strong>Graphe de production</strong><small>Déplace et zoome le canvas. Clique un nœud pour générer l’étape correspondante.</small></article>
          <article class="guide-card"><span>◫</span><strong>Panneaux déplaçables</strong><small>Le sous-workflow et le suivi d’activité se déplacent et se ferment comme des fenêtres.</small></article>
          <article class="guide-card"><span>↺</span><strong>Sorties & historique</strong><small>Compare les frames, lis la scène courante et restaure une génération précédente.</small></article>
        </div>
        <p class="guide-tip">La barre d’activité en bas suit l’opération en cours. Ouvre son journal pour voir les étapes détaillées et les erreurs sans quitter le plan.</p>`,
    },
  ];

  function installedModelCount(status) {
    const models = Array.isArray(status?.models) ? status.models : [];
    return models.filter((model) => model.installed || model.state === "installed").length;
  }

  function renderReadiness() {
    if (!currentStatus) {
      return `<div class="guide-readiness" aria-live="polite"><article><i></i><div><strong>Lecture de la configuration…</strong><small>Le Studio interroge ses services locaux.</small></div><em>En cours</em></article></div>`;
    }
    const models = Array.isArray(currentStatus.models) ? currentStatus.models : [];
    const installed = installedModelCount(currentStatus);
    const missingNodes = Array.isArray(currentStatus.missing_nodes) ? currentStatus.missing_nodes : [];
    const checks = [
      [Boolean(currentStatus.comfyui), "ComfyUI", currentStatus.comfyui ? "Le moteur répond." : "Démarre ComfyUI puis vérifie son adresse."],
      [Boolean(currentStatus.profiles_configured), "Workflows", currentStatus.profiles_configured ? "Les profils image et vidéo sont installés." : "Crée les workflows depuis Réglages."],
      [Boolean(currentStatus.models_ready), "Modèles", models.length ? `${installed} modèle(s) installé(s) sur ${models.length}.` : "Aucun manifeste de modèle détecté."],
      [missingNodes.length === 0, "Nœuds requis", missingNodes.length ? `Manquants : ${missingNodes.join(", ")}` : "Tous les nœuds nécessaires sont disponibles."],
    ];
    const rows = checks.map(([ready, label, detail]) => {
      const article = document.createElement("article");
      article.classList.toggle("ready", ready);
      const indicator = document.createElement("i");
      const copy = document.createElement("div");
      const strong = document.createElement("strong");
      const small = document.createElement("small");
      const state = document.createElement("em");
      strong.textContent = label;
      small.textContent = detail;
      state.textContent = ready ? "Prêt" : "À vérifier";
      copy.append(strong, small);
      article.append(indicator, copy, state);
      return article.outerHTML;
    });
    return `<div class="guide-readiness" aria-live="polite">${rows.join("")}</div><button class="button secondary guide-inline-action" type="button" data-guide-action="settings">Ouvrir les réglages</button>`;
  }

  function createDialog() {
    dialog = document.createElement("dialog");
    dialog.id = "getting-started-dialog";
    dialog.className = "getting-started-dialog";
    dialog.setAttribute("aria-labelledby", "getting-started-title");
    dialog.innerHTML = `
      <section class="getting-started-shell">
        <header class="getting-started-heading">
          <div class="getting-started-brand"><span>SV</span><div><strong>Bien démarrer</strong><small>LA SERRE DES VENINS · STUDIO 0.2.4</small></div></div>
          <button class="getting-started-dismiss" type="button" data-guide-action="close" aria-label="Fermer le guide">×</button>
        </header>
        <div class="getting-started-body">
          <nav class="getting-started-nav" aria-label="Étapes du guide"></nav>
          <article class="getting-started-content"></article>
        </div>
        <footer class="getting-started-footer">
          <small data-guide-progress>1 / ${STEP_COUNT}</small>
          <div class="getting-started-controls">
            <button class="button ghost" type="button" data-guide-action="skip">Passer le guide</button>
            <div><button class="button ghost" type="button" data-guide-action="previous">Précédent</button><button class="button primary" type="button" data-guide-action="next">Suivant</button></div>
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

    dialog.addEventListener("click", handleAction);
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
    dialog.querySelector("[data-guide-progress]").textContent = `${currentStep + 1} / ${STEP_COUNT}`;
    const previous = dialog.querySelector('[data-guide-action="previous"]');
    const next = dialog.querySelector('[data-guide-action="next"]');
    previous.disabled = currentStep === 0;
    next.textContent = currentStep === STEP_COUNT - 1 ? "Ouvrir la production" : "Suivant";
    next.dataset.guideAction = currentStep === STEP_COUNT - 1 ? "finish" : "next";
  }

  function goTo(step) {
    currentStep = Math.max(0, Math.min(STEP_COUNT - 1, Number(step) || 0));
    furthestStep = Math.max(furthestStep, currentStep);
    render();
  }

  async function requestStatus() {
    if (currentStatus || !window.SerreStudio?.api) return;
    try {
      currentStatus = await window.SerreStudio.api("/api/status");
      if (currentStep === 1) render();
    } catch (_error) {
      currentStatus = {
        comfyui: false,
        profiles_configured: false,
        models_ready: false,
        missing_nodes: ["Diagnostic indisponible"],
        models: [],
      };
      if (currentStep === 1) render();
    }
  }

  function markSeen() {
    try { localStorage.setItem(STORAGE_KEY, "seen"); } catch (_error) { /* no-op */ }
  }

  function open(options = {}) {
    if (!dialog) createDialog();
    if (options.reset !== false) goTo(0);
    if (!dialog.open) dialog.showModal();
    requestStatus();
  }

  function close(remember = true) {
    if (remember) markSeen();
    if (dialog?.open) dialog.close();
  }

  function handleAction(event) {
    const action = event.target.closest("[data-guide-action]")?.dataset.guideAction;
    if (!action) return;
    if (action === "close" || action === "skip") close(true);
    if (action === "previous") goTo(currentStep - 1);
    if (action === "next") goTo(currentStep + 1);
    if (action === "settings") {
      close(true);
      window.SerreWorkspace?.show("settings");
    }
    if (action === "finish") {
      close(true);
      window.SerreWorkspace?.show("graph");
    }
  }

  function shouldAutoOpen() {
    try {
      if (new URLSearchParams(window.location.search).has("view")) return false;
      return localStorage.getItem(STORAGE_KEY) !== "seen";
    } catch (_error) {
      return false;
    }
  }

  function init() {
    createDialog();
    document.querySelector("#getting-started-open")?.addEventListener("click", () => open());
    window.addEventListener("studio:status", (event) => {
      currentStatus = event.detail;
      if (dialog.open && currentStep === 1) render();
    });
    if (shouldAutoOpen()) window.setTimeout(() => open(), 250);
  }

  window.SerreGettingStarted = { open, close, goTo };
  document.addEventListener("DOMContentLoaded", init);
})();
