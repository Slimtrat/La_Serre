const workflowTemplateCatalogue = (() => {
  const settingsRoot = document.querySelector("#workflow-template-settings");
  let catalogue = null;
  let guidedRoot = null;
  let loading = null;

  const COPY = {
    fr: {
      eyebrow: "CONTINUITÉ VISUELLE",
      title: "Le parcours visuel complet du plan",
      description: "Chaque nœud reçoit une sortie validée, produit l’entrée du suivant et ouvre son vrai graphe ComfyUI.",
      settingsTitle: "Recettes visuelles disponibles",
      settingsDescription: "Le diagnostic est propre à chaque recette : un modèle FLUX manquant ne bloque pas SDXL ou LTX.",
      ready: "PRÊT",
      missing: "À PRÉPARER",
      selected: "SÉLECTIONNÉ",
      use: "Utiliser",
      inspect: "Voir les nœuds",
      models: "Modèles requis",
      noModels: "Aucun modèle déclaré",
      manual: "Source manuelle",
      settings: "Préparer les modèles",
      input: "Entrée",
      output: "Sortie",
      unavailable: "Catalogue indisponible",
      selectedNotice: "Recette sélectionnée pour cette étape.",
    },
    en: {
      eyebrow: "VISUAL CONTINUITY",
      title: "The shot’s complete visual journey",
      description: "Each node receives an approved output, produces the next input, and opens its real ComfyUI graph.",
      settingsTitle: "Available visual recipes",
      settingsDescription: "Readiness is per recipe: a missing FLUX model does not block SDXL or LTX.",
      ready: "READY",
      missing: "SETUP NEEDED",
      selected: "SELECTED",
      use: "Use",
      inspect: "View nodes",
      models: "Required models",
      noModels: "No declared model",
      manual: "Manual source",
      settings: "Prepare models",
      input: "Input",
      output: "Output",
      unavailable: "Catalogue unavailable",
      selectedNotice: "Recipe selected for this stage.",
    },
  };

  function language() { return window.SerreI18n?.getLanguage?.() === "en" ? "en" : "fr"; }
  function copy() { return COPY[language()]; }
  function h(value) {
    return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
  }
  async function request(path, options) {
    if (window.SerreStudio?.api && !options) return window.SerreStudio.api(path);
    const response = await fetch(path, options);
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.detail || `HTTP ${response.status}`);
    return body;
  }
  function orderedTemplates() {
    const byId = new Map((catalogue?.templates || []).map((item) => [item.id, item]));
    return (catalogue?.continuity_chain || []).map((id) => byId.get(id)).filter(Boolean);
  }
  function compactArtifacts(items, fallback) {
    const values = Array.isArray(items) ? items : [];
    return values.length ? values.map((item) => String(item).replaceAll("_", " ")).join(" + ") : fallback;
  }
  function modelMarkup(model) {
    const c = copy();
    const status = model.installed ? c.ready : c.missing;
    const source = model.url
      ? `<a href="${h(model.url)}" target="_blank" rel="noreferrer">${c.settings} ↗</a>`
      : `<span title="${h(model.source_note || c.manual)}">${c.manual}</span>`;
    return `<li><strong class="${model.installed ? "workflow-template-ready" : "workflow-template-missing"}">${h(status)} · ${h(model.role)}</strong><code>models/${h(model.folder)}/${h(model.filename)}</code>${model.installed ? "" : source}</li>`;
  }
  function nodeMarkup(template, index, selections, inSettings) {
    const c = copy();
    const selected = selections?.[template.stage] === template.id;
    const stateClass = template.models_ready ? "" : " blocked";
    const connection = `${compactArtifacts(template.receives, c.input)} → ${compactArtifacts(template.produces, c.output)}`;
    return `<article class="workflow-template-node${selected ? " selected" : ""}${stateClass}" data-template-id="${h(template.id)}" title="${h(connection)}">
      <header><span class="workflow-template-index">${String(index + 1).padStart(2, "0")}</span><div><h4>${h(template.label)}</h4><small>${h(template.model_family)}</small></div><small class="${template.models_ready ? "workflow-template-ready" : "workflow-template-missing"}">${template.models_ready ? c.ready : c.missing}</small></header>
      <p class="workflow-template-description">${h(template.description)}</p>
      <div class="workflow-template-flow" aria-label="${h(connection)}"><span><b>${c.input}</b><br>${h(compactArtifacts(template.receives, "—"))}</span><b aria-hidden="true">→</b><span><b>${c.output}</b><br>${h(compactArtifacts(template.produces, "—"))}</span></div>
      <details><summary>${c.models} · ${template.models.length}</summary><ul class="workflow-template-models">${template.models.length ? template.models.map(modelMarkup).join("") : `<li>${c.noModels}</li>`}</ul></details>
      <div class="workflow-template-actions">${inSettings ? "" : `<button class="button ${selected ? "ghost" : "secondary"}" type="button" data-template-select="${h(template.id)}" data-template-stage="${h(template.stage)}" ${selected ? "disabled" : ""}>${selected ? c.selected : c.use}</button>`}<button class="button ghost" type="button" data-template-inspect="${h(template.id)}" data-template-label="${h(template.label)}">${c.inspect}</button>${template.models_ready ? "" : `<button class="button ghost" type="button" data-template-settings>${c.settings}</button>`}</div>
    </article>`;
  }
  function sectionMarkup({ settings = false } = {}) {
    const c = copy();
    const guided = window.SerreGuided?.current?.();
    const selections = guided?.state?.selected_templates || {};
    const templates = orderedTemplates();
    if (!templates.length) return `<div class="workflow-template-empty">${c.unavailable}</div>`;
    return `<section class="workflow-template-map${settings ? " workflow-template-settings" : ""}" aria-label="${h(settings ? c.settingsTitle : c.title)}"><header><div><p class="eyebrow">${c.eyebrow}</p><h3>${settings ? c.settingsTitle : c.title}</h3><p>${settings ? c.settingsDescription : c.description}</p></div><span class="guided-stage-badge">${templates.length} NŒUDS</span></header><div class="workflow-template-chain" role="list">${templates.map((template, index) => nodeMarkup(template, index, selections, settings)).join("")}</div></section>`;
  }
  function render() {
    if (guidedRoot?.isConnected) guidedRoot.innerHTML = sectionMarkup();
    if (settingsRoot) settingsRoot.innerHTML = sectionMarkup({ settings: true });
  }
  async function load(force = false) {
    if (catalogue && !force) { render(); return catalogue; }
    if (!loading || force) loading = request("/api/workflow-templates").then((result) => { catalogue = result; render(); return result; }).finally(() => { loading = null; });
    return loading;
  }
  function mountGuided(root) { guidedRoot = root; void load().catch(reportError); }
  function reportError(error) {
    if (guidedRoot?.isConnected) guidedRoot.innerHTML = `<div class="workflow-template-empty">${h(error.message || copy().unavailable)}</div>`;
    window.SerreStudio?.notify?.(error.message || String(error), true);
  }
  async function handleClick(event) {
    const inspect = event.target.closest("[data-template-inspect]");
    if (inspect) return window.SerreWorkflowGraph?.openTemplate?.(inspect.dataset.templateInspect, inspect.dataset.templateLabel);
    if (event.target.closest("[data-template-settings]")) return window.SerreWorkspace?.show("settings");
    const select = event.target.closest("[data-template-select]");
    if (!select) return;
    select.disabled = true;
    await window.SerreGuided?.selectTemplate?.(select.dataset.templateStage, select.dataset.templateSelect);
    render();
    window.SerreStudio?.notify?.(copy().selectedNotice);
  }

  document.addEventListener("click", (event) => {
    if (event.target.closest("#workflow-template-settings, #guided-template-catalogue")) {
      Promise.resolve(handleClick(event)).catch(reportError);
    }
  });
  window.addEventListener("studio:language-changed", render);
  window.addEventListener("studio:project-changed", () => { catalogue = null; void load(true).catch(reportError); });
  document.addEventListener("DOMContentLoaded", () => { if (settingsRoot) void load().catch(reportError); });
  window.SerreWorkflowTemplates = Object.freeze({ load, mountGuided, render, current: () => catalogue });
  return window.SerreWorkflowTemplates;
})();
