(() => {
  const root = document.querySelector("#narrative-model-manager");
  const summary = document.querySelector("#narrative-model-manager-summary");
  const list = document.querySelector("#narrative-model-list");
  const installButton = document.querySelector("#narrative-model-install");
  const refreshButton = document.querySelector("#narrative-model-refresh");
  const runtimeButton = document.querySelector("#narrative-runtime-open");
  if (!root || !summary || !list || !installButton || !refreshButton || !runtimeButton) return;

  const COPY = {
    fr: {
      checking: "Vérification d’Ollama et des modèles installés…",
      ready: "Prêt · {model} est utilisé pour l’écriture",
      missing: "Ollama répond, mais aucun modèle narratif compatible n’est installé.",
      offline: "Ollama est hors ligne. Démarre le moteur avant d’installer un modèle.",
      install: "Installer {model}", installing: "Installation en cours…", installed: "{model} est prêt pour l’atelier narratif.",
      refresh: "Actualiser", runtimes: "Ouvrir les moteurs", empty: "Aucun modèle Ollama détecté.",
      narrative: "Narratif", incompatible: "Non narratif", selected: "sélectionné", unknownSize: "taille inconnue",
    },
    en: {
      checking: "Checking Ollama and installed models…",
      ready: "Ready · {model} is used for writing",
      missing: "Ollama is available, but no compatible narrative model is installed.",
      offline: "Ollama is offline. Start the engine before installing a model.",
      install: "Install {model}", installing: "Installing…", installed: "{model} is ready for the story room.",
      refresh: "Refresh", runtimes: "Open engines", empty: "No Ollama model detected.",
      narrative: "Narrative", incompatible: "Not narrative", selected: "selected", unknownSize: "unknown size",
    },
  };
  let status = null;
  let busy = false;

  const locale = () => document.documentElement.lang?.toLowerCase().startsWith("en") ? "en" : "fr";
  const t = (key, params = {}) => Object.entries(params).reduce(
    (text, [name, value]) => text.replaceAll(`{${name}}`, String(value)), COPY[locale()][key] || key,
  );
  const notify = (message, error = false) => window.SerreStudio?.notify(message, error);
  const formatBytes = (bytes) => {
    const value = Number(bytes || 0);
    if (!value) return t("unknownSize");
    const units = ["o", "Ko", "Mo", "Go", "To"];
    const index = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1);
    return `${(value / (1024 ** index)).toLocaleString(locale(), { maximumFractionDigits: 1 })} ${units[index]}`;
  };

  async function request(path, options = {}) {
    const response = await fetch(path, options);
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.detail || `HTTP ${response.status}`);
    return body;
  }

  function modelMeta(item) {
    return [formatBytes(item.size), item.parameter_size, item.quantization, item.name === status?.selected_model ? t("selected") : null]
      .filter(Boolean).join(" · ");
  }

  function render() {
    const recommended = status?.recommended_model || "qwen3:4b";
    const installed = (status?.models || []).some((item) => item.name === recommended);
    const state = !status?.ollama_ready ? "offline" : status.ready ? "ready" : "missing";
    const message = state === "ready" ? t("ready", { model: status.selected_model }) : t(state);
    summary.dataset.state = state;
    summary.textContent = message;
    document.querySelector("#settings-narrative-state").textContent = state === "ready" ? "Prêt" : state === "offline" ? "Hors ligne" : "À installer";
    document.querySelector("#settings-narrative-state").className = `settings-drawer-state ${state === "ready" ? "ready" : "warn"}`;
    installButton.textContent = busy ? t("installing") : installed ? t("installed", { model: recommended }) : t("install", { model: recommended });
    installButton.disabled = busy || installed || !status?.ollama_ready;
    refreshButton.textContent = t("refresh");
    refreshButton.disabled = busy;
    runtimeButton.textContent = t("runtimes");
    runtimeButton.classList.toggle("hidden", Boolean(status?.ollama_ready));
    list.replaceChildren();
    if (!(status?.models || []).length) {
      const empty = document.createElement("p");
      empty.className = "settings-model-empty";
      empty.textContent = t("empty");
      list.append(empty);
      return;
    }
    for (const item of status.models) {
      const row = document.createElement("article");
      row.className = "narrative-model-row";
      const copy = document.createElement("div");
      const name = document.createElement("strong");
      const meta = document.createElement("small");
      const kind = document.createElement("span");
      name.textContent = item.name;
      meta.textContent = modelMeta(item);
      kind.className = `narrative-model-kind${item.narrative_compatible ? "" : " incompatible"}`;
      kind.textContent = t(item.narrative_compatible ? "narrative" : "incompatible");
      copy.append(name, meta);
      row.append(copy, kind);
      list.append(row);
    }
  }

  async function refresh() {
    summary.dataset.state = "checking";
    summary.textContent = t("checking");
    try {
      status = await request("/api/narrative/status");
      render();
      return status;
    } catch (error) {
      status = { ollama_ready: false, ready: false, models: [], recommended_model: "qwen3:4b" };
      render();
      notify(error.message, true);
      return status;
    }
  }

  async function install() {
    if (busy) return;
    busy = true;
    render();
    try {
      status = await request("/api/narrative/models/recommended/install", { method: "POST" });
      render();
      notify(t("installed", { model: status.recommended_model || "qwen3:4b" }));
      window.dispatchEvent(new CustomEvent("studio:narrative-models-changed", { detail: status }));
    } catch (error) {
      notify(error.message, true);
      await refresh();
    } finally {
      busy = false;
      render();
    }
  }

  function open(options = {}) {
    window.SerreWorkspace?.show("settings");
    window.SerreSettings?.openDrawer("settings-drawer-narrative-models", { attention: options.attention !== false });
    void refresh();
  }

  installButton.addEventListener("click", () => void install());
  refreshButton.addEventListener("click", () => void refresh());
  runtimeButton.addEventListener("click", () => window.SerreSettings?.openDrawer("settings-drawer-runtimes", { attention: true }));
  window.addEventListener("studio:model-manager-open", (event) => {
    if (!event.detail?.provider || event.detail.provider === "ollama") open(event.detail || {});
  });
  window.addEventListener("serre:i18n-changed", () => { if (status) render(); });
  window.SerreModelManager = Object.freeze({ open, refresh, state: () => status });
  void refresh();
})();
