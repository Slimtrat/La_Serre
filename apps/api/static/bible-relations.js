(() => {
  const panel = document.querySelector("#bible-workspace");
  const graphRoot = panel?.querySelector("#bible-relationship-graph");
  const listRoot = panel?.querySelector("#bible-entity-list");
  const formRoot = panel?.querySelector("#bible-friendly-editor");
  const editor = panel?.querySelector("#bible-editor");
  const jsonApply = panel?.querySelector("#bible-json-apply");
  if (!panel || !graphRoot || !listRoot || !formRoot || !editor || !jsonApply) return;

  const I18N = {
    fr: {
      relationshipGraph: {
        title: "Carte des relations", subtitle: "Chaque flèche décrit ce que la source ressent envers la cible.",
        newLink: "Nouvelle relation", filter: "Afficher", all: "Toutes", toxic: "Toxiques", magnetic: "Attirance forte",
        healthy: "Stable", tense: "Sous tension", dangerous: "Toxique", empty: "Ajoute au moins deux personnages pour créer des relations.",
        noLink: "Aucune relation ne correspond à ce filtre.", outgoing: "sortant", incoming: "entrant",
        openCharacter: "Double-cliquer pour ouvrir la fiche personnage", moveCharacter: "Faire glisser pour réorganiser la carte",
        direction: "Sens du lien", source: "Qui ressent ?", target: "Envers qui ?", swap: "Inverser le sens",
        guided: "Édition guidée", advanced: "Mode avancé · JSON", applyJson: "Appliquer au formulaire",
        jsonError: "Le JSON avancé est invalide", onePerLine: "Une valeur par ligne",
        selectedHint: "Clique une flèche pour l’éditer. Clique un personnage pour isoler ses liens.",
        score: "Toxicité", metrics: "Dynamique émotionnelle",
      },
      fields: {
        id: "Identifiant", name: "Nom", role: "Rôle narratif", visual_description: "Description visuelle",
        wardrobe: "Silhouette et tenue", signature_details: "Détails signature", palette: "Palette",
        personality: "Personnalité", wants: "Désirs", fears: "Peurs", voice_description: "Voix",
        generation_negative_prompt: "Éléments à éviter", visual_references: "Références visuelles",
        voice_references: "Références vocales", canonical_prompt_id: "Prompt canonique", label: "Nature du lien",
        summary: "Résumé narratif", desire: "Désir", trust: "Confiance", anger: "Colère", fear: "Peur",
        attachment: "Attachement", toxicity: "Toxicité", statement: "Règle", applies_to: "S’applique à",
        immutable: "Règle immuable", title: "Titre", character_ids: "Personnages concernés", status: "État",
        start_episode: "Épisode de début", end_episode: "Épisode de fin", beats: "Étapes narratives",
        owners: "Détenteurs", known_by: "Connu par", hidden_from: "Caché à", severity: "Gravité",
        created_episode: "Épisode de création", revealed: "Révélé", kind: "Type", owner_type: "Propriétaire",
        owner_id: "Objet lié", uri: "Fichier ou URI", notes: "Notes", scope: "Portée", target_id: "Cible",
        positive: "Direction positive", negative: "Direction négative", constraints: "Contraintes",
        art_direction: "Direction artistique", tone: "Ton", visual_style: "Style visuel",
        rendering_rules: "Règles de rendu", banned_elements: "Éléments interdits", keywords: "Mots-clés",
        dialogue_rules: "Règles de dialogue", content_boundaries: "Limites de contenu",
      },
    },
    en: {
      relationshipGraph: {
        title: "Relationship map", subtitle: "Each arrow describes what the source feels toward the target.",
        newLink: "New relationship", filter: "Show", all: "All", toxic: "Toxic", magnetic: "Strong attraction",
        healthy: "Stable", tense: "Tense", dangerous: "Toxic", empty: "Add at least two characters to create relationships.",
        noLink: "No relationship matches this filter.", outgoing: "outgoing", incoming: "incoming",
        openCharacter: "Double-click to open the character sheet", moveCharacter: "Drag to rearrange the map",
        direction: "Link direction", source: "Who feels it?", target: "Toward whom?", swap: "Reverse direction",
        guided: "Guided editing", advanced: "Advanced mode · JSON", applyJson: "Apply to form",
        jsonError: "The advanced JSON is invalid", onePerLine: "One value per line",
        selectedHint: "Click an arrow to edit it. Click a character to isolate their links.",
        score: "Toxicity", metrics: "Emotional dynamics",
      },
      fields: {
        id: "Identifier", name: "Name", role: "Narrative role", visual_description: "Visual description",
        wardrobe: "Silhouette and wardrobe", signature_details: "Signature details", palette: "Palette",
        personality: "Personality", wants: "Wants", fears: "Fears", voice_description: "Voice",
        generation_negative_prompt: "Elements to avoid", visual_references: "Visual references",
        voice_references: "Voice references", canonical_prompt_id: "Canonical prompt", label: "Relationship type",
        summary: "Narrative summary", desire: "Desire", trust: "Trust", anger: "Anger", fear: "Fear",
        attachment: "Attachment", toxicity: "Toxicity", statement: "Rule", applies_to: "Applies to",
        immutable: "Immutable rule", title: "Title", character_ids: "Characters", status: "Status",
        start_episode: "Start episode", end_episode: "End episode", beats: "Narrative beats",
        owners: "Owners", known_by: "Known by", hidden_from: "Hidden from", severity: "Severity",
        created_episode: "Creation episode", revealed: "Revealed", kind: "Type", owner_type: "Owner",
        owner_id: "Linked object", uri: "File or URI", notes: "Notes", scope: "Scope", target_id: "Target",
        positive: "Positive direction", negative: "Negative direction", constraints: "Constraints",
        art_direction: "Art direction", tone: "Tone", visual_style: "Visual style",
        rendering_rules: "Rendering rules", banned_elements: "Banned elements", keywords: "Keywords",
        dialogue_rules: "Dialogue rules", content_boundaries: "Content boundaries",
      },
    },
  };
  window.SerreI18n?.register?.("fr", { bible: I18N.fr });
  window.SerreI18n?.register?.("en", { bible: I18N.en });

  const ENUMS = {
    kind: ["visual", "voice", "moodboard"], owner_type: ["project", "character", "location"],
    scope: ["project", "character", "location"], status: ["planned", "active", "resolved"],
  };
  const LONG_TEXT = new Set(["visual_description", "wardrobe", "voice_description", "generation_negative_prompt", "summary", "statement", "positive", "negative", "notes"]);
  const CHARACTER_LISTS = new Set(["character_ids", "owners", "known_by", "hidden_from"]);
  const METRICS = ["desire", "trust", "anger", "fear", "attachment", "toxicity"];
  const SVG_NS = "http://www.w3.org/2000/svg";
  const WORLD = { width: 1000, height: 700 };
  let bible = null;
  let category = "direction";
  let selectedId = "direction";
  let selectedCharacter = null;
  let draft = null;
  let isNew = false;
  let syncingJson = false;
  let filter = "all";
  let positions = {};

  function t(path, fallback = path) {
    const value = window.SerreI18n?.t?.(`bible.${path}`);
    return value && value !== `bible.${path}` ? value : fallback;
  }
  function fieldLabel(key) { return t(`fields.${key}`, key.replaceAll("_", " ")); }
  function clone(value) { return structuredClone(value); }
  function slug(value) {
    return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
      .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "relation";
  }
  function setAt(target, path, value) {
    let cursor = target;
    for (const key of path.slice(0, -1)) cursor = cursor[key];
    cursor[path.at(-1)] = value;
  }
  function syncJson() {
    if (!draft) return;
    syncingJson = true;
    editor.value = JSON.stringify(draft, null, 2);
    editor.dispatchEvent(new Event("input", { bubbles: true }));
    syncingJson = false;
  }
  function updateDraft(path, value, { render = false } = {}) {
    if (!draft) return;
    setAt(draft, path, value);
    if (category === "relationships" && isNew && ["source", "target"].includes(path.at(-1))) {
      draft.id = `${slug(draft.source)}-vers-${slug(draft.target)}`;
    }
    syncJson();
    if (render) renderForm();
  }
  function makeLabel(name, control) {
    const label = document.createElement("label");
    label.className = "bible-field";
    const caption = document.createElement("span");
    caption.textContent = fieldLabel(name);
    label.append(caption, control);
    return label;
  }
  function makeTextControl(path, value, multiline = false) {
    const control = document.createElement(multiline ? "textarea" : "input");
    if (!multiline) control.type = "text";
    control.value = value ?? "";
    control.addEventListener("input", () => updateDraft(path, control.value || (value === null ? null : "")));
    return control;
  }
  function makeArrayControl(path, values) {
    const name = path.at(-1);
    if (CHARACTER_LISTS.has(name) && bible?.characters?.length) {
      const choices = document.createElement("div");
      choices.className = "bible-choice-grid";
      for (const character of bible.characters) {
        const label = document.createElement("label");
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox"; checkbox.checked = values.includes(character.id); checkbox.value = character.id;
        checkbox.addEventListener("change", () => {
          const selected = [...choices.querySelectorAll('input[type="checkbox"]:checked')].map((item) => item.value);
          updateDraft(path, selected);
        });
        const text = document.createElement("span"); text.textContent = character.name;
        label.append(checkbox, text); choices.append(label);
      }
      return choices;
    }
    const control = document.createElement("textarea");
    control.className = "bible-lines-input"; control.rows = Math.min(5, Math.max(2, values.length + 1));
    control.value = values.join("\n"); control.placeholder = t("relationshipGraph.onePerLine", "Une valeur par ligne");
    control.addEventListener("input", () => updateDraft(path, control.value.split(/\r?\n/).map((item) => item.trim()).filter(Boolean)));
    return control;
  }
  function makeNumberControl(path, value) {
    const control = document.createElement("input");
    control.type = "number"; control.value = String(value);
    const name = path.at(-1);
    if (name === "severity" || path.includes("personality")) { control.min = "0"; control.max = "1"; control.step = "0.05"; }
    else if (name === "created_episode") { control.min = "1"; control.step = "1"; }
    control.addEventListener("input", () => updateDraft(path, Number(control.value)));
    return control;
  }
  function makeGenericField(path, value) {
    const name = path.at(-1);
    if (Array.isArray(value)) return makeLabel(name, makeArrayControl(path, value));
    if (value && typeof value === "object") {
      const fieldset = document.createElement("fieldset"); fieldset.className = "bible-fieldset";
      const legend = document.createElement("legend"); legend.textContent = fieldLabel(name); fieldset.append(legend);
      for (const [child, childValue] of Object.entries(value)) fieldset.append(makeGenericField([...path, child], childValue));
      return fieldset;
    }
    if (typeof value === "boolean") {
      const toggle = document.createElement("label"); toggle.className = "bible-toggle-field";
      const input = document.createElement("input"); input.type = "checkbox"; input.checked = value;
      input.addEventListener("change", () => updateDraft(path, input.checked));
      const text = document.createElement("span"); text.textContent = fieldLabel(name); toggle.append(input, text); return toggle;
    }
    if (typeof value === "number") return makeLabel(name, makeNumberControl(path, value));
    if (ENUMS[name]) {
      const select = document.createElement("select");
      for (const optionValue of ENUMS[name]) {
        const option = document.createElement("option"); option.value = optionValue; option.textContent = optionValue; option.selected = value === optionValue; select.append(option);
      }
      select.addEventListener("change", () => updateDraft(path, select.value));
      return makeLabel(name, select);
    }
    return makeLabel(name, makeTextControl(path, value, LONG_TEXT.has(name)));
  }

  function characterSelect(path, value) {
    const select = document.createElement("select");
    const empty = document.createElement("option");
    empty.value = ""; empty.textContent = "—"; select.append(empty);
    for (const character of bible?.characters || []) {
      const option = document.createElement("option");
      option.value = character.id;
      option.textContent = `${character.name} · ${character.role}`;
      option.selected = character.id === value;
      select.append(option);
    }
    select.addEventListener("change", () => updateDraft(path, select.value, { render: isNew }));
    return select;
  }

  function metricControl(name) {
    const row = document.createElement("label");
    row.className = `relationship-metric metric-${name}`;
    const caption = document.createElement("span"); caption.textContent = fieldLabel(name);
    const output = document.createElement("output"); output.value = String(draft[name]); output.textContent = String(draft[name]);
    const input = document.createElement("input");
    input.type = "range"; input.min = name === "toxicity" ? "0" : "-100"; input.max = "100"; input.step = "1"; input.value = String(draft[name] ?? 0);
    input.addEventListener("input", () => {
      output.value = input.value; output.textContent = input.value;
      updateDraft([name], Number(input.value));
    });
    row.append(caption, output, input);
    return row;
  }

  function renderRelationshipForm() {
    const direction = document.createElement("section"); direction.className = "relationship-direction-editor";
    const title = document.createElement("strong"); title.textContent = t("relationshipGraph.direction", "Sens du lien");
    const row = document.createElement("div"); row.className = "relationship-direction-row";
    const source = makeLabel("source", characterSelect(["source"], draft.source));
    source.querySelector("span").textContent = t("relationshipGraph.source", "Qui ressent ?");
    const arrow = document.createElement("span"); arrow.className = "relationship-direction-arrow"; arrow.textContent = "→"; arrow.setAttribute("aria-hidden", "true");
    const target = makeLabel("target", characterSelect(["target"], draft.target));
    target.querySelector("span").textContent = t("relationshipGraph.target", "Envers qui ?");
    const swap = document.createElement("button");
    swap.type = "button"; swap.className = "button ghost relationship-swap"; swap.textContent = "⇄";
    swap.title = t("relationshipGraph.swap", "Inverser le sens"); swap.setAttribute("aria-label", swap.title);
    swap.addEventListener("click", () => {
      [draft.source, draft.target] = [draft.target, draft.source];
      if (isNew) draft.id = `${slug(draft.source)}-vers-${slug(draft.target)}`;
      syncJson(); renderForm();
    });
    row.append(source, arrow, target, swap); direction.append(title, row);

    const identity = document.createElement("div"); identity.className = "bible-form-grid";
    identity.append(
      makeLabel("id", makeTextControl(["id"], draft.id)),
      makeLabel("label", makeTextControl(["label"], draft.label)),
      makeLabel("summary", makeTextControl(["summary"], draft.summary, true)),
    );
    const metrics = document.createElement("fieldset"); metrics.className = "relationship-metrics";
    const legend = document.createElement("legend"); legend.textContent = t("relationshipGraph.metrics", "Dynamique émotionnelle");
    metrics.append(legend, ...METRICS.map(metricControl));
    formRoot.append(direction, identity, metrics);
  }

  function renderForm() {
    formRoot.replaceChildren();
    if (!draft) return;
    const heading = document.createElement("p"); heading.className = "bible-guided-heading";
    heading.textContent = t("relationshipGraph.guided", "Édition guidée"); formRoot.append(heading);
    if (category === "relationships") renderRelationshipForm();
    else {
      const container = document.createElement("div"); container.className = "bible-form-grid";
      for (const [key, value] of Object.entries(draft)) container.append(makeGenericField([key], value));
      formRoot.append(container);
    }
    panel.querySelector("#bible-json-advanced summary").textContent = t("relationshipGraph.advanced", "Mode avancé · JSON");
    jsonApply.textContent = t("relationshipGraph.applyJson", "Appliquer au formulaire");
  }

  function toxicityScore(relation) {
    const explicit = Number(relation.toxicity || 0);
    const distrust = Math.max(0, -Number(relation.trust || 0));
    const volatility = Math.max(0, Number(relation.anger || 0));
    const fear = Math.max(0, Number(relation.fear || 0));
    const obsession = Math.max(0, Number(relation.desire || 0) + Number(relation.attachment || 0) - 110);
    return Math.min(100, Math.max(explicit, Math.round(distrust * .35 + volatility * .25 + fear * .2 + obsession * .35)));
  }
  function toxicityLevel(score) {
    if (score >= 66) return "dangerous";
    if (score >= 34) return "tense";
    return "healthy";
  }
  function layoutKey() {
    const project = document.querySelector("#project-select")?.value || "default";
    return `serre-bible-relationship-layout-v1:${project}`;
  }
  function loadPositions() {
    try { positions = JSON.parse(localStorage.getItem(layoutKey())) || {}; } catch (_error) { positions = {}; }
    const characters = bible?.characters || [];
    characters.forEach((character, index) => {
      if (positions[character.id]) return;
      const angle = -Math.PI / 2 + (Math.PI * 2 * index) / Math.max(1, characters.length);
      const radius = characters.length < 3 ? 225 : 245;
      positions[character.id] = {
        x: Math.round(WORLD.width / 2 + Math.cos(angle) * radius),
        y: Math.round(WORLD.height / 2 + Math.sin(angle) * radius),
      };
    });
  }
  function savePositions() {
    try { localStorage.setItem(layoutKey(), JSON.stringify(positions)); } catch (_error) { /* optional */ }
  }
  function filteredRelations() {
    const relations = bible?.relationships || [];
    if (filter === "toxic") return relations.filter((relation) => toxicityScore(relation) >= 50);
    if (filter === "magnetic") return relations.filter((relation) => Math.max(relation.desire, relation.attachment) >= 50);
    return relations;
  }
  function curveFor(relation, relations) {
    const source = positions[relation.source]; const target = positions[relation.target];
    if (!source || !target) return null;
    const dx = target.x - source.x; const dy = target.y - source.y; const length = Math.max(1, Math.hypot(dx, dy));
    const ux = dx / length; const uy = dy / length;
    const start = { x: source.x + ux * 76, y: source.y + uy * 48 };
    const end = { x: target.x - ux * 82, y: target.y - uy * 52 };
    const reverse = relations.some((item) => item.source === relation.target && item.target === relation.source);
    const bend = reverse ? (relation.source < relation.target ? 54 : -54) : 0;
    const middle = { x: (start.x + end.x) / 2 - uy * bend, y: (start.y + end.y) / 2 + ux * bend };
    return { start, end, middle, d: `M ${start.x} ${start.y} Q ${middle.x} ${middle.y} ${end.x} ${end.y}` };
  }
  function svgElement(name, attributes = {}) {
    const element = document.createElementNS(SVG_NS, name);
    for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, String(value));
    return element;
  }
  function showPopover(event, relation) {
    const popover = graphRoot.querySelector(".relationship-popover");
    const source = bible.characters.find((item) => item.id === relation.source)?.name || relation.source;
    const target = bible.characters.find((item) => item.id === relation.target)?.name || relation.target;
    popover.replaceChildren();
    const title = document.createElement("strong"); title.textContent = `${source} → ${target}`;
    const label = document.createElement("span"); label.textContent = relation.label;
    const score = document.createElement("b"); score.textContent = `${t("relationshipGraph.score", "Toxicité")} ${toxicityScore(relation)}%`;
    const summary = document.createElement("p"); summary.textContent = relation.summary;
    const metrics = document.createElement("small");
    metrics.textContent = METRICS.slice(0, -1).map((name) => `${fieldLabel(name)} ${relation[name] > 0 ? "+" : ""}${relation[name]}`).join(" · ");
    popover.append(title, label, score, summary, metrics);
    const bounds = graphRoot.querySelector(".relationship-graph-viewport").getBoundingClientRect();
    popover.style.left = `${Math.min(bounds.width - 250, Math.max(8, event.clientX - bounds.left + 12))}px`;
    popover.style.top = `${Math.min(bounds.height - 150, Math.max(8, event.clientY - bounds.top + 12))}px`;
    popover.hidden = false;
  }
  function hidePopover() {
    const popover = graphRoot.querySelector(".relationship-popover");
    if (popover) popover.hidden = true;
  }

  function drawEdges() {
    const svg = graphRoot.querySelector(".relationship-edges");
    if (!svg) return;
    svg.replaceChildren();
    const defs = svgElement("defs");
    for (const level of ["healthy", "tense", "dangerous"]) {
      const marker = svgElement("marker", { id: `relation-arrow-${level}`, viewBox: "0 0 10 10", refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: "auto-start-reverse" });
      marker.append(svgElement("path", { d: "M 0 0 L 10 5 L 0 10 z", class: `relationship-arrow-${level}` })); defs.append(marker);
    }
    svg.append(defs);
    const relations = filteredRelations();
    for (const relation of relations) {
      const curve = curveFor(relation, relations);
      if (!curve) continue;
      const score = toxicityScore(relation); const level = toxicityLevel(score);
      const dimmed = selectedCharacter && ![relation.source, relation.target].includes(selectedCharacter);
      const group = svgElement("g", { class: `relationship-edge level-${level}${dimmed ? " dimmed" : ""}`, "data-relation-id": relation.id, "data-toxicity": score });
      const visible = svgElement("path", { d: curve.d, class: "relationship-edge-line", "marker-end": `url(#relation-arrow-${level})`, "vector-effect": "non-scaling-stroke" });
      visible.style.setProperty("--edge-width", String(1.6 + score / 24));
      const hit = svgElement("path", { d: curve.d, class: "relationship-edge-hit", "vector-effect": "non-scaling-stroke", tabindex: "0", role: "button", "aria-label": `${relation.source} vers ${relation.target}, ${relation.label}, toxicité ${score}%` });
      const label = svgElement("text", { x: curve.middle.x, y: curve.middle.y - 8, class: "relationship-edge-label", "text-anchor": "middle" }); label.textContent = `${relation.label} · ${score}%`;
      const select = () => window.SerreBible?.selectEntity?.(relation.id);
      visible.addEventListener("click", select);
      hit.addEventListener("click", select);
      hit.addEventListener("keydown", (event) => { if (["Enter", " "].includes(event.key)) { event.preventDefault(); select(); } });
      for (const target of [visible, hit]) {
        target.addEventListener("pointerenter", (event) => showPopover(event, relation));
        target.addEventListener("pointermove", (event) => showPopover(event, relation));
      }
      group.addEventListener("pointerleave", hidePopover);
      group.append(visible, hit, label); svg.append(group);
    }
    const empty = graphRoot.querySelector(".relationship-graph-empty");
    empty.hidden = relations.length > 0;
    empty.textContent = bible?.characters?.length < 2 ? t("relationshipGraph.empty") : t("relationshipGraph.noLink");
  }

  function setNodePosition(node, position) {
    node.style.left = `${position.x / WORLD.width * 100}%`;
    node.style.top = `${position.y / WORLD.height * 100}%`;
  }

  function makeCharacterNode(character) {
    const node = document.createElement("button");
    node.type = "button"; node.className = "relationship-person-node"; node.dataset.characterId = character.id;
    node.classList.toggle("selected", selectedCharacter === character.id);
    const related = (bible.relationships || []).filter((item) => [item.source, item.target].includes(character.id));
    const outgoing = related.filter((item) => item.source === character.id).length;
    const incoming = related.filter((item) => item.target === character.id).length;
    const name = document.createElement("strong"); name.textContent = character.name;
    const role = document.createElement("span"); role.textContent = character.role;
    const counts = document.createElement("small");
    counts.textContent = `↗ ${outgoing} ${t("relationshipGraph.outgoing", "sortant")} · ↘ ${incoming} ${t("relationshipGraph.incoming", "entrant")}`;
    node.append(name, role, counts);
    node.title = `${t("relationshipGraph.moveCharacter")} · ${t("relationshipGraph.openCharacter")}`;
    setNodePosition(node, positions[character.id]);
    let moved = false;
    node.addEventListener("pointerdown", (event) => {
      if (event.button !== 0) return;
      moved = false;
      const start = { x: event.clientX, y: event.clientY };
      node.setPointerCapture(event.pointerId);
      const move = (next) => {
        if (Math.hypot(next.clientX - start.x, next.clientY - start.y) > 4) moved = true;
        if (!moved) return;
        const bounds = graphRoot.querySelector(".relationship-graph-viewport").getBoundingClientRect();
        positions[character.id] = {
          x: Math.min(920, Math.max(80, (next.clientX - bounds.left) / bounds.width * WORLD.width)),
          y: Math.min(640, Math.max(60, (next.clientY - bounds.top) / bounds.height * WORLD.height)),
        };
        setNodePosition(node, positions[character.id]); drawEdges();
      };
      const finish = () => {
        node.removeEventListener("pointermove", move); node.removeEventListener("pointerup", finish); node.removeEventListener("pointercancel", finish);
        if (moved) savePositions();
      };
      node.addEventListener("pointermove", move); node.addEventListener("pointerup", finish); node.addEventListener("pointercancel", finish);
    });
    node.addEventListener("click", (event) => {
      if (moved) { event.preventDefault(); moved = false; return; }
      selectedCharacter = selectedCharacter === character.id ? null : character.id; renderGraph();
    });
    node.addEventListener("dblclick", () => {
      window.SerreBible?.selectCategory?.("characters"); window.SerreBible?.selectEntity?.(character.id);
    });
    return node;
  }

  function ensureGraphShell() {
    if (graphRoot.dataset.ready) return;
    graphRoot.dataset.ready = "true";
    graphRoot.innerHTML =
      '<header class="relationship-graph-toolbar"><div><strong data-relationship-title></strong><span data-relationship-subtitle></span></div>' +
      '<label><span data-relationship-filter-label></span><select data-relationship-filter>' +
      '<option value="all"></option><option value="toxic"></option><option value="magnetic"></option></select></label>' +
      '<button class="button secondary" type="button" data-relationship-create></button></header>' +
      '<div class="relationship-graph-viewport" role="application"><svg class="relationship-edges" viewBox="0 0 1000 700" preserveAspectRatio="none"></svg>' +
      '<div class="relationship-person-nodes"></div><p class="relationship-graph-empty" hidden></p>' +
      '<aside class="relationship-popover" hidden></aside></div>' +
      '<footer><span class="legend-healthy"></span><span class="legend-tense"></span><span class="legend-dangerous"></span><small data-relationship-hint></small></footer>';
    graphRoot.querySelector("[data-relationship-create]").addEventListener("click", () => panel.querySelector("#bible-create")?.click());
    graphRoot.querySelector("[data-relationship-filter]").addEventListener("change", (event) => { filter = event.target.value; drawEdges(); });
  }

  function localizeGraph() {
    if (!graphRoot.dataset.ready) return;
    graphRoot.querySelector("[data-relationship-title]").textContent = t("relationshipGraph.title");
    graphRoot.querySelector("[data-relationship-subtitle]").textContent = t("relationshipGraph.subtitle");
    graphRoot.querySelector("[data-relationship-filter-label]").textContent = t("relationshipGraph.filter");
    graphRoot.querySelector('[data-relationship-filter] [value="all"]').textContent = t("relationshipGraph.all");
    graphRoot.querySelector('[data-relationship-filter] [value="toxic"]').textContent = t("relationshipGraph.toxic");
    graphRoot.querySelector('[data-relationship-filter] [value="magnetic"]').textContent = t("relationshipGraph.magnetic");
    graphRoot.querySelector("[data-relationship-create]").textContent = t("relationshipGraph.newLink");
    graphRoot.querySelector(".legend-healthy").textContent = `● ${t("relationshipGraph.healthy")}`;
    graphRoot.querySelector(".legend-tense").textContent = `● ${t("relationshipGraph.tense")}`;
    graphRoot.querySelector(".legend-dangerous").textContent = `● ${t("relationshipGraph.dangerous")}`;
    graphRoot.querySelector("[data-relationship-hint]").textContent = t("relationshipGraph.selectedHint");
  }

  function renderGraph() {
    if (!bible || category !== "relationships") return;
    ensureGraphShell(); localizeGraph(); loadPositions();
    graphRoot.classList.remove("hidden"); listRoot.classList.add("hidden");
    const nodes = graphRoot.querySelector(".relationship-person-nodes");
    nodes.replaceChildren(...bible.characters.map(makeCharacterNode)); drawEdges();
  }

  function leaveGraph() {
    graphRoot.classList.add("hidden"); listRoot.classList.remove("hidden"); selectedCharacter = null; hidePopover();
  }

  function receiveEntity(detail) {
    category = detail.category; draft = clone(detail.entity); isNew = Boolean(detail.isNew); selectedId = isNew ? "" : draft.id;
    renderForm(); if (category === "relationships") renderGraph();
  }

  editor.addEventListener("input", () => {
    if (!syncingJson) panel.querySelector("#bible-json-advanced")?.classList.add("edited");
  });
  jsonApply.addEventListener("click", () => {
    try {
      draft = JSON.parse(editor.value);
      panel.querySelector("#bible-json-advanced")?.classList.remove("edited");
      panel.querySelector("#bible-validation").textContent = ""; renderForm();
    } catch (error) {
      const validation = panel.querySelector("#bible-validation");
      validation.textContent = `${t("relationshipGraph.jsonError")} · ${error.message}`; validation.className = "error";
    }
  });
  window.addEventListener("studio:bible-loaded", (event) => {
    bible = clone(event.detail.bible); category = event.detail.category; selectedId = event.detail.selectedId;
    if (category === "relationships") renderGraph();
  });
  window.addEventListener("studio:bible-category-selected", (event) => {
    bible = clone(event.detail.bible); category = event.detail.category;
    if (category === "relationships") renderGraph(); else leaveGraph();
  });
  window.addEventListener("studio:bible-entity-selected", (event) => receiveEntity(event.detail));
  window.addEventListener("studio:project-changed", () => { positions = {}; selectedCharacter = null; });
  window.addEventListener("studio:language-changed", () => { renderForm(); if (category === "relationships") renderGraph(); });

  queueMicrotask(() => {
    const state = window.SerreBible?.state?.();
    if (!state?.bible) return;
    bible = state.bible; category = state.category; selectedId = state.selectedId;
    const entity = category === "direction"
      ? { id: "direction", art_direction: bible.art_direction, tone: bible.tone }
      : (bible[category] || []).find((item) => item.id === selectedId) || (bible[category] || [])[0];
    if (entity) receiveEntity({ category, entity, isNew: false });
    if (category === "relationships") renderGraph();
  });
})();
