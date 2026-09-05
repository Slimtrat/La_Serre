const narrativeAuthoring = (() => {
  const COPY = {
    fr: {
      open: "Écriture", openTitle: "Écrire la série et ses épisodes", title: "Atelier narratif",
      subtitle: "Une proposition IA reste candidate jusqu’à ton approbation.", model: "Modèle",
      ollamaOffline: "Ollama hors ligne", narrativeModelMissing: "Modèle narratif requis · installe Qwen3 4B",
      manageModels: "Gérer les modèles", close: "Fermer", seriesTab: "Série · Direction",
      episodeTab: "Épisode · Écriture & plans", director: "Director", screenwriter: "Scénariste",
      validator: "Validateur général", episode: "Épisode", breakdown: "Découpage en plans",
      stages: { intention: "01 · intention", architecture: "02 · architecture", guardrail: "03 · garde-fou" },
      status: { empty: "Vide", draft: "À valider", approved: "Approuvé", blocked: "Bloqué" },
      modes: { manual: "Manuel", import: "Import", ai: "IA" },
      episodeStatus: { idea: "Idée", writing: "Écriture", review: "En validation", approved: "Approuvé", breakdown: "Découpage", production: "Production", final: "Final", draft: "Brouillon" },
      fields: {
        concept: "Concept", genre: "Genre", tone: "Ton", visualDirection: "Direction visuelle",
        targetDuration: "Durée cible (s)", themes: "Thèmes — un par ligne", constraints: "Contraintes",
        narrativeRules: "Règles narratives", objectives: "Objectifs", customPrompt: "Prompt personnalisé",
        seriesArc: "Arc de série", characterProgression: "Progression des personnages",
        relationshipProgression: "Progression des relations", proposedEpisodes: "Épisodes proposés",
        verdict: "Verdict", summary: "Synthèse", overrideReason: "Justification d’override",
        title: "Titre", logline: "Logline", source: "Histoire / texte de théâtre", hook: "Hook",
        setup: "Setup", conflict: "Conflit", reveal: "Révélation", cliffhanger: "Cliffhanger",
        bibleCharacters: "Personnages Bible — IDs séparés par virgule",
        bibleLocations: "Lieux Bible — IDs séparés par virgule", number: "N°", synopsis: "Synopsis",
        characterIds: "Personnages (IDs)", locationIds: "Lieux (IDs)", duration: "Durée",
        locationId: "Lieu (ID)", frame: "Cadre", movement: "Mouvement", action: "Action",
        shotSource: "Source du plan", lighting: "Lumière", mood: "Ambiance", style: "Style",
        speechMode: "Mode de parole", optionalSpeaker: "Locuteur (optionnel)", dialogue: "Réplique / narration", intention: "Intention", emotion: "Émotion",
      },
      speechModes: { on_screen: "Dialogue à l’image", off_screen: "Parole hors champ", voice_over: "Voix off / narration" },
      verdicts: { pass: "Cohérent", warning: "À surveiller", fail: "Bloqué" },
      placeholders: {
        concept: "Une situation ordinaire traitée comme un drame immense…",
        override: "Requis pour accepter un échec",
      },
      actions: {
        imagine: "✦ Laisser l’IA imaginer", audit: "✦ Auditer avec l’IA", import: "Importer",
        save: "Enregistrer", approve: "Approuver", approveGate: "Approuver la gate",
        createEpisodes: "Créer les épisodes", addEpisode: "＋ Ajouter un épisode",
        newEpisode: "＋ Nouvel épisode", applyProposal: "Appliquer la proposition", review: "Vérifier",
        trash: "Corbeille", addShot: "＋ Ajouter un plan manuel", generateBreakdown: "✦ Découper avec l’IA",
        applyBreakdown: "Appliquer le découpage", remove: "Retirer",
      },
      hints: {
        selectOrCreate: "Sélectionne ou crée un épisode.", noReview: "Aucune validation lancée.",
        editableBreakdown: "Chaque carte est éditable. Seul “Appliquer” crée les fichiers.",
        noCandidateShot: "Aucun plan candidat.", noProvenance: "Aucune provenance enregistrée",
        newUnsaved: "Nouvel épisode non enregistré",
      },
      messages: {
        directorCandidate: "Proposition du Director prête à relire — rien n’est enregistré.",
        screenwriterCandidate: "Proposition du scénariste prête à relire.",
        auditReady: "Audit terminé. Le rapport n’a modifié aucun texte.", approved: "Étape approuvée explicitement.",
        episodesCreated: "{count} épisode(s) créé(s) et navigables.", episodesExist: "Tous les épisodes proposés existaient déjà.",
        episodeCreated: "{id} créé.", episodeSaved: "Épisode enregistré en écriture.",
        episodeCandidate: "Brouillon candidat prêt. Relis-le puis clique Appliquer.",
        draftApplied: "Brouillon appliqué. La gate de cohérence est disponible.",
        noInconsistency: "Aucune incohérence détectée.", episodeApproved: "Écriture approuvée. Le découpage est déverrouillé.",
        breakdownCandidate: "Découpage candidat prêt : chaque carte reste éditable.",
        shotsCreated: "{count} plans créés et navigables.", trashed: "Épisode déplacé dans la corbeille.",
      },
      errors: {
        fallback: "Erreur de l’atelier narratif", createFirst: "Crée d’abord l’épisode",
        selectEpisode: "Sélectionne un épisode", confirmTrash: "Mettre {id} dans la corbeille récupérable ?",
        modelRequired: "Sélectionne un modèle Ollama installé", ollamaUnavailable: "Ollama est inaccessible",
        validateFirst: "Lance la validation avant d’approuver", changedReview: "Le texte a changé : relance la validation",
        fixBlockers: "Corrige les blocages avant d’approuver", approveBeforeBreakdown: "Approuve l’épisode avant son découpage",
        approveDirector: "Valide d’abord la direction de série", approveScreenwriter: "Valide d’abord le travail du scénariste",
      },
      defaultEpisodeTitle: "Épisode sans titre", shotNumber: "Plan {number}", importLabel: "Import : {name}", provenanceLabel: "Provenance",
      reviewStatus: { pass: "COHÉRENT", warning: "À SURVEILLER", fail: "BLOQUÉ" },
    },
    en: {
      open: "Writing", openTitle: "Write the series and its episodes", title: "Story room",
      subtitle: "An AI proposal remains a candidate until you approve it.", model: "Model",
      ollamaOffline: "Ollama offline", narrativeModelMissing: "Narrative model required · install Qwen3 4B",
      manageModels: "Manage models", close: "Close", seriesTab: "Series · Direction",
      episodeTab: "Episode · Writing & shots", director: "Director", screenwriter: "Screenwriter",
      validator: "General validator", episode: "Episode", breakdown: "Shot breakdown",
      stages: { intention: "01 · intent", architecture: "02 · architecture", guardrail: "03 · guardrail" },
      status: { empty: "Empty", draft: "Needs approval", approved: "Approved", blocked: "Locked" },
      modes: { manual: "Manual", import: "Import", ai: "AI" },
      episodeStatus: { idea: "Idea", writing: "Writing", review: "In review", approved: "Approved", breakdown: "Breakdown", production: "Production", final: "Final", draft: "Draft" },
      fields: {
        concept: "Concept", genre: "Genre", tone: "Tone", visualDirection: "Visual direction",
        targetDuration: "Target duration (s)", themes: "Themes — one per line", constraints: "Constraints",
        narrativeRules: "Narrative rules", objectives: "Objectives", customPrompt: "Custom prompt",
        seriesArc: "Series arc", characterProgression: "Character progression",
        relationshipProgression: "Relationship progression", proposedEpisodes: "Proposed episodes",
        verdict: "Verdict", summary: "Summary", overrideReason: "Override rationale",
        title: "Title", logline: "Logline", source: "Story / stage script", hook: "Hook",
        setup: "Setup", conflict: "Conflict", reveal: "Reveal", cliffhanger: "Cliffhanger",
        bibleCharacters: "Bible characters — comma-separated IDs",
        bibleLocations: "Bible locations — comma-separated IDs", number: "No.", synopsis: "Synopsis",
        characterIds: "Characters (IDs)", locationIds: "Locations (IDs)", duration: "Duration",
        locationId: "Location (ID)", frame: "Framing", movement: "Movement", action: "Action",
        shotSource: "Shot source", lighting: "Lighting", mood: "Mood", style: "Style",
        speechMode: "Speech mode", optionalSpeaker: "Speaker (optional)", dialogue: "Line / narration", intention: "Intention", emotion: "Emotion",
      },
      speechModes: { on_screen: "On-camera dialogue", off_screen: "Off-screen speech", voice_over: "Voice-over / narration" },
      verdicts: { pass: "Coherent", warning: "Needs attention", fail: "Blocked" },
      placeholders: {
        concept: "An ordinary problem treated like enormous television drama…",
        override: "Required to accept a failed review",
      },
      actions: {
        imagine: "✦ Let AI imagine", audit: "✦ Audit with AI", import: "Import", save: "Save",
        approve: "Approve", approveGate: "Approve gate", createEpisodes: "Create episodes",
        addEpisode: "＋ Add an episode", newEpisode: "＋ New episode", applyProposal: "Apply proposal",
        review: "Review", trash: "Trash", addShot: "＋ Add a manual shot", generateBreakdown: "✦ Break down with AI",
        applyBreakdown: "Apply breakdown", remove: "Remove",
      },
      hints: {
        selectOrCreate: "Select or create an episode.", noReview: "No review has been run.",
        editableBreakdown: "Every card is editable. Only “Apply” creates files.", noCandidateShot: "No candidate shot.",
        noProvenance: "No provenance recorded", newUnsaved: "New unsaved episode",
      },
      messages: {
        directorCandidate: "Director proposal ready for review — nothing has been saved.",
        screenwriterCandidate: "Screenwriter proposal ready for review.",
        auditReady: "Audit complete. The report did not modify any text.", approved: "Stage explicitly approved.",
        episodesCreated: "{count} episode(s) created and ready to open.", episodesExist: "All proposed episodes already exist.",
        episodeCreated: "{id} created.", episodeSaved: "Episode saved in writing.",
        episodeCandidate: "Candidate draft ready. Review it, then click Apply.",
        draftApplied: "Draft applied. The coherence gate is now available.", noInconsistency: "No inconsistency detected.",
        episodeApproved: "Writing approved. The breakdown is now unlocked.",
        breakdownCandidate: "Candidate breakdown ready: every card remains editable.",
        shotsCreated: "{count} shots created and ready to open.", trashed: "Episode moved to trash.",
      },
      errors: {
        fallback: "Story room error", createFirst: "Create the episode first", selectEpisode: "Select an episode",
        confirmTrash: "Move {id} to recoverable trash?", modelRequired: "Select an installed Ollama model",
        ollamaUnavailable: "Ollama is unavailable", validateFirst: "Run the review before approving",
        changedReview: "The text changed: run the review again", fixBlockers: "Resolve blockers before approving",
        approveBeforeBreakdown: "Approve the episode before breaking it down", approveDirector: "Approve series direction first",
        approveScreenwriter: "Approve the screenwriter’s work first",
      },
      defaultEpisodeTitle: "Untitled episode", shotNumber: "Shot {number}", importLabel: "Import: {name}", provenanceLabel: "Provenance",
      reviewStatus: { pass: "COHERENT", warning: "NEEDS ATTENTION", fail: "BLOCKED" },
    },
  };
  window.SerreI18n?.register?.("fr", { narrative: COPY.fr });
  window.SerreI18n?.register?.("en", { narrative: COPY.en });
  const openButton = document.querySelector("#narrative-workflow-open");
  if (!openButton) return null;
  let dialog, workflow, currentEpisode, episodeReviewReport;
  let modelStatus = null;
  let validatorFindings = [], breakdownCandidate = [];
  let modes = { director: "manual", screenwriter: "manual", validator: "manual", episode: "manual", breakdown: "manual" };

  function locale() { return window.SerreI18n?.locale?.() === "en" ? "en" : "fr"; }
  function interpolate(text, params) {
    return Object.entries(params).reduce((result, [key, replacement]) => result.replaceAll(`{${key}}`, replacement), text);
  }
  function t(key, params = {}) {
    const translated = window.SerreI18n?.t?.(`narrative.${key}`, params);
    if (translated && translated !== `narrative.${key}`) return translated;
    const fallback = key.split(".").reduce((result, segment) => result?.[segment], COPY[locale()]);
    return interpolate(fallback || key, params);
  }
  function h(input) {
    return String(input ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
  }
  const ERROR_KEYS = {
    "Sélectionne un modèle Ollama installé": "modelRequired", "Ollama est inaccessible": "ollamaUnavailable",
    "Lance la validation avant d’approuver": "validateFirst", "Le texte a changé : relance la validation": "changedReview",
    "Corrige les blocages avant d’approuver": "fixBlockers", "Approuve l’épisode avant son découpage": "approveBeforeBreakdown",
    "Valide d’abord la direction de série": "approveDirector", "Valide d’abord le travail du scénariste": "approveScreenwriter",
  };
  function errorMessage(body, response) {
    const detail = typeof body.detail === "string" ? body.detail : "";
    if (locale() === "en" && ERROR_KEYS[detail]) return t(`errors.${ERROR_KEYS[detail]}`);
    return detail || `${t("errors.fallback")} · HTTP ${response.status}`;
  }
  async function request(path, options = {}) {
    const response = await fetch(path, options);
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(errorMessage(body, response));
    return body;
  }
  const json = (method, body) => ({ method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const lines = (value) => String(value || "").split(/\r?\n|,/).map((item) => item.trim()).filter(Boolean);
  const value = (id) => dialog.querySelector("#" + id)?.value?.trim() || "";
  const setValue = (id, next) => { const field = dialog.querySelector("#" + id); if (field) field.value = next ?? ""; };
  const model = () => value("narrative-model") || null;
  const notify = (message, error = false) => window.SerreStudio?.notify(message, error);

  function markup() {
    return `<section class="narrative-workflow-shell">
      <header class="narrative-workflow-header"><div><h2 id="narrative-workflow-title">${h(t("title"))}</h2><p>${h(t("subtitle"))}</p></div><div class="narrative-header-actions"><div class="narrative-model-control"><label class="muted">${h(t("model"))} <select id="narrative-model"><option value="">${h(t("ollamaOffline"))}</option></select></label><button id="narrative-model-manage" class="narrative-model-alert hidden" type="button"><span id="narrative-model-manage-copy">${h(t("ollamaOffline"))}</span><strong>${h(t("manageModels"))} →</strong></button></div><button id="narrative-close" class="button ghost" type="button">${h(t("close"))}</button></div></header>
      <nav class="narrative-workflow-tabs" role="tablist"><button type="button" data-author-tab="series" class="selected">${h(t("seriesTab"))}</button><button type="button" data-author-tab="episode">${h(t("episodeTab"))}</button></nav>
      <div class="narrative-workflow-body">
       <section data-author-panel="series"><div class="narrative-stage-grid">
        <article class="narrative-stage" id="director-stage" data-status="empty"><header><div><span>${h(t("stages.intention"))}</span><h3>${h(t("director"))}</h3></div><strong id="director-status">${h(t("status.empty"))}</strong></header><div class="narrative-stage-fields">
         <label>${h(t("fields.concept"))}<textarea id="director-concept" placeholder="${h(t("placeholders.concept"))}"></textarea></label><label>${h(t("fields.genre"))}<input id="director-genre" /></label><label>${h(t("fields.tone"))}<input id="director-tone" /></label><label>${h(t("fields.visualDirection"))}<textarea id="director-visual"></textarea></label><label>${h(t("fields.targetDuration"))}<input id="director-duration" type="number" min="1" max="600" value="45" /></label><label>${h(t("fields.themes"))}<textarea id="director-themes"></textarea></label><label>${h(t("fields.constraints"))}<textarea id="director-constraints"></textarea></label><label>${h(t("fields.narrativeRules"))}<textarea id="director-rules"></textarea></label><label>${h(t("fields.objectives"))}<textarea id="director-objectives"></textarea></label><label>${h(t("fields.customPrompt"))}<textarea id="director-prompt"></textarea></label>
        </div><p id="director-provenance" class="narrative-provenance"></p><div class="narrative-stage-actions"><button id="director-imagine" class="button secondary" type="button">${h(t("actions.imagine"))}</button><label class="button ghost narrative-file">${h(t("actions.import"))}<input id="director-import" type="file" accept=".json,.txt,.md" /></label><button id="director-save" class="button ghost" type="button">${h(t("actions.save"))}</button><button id="director-approve" class="button primary" type="button">${h(t("actions.approve"))}</button></div></article>
        <article class="narrative-stage" id="screenwriter-stage" data-status="empty"><header><div><span>${h(t("stages.architecture"))}</span><h3>${h(t("screenwriter"))}</h3></div><strong id="screenwriter-status">${h(t("status.blocked"))}</strong></header><div class="narrative-stage-fields">
         <label>${h(t("fields.seriesArc"))}<textarea id="screenwriter-arc"></textarea></label><label>${h(t("fields.characterProgression"))}<textarea id="screenwriter-characters"></textarea></label><label>${h(t("fields.relationshipProgression"))}<textarea id="screenwriter-relationships"></textarea></label><label>${h(t("fields.customPrompt"))}<textarea id="screenwriter-prompt"></textarea></label><div><span class="muted">${h(t("fields.proposedEpisodes"))}</span><div id="series-episode-proposals" class="episode-proposals"></div></div><button id="series-add-episode" class="button ghost" type="button">${h(t("actions.addEpisode"))}</button>
        </div><p id="screenwriter-provenance" class="narrative-provenance"></p><div class="narrative-stage-actions"><button id="screenwriter-imagine" class="button secondary" type="button">${h(t("actions.imagine"))}</button><label class="button ghost narrative-file">${h(t("actions.import"))}<input id="screenwriter-import" type="file" accept=".json,.txt,.md" /></label><button id="screenwriter-save" class="button ghost" type="button">${h(t("actions.save"))}</button><button id="screenwriter-approve" class="button primary" type="button">${h(t("actions.approve"))}</button></div></article>
        <article class="narrative-stage" id="validator-stage" data-status="empty"><header><div><span>${h(t("stages.guardrail"))}</span><h3>${h(t("validator"))}</h3></div><strong id="validator-status">${h(t("status.blocked"))}</strong></header><div class="narrative-stage-fields">
         <label>${h(t("fields.verdict"))}<select id="validator-verdict"><option value="pass">${h(t("verdicts.pass"))}</option><option value="warning">${h(t("verdicts.warning"))}</option><option value="fail">${h(t("verdicts.fail"))}</option></select></label><label>${h(t("fields.summary"))}<textarea id="validator-summary"></textarea></label><label>${h(t("fields.customPrompt"))}<textarea id="validator-prompt"></textarea></label><ul id="validator-findings" class="validator-findings"></ul><label>${h(t("fields.overrideReason"))}<input id="validator-override" placeholder="${h(t("placeholders.override"))}" /></label>
        </div><p id="validator-provenance" class="narrative-provenance"></p><div class="narrative-stage-actions"><button id="validator-imagine" class="button secondary" type="button">${h(t("actions.audit"))}</button><label class="button ghost narrative-file">${h(t("actions.import"))}<input id="validator-import" type="file" accept=".json,.txt,.md" /></label><button id="validator-save" class="button ghost" type="button">${h(t("actions.save"))}</button><button id="validator-approve" class="button primary" type="button">${h(t("actions.approveGate"))}</button><button id="series-publish" class="button secondary" type="button">${h(t("actions.createEpisodes"))}</button></div></article>
       </div></section>
       <section data-author-panel="episode" class="hidden"><div class="episode-author">
        <article class="episode-author-card"><h3>${h(t("episode"))}</h3><p id="episode-author-state" class="muted">${h(t("hints.selectOrCreate"))}</p><div class="episode-author-fields">
         <label>${h(t("fields.title"))}<input id="episode-author-title" /></label><label>${h(t("fields.targetDuration"))}<input id="episode-author-duration" type="number" min="1" max="600" value="30" /></label><label>${h(t("fields.logline"))}<textarea id="episode-author-logline"></textarea></label><label>${h(t("fields.source"))}<textarea id="episode-author-source"></textarea></label><div class="episode-story-grid"><label>${h(t("fields.hook"))}<textarea id="episode-story-hook"></textarea></label><label>${h(t("fields.setup"))}<textarea id="episode-story-setup"></textarea></label><label>${h(t("fields.conflict"))}<textarea id="episode-story-conflict"></textarea></label><label>${h(t("fields.reveal"))}<textarea id="episode-story-reveal"></textarea></label><label>${h(t("fields.cliffhanger"))}<textarea id="episode-story-cliffhanger"></textarea></label></div><label>${h(t("fields.bibleCharacters"))}<input id="episode-author-characters" /></label><label>${h(t("fields.bibleLocations"))}<input id="episode-author-locations" /></label><label>${h(t("fields.customPrompt"))}<textarea id="episode-author-prompt"></textarea></label>
        </div><div id="episode-review-report" class="episode-review-report">${h(t("hints.noReview"))}</div><div class="episode-author-actions"><button id="episode-new" class="button ghost" type="button">${h(t("actions.newEpisode"))}</button><button id="episode-imagine" class="button secondary" type="button">${h(t("actions.imagine"))}</button><label class="button ghost narrative-file">${h(t("actions.import"))}<input id="episode-import" type="file" accept=".txt,.md,.json" /></label><button id="episode-save" class="button ghost" type="button">${h(t("actions.save"))}</button><button id="episode-apply-draft" class="button secondary" type="button">${h(t("actions.applyProposal"))}</button><button id="episode-review" class="button ghost" type="button">${h(t("actions.review"))}</button><button id="episode-approve" class="button primary" type="button">${h(t("actions.approve"))}</button><button id="episode-delete" class="button ghost" type="button">${h(t("actions.trash"))}</button></div></article>
        <article class="episode-author-card"><h3>${h(t("breakdown"))}</h3><p class="muted">${h(t("hints.editableBreakdown"))}</p><div id="breakdown-editor" class="breakdown-editor"></div><button id="breakdown-add" class="button ghost" type="button">${h(t("actions.addShot"))}</button><div class="episode-author-actions"><button id="breakdown-imagine" class="button secondary" type="button">${h(t("actions.generateBreakdown"))}</button><label class="button ghost narrative-file">${h(t("actions.import"))}<input id="breakdown-import" type="file" accept=".json" /></label><button id="breakdown-apply" class="button primary" type="button">${h(t("actions.applyBreakdown"))}</button></div></article>
       </div></section>
      </div></section>`;
  }

  function mount() {
    dialog = document.createElement("dialog"); dialog.id = "narrative-workflow-dialog"; dialog.className = "narrative-workflow-dialog"; dialog.setAttribute("aria-labelledby", "narrative-workflow-title"); dialog.innerHTML = markup(); document.body.append(dialog); bind();
  }

  const provenanceText = (stage) => {
    if (!stage?.provenance) return t("hints.noProvenance");
    const mode = t(`modes.${stage.provenance.mode}`);
    return `${t("provenanceLabel")} · ${[mode, stage.provenance.provider, stage.provenance.model, stage.provenance.source_label].filter(Boolean).join(" · ")}`;
  };
  function fillDirector(content = {}) { setValue("director-concept", content.concept); setValue("director-genre", content.genre); setValue("director-tone", content.tone); setValue("director-visual", content.visual_direction); setValue("director-duration", content.target_episode_duration || 45); setValue("director-themes", (content.themes || []).join("\n")); setValue("director-constraints", (content.constraints || []).join("\n")); setValue("director-rules", (content.narrative_rules || []).join("\n")); setValue("director-objectives", (content.series_objectives || []).join("\n")); }
  function directorContent() { return { concept: value("director-concept"), genre: value("director-genre"), tone: value("director-tone"), visual_direction: value("director-visual"), constraints: lines(value("director-constraints")), target_episode_duration: Number(value("director-duration")) || 45, themes: lines(value("director-themes")), narrative_rules: lines(value("director-rules")), series_objectives: lines(value("director-objectives")) }; }

  function episodeProposalCard(item = {}, index = 0) {
    const card = document.createElement("div"); card.className = "episode-proposal";
    card.innerHTML = `<div class="episode-proposal-row"><label>${h(t("fields.number"))}<input data-field="episode" type="number" min="1" /></label><label>${h(t("fields.title"))}<input data-field="title" /></label></div><label>${h(t("fields.logline"))}<textarea data-field="logline"></textarea></label><label>${h(t("fields.synopsis"))}<textarea data-field="synopsis"></textarea></label><label>${h(t("fields.cliffhanger"))}<textarea data-field="cliffhanger"></textarea></label><label>${h(t("fields.characterIds"))}<input data-field="characters" /></label><label>${h(t("fields.locationIds"))}<input data-field="locations" /></label><button type="button">${h(t("actions.remove"))}</button>`;
    const values = { episode: item.episode || index + 1, title: item.title || "", logline: item.logline || "", synopsis: item.synopsis || "", cliffhanger: item.cliffhanger || "", characters: (item.character_ids || []).join(", "), locations: (item.location_ids || []).join(", ") };
    Object.entries(values).forEach(([key, next]) => { card.querySelector(`[data-field="${key}"]`).value = next; });
    card.querySelector("button").addEventListener("click", () => card.remove()); return card;
  }
  function fillScreenwriter(content = {}) {
    setValue("screenwriter-arc", content.series_arc); setValue("screenwriter-characters", (content.character_progression || []).join("\n")); setValue("screenwriter-relationships", (content.relationship_progression || []).join("\n"));
    const list = dialog.querySelector("#series-episode-proposals"); list.replaceChildren(); (content.episodes || []).forEach((item, index) => list.append(episodeProposalCard(item, index)));
  }
  function screenwriterContent() {
    const episodes = Array.from(dialog.querySelectorAll(".episode-proposal")).map((card) => ({ season: 1, episode: Number(card.querySelector('[data-field="episode"]').value), title: card.querySelector('[data-field="title"]').value.trim(), logline: card.querySelector('[data-field="logline"]').value.trim(), synopsis: card.querySelector('[data-field="synopsis"]').value.trim(), cliffhanger: card.querySelector('[data-field="cliffhanger"]').value.trim(), character_ids: lines(card.querySelector('[data-field="characters"]').value), location_ids: lines(card.querySelector('[data-field="locations"]').value) }));
    return { series_arc: value("screenwriter-arc"), character_progression: lines(value("screenwriter-characters")), relationship_progression: lines(value("screenwriter-relationships")), episodes };
  }
  function fillValidator(content = {}) {
    setValue("validator-verdict", content.verdict || "pass"); setValue("validator-summary", content.summary); validatorFindings = content.findings || [];
    const list = dialog.querySelector("#validator-findings"); list.replaceChildren(); validatorFindings.forEach((finding) => { const item = document.createElement("li"); item.className = finding.severity; item.textContent = finding.title + " — " + finding.message; list.append(item); });
  }
  function refreshSeriesLabels() {
    for (const name of ["director", "screenwriter", "validator"]) {
      const stage = workflow?.[name] || { status: "empty" }; dialog.querySelector("#" + name + "-stage").dataset.status = stage.status;
      const upstreamBlocked = (name === "screenwriter" && workflow?.director?.status !== "approved") || (name === "validator" && workflow?.screenwriter?.status !== "approved");
      const status = upstreamBlocked && stage.status === "empty" ? "blocked" : stage.status;
      dialog.querySelector("#" + name + "-status").textContent = t(`status.${status}`);
      dialog.querySelector("#" + name + "-provenance").textContent = provenanceText(stage);
    }
  }
  function refreshSeries() {
    refreshSeriesLabels();
    fillDirector(workflow?.director?.content || {}); fillScreenwriter(workflow?.screenwriter?.content || {}); fillValidator(workflow?.validator?.content || {});
  }
  async function loadWorkflow() { workflow = await request("/api/narrative/series"); refreshSeries(); }
  async function imagineDirector() { const result = await request("/api/narrative/series/director/generate", json("POST", { source_text: value("director-concept"), prompt: value("director-prompt"), model: model() })); fillDirector(result.candidate); modes.director = "ai"; notify(t("messages.directorCandidate")); }
  async function saveDirector() { workflow = await request("/api/narrative/series/director", json("PUT", { content: directorContent(), mode: modes.director, prompt: value("director-prompt"), model: model() })); modes.director = "manual"; refreshSeries(); }
  async function imagineScreenwriter() { const result = await request("/api/narrative/series/screenwriter/generate", json("POST", { prompt: value("screenwriter-prompt"), model: model() })); fillScreenwriter(result.candidate); modes.screenwriter = "ai"; notify(t("messages.screenwriterCandidate")); }
  async function saveScreenwriter() { workflow = await request("/api/narrative/series/screenwriter", json("PUT", { content: screenwriterContent(), mode: modes.screenwriter, prompt: value("screenwriter-prompt"), model: model() })); modes.screenwriter = "manual"; refreshSeries(); }
  async function imagineValidator() { const result = await request("/api/narrative/series/validator/generate", json("POST", { prompt: value("validator-prompt"), model: model() })); fillValidator(result.candidate); modes.validator = "ai"; notify(t("messages.auditReady")); }
  async function saveValidator() { workflow = await request("/api/narrative/series/validator", json("PUT", { content: { verdict: value("validator-verdict"), summary: value("validator-summary"), findings: validatorFindings }, mode: modes.validator, prompt: value("validator-prompt"), model: model() })); modes.validator = "manual"; refreshSeries(); }
  async function approveStage(stage) { workflow = await request(`/api/narrative/series/${stage}/approve`, json("POST", { override_reason: stage === "validator" ? value("validator-override") : "" })); refreshSeries(); notify(t("messages.approved")); }
  async function publishEpisodes() { const result = await request("/api/narrative/series/publish", json("POST", {})); workflow = result.workflow; await window.SerreEpisode?.refresh?.(); notify(result.created_episode_ids.length ? t("messages.episodesCreated", { count: result.created_episode_ids.length }) : t("messages.episodesExist")); }

  function fillEpisode(episode = {}) {
    currentEpisode = episode.id ? episode : null; episodeReviewReport = null; setValue("episode-author-title", episode.title || t("defaultEpisodeTitle")); setValue("episode-author-duration", episode.duration_target || 30); setValue("episode-author-logline", episode.logline); setValue("episode-author-source", episode.narrative_source);
    for (const key of ["hook", "setup", "conflict", "reveal", "cliffhanger"]) setValue("episode-story-" + key, episode.story?.[key]);
    setValue("episode-author-characters", (episode.characters || []).join(", ")); setValue("episode-author-locations", (episode.locations || []).join(", "));
    dialog.querySelector("#episode-author-state").textContent = episode.id ? episode.id + " · " + t(`episodeStatus.${episode.status}`) : t("hints.newUnsaved"); dialog.querySelector("#episode-review-report").textContent = t("hints.noReview"); breakdownCandidate = []; renderBreakdown();
  }
  function episodeCandidate() { return { title: value("episode-author-title"), logline: value("episode-author-logline"), story: { hook: value("episode-story-hook"), setup: value("episode-story-setup"), conflict: value("episode-story-conflict"), reveal: value("episode-story-reveal"), cliffhanger: value("episode-story-cliffhanger") }, narrative_source: value("episode-author-source"), character_ids: lines(value("episode-author-characters")), location_ids: lines(value("episode-author-locations")) }; }
  async function loadCurrentEpisode() { const id = document.querySelector("#episode-select")?.value; if (!id) return fillEpisode({}); const data = await request("/api/episodes/" + id); fillEpisode(data.episode); }
  async function createEpisode() { const created = await request("/api/episodes", json("POST", { title: value("episode-author-title") || t("defaultEpisodeTitle"), concept: value("episode-author-source"), duration_target: Number(value("episode-author-duration")) || 30 })); fillEpisode(created); await window.SerreEpisode?.refresh?.(created.id); notify(t("messages.episodeCreated", { id: created.id })); return created; }
  async function saveEpisode() {
    if (!currentEpisode) return createEpisode(); const candidate = episodeCandidate();
    const saved = await request("/api/episodes/" + currentEpisode.id, json("PUT", { title: candidate.title, logline: candidate.logline, story: candidate.story, narrative_source: candidate.narrative_source, characters: candidate.character_ids, locations: candidate.location_ids, duration_target: Number(value("episode-author-duration")) || 30 }));
    fillEpisode(saved); await window.SerreEpisode?.refresh?.(saved.id); notify(t("messages.episodeSaved"));
  }
  async function imagineEpisode() { if (!currentEpisode) await createEpisode(); const result = await request(`/api/episodes/${currentEpisode.id}/draft/generate`, json("POST", { source_text: value("episode-author-source"), prompt: value("episode-author-prompt"), model: model() })); fillEpisode({ ...currentEpisode, ...result.candidate }); modes.episode = "ai"; notify(t("messages.episodeCandidate")); }
  async function applyEpisodeDraft() { if (!currentEpisode) throw new Error(t("errors.createFirst")); const saved = await request(`/api/episodes/${currentEpisode.id}/draft/apply`, json("POST", { candidate: episodeCandidate(), mode: modes.episode, prompt: value("episode-author-prompt"), model: model() })); modes.episode = "manual"; fillEpisode(saved); await window.SerreEpisode?.refresh?.(saved.id); notify(t("messages.draftApplied")); }
  function renderEpisodeReview() {
    const target = dialog.querySelector("#episode-review-report");
    if (!episodeReviewReport) { target.textContent = t("hints.noReview"); return; }
    const findings = episodeReviewReport.findings.map((item) => `• ${item.title} — ${item.recommendation}`).join("\n");
    target.textContent = t(`reviewStatus.${episodeReviewReport.status}`) + "\n" + (findings || t("messages.noInconsistency"));
  }
  async function reviewEpisode() { if (!currentEpisode) throw new Error(t("errors.createFirst")); episodeReviewReport = await request(`/api/episodes/${currentEpisode.id}/review`, json("POST", {})); renderEpisodeReview(); }
  async function approveEpisode() { if (!currentEpisode) throw new Error(t("errors.createFirst")); const saved = await request(`/api/episodes/${currentEpisode.id}/approve`, json("POST", {})); fillEpisode(saved); await window.SerreEpisode?.refresh?.(saved.id); notify(t("messages.episodeApproved")); }

  function shotCard(item = {}, index = 0) {
    const card = document.createElement("div"); card.className = "shot-blueprint";
    card.innerHTML = `<strong>${h(t("shotNumber", { number: String(index + 1).padStart(2, "0") }))}</strong><div class="shot-blueprint-row"><label>${h(t("fields.duration"))}<input data-shot="duration" type="number" min="1" max="12" step=".5" /></label><label>${h(t("fields.locationId"))}<input data-shot="location" /></label></div><label>${h(t("fields.characterIds"))}<input data-shot="characters" /></label><div class="shot-blueprint-row"><label>${h(t("fields.frame"))}<input data-shot="type" /></label><label>${h(t("fields.movement"))}<input data-shot="movement" /></label></div><label>${h(t("fields.action"))}<textarea data-shot="action"></textarea></label><label>${h(t("fields.shotSource"))}<textarea data-shot="source"></textarea></label><div class="shot-blueprint-row"><label>${h(t("fields.lighting"))}<input data-shot="lighting" /></label><label>${h(t("fields.mood"))}<input data-shot="mood" /></label></div><label>${h(t("fields.style"))}<input data-shot="style" /></label><div class="shot-blueprint-row"><label>${h(t("fields.speechMode"))}<select data-shot="mode"><option value="on_screen">${h(t("speechModes.on_screen"))}</option><option value="off_screen">${h(t("speechModes.off_screen"))}</option><option value="voice_over">${h(t("speechModes.voice_over"))}</option></select></label><label>${h(t("fields.optionalSpeaker"))}<input data-shot="speaker" /></label></div><label>${h(t("fields.dialogue"))}<textarea data-shot="dialogue"></textarea></label><div class="shot-blueprint-row"><label>${h(t("fields.intention"))}<input data-shot="intention" /></label><label>${h(t("fields.emotion"))}<input data-shot="emotion" /></label></div><button type="button">${h(t("actions.remove"))}</button>`;
    const values = { duration: item.duration || 4, location: item.location_id || "", characters: (item.character_ids || []).join(", "), type: item.shot_type || "medium", movement: item.camera_movement || "slow push-in", action: item.action || "", source: item.source_text || "", lighting: item.lighting || "cinematic low key", mood: item.mood || "tense", style: (item.style || ["cinematic"]).join(", "), mode: item.dialogue?.mode || "on_screen", speaker: item.dialogue?.speaker_id || "", dialogue: item.dialogue?.text || "", intention: item.dialogue?.intention || "", emotion: item.dialogue?.emotion || "" };
    Object.entries(values).forEach(([key, next]) => { card.querySelector(`[data-shot="${key}"]`).value = next; }); card.querySelector("button").addEventListener("click", () => card.remove()); return card;
  }
  function renderBreakdown() { const list = dialog.querySelector("#breakdown-editor"); list.replaceChildren(); if (!breakdownCandidate.length) { const empty = document.createElement("p"); empty.className = "narrative-empty"; empty.textContent = t("hints.noCandidateShot"); list.append(empty); return; } breakdownCandidate.forEach((item, index) => list.append(shotCard(item, index))); }
  function collectBreakdown() {
    return Array.from(dialog.querySelectorAll(".shot-blueprint")).map((card) => { const get = (name) => card.querySelector(`[data-shot="${name}"]`).value.trim(); const speaker = get("speaker"), text = get("dialogue"); return { source_text: get("source"), duration: Number(get("duration")), location_id: get("location"), character_ids: lines(get("characters")), shot_type: get("type"), camera_movement: get("movement"), lens: "50mm", action: get("action"), dialogue: speaker && text ? { speaker_id: speaker, text, mode: get("mode"), intention: get("intention"), emotion: get("emotion") } : null, lighting: get("lighting"), mood: get("mood"), style: lines(get("style")) }; });
  }
  async function imagineBreakdown() { if (!currentEpisode) throw new Error(t("errors.selectEpisode")); const result = await request(`/api/episodes/${currentEpisode.id}/breakdown/generate`, json("POST", { prompt: value("episode-author-prompt"), model: model() })); breakdownCandidate = result.candidate.shots; modes.breakdown = "ai"; renderBreakdown(); notify(t("messages.breakdownCandidate")); }
  async function applyBreakdown() { if (!currentEpisode) throw new Error(t("errors.selectEpisode")); const result = await request(`/api/episodes/${currentEpisode.id}/breakdown/apply`, json("POST", { candidate: { shots: collectBreakdown() }, mode: modes.breakdown, prompt: value("episode-author-prompt"), model: model() })); modes.breakdown = "manual"; const id = currentEpisode.id; fillEpisode(result.episode); await window.SerreEpisode?.refresh?.(id); dialog.close(); notify(t("messages.shotsCreated", { count: result.shots.length })); }

  async function importFile(input, apply) { const file = input.files?.[0]; if (!file) return; const text = await file.text(); let data = text; try { data = JSON.parse(text); } catch (_error) { /* plain text */ } apply(data, file.name); input.value = ""; }
  function bindImport(id, apply) { dialog.querySelector("#" + id).addEventListener("change", (event) => importFile(event.target, apply).catch((error) => notify(error.message, true))); }
  const safe = (action) => () => Promise.resolve(action()).catch((error) => notify(error.message, true));

  function bind() {
    dialog.querySelector("#narrative-close").addEventListener("click", () => dialog.close()); dialog.querySelectorAll("[data-author-tab]").forEach((button) => button.addEventListener("click", () => showTab(button.dataset.authorTab)));
    dialog.querySelector("#narrative-model-manage").addEventListener("click", () => {
      dialog.close();
      window.dispatchEvent(new CustomEvent("studio:model-manager-open", {
        detail: { provider: "ollama", recommendedModel: modelStatus?.recommended_model || "qwen3:4b", attention: true },
      }));
    });
    dialog.querySelector("#director-imagine").addEventListener("click", safe(imagineDirector)); dialog.querySelector("#director-save").addEventListener("click", safe(saveDirector)); dialog.querySelector("#director-approve").addEventListener("click", safe(() => approveStage("director")));
    dialog.querySelector("#screenwriter-imagine").addEventListener("click", safe(imagineScreenwriter)); dialog.querySelector("#screenwriter-save").addEventListener("click", safe(saveScreenwriter)); dialog.querySelector("#screenwriter-approve").addEventListener("click", safe(() => approveStage("screenwriter"))); dialog.querySelector("#series-add-episode").addEventListener("click", () => dialog.querySelector("#series-episode-proposals").append(episodeProposalCard({}, dialog.querySelectorAll(".episode-proposal").length)));
    dialog.querySelector("#validator-imagine").addEventListener("click", safe(imagineValidator)); dialog.querySelector("#validator-save").addEventListener("click", safe(saveValidator)); dialog.querySelector("#validator-approve").addEventListener("click", safe(() => approveStage("validator"))); dialog.querySelector("#series-publish").addEventListener("click", safe(publishEpisodes));
    dialog.querySelector("#episode-new").addEventListener("click", () => fillEpisode({})); dialog.querySelector("#episode-save").addEventListener("click", safe(saveEpisode)); dialog.querySelector("#episode-imagine").addEventListener("click", safe(imagineEpisode)); dialog.querySelector("#episode-apply-draft").addEventListener("click", safe(applyEpisodeDraft)); dialog.querySelector("#episode-review").addEventListener("click", safe(reviewEpisode)); dialog.querySelector("#episode-approve").addEventListener("click", safe(approveEpisode));
    dialog.querySelector("#episode-delete").addEventListener("click", safe(async () => { if (!currentEpisode || !window.confirm(t("errors.confirmTrash", { id: currentEpisode.id }))) return; await request("/api/episodes/" + currentEpisode.id, { method: "DELETE" }); fillEpisode({}); await window.SerreEpisode?.refresh?.(); notify(t("messages.trashed")); }));
    dialog.querySelector("#breakdown-add").addEventListener("click", () => { breakdownCandidate = collectBreakdown(); breakdownCandidate.push({}); renderBreakdown(); }); dialog.querySelector("#breakdown-imagine").addEventListener("click", safe(imagineBreakdown)); dialog.querySelector("#breakdown-apply").addEventListener("click", safe(applyBreakdown));
    bindImport("director-import", (data, name) => { if (typeof data === "string") fillDirector({ ...directorContent(), concept: data }); else fillDirector(data.content || data); modes.director = "import"; setValue("director-prompt", t("importLabel", { name })); });
    bindImport("screenwriter-import", (data, name) => { if (typeof data === "string") setValue("screenwriter-arc", data); else fillScreenwriter(data.content || data); modes.screenwriter = "import"; setValue("screenwriter-prompt", t("importLabel", { name })); });
    bindImport("validator-import", (data, name) => { if (typeof data === "string") fillValidator({ verdict: "pass", summary: data, findings: [] }); else fillValidator(data.content || data); modes.validator = "import"; setValue("validator-prompt", t("importLabel", { name })); });
    bindImport("episode-import", (data, name) => { if (typeof data === "string") setValue("episode-author-source", data); else fillEpisode({ ...currentEpisode, ...(data.episode || data) }); modes.episode = "import"; setValue("episode-author-prompt", t("importLabel", { name })); });
    bindImport("breakdown-import", (data) => { breakdownCandidate = data.shots || data.candidate?.shots || []; modes.breakdown = "import"; renderBreakdown(); });
  }
  function showTab(tab) { dialog.querySelectorAll("[data-author-tab]").forEach((button) => button.classList.toggle("selected", button.dataset.authorTab === tab)); dialog.querySelectorAll("[data-author-panel]").forEach((panel) => panel.classList.toggle("hidden", panel.dataset.authorPanel !== tab)); if (tab === "episode") loadCurrentEpisode().catch((error) => notify(error.message, true)); }
  function renderModelStatus() {
    if (!dialog) return;
    const select = dialog.querySelector("#narrative-model");
    const manage = dialog.querySelector("#narrative-model-manage");
    const missing = !modelStatus?.ready || !modelStatus?.selected_model;
    if (select?.options.length === 1 && !select.value) {
      select.options[0].textContent = t(modelStatus?.ollama_ready ? "narrativeModelMissing" : "ollamaOffline");
    }
    if (!modelStatus && select?.options.length === 1 && !select.value) select.options[0].textContent = t("ollamaOffline");
    manage?.classList.toggle("hidden", !missing);
    const copy = dialog.querySelector("#narrative-model-manage-copy");
    if (copy) copy.textContent = t(modelStatus?.ollama_ready ? "narrativeModelMissing" : "ollamaOffline");
    const action = manage?.querySelector("strong");
    if (action) action.textContent = `${t("manageModels")} →`;
  }
  async function loadModels() {
    modelStatus = await request("/api/narrative/status");
    const select = dialog.querySelector("#narrative-model");
    select.replaceChildren();
    if (!modelStatus.ready || !modelStatus.selected_model) select.append(new Option("", ""));
    else { modelStatus.models.forEach((item) => select.append(new Option(item.name, item.name))); select.value = modelStatus.selected_model; }
    renderModelStatus();
  }
  async function open(tab = "series") { if (!dialog) mount(); dialog.showModal(); showTab(tab); await Promise.allSettled([loadWorkflow(), loadModels()]); }
  function relocalize() {
    if (!dialog) return;
    refreshSeriesLabels();
    if (currentEpisode) dialog.querySelector("#episode-author-state").textContent = `${currentEpisode.id} · ${t(`episodeStatus.${currentEpisode.status}`)}`;
    else dialog.querySelector("#episode-author-state").textContent = t("hints.newUnsaved");
    renderEpisodeReview();
    if (dialog.querySelector(".shot-blueprint")) breakdownCandidate = collectBreakdown();
    renderBreakdown();
    renderModelStatus();
  }
  openButton.addEventListener("click", () => open("series")); window.addEventListener("studio:project-changed", () => { workflow = null; currentEpisode = null; if (dialog?.open) loadWorkflow().catch((error) => notify(error.message, true)); });
  window.addEventListener("studio:narrative-models-changed", () => { if (dialog?.open) loadModels().catch((error) => notify(error.message, true)); });
  window.addEventListener("serre:i18n-changed", relocalize);
  window.SerreNarrativeWorkflow = Object.freeze({ open }); return { open };
})();
