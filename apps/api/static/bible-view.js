const bibleStudio = (() => {
  const appNav = document.querySelector(".app-nav");
  const shell = document.querySelector(".shell");
  if (!appNav || !shell) return null;

  const CATEGORIES = {
    direction: { label: "Direction & ton", singular: "direction", endpoint: "direction" },
    characters: { label: "Personnages", singular: "personnage", endpoint: "characters" },
    locations: { label: "Lieux", singular: "lieu", endpoint: "locations" },
    relationships: { label: "Relations", singular: "relation", endpoint: "relationships" },
    world_rules: { label: "Règles du monde", singular: "règle", endpoint: "world_rules" },
    narrative_arcs: { label: "Arcs narratifs", singular: "arc", endpoint: "narrative_arcs" },
    secrets: { label: "Secrets", singular: "secret", endpoint: "secrets" },
    references: { label: "Références", singular: "référence", endpoint: "references" },
    prompts: { label: "Prompts", singular: "prompt", endpoint: "prompts" },
  };
  const TEMPLATES = {
    characters: {
      id: "nouveau-personnage", name: "Nouveau personnage", role: "Rôle narratif",
      visual_description: "Description visuelle canonique détaillée du personnage",
      wardrobe: "Silhouette, tenue ou anatomie canonique détaillée du personnage",
      signature_details: ["détail signature"], palette: ["#111111", "#555555", "#aaaaaa"],
      personality: { courage: 0.5, loyauté: 0.5, curiosité: 0.5 },
      wants: ["objectif"], fears: ["peur"],
      voice_description: "Description précise de la voix canonique",
      generation_negative_prompt: "identity drift",
      visual_references: [], voice_references: [], canonical_prompt_id: null,
    },
    locations: {
      id: "nouveau-lieu", name: "Nouveau lieu",
      visual_description: "Description visuelle canonique détaillée du lieu",
      signature_details: ["élément signature"], palette: ["#111111", "#555555", "#aaaaaa"],
      generation_negative_prompt: "location drift",
      visual_references: [], canonical_prompt_id: null,
    },
    relationships: {
      id: "relation-a-b", source: "personnage-a", target: "personnage-b",
      label: "Relation", summary: "État narratif actuel de leur relation",
      desire: 0, trust: 0, anger: 0, fear: 0, attachment: 0, toxicity: 0,
    },
    world_rules: {
      id: "nouvelle-regle", statement: "Règle canonique du monde",
      applies_to: [], immutable: false,
    },
    narrative_arcs: {
      id: "nouvel-arc", title: "Nouvel arc", summary: "Trajectoire narrative canonique",
      character_ids: [], status: "planned", start_episode: null, end_episode: null, beats: [],
    },
    secrets: {
      id: "nouveau-secret", owners: ["personnage"], known_by: [], hidden_from: [],
      summary: "Secret narratif canonique", severity: 0.5, created_episode: 1, revealed: false,
    },
    references: {
      id: "nouvelle-reference", kind: "visual", owner_type: "project",
      owner_id: null, uri: "references/image.png", label: "Référence visuelle", notes: "",
    },
    prompts: {
      id: "nouveau-prompt", scope: "project", target_id: null,
      positive: "Direction positive canonique", negative: "", constraints: [],
    },
  };

  const navButton = document.createElement("button");
  navButton.type = "button";
  navButton.setAttribute("role", "tab");
  navButton.dataset.workspaceTarget = "bible";
  navButton.textContent = "Bible";
  const settingsTab = appNav.querySelector('[data-workspace-target="settings"]');
  appNav.insertBefore(navButton, settingsTab);

  const panel = document.createElement("section");
  panel.id = "bible-workspace";
  panel.className = "bible-workspace panel";
  panel.setAttribute("aria-labelledby", "bible-title");
  panel.innerHTML =
    '<header class="bible-header"><div><p class="eyebrow">SOURCE DE VÉRITÉ DU PROJET</p>' +
    '<h2 id="bible-title">Bible canonique</h2><p id="bible-context">Chargement du canon…</p></div>' +
    '<div class="bible-header-actions"><span id="bible-revision" class="badge">révision —</span>' +
    '<button id="bible-impact-open" class="button ghost" type="button">Impact aval</button>' +
    '<button id="bible-export" class="button ghost" type="button">Exporter JSON</button>' +
    '<button id="bible-ai-kit" class="button ghost" type="button">Kit ChatGPT</button>' +
    '<button id="bible-import" class="button secondary" type="button">Importer JSON</button>' +
    '<input id="bible-import-file" type="file" accept="application/json,.json" hidden>' +
    '<button id="bible-refresh" class="button secondary" type="button">Actualiser</button></div></header>' +
    '<div class="bible-layout"><aside class="bible-categories"><nav id="bible-categories" aria-label="Sections de la Bible"></nav>' +
    '<footer><strong>Identité unique</strong><span>Les plans référencent ces objets par leur identifiant canonique.</span></footer></aside>' +
    '<section class="bible-collection"><header><div><p class="eyebrow">REGISTRE</p><h3 id="bible-collection-title">Direction & ton</h3></div>' +
    '<button id="bible-create" class="button secondary" type="button">Ajouter</button></header>' +
    '<div id="bible-entity-list" class="bible-entity-list"></div>' +
    '<section id="bible-relationship-graph" class="bible-relationship-graph hidden" aria-label="Graphe directionnel des relations"></section></section>' +
    '<section class="bible-inspector"><header><div><p class="eyebrow">INSPECTOR</p><h3 id="bible-entity-title">Direction artistique</h3></div>' +
    '<span id="bible-editor-state">Lecture</span></header><p id="bible-entity-summary"></p>' +
    '<div id="bible-friendly-editor" class="bible-friendly-editor" aria-label="Éditeur guidé"></div>' +
    '<details id="bible-json-advanced" class="bible-json-advanced"><summary>Mode avancé · JSON</summary>' +
    '<label class="bible-json-label">Contrat canonique JSON<textarea id="bible-editor" spellcheck="false"></textarea></label>' +
    '<button id="bible-json-apply" class="button ghost" type="button">Appliquer au formulaire</button></details>' +
    '<p id="bible-validation" role="status"></p><footer>' +
    '<button id="bible-delete" class="button ghost" type="button">Supprimer</button>' +
    '<button id="bible-save" class="button primary" type="button">Enregistrer la révision</button></footer></section></div>' +
    '<aside id="bible-impact" class="bible-impact hidden" aria-label="Impact aval"><header><div><p class="eyebrow">DÉPENDANCES</p>' +
    '<h3>Impact aval détecté</h3></div><button id="bible-impact-close" type="button" aria-label="Fermer">×</button></header>' +
    '<div id="bible-impact-content"></div></aside>';
  shell.append(panel);

  const editor = panel.querySelector("#bible-editor");
  const listRoot = panel.querySelector("#bible-entity-list");
  const categoryRoot = panel.querySelector("#bible-categories");
  const validation = panel.querySelector("#bible-validation");
  const deleteButton = panel.querySelector("#bible-delete");
  const createButton = panel.querySelector("#bible-create");
  const importFile = panel.querySelector("#bible-import-file");
  let bible = null;
  let impact = null;
  let category = "direction";
  let selectedId = "direction";
  let dirty = false;

  function entities() {
    if (!bible) return [];
    if (category === "direction") {
      return [{
        id: "direction",
        name: "Direction artistique & ton",
        art_direction: bible.art_direction,
        tone: bible.tone,
      }];
    }
    return bible[category] || [];
  }

  function entityLabel(entity) {
    return entity.name || entity.title || entity.label || entity.statement || entity.id;
  }

  function summaryFor(entity) {
    if (category === "characters") return entity.role;
    if (category === "locations") return entity.visual_description;
    if (category === "relationships") return entity.summary;
    if (category === "world_rules") return entity.statement;
    if (category === "narrative_arcs") return entity.summary;
    if (category === "secrets") return "Information narrative sensible · " + (entity.revealed ? "révélée" : "non révélée");
    if (category === "references") return entity.kind + " · " + entity.uri;
    if (category === "prompts") return entity.scope + (entity.target_id ? " · " + entity.target_id : "");
    return "Style visuel, ton, règles de dialogue et limites de contenu du projet.";
  }

  function setEditor(entity, isNew = false) {
    selectedId = isNew ? "" : entity.id;
    editor.value = JSON.stringify(
      category === "direction"
        ? { art_direction: entity.art_direction, tone: entity.tone }
        : entity,
      null,
      2,
    );
    panel.querySelector("#bible-entity-title").textContent =
      isNew ? "Nouvelle " + CATEGORIES[category].singular : entityLabel(entity);
    panel.querySelector("#bible-entity-summary").textContent = summaryFor(entity);
    panel.querySelector("#bible-editor-state").textContent = isNew ? "Création" : "Canon enregistré";
    deleteButton.disabled = isNew || category === "direction";
    dirty = false;
    validation.textContent = "";
    renderList();
    window.dispatchEvent(new CustomEvent("studio:bible-entity-selected", {
      detail: { category, entity: structuredClone(entity), isNew },
    }));
  }

  function renderCategories() {
    categoryRoot.replaceChildren();
    for (const [id, config] of Object.entries(CATEGORIES)) {
      const button = document.createElement("button");
      button.type = "button";
      button.classList.toggle("selected", id === category);
      button.dataset.bibleCategory = id;
      const label = document.createElement("strong");
      label.textContent = config.label;
      const count = document.createElement("span");
      count.textContent = id === "direction" ? "1" : String((bible?.[id] || []).length);
      button.append(label, count);
      button.addEventListener("click", () => selectCategory(id));
      categoryRoot.append(button);
    }
  }

  function renderList() {
    listRoot.replaceChildren();
    for (const entity of entities()) {
      const button = document.createElement("button");
      button.type = "button";
      button.classList.toggle("selected", entity.id === selectedId);
      const title = document.createElement("strong");
      title.textContent = entityLabel(entity);
      const meta = document.createElement("span");
      meta.textContent = entity.id;
      button.append(title, meta);
      button.addEventListener("click", () => {
        if (dirty && !window.confirm("Abandonner les modifications non enregistrées ?")) return;
        setEditor(entity);
      });
      listRoot.append(button);
    }
    if (!entities().length) {
      const empty = document.createElement("p");
      empty.className = "bible-empty";
      empty.textContent = "Aucune entrée canonique dans ce registre.";
      listRoot.append(empty);
    }
  }

  function selectCategory(next) {
    if (dirty && !window.confirm("Abandonner les modifications non enregistrées ?")) return;
    category = next;
    panel.querySelector(".bible-layout").classList.toggle("relationship-mode", category === "relationships");
    panel.querySelector("#bible-collection-title").textContent = CATEGORIES[category].label;
    createButton.classList.toggle("hidden", category === "direction");
    renderCategories();
    const first = entities()[0];
    if (first) setEditor(first);
    else {
      selectedId = "";
      editor.value = "";
      panel.querySelector("#bible-entity-title").textContent = "Registre vide";
      panel.querySelector("#bible-entity-summary").textContent = "";
      deleteButton.disabled = true;
      renderList();
    }
    window.dispatchEvent(new CustomEvent("studio:bible-category-selected", {
      detail: { category, bible: structuredClone(bible) },
    }));
  }

  function renderImpact() {
    const root = panel.querySelector("#bible-impact-content");
    root.replaceChildren();
    if (!impact || !impact.changes.length) {
      const empty = document.createElement("p");
      empty.className = "bible-empty";
      empty.textContent = "Aucune modification canonique à propager.";
      root.append(empty);
      return;
    }
    const summary = document.createElement("div");
    summary.className = "bible-impact-summary";
    summary.textContent =
      impact.affected_episodes.length + " épisode(s) · " +
      impact.affected_shots.length + " plan(s) · " +
      impact.artifact_count + " artefact(s) à régénérer";
    root.append(summary);
    for (const change of impact.changes.slice().reverse()) {
      const article = document.createElement("article");
      const title = document.createElement("strong");
      title.textContent = "r" + change.revision + " · " + change.entity_type + " / " + change.entity_id;
      const detail = document.createElement("span");
      detail.textContent = change.operation + " · " + change.shots.length + " plan(s) touché(s)";
      article.append(title, detail);
      root.append(article);
    }
    for (const artifact of impact.artifacts) {
      const article = document.createElement("article");
      article.className = "stale";
      const title = document.createElement("strong");
      title.textContent = artifact.kind + " · " + artifact.id;
      const detail = document.createElement("span");
      detail.textContent = "Construit avec r" + artifact.built_revision + " · nouvelle génération requise";
      article.append(title, detail);
      root.append(article);
    }
  }

  function applyPayload(result) {
    bible = result.bible || result;
    if (result.impact) impact = result.impact;
    panel.querySelector("#bible-revision").textContent = "révision " + bible.revision;
    renderCategories();
    const current = entities().find((entity) => entity.id === selectedId) || entities()[0];
    if (current) setEditor(current);
    else selectCategory(category);
    renderImpact();
    window.dispatchEvent(new CustomEvent("studio:bible-loaded", {
      detail: { bible: structuredClone(bible), category, selectedId },
    }));
  }

  async function request(path, options = {}) {
    const response = await fetch(path, options);
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      const detail = typeof body.detail === "string"
        ? body.detail
        : Array.isArray(body.detail)
          ? body.detail.slice(0, 3).map((item) => {
            const field = Array.isArray(item.loc) ? item.loc.slice(1).join(".") : "document";
            return field + " · " + item.msg;
          }).join(" | ")
          : body.detail?.message || "Erreur HTTP " + response.status;
      throw new Error(detail);
    }
    return body;
  }

  function downloadJson(filename, payload) {
    const blob = new Blob([JSON.stringify(payload, null, 2) + "\n"], {
      type: "application/json;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function safeFileName(value) {
    return String(value || "projet")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "projet";
  }

  async function exportExchange() {
    const payload = await request("/api/bible/exchange");
    downloadJson("bible-" + safeFileName(payload.bible?.title) + ".serre.json", payload);
    validation.className = "";
    validation.textContent = "Bible portable exportée.";
  }

  async function downloadAiKit() {
    const payload = await request("/api/bible/exchange/ai-kit");
    downloadJson("bible-kit-chatgpt.serre.json", payload);
    validation.className = "";
    validation.textContent = "Kit ChatGPT téléchargé · consigne, schéma et gabarit vide.";
  }

  async function importExchange(file) {
    if (!file) return;
    let payload;
    try {
      payload = JSON.parse(await file.text());
    } catch (error) {
      throw new Error("Le fichier sélectionné ne contient pas un JSON valide · " + error.message);
    }
    if (payload.format !== "serre.project-bible" || payload.format_version !== 1) {
      throw new Error("Format refusé · document serre.project-bible version 1 attendu.");
    }
    const collections = [
      "characters", "locations", "relationships", "world_rules", "narrative_arcs",
      "secrets", "references", "prompts",
    ];
    const entityCount = collections.reduce(
      (total, key) => total + (Array.isArray(payload.bible?.[key]) ? payload.bible[key].length : 0),
      0,
    );
    const accepted = window.confirm(
      "Remplacer la Bible canonique par « " + (payload.bible?.title || "sans titre") +
      " » (" + entityCount + " entrées) ? Une nouvelle révision sera créée.",
    );
    if (!accepted) return;
    validation.className = "";
    validation.textContent = "Validation du contrat et calcul de l’impact…";
    const revision = bible?.revision ?? 0;
    const result = await request(
      "/api/bible/exchange/import?expected_revision=" + revision,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );
    dirty = false;
    applyPayload(result);
    validation.textContent = "Bible importée · nouvelle révision canonique enregistrée.";
    window.dispatchEvent(new CustomEvent("studio:bible-changed", { detail: result }));
  }

  async function load() {
    validation.textContent = "Lecture de la Bible…";
    const [biblePayload, impactPayload] = await Promise.all([
      request("/api/bible"),
      request("/api/bible/impact"),
    ]);
    bible = biblePayload;
    impact = impactPayload;
    panel.querySelector("#bible-revision").textContent = "révision " + bible.revision;
    renderCategories();
    selectCategory(category);
    renderImpact();
    validation.textContent = "";
    window.dispatchEvent(new CustomEvent("studio:bible-loaded", {
      detail: { bible: structuredClone(bible), category, selectedId },
    }));
  }

  async function save() {
    let payload;
    try {
      payload = JSON.parse(editor.value);
    } catch (error) {
      validation.textContent = "JSON invalide · " + error.message;
      validation.className = "error";
      return;
    }
    const endpoint = CATEGORIES[category].endpoint;
    const id = category === "direction" ? "" : payload.id;
    if (category !== "direction" && !id) {
      validation.textContent = "L’identifiant canonique est obligatoire.";
      validation.className = "error";
      return;
    }
    validation.textContent = "Enregistrement et analyse d’impact…";
    validation.className = "";
    try {
      const result = await request(
        "/api/bible/" + endpoint + (id ? "/" + encodeURIComponent(id) : ""),
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      selectedId = id || "direction";
      dirty = false;
      applyPayload(result);
      validation.textContent = "Révision canonique enregistrée.";
      window.dispatchEvent(new CustomEvent("studio:bible-changed", { detail: result }));
      const episodeSelect = document.querySelector("#episode-select");
      if (episodeSelect?.value) episodeSelect.dispatchEvent(new Event("change"));
    } catch (error) {
      validation.textContent = error.message;
      validation.className = "error";
    }
  }

  async function removeSelected() {
    if (!selectedId || category === "direction") return;
    if (!window.confirm("Supprimer cette entrée canonique ? Les objets encore référencés seront protégés.")) return;
    try {
      const result = await request(
        "/api/bible/" + CATEGORIES[category].endpoint + "/" + encodeURIComponent(selectedId),
        { method: "DELETE" },
      );
      selectedId = "";
      applyPayload(result);
      window.dispatchEvent(new CustomEvent("studio:bible-changed", { detail: result }));
    } catch (error) {
      validation.textContent = error.message;
      validation.className = "error";
    }
  }

  function createEntity() {
    const template = TEMPLATES[category];
    if (!template) return;
    const draft = structuredClone(template);
    if (category === "relationships") {
      const characters = bible?.characters || [];
      draft.source = characters[0]?.id || "";
      draft.target = characters.find((item) => item.id !== draft.source)?.id || "";
      draft.id = [draft.source, "vers", draft.target].filter(Boolean).join("-") || "nouvelle-relation";
    }
    setEditor(draft, true);
  }

  function selectEntity(entityId) {
    const entity = entities().find((item) => item.id === entityId);
    if (!entity) return false;
    if (dirty && !window.confirm("Abandonner les modifications non enregistrées ?")) return false;
    setEditor(entity);
    return true;
  }

  function state() {
    return {
      bible: bible ? structuredClone(bible) : null,
      category,
      selectedId,
      dirty,
    };
  }
  panel.querySelector("#bible-export").addEventListener("click", () => {
    exportExchange().catch(showError);
  });
  panel.querySelector("#bible-ai-kit").addEventListener("click", () => {
    downloadAiKit().catch(showError);
  });
  panel.querySelector("#bible-import").addEventListener("click", () => {
    importFile.value = "";
    importFile.click();
  });
  importFile.addEventListener("change", () => importExchange(importFile.files?.[0]).catch(showError));

  editor.addEventListener("input", () => {
    dirty = true;
    panel.querySelector("#bible-editor-state").textContent = "Modifié";
    validation.textContent = "";
  });
  panel.querySelector("#bible-save").addEventListener("click", save);
  deleteButton.addEventListener("click", removeSelected);
  createButton.addEventListener("click", createEntity);
  panel.querySelector("#bible-refresh").addEventListener("click", () => load().catch(showError));
  panel.querySelector("#bible-impact-open").addEventListener("click", () => panel.querySelector("#bible-impact").classList.remove("hidden"));
  panel.querySelector("#bible-impact-close").addEventListener("click", () => panel.querySelector("#bible-impact").classList.add("hidden"));
  window.addEventListener("studio:project-changed", () => load().catch(showError));
  window.addEventListener("studio:shot-selected", (event) => {
    const shot = event.detail?.shot;
    if (!shot) return;
    panel.querySelector("#bible-context").textContent =
      shot.id + " référence " + shot.characters.map((item) => item.id).join(", ") +
      " · " + shot.location + " · canon r" + (shot.canonical_context?.revision ?? "—");
  });

  function showError(error) {
    validation.textContent = error.message || "Bible indisponible";
    validation.className = "error";
  }

  load().catch(showError);
  window.SerreBible = { load, save, selectCategory, selectEntity, state };
  return window.SerreBible;
})();
