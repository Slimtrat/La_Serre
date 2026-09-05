const guidedWorkspace = (() => {
  const root = document.querySelector("#guided-workspace");
  if (!root) return null;
  const STAGES = [
    ["idea", "Idée", "Décris l’envie"],
    ["universe", "Univers", "Pose les personnages"],
    ["episode", "Épisode", "Écris et valide"],
    ["storyboard", "Storyboard", "Découpe en plans"],
    ["production", "Production", "Génère les médias"],
    ["result", "Résultat", "Regarde et itère"],
  ];
  const LIST_FIELDS = new Set(["signature_details", "palette", "wants", "fears"]);
  let payload = null;
  let episodes = [];
  let bible = { characters: [], locations: [] };
  let mediaStatus = null;
  let activeStage = 0;
  let activeProposal = null;
  let autopilotRun = null;
  let autopilotTimer = null;
  let autopilotSeen = new Map();

  function h(value) {
    return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
  }
  function lines(value) {
    return String(value || "").split(/\r?\n|,/).map((item) => item.trim()).filter(Boolean);
  }
  function request(path, options = {}) {
    return fetch(path, options).then(async (response) => {
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        const detail = typeof body.detail === "string" ? body.detail : body.detail?.message;
        throw new Error(detail || `HTTP ${response.status}`);
      }
      return body;
    });
  }
  function json(method, body) {
    return { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) };
  }
  function notify(message, error = false) {
    window.SerreStudio?.notify?.(message, error);
  }
  function currentEpisode() {
    return episodes.find((item) => item.id === payload?.state?.active_episode_id) || null;
  }
  function stageStates() {
    const episode = currentEpisode();
    const approved = ["approved", "breakdown", "production", "final"].includes(episode?.status);
    return [
      Boolean(payload?.completion?.brief?.ready),
      Boolean(payload?.completion?.universe?.ready),
      approved,
      Boolean(episode?.shot_count),
      Boolean(mediaStatus?.exists || mediaStatus?.video),
      Boolean(mediaStatus?.video),
    ];
  }
  function nextIncomplete() {
    const index = stageStates().findIndex((ready) => !ready);
    return index < 0 ? 5 : index;
  }
  function completionPercent() {
    const states = stageStates();
    return Math.round(states.filter(Boolean).length / states.length * 100);
  }

  function shellMarkup() {
    return `<div class="guided-shell">
      <header class="guided-header">
        <div><p class="eyebrow">CRÉATION GUIDÉE</p><h1 id="guided-title">Ton épisode, de l’idée au rendu</h1><p>Tu gardes la décision. L’IA propose, le Studio montre les conséquences.</p></div>
        <div class="guided-header-actions"><div class="guided-progress"><strong data-guided-progress-label></strong><span class="guided-progress-track"><i data-guided-progress-bar></i></span></div><button class="button secondary" type="button" data-guided-action="autopilot">✦ Imaginer tout le parcours</button><button class="button ghost" type="button" data-guided-action="advanced">Tout le parcours dans le graphe ↗</button></div>
      </header>
      <nav class="guided-journey" aria-label="Parcours de création"></nav>
      <section class="guided-autopilot hidden" aria-live="polite"></section>
      <div class="guided-main"><section class="guided-stage" aria-live="polite"></section><aside class="guided-context"></aside></div>
    </div>
    <div class="guided-proposal-backdrop hidden" data-proposal-close></div>
    <aside class="guided-proposal hidden" aria-labelledby="guided-proposal-title">
      <header><div><p class="eyebrow">PROPOSITION · NON APPLIQUÉE</p><strong id="guided-proposal-title">Avant / après</strong></div><button class="button ghost" type="button" data-proposal-close>×</button></header>
      <div class="guided-proposal-body"></div>
      <footer><small data-proposal-model></small><div><button class="button ghost" type="button" data-proposal-reject>Refuser</button> <button class="button primary" type="button" data-proposal-accept>Appliquer mes modifications</button></div></footer>
    </aside>`;
  }

  function renderJourney() {
    const states = stageStates();
    const nav = root.querySelector(".guided-journey");
    nav.innerHTML = STAGES.map((stage, index) => `<button class="guided-node ${states[index] ? "ready" : ""} ${index === activeStage ? "active" : ""}" type="button" data-guided-stage="${index}" data-index="${String(index + 1).padStart(2, "0")}"><strong>${stage[1]}</strong><small>${states[index] ? "Validé" : stage[2]}</small></button>`).join("");
    const percent = completionPercent();
    root.querySelector("[data-guided-progress-label]").textContent = `${percent} % du parcours`;
    root.querySelector("[data-guided-progress-bar]").style.width = `${percent}%`;
  }

  function stageHeading(index, title, copy, ready) {
    return `<header class="guided-stage-heading"><div><p class="eyebrow">ÉTAPE ${String(index + 1).padStart(2, "0")}</p><h2>${h(title)}</h2><p>${h(copy)}</p></div><span class="guided-stage-badge ${ready ? "ready" : ""}">${ready ? "PRÊT" : "EN COURS"}</span></header>`;
  }
  function candidateRows(value, prefix = "", depth = 0) {
    if (depth > 2 || value === null || value === undefined) return [];
    if (Array.isArray(value)) {
      if (value.every((item) => typeof item !== "object")) {
        return [[prefix, value.join(" · ")]];
      }
      return value.slice(0, 8).flatMap((item, index) => candidateRows(item, `${prefix} ${index + 1}`, depth + 1));
    }
    if (typeof value === "object") {
      return Object.entries(value).flatMap(([key, item]) => candidateRows(item, prefix ? `${prefix} · ${key}` : key, depth + 1));
    }
    return [[prefix, String(value)]];
  }
  function renderAutopilot() {
    const panel = root.querySelector(".guided-autopilot");
    if (!panel) return;
    panel.classList.toggle("hidden", !autopilotRun);
    if (!autopilotRun) { panel.innerHTML = ""; return; }
    const completed = autopilotRun.stages.filter((stage) => stage.status === "completed").length;
    panel.innerHTML = `<header><div><p class="eyebrow">PARCOURS IA · CANDIDATS NON PUBLIÉS</p><h3>${autopilotRun.status === "completed" ? "Le parcours proposé est prêt à relire" : autopilotRun.status === "failed" ? "Le parcours s’est arrêté" : "Les IA construisent le projet étape par étape"}</h3></div><strong>${completed} / ${autopilotRun.stages.length}</strong></header><div class="guided-autopilot-track">${autopilotRun.stages.map((stage, index) => {
      const rows = candidateRows(stage.candidate).slice(0, 14);
      return `<article class="guided-autopilot-step ${stage.status}" data-autopilot-stage="${stage.id}"><span>${String(index + 1).padStart(2, "0")}</span><div><strong>${h(stage.label)}</strong><small>${h(stage.error || stage.summary || (stage.status === "running" ? "L’IA utilise la Bible et les étapes précédentes…" : "En attente"))}</small>${rows.length ? `<details><summary>Lire la proposition</summary><dl>${rows.map(([key, value]) => `<div><dt>${h(key.replaceAll("_", " "))}</dt><dd>${h(value)}</dd></div>`).join("")}</dl></details>` : ""}</div></article>`;
    }).join("")}</div>`;
  }
  function lock(field, locked) {
    return `<span class="guided-lock"><input type="checkbox" data-lock-field="${field}" ${locked ? "checked" : ""}/> verrouiller</span>`;
  }
  function aiActions(target) {
    return `<div class="guided-ai-actions">
      <button class="button ghost" type="button" data-ai-mode="improve" data-ai-target="${target}">Améliorer</button>
      <button class="button ghost" type="button" data-ai-mode="fill_missing" data-ai-target="${target}">Compléter les manques</button>
      <button class="button secondary" type="button" data-ai-mode="prepare_next" data-ai-target="${target}">Préparer la suite</button>
    </div>`;
  }
  function delegatedAiActions(step) {
    return `<div class="guided-ai-actions"><button class="button secondary" type="button" data-guided-action="coauthor" data-coauthor-step="${step}">✦ Imaginer cette étape avec le contexte actuel</button><button class="button ghost" type="button" data-guided-action="coherence">Vérifier la cohérence</button></div>`;
  }

  function renderBrief() {
    const brief = payload.state.brief;
    const locked = new Set(brief.locked_fields || []);
    const ready = payload.completion.brief.ready;
    return stageHeading(0, "Commence par l’envie", "Quelques phrases suffisent. Le brouillon peut rester incomplet aussi longtemps que tu veux.", ready) +
      `<form class="guided-form" data-guided-form="brief">
        <label>Titre de travail ${lock("working_title", locked.has("working_title"))}<input data-brief="working_title" value="${h(brief.working_title)}" placeholder="Ex. La Serre des Venins" /></label>
        <label>Genre ${lock("genre", locked.has("genre"))}<input data-brief="genre" value="${h(brief.genre)}" placeholder="Fantasy gothique, dark romance…" /></label>
        <label class="wide">Ton idée ${lock("idea", locked.has("idea"))}<textarea data-brief="idea" placeholder="Qui veut quoi, et quel est le prix à payer ?">${h(brief.idea)}</textarea></label>
        <label>Ton ${lock("tone", locked.has("tone"))}<input data-brief="tone" value="${h(brief.tone)}" placeholder="Fun, séduisant, légèrement glauque…" /></label>
        <label>Public ${lock("audience", locked.has("audience"))}<input data-brief="audience" value="${h(brief.audience)}" placeholder="Format et public visés" /></label>
        <label>Titre du premier épisode ${lock("episode_title", locked.has("episode_title"))}<input data-brief="episode_title" value="${h(brief.episode_title)}" /></label>
        <label>Promesse du premier épisode ${lock("episode_concept", locked.has("episode_concept"))}<textarea data-brief="episode_concept">${h(brief.episode_concept)}</textarea></label>
      </form><div class="guided-actions"><button class="button primary" type="button" data-guided-action="save-brief">Enregistrer le brouillon</button><button class="button ghost" type="button" data-guided-next="1">Continuer vers l’univers →</button></div>${aiActions("brief")}`;
  }

  function characterCard(character) {
    const completion = payload.completion.characters.find((item) => item.id === character.id);
    const locked = new Set(character.locked_fields || []);
    const field = (name, label, value, wide = false, textarea = false) => `<label class="${wide ? "wide" : ""}">${label} ${lock(name, locked.has(name))}${textarea ? `<textarea data-character-field="${name}">${h(value)}</textarea>` : `<input data-character-field="${name}" value="${h(value)}" />`}</label>`;
    return `<article class="guided-character" data-character-id="${character.id}"><header><div><strong>${h(character.name || "Nouveau personnage")}</strong><small>${completion?.ready ? "Fiche prête pour la Bible" : `Encore ${completion?.missing?.length || 0} point(s) à préciser`}</small></div><span class="guided-stage-badge ${character.promoted_revision ? "ready" : ""}">${character.promoted_revision ? "DANS LA BIBLE" : "BROUILLON"}</span></header><div class="guided-form">
      ${field("name", "Nom", character.name)}${field("role", "Rôle dramatique", character.role)}
      ${field("visual_description", "Apparence visuelle", character.visual_description, true, true)}
      ${field("wardrobe", "Tenue canonique", character.wardrobe, true, true)}
      ${field("signature_details", "Détails signature — séparés par des virgules", character.signature_details.join(", "))}
      ${field("palette", "Palette — 3 couleurs minimum", character.palette.join(", "))}
      ${field("personality", "Personnalité", character.personality, true, true)}
      ${field("wants", "Ce qu’iel désire", character.wants.join(", "))}${field("fears", "Ce qu’iel redoute", character.fears.join(", "))}
      ${field("voice_description", "Voix et jeu", character.voice_description, true, true)}
      ${field("generation_negative_prompt", "À éviter visuellement (optionnel)", character.generation_negative_prompt, true, true)}
      </div><div class="guided-character-actions"><button class="button primary" type="button" data-character-action="save">Enregistrer</button><button class="button secondary" type="button" data-character-action="promote" ${completion?.ready ? "" : "disabled"}>Ajouter à la Bible</button><button class="button ghost" type="button" data-character-action="delete">Retirer</button></div>${aiActions(`character:${character.id}`)}</article>`;
  }

  function renderUniverse() {
    const ready = payload.completion.universe.ready;
    const list = payload.state.characters.length
      ? `<div class="guided-character-list">${payload.state.characters.map(characterCard).join("")}</div>`
      : `<div class="guided-empty"><strong>Le casting est encore vide.</strong><p>Crée une silhouette, même incomplète. Tu pourras la préciser plus tard ou demander à l’IA.</p></div>`;
    return stageHeading(1, "Qui porte l’histoire ?", "Les fiches restent des brouillons jusqu’à leur publication dans la Bible canonique.", ready) + list + `<div class="guided-actions"><button class="button primary" type="button" data-guided-action="add-character">＋ Ajouter un personnage</button><button class="button ghost" type="button" data-guided-next="2">Continuer vers l’épisode →</button></div>`;
  }

  function renderEpisode() {
    const episode = currentEpisode();
    const options = episodes.map((item) => `<option value="${item.id}" ${episode?.id === item.id ? "selected" : ""}>${item.id} · ${h(item.title)}</option>`).join("");
    const body = episode
      ? `<div class="guided-status-card"><p class="eyebrow">ÉPISODE LIÉ</p><h3>${episode.id} · ${h(episode.title)}</h3><p>${h(episode.logline || "Le texte peut encore être développé.")}</p><span class="guided-stage-badge">${h(episode.status)}</span></div><div class="guided-actions"><button class="button primary" type="button" data-guided-action="open-writing">Écrire et valider sans JSON</button><button class="button ghost" type="button" data-guided-action="unlink-episode">Changer d’épisode</button></div>`
      : `<div class="guided-status-card"><h3>Créer ou reprendre un épisode</h3><p>Le titre et la promesse préparés à l’étape 1 seront utilisés pour le nouveau brouillon.</p><label>Épisode existant<select id="guided-episode-select"><option value="">Choisir…</option>${options}</select></label><div class="guided-actions"><button class="button secondary" type="button" data-guided-action="link-episode">Ouvrir la sélection</button><button class="button primary" type="button" data-guided-action="create-episode">Créer mon premier épisode</button></div></div>`;
    return stageHeading(2, "Écris l’épisode", "Le Studio accepte l’incomplet, puis exige une validation de cohérence avant le storyboard.", stageStates()[2]) + body + delegatedAiActions("episode");
  }

  function renderStoryboard() {
    const episode = currentEpisode();
    const shotCount = episode?.shot_count || 0;
    return stageHeading(3, "Transforme le texte en actions", "Chaque plan décrit l’action, le dialogue, l’intention et trois poses visuelles. La gate reste humaine.", Boolean(shotCount)) + `<div class="guided-status-card"><h3>${shotCount ? `${shotCount} plan(s) prêt(s)` : "Aucun plan pour l’instant"}</h3><p>${episode ? (episode.status === "approved" ? "L’écriture est approuvée : le découpage est déverrouillé." : "Valide d’abord l’épisode pour garantir une base cohérente.") : "Lie d’abord un épisode au parcours."}</p></div><div class="guided-actions"><button class="button primary" type="button" data-guided-action="open-storyboard" ${episode ? "" : "disabled"}>Découper visuellement</button><button class="button ghost" type="button" data-guided-next="4">Voir la production →</button></div>${delegatedAiActions("storyboard")}`;
  }

  function renderProduction() {
    const episode = currentEpisode();
    return stageHeading(4, "Produis sans perdre le fil", "Le parcours visualise ce que chaque recette reçoit et transmet; le graphe avancé permet d’inspecter tous ses nœuds.", stageStates()[4]) + `<div class="guided-status-card"><h3>${episode?.shot_count ? "Les plans peuvent entrer en production" : "Le storyboard doit encore être validé"}</h3><p>Images de pose, mouvement, voix émotionnelles, musique, sous-titres puis montage final : chaque sortie reste remplaçable.</p></div><div id="guided-template-catalogue"></div><div class="guided-actions"><button class="button primary" type="button" data-guided-action="open-production" ${episode?.shot_count ? "" : "disabled"}>Ouvrir le graphe de production</button><button class="button ghost" type="button" data-guided-next="5">Voir le résultat →</button></div>${delegatedAiActions("production")}`;
  }

  function renderResult() {
    return stageHeading(5, "Regarde, compare, recommence", "La sortie finale n’efface jamais tes sources ni tes versions précédentes.", stageStates()[5]) + `<div class="guided-status-card"><h3>${mediaStatus?.video ? "L’épisode final est disponible" : "Le rendu final apparaîtra ici"}</h3><p>${mediaStatus?.video ? "Tu peux le lire, vérifier les sous-titres et créer une nouvelle variante." : "Termine les plans dans le graphe de production; la progression restera visible en bas de l’écran."}</p></div><div class="guided-actions"><button class="button primary" type="button" data-guided-action="open-results">Ouvrir les sorties</button><button class="button ghost" type="button" data-guided-next="0">Revenir à l’idée</button></div>${delegatedAiActions("result")}`;
  }

  function renderContext() {
    const episode = currentEpisode();
    const missing = activeStage === 0 ? payload.completion.brief.missing : activeStage === 1 ? payload.completion.universe.missing : [];
    root.querySelector(".guided-context").innerHTML = `<p class="eyebrow">CONTEXTE UTILISÉ PAR L’IA</p><h3>Ce que le Studio transmet</h3><ul class="guided-context-list"><li><strong>Projet</strong>${h(payload.state.brief.working_title || "Sans titre")} · révision ${payload.state.revision}</li><li><strong>Intention</strong>${h(payload.state.brief.idea || "Pas encore décrite")}</li><li><strong>Bible</strong>${payload.state.characters.length} personnage(s) en travail · ${bible.characters.length} personnage(s) et ${bible.locations.length} lieu(x) canoniques</li><li><strong>Épisode actif</strong>${episode ? `${episode.id} · ${h(episode.title)} · ${episode.status}` : "Aucun épisode lié"}</li></ul><div class="guided-next"><strong>Prochaine action utile</strong><br>${missing.length ? `Compléter : ${h(missing.join(", "))}` : h(STAGES[Math.min(5, nextIncomplete())][2])}</div>`;
  }

  function render() {
    if (!payload) return;
    renderJourney();
    renderAutopilot();
    const renderers = [renderBrief, renderUniverse, renderEpisode, renderStoryboard, renderProduction, renderResult];
    root.querySelector(".guided-stage").innerHTML = renderers[activeStage]();
    const templateRoot = root.querySelector("#guided-template-catalogue");
    if (templateRoot) window.SerreWorkflowTemplates?.mountGuided?.(templateRoot);
    renderContext();
  }

  function collectBrief() {
    const brief = { ...payload.state.brief };
    root.querySelectorAll("[data-brief]").forEach((field) => { brief[field.dataset.brief] = field.value.trim(); });
    brief.locked_fields = Array.from(root.querySelectorAll('[data-guided-form="brief"] [data-lock-field]:checked')).map((field) => field.dataset.lockField);
    return brief;
  }
  function collectCharacter(card) {
    const source = payload.state.characters.find((item) => item.id === card.dataset.characterId);
    const character = { ...source };
    card.querySelectorAll("[data-character-field]").forEach((field) => {
      const name = field.dataset.characterField;
      character[name] = LIST_FIELDS.has(name) ? lines(field.value) : field.value.trim();
    });
    character.locked_fields = Array.from(card.querySelectorAll("[data-lock-field]:checked")).map((field) => field.dataset.lockField);
    return character;
  }
  async function saveBrief() {
    payload = await request("/api/guided/brief", json("PUT", { expected_revision: payload.state.revision, brief: collectBrief() }));
    render(); notify("Brouillon enregistré. Tu peux reprendre exactement ici plus tard.");
  }
  async function saveCharacter(card) {
    const character = collectCharacter(card);
    payload = await request(`/api/guided/characters/${character.id}`, json("PUT", { expected_revision: payload.state.revision, character }));
    render(); notify("Personnage enregistré comme brouillon.");
  }
  async function addCharacter() {
    payload = await request("/api/guided/characters", json("POST", { expected_revision: payload.state.revision }));
    render(); root.querySelector(".guided-character:last-of-type input")?.focus();
  }
  async function deleteCharacter(card) {
    if (!window.confirm("Retirer ce brouillon du parcours ?")) return;
    payload = await request(`/api/guided/characters/${card.dataset.characterId}?expected_revision=${payload.state.revision}`, { method: "DELETE" });
    render();
  }
  async function promoteCharacter(card) {
    const latest = collectCharacter(card);
    if (JSON.stringify(latest) !== JSON.stringify(payload.state.characters.find((item) => item.id === latest.id))) await saveCharacter(card);
    payload = await request(`/api/guided/characters/${latest.id}/promote`, json("POST", { expected_revision: payload.state.revision }));
    render(); notify("Personnage publié dans la Bible canonique.");
  }
  async function linkEpisode(episodeId) {
    payload = await request("/api/guided/episode-link", json("PUT", { expected_revision: payload.state.revision, episode_id: episodeId || null }));
    await loadMedia(); render();
  }
  async function createEpisode() {
    await saveBrief();
    const brief = payload.state.brief;
    const created = await request("/api/episodes", json("POST", { title: brief.episode_title || "Épisode sans titre", concept: brief.episode_concept || brief.idea, duration_target: 30 }));
    await loadEpisodes(); await linkEpisode(created.id); await window.SerreEpisode?.refresh?.(created.id);
    notify(`${created.id} créé. Tu peux maintenant l’écrire.`);
  }

  async function generateProposal(target, mode, button) {
    button.disabled = true;
    const jobId = `guided-ai-${Date.now()}`;
    window.dispatchEvent(new CustomEvent("studio:stage-job", { detail: { id: jobId, kind: "prompt", status: "GENERATING", message: "L’IA relit le contexte du parcours…" } }));
    try {
      const result = await request("/api/guided/proposals", json("POST", { expected_revision: payload.state.revision, target, mode, locale: window.SerreI18n?.getLanguage?.() === "en" ? "en" : "fr", model: document.querySelector("#ollama-model")?.value || null }));
      activeProposal = result.proposal; showProposal();
      window.dispatchEvent(new CustomEvent("studio:stage-job", { detail: { id: jobId, kind: "prompt", status: "COMPLETED", message: "Proposition prête à comparer." } }));
    } catch (error) {
      window.dispatchEvent(new CustomEvent("studio:stage-job", { detail: { id: jobId, kind: "prompt", status: "FAILED", message: error.message } }));
      notify(error.message, true);
    } finally { button.disabled = false; }
  }
  function displayValue(value) { return Array.isArray(value) ? value.join("\n") : String(value ?? ""); }
  function showProposal() {
    const drawer = root.querySelector(".guided-proposal");
    const backdrop = root.querySelector(".guided-proposal-backdrop");
    const changes = Object.keys(activeProposal.after).filter((key) => JSON.stringify(activeProposal.before[key]) !== JSON.stringify(activeProposal.after[key]) && key !== "locked_fields" && key !== "promoted_revision" && key !== "id");
    root.querySelector(".guided-proposal-body").innerHTML = changes.length ? changes.map((key) => `<label class="guided-diff"><small>${h(key.replaceAll("_", " "))}</small><p class="guided-before">${h(displayValue(activeProposal.before[key]) || "(vide)")}</p><textarea data-proposal-field="${key}" data-proposal-list="${Array.isArray(activeProposal.after[key])}">${h(displayValue(activeProposal.after[key]))}</textarea></label>`).join("") : `<p class="guided-empty">Cette proposition ne change aucun champ.</p>`;
    root.querySelector("[data-proposal-model]").textContent = `Ollama · ${activeProposal.model} · base r${activeProposal.base_revision}`;
    drawer.classList.remove("hidden"); backdrop.classList.remove("hidden");
  }
  function closeProposal() {
    root.querySelector(".guided-proposal")?.classList.add("hidden");
    root.querySelector(".guided-proposal-backdrop")?.classList.add("hidden");
    activeProposal = null;
  }
  async function acceptProposal() {
    const after = structuredClone(activeProposal.after);
    root.querySelectorAll("[data-proposal-field]").forEach((field) => { after[field.dataset.proposalField] = field.dataset.proposalList === "true" ? lines(field.value) : field.value.trim(); });
    payload = await request(`/api/guided/proposals/${activeProposal.id}/accept`, json("POST", { expected_revision: payload.state.revision, edited_after: after }));
    closeProposal(); render(); notify("Proposition appliquée et historisée.");
  }
  async function rejectProposal() {
    await request(`/api/guided/proposals/${activeProposal.id}/reject`, { method: "POST" });
    closeProposal(); notify("Proposition refusée. Le brouillon n’a pas changé.");
  }

  async function loadEpisodes() {
    const result = await request("/api/episodes"); episodes = result.episodes || [];
  }
  async function loadMedia() {
    mediaStatus = null;
    if (!payload?.state?.active_episode_id) return;
    try { mediaStatus = await request(`/api/episodes/${payload.state.active_episode_id}/media-status`); } catch (_error) { mediaStatus = null; }
  }
  async function load() {
    const [guided, biblePayload, , latestAutopilot] = await Promise.all([
      request("/api/guided"),
      request("/api/bible"),
      loadEpisodes(),
      request("/api/guided/autopilot-jobs/latest").catch(() => ({ run: null })),
    ]);
    payload = guided;
    bible = biblePayload;
    autopilotRun = latestAutopilot.run;
    await loadMedia();
    if (!Number.isInteger(activeStage)) activeStage = nextIncomplete();
    render();
    if (autopilotRun && ["queued", "running"].includes(autopilotRun.status)) scheduleAutopilotPoll();
  }
  function goTo(index) {
    activeStage = Math.max(0, Math.min(STAGES.length - 1, Number(index)));
    render();
  }
  async function selectTemplate(stage, templateId) {
    payload = await request("/api/guided/template-selection", json("PUT", {
      expected_revision: payload.state.revision,
      stage,
      template_id: templateId,
    }));
    render();
    return payload;
  }
  function emitAutopilotProgress(run) {
    run.stages.forEach((stage) => {
      const previous = autopilotSeen.get(stage.id);
      if (previous === stage.status) return;
      autopilotSeen.set(stage.id, stage.status);
      window.dispatchEvent(new CustomEvent("studio:guided-autopilot-stage", { detail: { run_id: run.id, stage_id: stage.id, label: stage.label, status: stage.status, summary: stage.summary || stage.error || "" } }));
    });
    const active = run.stages.find((stage) => stage.status === "running");
    const status = run.status === "completed" ? "COMPLETED" : run.status === "failed" ? "FAILED" : "GENERATING";
    window.dispatchEvent(new CustomEvent("studio:stage-job", { detail: { id: `guided-autopilot-${run.id}`, kind: "prompt", status, message: active ? `IA · ${active.label}` : run.status === "completed" ? "Parcours IA prêt à relire." : "Parcours IA interrompu." } }));
  }
  function scheduleAutopilotPoll() {
    window.clearTimeout(autopilotTimer);
    autopilotTimer = window.setTimeout(() => { void pollAutopilot(); }, 750);
  }
  async function pollAutopilot() {
    if (!autopilotRun) return;
    const result = await request(`/api/guided/autopilot-jobs/${autopilotRun.id}`);
    autopilotRun = result.run;
    emitAutopilotProgress(autopilotRun);
    renderAutopilot();
    if (["queued", "running"].includes(autopilotRun.status)) scheduleAutopilotPoll();
    else notify(autopilotRun.status === "completed" ? "Parcours IA complet : chaque proposition reste à valider." : "Le parcours IA s’est arrêté. Ouvre le parcours guidé pour voir la cause.", autopilotRun.status === "failed");
  }
  async function startAutopilot() {
    if (activeStage === 0) await saveBrief();
    const result = await request("/api/guided/autopilot-jobs", json("POST", {
      expected_revision: payload.state.revision,
      locale: window.SerreI18n?.getLanguage?.() === "en" ? "en" : "fr",
      model: document.querySelector("#ollama-model")?.value || document.querySelector("#narrative-model")?.value || null,
      prompt: "",
    }));
    autopilotRun = result.run;
    autopilotSeen = new Map();
    renderAutopilot();
    window.SerreWorkspace?.show("graph");
    await window.SerreGraph?.load?.("series", "series", { fit: true });
    emitAutopilotProgress(autopilotRun);
    scheduleAutopilotPoll();
  }
  function openCoauthor(step) {
    if (step === "production") {
      window.SerreWorkspace?.show("graph");
      notify("Choisis un nœud : ses champs peuvent être alimentés par l’IA avec ce contexte.");
      return;
    }
    if (step === "result") {
      void generateProposal("brief", "prepare_next", root.querySelector('[data-coauthor-step="result"]'));
      return;
    }
    window.SerreNarrativeWorkflow?.open("episode");
  }
  async function handleClick(event) {
    const stage = event.target.closest("[data-guided-stage]"); if (stage) return goTo(stage.dataset.guidedStage);
    const next = event.target.closest("[data-guided-next]"); if (next) return goTo(next.dataset.guidedNext);
    const ai = event.target.closest("[data-ai-mode]"); if (ai) return generateProposal(ai.dataset.aiTarget, ai.dataset.aiMode, ai);
    if (event.target.closest("[data-proposal-close]")) return closeProposal();
    if (event.target.closest("[data-proposal-accept]")) return acceptProposal().catch(fail);
    if (event.target.closest("[data-proposal-reject]")) return rejectProposal().catch(fail);
    const characterButton = event.target.closest("[data-character-action]");
    if (characterButton) {
      const card = characterButton.closest("[data-character-id]");
      const actions = { save: saveCharacter, delete: deleteCharacter, promote: promoteCharacter };
      return actions[characterButton.dataset.characterAction](card).catch(fail);
    }
    const action = event.target.closest("[data-guided-action]")?.dataset.guidedAction;
    if (!action) return;
    if (action === "advanced") {
      window.SerreWorkspace?.show("graph");
      await window.SerreGraph?.load?.("series", "series", { fit: true });
    }
    if (action === "autopilot") await startAutopilot();
    if (action === "open-production") window.SerreWorkspace?.show("graph");
    if (action === "save-brief") await saveBrief();
    if (action === "add-character") await addCharacter();
    if (action === "create-episode") await createEpisode();
    if (action === "link-episode") await linkEpisode(root.querySelector("#guided-episode-select")?.value);
    if (action === "unlink-episode") await linkEpisode(null);
    if (action === "open-writing" || action === "open-storyboard") window.SerreNarrativeWorkflow?.open("episode");
    if (action === "open-results") window.SerreWorkspace?.show("outputs");
    if (action === "coauthor") openCoauthor(event.target.closest("[data-coauthor-step]").dataset.coauthorStep);
    if (action === "coherence") await window.SerreCoherence?.run?.("all");
  }
  function fail(error) { notify(error.message || String(error), true); void load().catch(() => {}); }
  function init() {
    root.innerHTML = shellMarkup();
    root.addEventListener("click", (event) => { Promise.resolve(handleClick(event)).catch(fail); });
    window.addEventListener("studio:project-changed", () => { activeStage = 0; load().catch(fail); });
    window.addEventListener("studio:episode-loaded", () => load().catch(fail));
    load().then(() => { activeStage = nextIncomplete(); render(); }).catch(fail);
  }
  init();
  window.SerreGuided = Object.freeze({ load, goTo, selectTemplate, current: () => payload });
  return window.SerreGuided;
})();
