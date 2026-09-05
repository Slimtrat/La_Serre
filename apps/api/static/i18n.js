(function serreI18nBootstrap() {
  "use strict";

  const STORAGE_KEY = "serre-studio-language";
  const DEFAULT_LANGUAGE = "fr";
  const SUPPORTED_LANGUAGES = Object.freeze(["fr", "en"]);
  const catalogs = {
    fr: {
      common: {
        close: "Fermer", cancel: "Annuler", save: "Enregistrer", refresh: "Actualiser",
        loading: "Chargement…", pending: "En attente", ready: "Prêt", error: "Erreur",
        unavailable: "Indisponible", optional: "Optionnel", comingSoon: "À venir",
        items: { one: "{count} élément", other: "{count} éléments" }, fallbackProof: "Texte de secours",
      },
      shell: {
        studioLocal: "Studio local", currentVersion: "Version actuelle", mainNavigation: "Navigation principale",
        context: "Contexte de création", graph: "Graphe", views: "VUES", navigate: "Naviguer", viewDock: "Changer de vue", viewDockHint: "Approche le bord gauche pour changer d’espace.", project: "Projet", series: "Série", episode: "Épisode", shot: "Plan",
        activeProject: "Projet actif", activeEpisode: "Épisode actif", activeShot: "Plan actif",
        manageProjects: "Projets", newProject: "Nouveau", openProjectMenu: "Gérer les projets et leurs fichiers",
        canon: "Série & Bible", canonTitle: "Ouvrir la Bible canonique de la série",
        charactersResource: "Personnages", charactersTitle: "Ouvrir le casting canonique de la série", charactersAria: "Personnages, ressource de série", seriesScope: "Ressource de série",
        assets: "Assets", assetsTitle: "Ouvrir la bibliothèque d’assets du projet",
        queue: "File", queueTitle: "File globale de production", journal: "Journal",
        guide: "Guide", guideTitle: "Ouvrir le guide de démarrage", settings: "Réglages",
        settingsTitle: "Configurer les moteurs et le stockage", services: "Moteurs",
        tools: "Outils du studio", legacySpaces: "Espaces du studio", openActiveShot: "Ouvrir le plan actif",
        serviceStatus: "État de ComfyUI et Ollama",
        connected: "Connecté", connecting: "Connexion…", language: "Langue de l’interface",
        production: "Production", planLegacy: "Plan", outputsLegacy: "Sorties", settingsLegacy: "Réglages",
      },
      project: {
        create: "Créer un projet", createAndOpen: "Créer et ouvrir", name: "Nom du projet",
        alternative: "Version alternative", isolatedSpace: "NOUVEL ESPACE ISOLÉ",
        createCopy: "Le scénario courant est dupliqué comme base. Les images, voix, clips, historiques et masters repartent dans un dossier de sortie vide.",
        files: "FICHIERS DU STUDIO", location: "Emplacement des projets",
        locationIntro: "Chaque projet garde ses fichiers de travail et ses rendus dans un espace isolé. Les chemins affichés sont absolus.",
        storage: "STOCKAGE DES PROJETS", workOutput: "Dossiers work et output",
        rootsHelp: "Ces racines s’appliquent aux prochains projets. Aucun projet existant n’est déplacé automatiquement.",
        workRoot: "Racine work", outputRoot: "Racine output", sameRoot: "Utiliser la même racine",
        saveLocations: "Enregistrer les emplacements", remove: "Retirer le projet", sensitive: "ZONE SENSIBLE",
        unregister: "Désenregistrer seulement", keepFiles: "Conserver les fichiers",
        unregisterHelp: "Le projet disparaît du Studio, mais tous ses fichiers restent sur le disque.",
        deleteWorkOutput: "Supprimer work + output", typeExactName: "Recopie le nom exact",
        deleteFiles: "Supprimer les fichiers", loaded: "Chargement…", unavailable: "Projet indisponible",
      },
      graph: {
        canvas: "CANVAS DE PRODUCTION", title: "Du récit au plan final",
        subtitle: "Déplace le canvas, zoome et ouvre un nœud pour agir.", zoomOut: "Dézoomer", zoomIn: "Zoomer",
        fit: "Tout voir", reset: "Réinitialiser", focus: "Mode focus", navigation: "Navigation du graphe",
        interactive: "Graphe de production interactif", engine: "Moteur", state: "État",
        drop: "Dépose un fichier directement sur ce nœud.", dragCanvas: "Glisser le fond pour se déplacer",
        wheelZoom: "Molette pour zoomer", dragNode: "Glisser un nœud pour réorganiser",
        episodeProgress: "PROGRESSION DE L’ÉPISODE", clipsDone: "Clips finalisés",
        story: "Histoire", storySub: "Texte ou import", sourceLoaded: "Source chargée",
        director: "Director", directorSub: "Découpage créatif", available: "Disponible",
        shotJson: "shot.json", shotReview: "Validation du découpage", shotReviewDetail: "Contrat technique · shot.json", shotValid: "Plan validé", characters: "Personnages",
        privateIdentities: "Identités privées", canonLocked: "Canon verrouillé", keyframe: "Keyframe",
        composition: "Composition & identité", toProduce: "À produire", review: "Validation",
        approve: "Approuver ou reroll", motion: "Mouvement", imageToVideo: "Image vers vidéo",
        voiceSound: "Voix & son", ttsImport: "TTS ou import", sync: "Synchronisation",
        syncSub: "Voix, musique, SFX", edit: "Montage", approvedShots: "Plans approuvés",
        finalEpisode: "Épisode final", input: "ENTRÉE", contract: "CONTRAT", human: "HUMAIN",
        audio: "AUDIO", mixing: "MIXAGE", mainFlow: "Flux principal", optionalBranch: "Branche optionnelle",
        activeStep: "Étape active", legend: "Légende du graphe",
      },
      episode: {
        inProduction: "ÉPISODE EN PRODUCTION", loading: "Chargement de l’épisode…",
        localCatalog: "Catalogue local", seeCast: "Voir le casting et les plans",
        castAndShots: "Casting et plans de l’épisode", episodeShots: "Plans de l’épisode", selectionHint: "Sélection depuis le contexte ci-dessus", canonicalCharacters: "PERSONNAGES CANONIQUES",
        shots: "PLANS", generateShot: "Générer le plan", keyframeOnly: "Keyframe seulement",
        finish: "Finaliser l’épisode", finishMaster: "MASTER D’ÉPISODE", configuration: "Configuration",
        localVoice: "Voix locale", autoSapi: "Automatique — SAPI sous Windows",
        forceSapi: "Forcer Microsoft SAPI", noTts: "Sans synthèse vocale", allowStills: "Autoriser les plans fixes",
        allowStillsHelp: "Utilise une keyframe lorsqu’un clip manque.", replaceMaster: "Remplacer le master existant",
        replaceMasterHelp: "Nécessaire uniquement pour une nouvelle version.", advancedFormat: "Format avancé",
        width: "Largeur", height: "Hauteur", fps: "Images/s", finalChain: "Chaîne finale",
        voice: "Voix", mix: "Mixage", export: "Export", verifySources: "Prêt à vérifier les sources.",
        verifiedMaster: "MASTER VÉRIFIÉ", finalReady: "Épisode final prêt", downloadMp4: "Télécharger le MP4",
        manifest: "Manifeste", subtitles: "Sous-titres", storyPlaceholder: "Écris une situation, ou importe un scénario…",
        ollamaModel: "Modèle Ollama", detectingOllama: "Détection d’Ollama…",
      },
      settings: {
        guided: "CONFIGURATION GUIDÉE", title: "ComfyUI sans JSON à bricoler", configure: "À configurer",
        comfyAddress: "Adresse ComfyUI", saveTest: "Enregistrer & tester", createWorkflows: "Créer mes workflows",
        codeCreates: "Le code crée", download: "Tu télécharges", generate: "Tu génères",
        onlyModels: "uniquement les modèles listés", withoutGraph: "sans ouvrir le graphe ComfyUI",
        watchingDownloads: "Surveillance du dossier Downloads…", installDownloads: "Installer les téléchargements terminés",
        advanced: "Mode avancé — importer un workflow personnel", keyframeWorkflow: "Workflow keyframe",
        videoWorkflow: "Workflow vidéo",
      },
      bible: {
        nav: "Bible", truth: "SOURCE DE VÉRITÉ DU PROJET", title: "Bible canonique",
        loading: "Chargement du canon…", revision: "révision —", downstream: "Impact aval",
        sections: "Sections de la Bible", uniqueIdentity: "Identité unique",
        identityHelp: "Les plans référencent ces objets par leur identifiant canonique.", register: "REGISTRE",
        direction: "Direction & ton", add: "Ajouter", inspector: "INSPECTOR", artDirection: "Direction artistique",
        reading: "Lecture", contract: "Contrat canonique JSON", delete: "Supprimer", saveRevision: "Enregistrer la révision",
        dependencies: "DÉPENDANCES", impactDetected: "Impact aval détecté", empty: "Registre vide",
        modified: "Modifié", creation: "Création", saved: "Canon enregistré", unavailable: "Bible indisponible",
        categories: { characters: "Personnages", locations: "Lieux", relationships: "Relations", rules: "Règles du monde", arcs: "Arcs narratifs", secrets: "Secrets", references: "Références", prompts: "Prompts" },
      },
      queue: {
        global: "PRODUCTION GLOBALE", title: "File de génération", empty: "File vide",
        noImplicit: "Aucune génération batch implicite", progress: "Progression globale",
        explicit: "Actions batch explicites", missing: "Produire les manquants", approved: "Produire les plans validés",
        pause: "Pause", activeShot: "Plan actif", priority: "Priorité", add: "Ajouter", emptyLong: "La file est vide.",
        continueOnError: "Une erreur n’arrête jamais les tâches suivantes.", clear: "Nettoyer les tâches finies",
        statuses: { queued: "En attente", running: "En cours", approval: "À valider", completed: "Terminé", failed: "Erreur", cancelled: "Annulé" },
        kinds: { keyframes: "Keyframes", video: "Vidéo", voice: "Voix", music: "Musique" },
      },
      outputs: {
        eyebrow: "SORTIES", review: "Contrôle humain", version: "Version", noRender: "Aucun rendu",
        restore: "Restaurer", actionPoses: "POSES D’ACTION", posesEmpty: "Les poses début, milieu et fin apparaîtront ici",
        generatedPose: "Pose générée sélectionnée", previousPose: "Pose précédente", nextPose: "Pose suivante",
        clip: "CLIP", videoEmpty: "La vidéo apparaîtra ici", audio: "VOIX / MUSIQUE", noTrack: "Aucune piste générée",
        currentScene: "SCÈNE EN COURS", selectShot: "Sélectionne un plan", action: "Action", camera: "Caméra",
        log: "JOURNAL", noRun: "Aucune exécution", configureFirst: "Configure ComfyUI, puis lance une génération.",
        animate: "Animer la keyframe", noDialogue: "Plan sans dialogue.", intention: "Intention", emotion: "Émotion",
        unknownDate: "date inconnue", versionLog: "Journal de la version", noEvent: "Aucun événement enregistré pour cette version.",
        activeVersion: "Version active", archive: "Archive", archivedVersion: "Version archivée", generatedVersion: "Version générée",
      },
      notifications: {
        projectLog: "Journal du projet", activeProject: "PROJET ACTIF", activityLog: "Journal d’activité",
        markRead: "Tout marquer comme lu", none: "Aucune notification.", noneProject: "Aucune notification pour ce projet.",
        studioError: "Erreur du Studio",
      },
      gettingStarted: {
        title: "Bien démarrer", close: "Fermer le guide", next: "Suivant", previous: "Précédent",
        finish: "Terminer", reopen: "Ouvrir le guide de démarrage",
      },
      dto: {
        queued: "En attente", running: "En cours", awaiting_approval: "À valider", completed: "Terminé",
        failed: "Erreur", cancelled: "Annulé", ready: "Prêt", pending: "En attente", idle: "Disponible",
      },
    },
    en: {
      common: {
        close: "Close", cancel: "Cancel", save: "Save", refresh: "Refresh", loading: "Loading…",
        pending: "Pending", ready: "Ready", error: "Error", unavailable: "Unavailable", optional: "Optional", comingSoon: "Coming soon",
        items: { one: "{count} item", other: "{count} items" },
      },
      shell: {
        studioLocal: "Local studio", currentVersion: "Current version", mainNavigation: "Main navigation", context: "Creation context", graph: "Graph", views: "VIEWS", navigate: "Navigate", viewDock: "Change view", viewDockHint: "Move to the left edge to switch workspace.",
        project: "Project", series: "Series", episode: "Episode", shot: "Shot", activeProject: "Active project",
        activeEpisode: "Active episode", activeShot: "Active shot", manageProjects: "Projects", newProject: "New",
        openProjectMenu: "Manage projects and their files", canon: "Series & Bible", canonTitle: "Open the series canon Bible",
        charactersResource: "Characters", charactersTitle: "Open the series canonical cast", charactersAria: "Characters, series resource", seriesScope: "Series resource",
        assets: "Assets", assetsTitle: "Open the project asset library", queue: "Queue", queueTitle: "Global production queue",
        journal: "Journal", guide: "Guide", guideTitle: "Open the getting started guide", settings: "Settings",
        settingsTitle: "Configure engines and storage", services: "Engines", tools: "Studio tools", legacySpaces: "Studio workspaces",
        openActiveShot: "Open active shot", serviceStatus: "ComfyUI and Ollama status", connected: "Connected", connecting: "Connecting…",
        language: "Interface language", production: "Production", planLegacy: "Shot", outputsLegacy: "Outputs", settingsLegacy: "Settings",
      },
      project: {
        create: "Create a project", createAndOpen: "Create and open", name: "Project name", alternative: "Alternative version",
        isolatedSpace: "NEW ISOLATED SPACE", createCopy: "The current screenplay is duplicated as a starting point. Images, voices, clips, history and masters start in an empty output folder.",
        files: "STUDIO FILES", location: "Project locations", locationIntro: "Each project keeps its work files and renders in an isolated space. Displayed paths are absolute.",
        storage: "PROJECT STORAGE", workOutput: "Work and output folders", rootsHelp: "These roots apply to new projects. Existing projects are never moved automatically.",
        workRoot: "Work root", outputRoot: "Output root", sameRoot: "Use the same root", saveLocations: "Save locations",
        remove: "Remove project", sensitive: "SENSITIVE AREA", unregister: "Unregister only", keepFiles: "Keep files",
        unregisterHelp: "The project disappears from the Studio, but all files remain on disk.", deleteWorkOutput: "Delete work + output",
        typeExactName: "Type the exact name", deleteFiles: "Delete files", loaded: "Loading…", unavailable: "Project unavailable",
      },
      graph: {
        canvas: "PRODUCTION CANVAS", title: "From story to final shot", subtitle: "Pan the canvas, zoom and open a node to act.",
        zoomOut: "Zoom out", zoomIn: "Zoom in", fit: "Fit all", reset: "Reset", focus: "Focus mode", navigation: "Graph navigation",
        interactive: "Interactive production graph", engine: "Engine", state: "State", drop: "Drop a file directly onto this node.",
        dragCanvas: "Drag the background to pan", wheelZoom: "Mouse wheel to zoom", dragNode: "Drag a node to rearrange",
        episodeProgress: "EPISODE PROGRESS", clipsDone: "Completed clips", story: "Story", storySub: "Text or import",
        sourceLoaded: "Source loaded", director: "Director", directorSub: "Creative breakdown", available: "Available",
        shotJson: "shot.json", shotReview: "Shot review", shotReviewDetail: "Technical contract · shot.json", shotValid: "Validated shot", characters: "Characters", privateIdentities: "Private identities",
        canonLocked: "Canon locked", keyframe: "Keyframe", composition: "Composition & identity", toProduce: "To produce",
        review: "Review", approve: "Approve or reroll", motion: "Motion", imageToVideo: "Image to video", voiceSound: "Voice & sound",
        ttsImport: "TTS or import", sync: "Synchronization", syncSub: "Voice, music, SFX", edit: "Edit", approvedShots: "Approved shots",
        finalEpisode: "Final episode", input: "INPUT", contract: "CONTRACT", human: "HUMAN", audio: "AUDIO", mixing: "MIXING",
        mainFlow: "Main flow", optionalBranch: "Optional branch", activeStep: "Active step", legend: "Graph legend",
      },
      episode: {
        inProduction: "EPISODE IN PRODUCTION", loading: "Loading episode…", localCatalog: "Local catalog",
        seeCast: "View cast and shots", castAndShots: "Episode cast and shots", episodeShots: "Episode shots", selectionHint: "Select from the context above", canonicalCharacters: "CANONICAL CHARACTERS",
        shots: "SHOTS", generateShot: "Generate shot", keyframeOnly: "Keyframe only", finish: "Finish episode",
        finishMaster: "EPISODE MASTER", configuration: "Configuration", localVoice: "Local voice",
        autoSapi: "Automatic — SAPI on Windows", forceSapi: "Force Microsoft SAPI", noTts: "No text-to-speech",
        allowStills: "Allow still shots", allowStillsHelp: "Uses a keyframe when a clip is missing.", replaceMaster: "Replace existing master",
        replaceMasterHelp: "Only needed to produce a new version.", advancedFormat: "Advanced format", width: "Width", height: "Height",
        fps: "Frames/s", finalChain: "Final pipeline", voice: "Voice", mix: "Mix", export: "Export",
        verifySources: "Ready to verify sources.", verifiedMaster: "VERIFIED MASTER", finalReady: "Final episode ready",
        downloadMp4: "Download MP4", manifest: "Manifest", subtitles: "Subtitles", storyPlaceholder: "Write a situation, or import a screenplay…",
        ollamaModel: "Ollama model", detectingOllama: "Detecting Ollama…",
      },
      settings: {
        guided: "GUIDED SETUP", title: "ComfyUI without hand-editing JSON", configure: "Setup required", comfyAddress: "ComfyUI address",
        saveTest: "Save & test", createWorkflows: "Create my workflows", codeCreates: "The code creates", download: "You download",
        generate: "You generate", onlyModels: "only the listed models", withoutGraph: "without opening the ComfyUI graph",
        watchingDownloads: "Watching the Downloads folder…", installDownloads: "Install completed downloads",
        advanced: "Advanced mode — import a custom workflow", keyframeWorkflow: "Keyframe workflow", videoWorkflow: "Video workflow",
      },
      bible: {
        nav: "Bible", truth: "PROJECT SOURCE OF TRUTH", title: "Canon Bible", loading: "Loading canon…", revision: "revision —",
        downstream: "Downstream impact", sections: "Bible sections", uniqueIdentity: "Unique identity",
        identityHelp: "Shots reference these objects through their canonical identifier.", register: "REGISTRY", direction: "Direction & tone",
        add: "Add", inspector: "INSPECTOR", artDirection: "Art direction", reading: "Read only", contract: "Canon JSON contract",
        delete: "Delete", saveRevision: "Save revision", dependencies: "DEPENDENCIES", impactDetected: "Downstream impact detected",
        empty: "Empty registry", modified: "Modified", creation: "Creating", saved: "Canon saved", unavailable: "Bible unavailable",
        categories: { characters: "Characters", locations: "Locations", relationships: "Relationships", rules: "World rules", arcs: "Narrative arcs", secrets: "Secrets", references: "References", prompts: "Prompts" },
      },
      queue: {
        global: "GLOBAL PRODUCTION", title: "Generation queue", empty: "Empty queue", noImplicit: "No implicit batch generation",
        progress: "Overall progress", explicit: "Explicit batch actions", missing: "Produce missing items", approved: "Produce approved shots",
        pause: "Pause", activeShot: "Active shot", priority: "Priority", add: "Add", emptyLong: "The queue is empty.",
        continueOnError: "An error never stops subsequent tasks.", clear: "Clear finished tasks",
        statuses: { queued: "Queued", running: "Running", approval: "Awaiting review", completed: "Completed", failed: "Error", cancelled: "Cancelled" },
        kinds: { keyframes: "Keyframes", video: "Video", voice: "Voice", music: "Music" },
      },
      outputs: {
        eyebrow: "OUTPUTS", review: "Human review", version: "Version", noRender: "No render", restore: "Restore",
        actionPoses: "ACTION POSES", posesEmpty: "Start, middle and end poses will appear here", generatedPose: "Selected generated pose",
        previousPose: "Previous pose", nextPose: "Next pose", clip: "CLIP", videoEmpty: "The video will appear here",
        audio: "VOICE / MUSIC", noTrack: "No generated track", currentScene: "CURRENT SCENE", selectShot: "Select a shot",
        action: "Action", camera: "Camera", log: "JOURNAL", noRun: "No run", configureFirst: "Configure ComfyUI, then start a generation.",
        animate: "Animate keyframe", noDialogue: "Shot without dialogue.", intention: "Intention", emotion: "Emotion",
        unknownDate: "unknown date", versionLog: "Version log", noEvent: "No event recorded for this version.",
        activeVersion: "Active version", archive: "Archive", archivedVersion: "Archived version", generatedVersion: "Generated version",
      },
      notifications: {
        projectLog: "Project journal", activeProject: "ACTIVE PROJECT", activityLog: "Activity journal", markRead: "Mark all as read",
        none: "No notifications.", noneProject: "No notifications for this project.", studioError: "Studio error",
      },
      gettingStarted: { title: "Getting started", close: "Close guide", next: "Next", previous: "Previous", finish: "Finish", reopen: "Open getting started guide" },
      dto: {
        queued: "Queued", running: "Running", awaiting_approval: "Awaiting review", completed: "Completed", failed: "Error",
        cancelled: "Cancelled", ready: "Ready", pending: "Pending", idle: "Available",
      },
    },
  };

  const textKeys = new WeakMap();
  const attributeKeys = new WeakMap();
  let language = detectLanguage();
  let observer = null;
  let scheduled = false;

  function detectLanguage() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (SUPPORTED_LANGUAGES.includes(saved)) return saved;
    } catch (_error) { /* storage is optional */ }
    const browser = String(navigator.language || "").toLowerCase().split("-")[0];
    return SUPPORTED_LANGUAGES.includes(browser) ? browser : DEFAULT_LANGUAGE;
  }

  function getPath(source, path) {
    return path.split(".").reduce((value, segment) => value && value[segment], source);
  }

  function merge(target, source) {
    Object.entries(source || {}).forEach(([key, value]) => {
      if (value && typeof value === "object" && !Array.isArray(value)) {
        target[key] = merge(target[key] && typeof target[key] === "object" ? target[key] : {}, value);
      } else target[key] = value;
    });
    return target;
  }

  function interpolate(value, params) {
    return String(value).replace(/\{([\w.-]+)\}/g, (_match, name) => params[name] ?? "{" + name + "}");
  }

  function t(key, params = {}) {
    let value = getPath(catalogs[language], key);
    if (value === undefined) value = getPath(catalogs[DEFAULT_LANGUAGE], key);
    if (value === undefined) return key;
    if (value && typeof value === "object") {
      const count = Number(params.count);
      value = count === 0 && value.zero !== undefined ? value.zero : count === 1 ? value.one : value.other;
    }
    return interpolate(value, params);
  }

  function flatten(source, prefix = "", output = {}) {
    Object.entries(source || {}).forEach(([key, value]) => {
      const path = prefix ? prefix + "." + key : key;
      if (typeof value === "string") output[path] = value;
      else if (value && typeof value === "object" && !("one" in value || "other" in value)) flatten(value, path, output);
    });
    return output;
  }

  function indexes() {
    const byText = new Map();
    SUPPORTED_LANGUAGES.forEach((locale) => {
      Object.entries(flatten(catalogs[locale])).forEach(([key, value]) => byText.set(value, key));
    });
    byText.set("Shot JSON", "graph.shotReview");
    return byText;
  }

  function localizedPattern(value) {
    let match = value.match(/^Plan (\d+) sur (\d+) · prêt à générer$/);
    if (match) return language === "en" ? `Shot ${match[1]} of ${match[2]} · ready to generate` : value;
    match = value.match(/^Shot (\d+) of (\d+) · ready to generate$/);
    if (match) return language === "fr" ? `Plan ${match[1]} sur ${match[2]} · prêt à générer` : value;
    match = value.match(/^(\d+) \/ (\d+) clips finalisés$/);
    if (match) return language === "en" ? `${match[1]} / ${match[2]} completed clips` : value;
    match = value.match(/^(\d+) \/ (\d+) completed clips$/);
    if (match) return language === "fr" ? `${match[1]} / ${match[2]} clips finalisés` : value;
    match = value.match(/^Plan (\d+) · ([\d.,]+) s$/);
    if (match) return language === "en" ? `Shot ${match[1]} · ${match[2]} s` : value;
    match = value.match(/^Shot (\d+) · ([\d.,]+) s$/);
    if (match) return language === "fr" ? `Plan ${match[1]} · ${match[2]} s` : value;
    match = value.match(/^(\d+) identités canoniques$/);
    if (match) return language === "en" ? `${match[1]} canonical identities` : value;
    match = value.match(/^(\d+) canonical identities$/);
    if (match) return language === "fr" ? `${match[1]} identités canoniques` : value;
    return value;
  }

  function translateTextNode(node, byText) {
    if (!node.nodeValue || !node.nodeValue.trim()) return;
    const raw = node.nodeValue;
    const value = raw.trim();
    let key = textKeys.get(node);
    if (key) {
      const known = SUPPORTED_LANGUAGES.some((locale) => getPath(catalogs[locale], key) === value);
      if (!known) { textKeys.delete(node); key = null; }
    }
    key = key || byText.get(value);
    const translated = key ? t(key) : localizedPattern(value);
    if (key) textKeys.set(node, key);
    if (translated !== value) node.nodeValue = raw.replace(value, translated);
  }

  function translateAttribute(element, name, byText) {
    const explicit = element.dataset && element.dataset["i18n" + name.replace(/(^|-)([a-z])/g, (_m, _a, letter) => letter.toUpperCase())];
    const value = element.getAttribute(name);
    if (!value) return;
    let keys = attributeKeys.get(element);
    if (!keys) { keys = {}; attributeKeys.set(element, keys); }
    let key = explicit || keys[name];
    if (key && !explicit) {
      const known = SUPPORTED_LANGUAGES.some((locale) => getPath(catalogs[locale], key) === value);
      if (!known) key = null;
    }
    key = key || byText.get(value);
    const translated = key ? t(key) : localizedPattern(value);
    if (key) keys[name] = key;
    if (translated !== value) element.setAttribute(name, translated);
  }

  function translateRoot(root = document) {
    const byText = indexes();
    if (root.nodeType === Node.TEXT_NODE) translateTextNode(root, byText);
    const element = root.nodeType === Node.ELEMENT_NODE ? root : null;
    if (element) {
      if (element.dataset?.i18n && !element.children.length) {
        const translated = t(element.dataset.i18n);
        if (element.textContent !== translated) element.textContent = translated;
      }
      ["title", "aria-label", "placeholder"].forEach((name) => translateAttribute(element, name, byText));
    }
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (node.nodeType === Node.ELEMENT_NODE && ["SCRIPT", "STYLE"].includes(node.tagName)) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      },
    });
    while (walker.nextNode()) {
      const node = walker.currentNode;
      if (node.nodeType === Node.TEXT_NODE) translateTextNode(node, byText);
      else {
        if (node.dataset?.i18n && !node.children.length) {
          const translated = t(node.dataset.i18n);
          if (node.textContent !== translated) node.textContent = translated;
        }
        ["title", "aria-label", "placeholder"].forEach((name) => translateAttribute(node, name, byText));
      }
    }
  }

  function refresh() {
    scheduled = false;
    document.documentElement.lang = language;
    translateRoot(document.body || document.documentElement);
    const select = document.querySelector("#language-select");
    if (select) select.value = language;
  }

  function scheduleRefresh() {
    if (scheduled) return;
    scheduled = true;
    window.requestAnimationFrame(refresh);
  }

  function setLanguage(nextLanguage, { persist = true } = {}) {
    const next = SUPPORTED_LANGUAGES.includes(nextLanguage) ? nextLanguage : DEFAULT_LANGUAGE;
    const previous = language;
    language = next;
    if (persist) {
      try { localStorage.setItem(STORAGE_KEY, language); } catch (_error) { /* storage is optional */ }
    }
    refresh();
    if (previous !== language) {
      const detail = { language, locale: language, previous };
      window.dispatchEvent(new CustomEvent("serre:language-changed", { detail }));
      window.dispatchEvent(new CustomEvent("serre:i18n-changed", { detail }));
      window.dispatchEvent(new CustomEvent("studio:language-changed", { detail }));
    }
    return language;
  }

  function register(locale, catalog) {
    if (!SUPPORTED_LANGUAGES.includes(locale)) return false;
    merge(catalogs[locale], catalog);
    scheduleRefresh();
    return true;
  }

  function localize(value, namespace = "dto") {
    if (typeof value !== "string") return value;
    const key = namespace + "." + value;
    return getPath(catalogs[language], key) !== undefined || getPath(catalogs[DEFAULT_LANGUAGE], key) !== undefined ? t(key) : value;
  }

  function locale() { return language === "en" ? "en-GB" : "fr-FR"; }

  window.SerreI18n = Object.freeze({
    t, setLanguage, getLanguage: () => language, getLocale: locale, localize, register,
    locale: () => language, setLocale: setLanguage,
    translate: translateRoot, refresh, supportedLanguages: SUPPORTED_LANGUAGES,
    fallbackLanguage: DEFAULT_LANGUAGE, storageKey: STORAGE_KEY,
  });

  function start() {
    refresh();
    const languageSelect = document.querySelector("#language-select");
    languageSelect?.addEventListener("change", () => setLanguage(languageSelect.value));
    window.addEventListener("studio:language-change-request", (event) => {
      setLanguage(event.detail?.locale || event.detail?.language);
    });
    observer = new MutationObserver((mutations) => {
      if (mutations.some((mutation) => mutation.type === "childList" || mutation.type === "characterData" || mutation.type === "attributes")) scheduleRefresh();
    });
    observer.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ["title", "aria-label", "placeholder"] });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
})();
