(() => {
  const ROOT_SELECTOR = ".narrative-workflow-dialog, #editorial-history-dialog";
  const LABEL_SELECTOR = ".narrative-workflow-dialog label, #editorial-history-dialog label";
  const SKIPPED_TYPES = new Set(["file", "hidden", "checkbox", "radio", "number", "search"]);
  const copy = {
    fr: { title: "Remplir avec l’IA depuis le contexte actuel", before: "AVANT", after: "PROPOSITION IA", keep: "Garder l’actuel", apply: "Utiliser", empty: "(champ vide)", working: "L’IA relit le contexte…", ready: "Proposition IA prête", candidate: "PROPOSITION NON APPLIQUÉE" },
    en: { title: "Fill with AI using the current context", before: "BEFORE", after: "AI PROPOSAL", keep: "Keep current", apply: "Use proposal", empty: "(empty field)", working: "AI is reading the context…", ready: "AI proposal ready", candidate: "UNAPPLIED PROPOSAL" },
  };
  let candidatePanel = null;
  let activeCandidate = null;

  function language() { return window.SerreI18n?.getLanguage?.() === "en" ? "en" : "fr"; }
  function t(key) { return copy[language()][key]; }
  function request(path, options = {}) {
    return fetch(path, options).then(async (response) => {
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.detail || `HTTP ${response.status}`);
      return payload;
    });
  }
  function fieldKey(field) {
    return field.id || field.dataset.editorialField || field.dataset.field || field.dataset.shot || field.name || "field";
  }
  function fieldLabel(label, field) {
    const direct = Array.from(label.childNodes).find((node) => node.nodeType === Node.TEXT_NODE && node.textContent.trim());
    return direct?.textContent.trim() || field.getAttribute("aria-label") || fieldKey(field);
  }
  function eligible(field) {
    const type = (field.getAttribute("type") || "text").toLowerCase();
    return !SKIPPED_TYPES.has(type) && !field.disabled && !field.readOnly;
  }
  function visibleContext(root, activeField) {
    const lines = [];
    const graph = window.SerreGraph?.current?.();
    if (graph) lines.push(`Graphe actif: ${graph.scope || ""} ${graph.id || ""}`.trim());
    for (const field of root.querySelectorAll("input, textarea, select")) {
      if (field === activeField || !eligible(field)) continue;
      const value = String(field.value || "").trim();
      if (!value) continue;
      const label = field.closest("label");
      const name = label ? fieldLabel(label, field) : fieldKey(field);
      lines.push(`${name}: ${value}`);
      if (lines.join("\n").length > 14000) break;
    }
    return lines.join("\n").slice(0, 16000);
  }
  function mountCandidatePanel() {
    if (candidatePanel) return;
    candidatePanel = document.createElement("aside");
    candidatePanel.className = "ai-field-candidate hidden";
    candidatePanel.innerHTML = `<header><div><small data-ai-candidate-kicker></small><strong data-ai-candidate-title></strong></div><button type="button" data-ai-candidate-close aria-label="Fermer">×</button></header><section class="ai-field-diff"><article><small data-ai-before-label></small><p data-ai-before></p></article><article><small data-ai-after-label></small><p data-ai-after></p></article></section><footer><small data-ai-provider></small><div><button class="button ghost" type="button" data-ai-candidate-keep></button><button class="button primary" type="button" data-ai-candidate-apply></button></div></footer>`;
    document.body.append(candidatePanel);
    candidatePanel.querySelector("[data-ai-candidate-close]").addEventListener("click", closeCandidate);
    candidatePanel.querySelector("[data-ai-candidate-keep]").addEventListener("click", closeCandidate);
    candidatePanel.querySelector("[data-ai-candidate-apply]").addEventListener("click", applyCandidate);
  }
  function closeCandidate() {
    candidatePanel?.classList.add("hidden");
    activeCandidate = null;
  }
  function applyCandidate() {
    if (!activeCandidate?.field?.isConnected) return closeCandidate();
    activeCandidate.field.value = activeCandidate.value;
    activeCandidate.field.dispatchEvent(new Event("input", { bubbles: true }));
    activeCandidate.field.dispatchEvent(new Event("change", { bubbles: true }));
    activeCandidate.field.focus({ preventScroll: true });
    closeCandidate();
  }
  function showCandidate(field, label, previous, result, anchor) {
    mountCandidatePanel();
    activeCandidate = { field, value: result.suggestion };
    candidatePanel.querySelector("[data-ai-candidate-kicker]").textContent = t("candidate");
    candidatePanel.querySelector("[data-ai-candidate-title]").textContent = label;
    candidatePanel.querySelector("[data-ai-before-label]").textContent = t("before");
    candidatePanel.querySelector("[data-ai-after-label]").textContent = t("after");
    candidatePanel.querySelector("[data-ai-before]").textContent = previous || t("empty");
    candidatePanel.querySelector("[data-ai-after]").textContent = result.suggestion;
    candidatePanel.querySelector("[data-ai-provider]").textContent = `Ollama · ${result.model}`;
    candidatePanel.querySelector("[data-ai-candidate-keep]").textContent = t("keep");
    candidatePanel.querySelector("[data-ai-candidate-apply]").textContent = t("apply");
    candidatePanel.classList.remove("hidden");
    const rect = anchor.getBoundingClientRect();
    const width = candidatePanel.offsetWidth;
    const height = candidatePanel.offsetHeight;
    candidatePanel.style.left = `${Math.max(8, Math.min(rect.right - width, window.innerWidth - width - 8))}px`;
    candidatePanel.style.top = `${Math.max(72, Math.min(rect.bottom + 7, window.innerHeight - height - 8))}px`;
  }
  async function suggest(field, label, button) {
    const root = field.closest(ROOT_SELECTOR);
    if (!root) return;
    const previous = field.value;
    button.disabled = true;
    button.textContent = "…";
    const jobId = `field-ai-${Date.now()}`;
    window.dispatchEvent(new CustomEvent("studio:stage-job", { detail: { id: jobId, kind: "prompt", stage: "prompt", status: "GENERATING", message: t("working") } }));
    try {
      const result = await request("/api/narrative/field/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          field_key: fieldKey(field), field_label: label, current_value: previous,
          context: visibleContext(root, field), locale: language(),
          model: document.querySelector("#narrative-model")?.value || document.querySelector("#ollama-model")?.value || null,
        }),
      });
      showCandidate(field, label, previous, result, button);
      window.dispatchEvent(new CustomEvent("studio:stage-job", { detail: { id: jobId, kind: "prompt", stage: "prompt", status: "COMPLETED", message: t("ready") } }));
    } catch (error) {
      window.dispatchEvent(new CustomEvent("studio:stage-job", { detail: { id: jobId, kind: "prompt", stage: "prompt", status: "FAILED", message: error.message } }));
      window.SerreStudio?.notify?.(error.message, true);
    } finally {
      button.disabled = false;
      button.textContent = "✦";
    }
  }
  function decorate(root = document) {
    for (const label of root.querySelectorAll(LABEL_SELECTOR)) {
      if (label.dataset.aiFieldReady === "true") continue;
      const field = label.querySelector("input, textarea");
      if (!field || !eligible(field)) continue;
      label.dataset.aiFieldReady = "true";
      label.classList.add("ai-field-enabled");
      const button = document.createElement("button");
      button.type = "button";
      button.className = "ai-field-trigger";
      button.textContent = "✦";
      button.title = t("title");
      button.setAttribute("aria-label", `${t("title")} · ${fieldLabel(label, field)}`);
      button.addEventListener("click", (event) => {
        event.preventDefault(); event.stopPropagation();
        void suggest(field, fieldLabel(label, field), button);
      });
      label.append(button);
    }
  }
  const observer = new MutationObserver(() => decorate());
  observer.observe(document.body, { childList: true, subtree: true });
  decorate();
  window.addEventListener("serre:i18n-changed", () => {
    for (const button of document.querySelectorAll(".ai-field-trigger")) button.title = t("title");
    closeCandidate();
  });
  window.SerreFieldAssistant = Object.freeze({ decorate, close: closeCandidate });
})();
