const runtimeManager = (() => {
  const list = document.querySelector("#runtime-service-list");
  const summary = document.querySelector("#runtime-manager-summary");
  const refreshButton = document.querySelector("#runtime-refresh");
  const prepareButton = document.querySelector("#runtime-prepare");
  const logViewer = document.querySelector("#runtime-log-viewer");
  if (!list || !summary || !refreshButton || !prepareButton || !logViewer) return null;

  const copy = {
    fr: {
      unavailable: "Le pilotage est disponible dans l’application desktop.",
      ready: "Studio prêt · {ready}/{total} moteurs disponibles",
      partial: "Studio partiellement prêt · {ready}/{total} moteurs disponibles",
      mode: { managed: "Géré par La Serre", external: "Instance externe", configured: "Installation détectée", missing: "Non installé" },
      state: { checking: "Diagnostic", starting: "Démarrage", ready: "Prêt", unavailable: "Indisponible", missing: "Absent", restarting: "Redémarrage", failed: "Erreur", stopped: "Arrêté" },
      start: "Démarrer", stop: "Arrêter", restart: "Redémarrer", logs: "Voir les logs",
      noLogs: "Aucune ligne de journal pour ce moteur.", working: "Action en cours…",
      preparing: "Préparation du Studio…", prepare: "Préparer / Réparer tout",
      prepared: "Ollama, ComfyUI, les modèles et les workflows sont prêts.",
      incomplete: "Les moteurs sont lancés, mais les modèles ou workflows ComfyUI restent à configurer.",
      timeout: "La préparation dépasse cinq minutes. Ouvre les logs des moteurs pour le diagnostic.",
    },
    en: {
      unavailable: "Runtime controls are available in the desktop application.",
      ready: "Studio ready · {ready}/{total} runtimes available",
      partial: "Studio partially ready · {ready}/{total} runtimes available",
      mode: { managed: "Managed by La Serre", external: "External instance", configured: "Detected installation", missing: "Not installed" },
      state: { checking: "Checking", starting: "Starting", ready: "Ready", unavailable: "Unavailable", missing: "Missing", restarting: "Restarting", failed: "Error", stopped: "Stopped" },
      start: "Start", stop: "Stop", restart: "Restart", logs: "View logs",
      noLogs: "No log lines for this runtime.", working: "Action in progress…",
      preparing: "Preparing Studio…", prepare: "Prepare / Repair all",
      prepared: "Ollama, ComfyUI, models, and workflows are ready.",
      incomplete: "Runtimes started, but ComfyUI models or workflows still need configuration.",
      timeout: "Preparation exceeded five minutes. Open runtime logs for diagnostics.",
    },
  };
  let payload = { enabled: false, services: [] };
  const previousStates = new Map();
  let preparing = false;

  function language() { return window.SerreI18n?.getLanguage?.() === "en" ? "en" : "fr"; }
  function text(key) { return copy[language()][key]; }
  function interpolate(value, values) { return Object.entries(values).reduce((result, [key, item]) => result.replace(`{${key}}`, item), value); }

  async function request(path, options = {}) {
    const response = await fetch(path, options);
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.detail || `HTTP ${response.status}`);
    return body;
  }

  function announcePreparation(status, message, services = payload.services || []) {
    const ready = services.filter((service) => service.state === "ready").length;
    window.dispatchEvent(new CustomEvent("studio:runtime-preparation", {
      detail: {
        status,
        message,
        progress: {
          percent: services.length ? Math.round(100 * ready / services.length) : 0,
          completed: ready,
          total: services.length || 2,
          active_stage: "runtime",
          indeterminate: status === "GENERATING",
        },
      },
    }));
  }

  function wait(milliseconds) {
    return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
  }

  function actionButton(service, action) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = action === "start" ? "button primary" : "button ghost";
    button.textContent = text(action);
    button.disabled = !service.actions?.[action];
    button.addEventListener("click", () => control(service.name, action, button));
    return button;
  }

  function render(nextPayload) {
    payload = nextPayload;
    list.replaceChildren();
    const services = payload.services || [];
    const ready = services.filter((service) => service.state === "ready").length;
    summary.textContent = payload.enabled
      ? interpolate(text(ready === services.length && services.length ? "ready" : "partial"), { ready: String(ready), total: String(services.length) })
      : text("unavailable");

    for (const service of services) {
      const card = document.createElement("article");
      card.className = "runtime-service";
      card.dataset.state = service.state;
      const main = document.createElement("div");
      main.className = "runtime-service-main";
      const title = document.createElement("div");
      title.className = "runtime-service-title";
      const name = document.createElement("strong");
      name.textContent = service.display_name;
      const mode = document.createElement("small");
      mode.textContent = copy[language()].mode[service.mode] || service.mode;
      title.append(name, mode);
      const state = document.createElement("span");
      state.className = "runtime-state";
      state.textContent = copy[language()].state[service.state] || service.state;
      main.append(title, state);
      const detail = document.createElement("p");
      detail.className = "runtime-service-detail";
      detail.textContent = service.detail;
      const path = document.createElement("small");
      path.className = "runtime-service-path";
      path.title = service.executable || service.url;
      path.textContent = service.executable || service.url;
      const actions = document.createElement("div");
      actions.className = "runtime-service-actions";
      actions.append(actionButton(service, "start"), actionButton(service, "stop"), actionButton(service, "restart"));
      const logs = document.createElement("button");
      logs.type = "button";
      logs.className = "button ghost";
      logs.textContent = text("logs");
      logs.addEventListener("click", () => showLogs(service.name));
      actions.append(logs);
      card.append(main, detail, path, actions);
      list.append(card);

      const previous = previousStates.get(service.name);
      if (previous && previous !== service.state && service.state === "failed") {
        window.SerreNotifications?.captureError(`${service.display_name} · ${service.detail}`).catch(() => {});
      }
      previousStates.set(service.name, service.state);
    }
    updateTopbar(services);
    window.dispatchEvent(new CustomEvent("studio:runtime", { detail: payload }));
  }

  function updateTopbar(services) {
    const dot = document.querySelector("#connection-dot");
    const label = document.querySelector("#connection-label");
    if (!dot || !label || !payload.enabled) return;
    const ready = services.filter((service) => service.state === "ready").length;
    const failed = services.some((service) => service.state === "failed");
    const active = services.some((service) => ["checking", "starting", "restarting"].includes(service.state));
    dot.className = `dot ${failed ? "error" : ready === services.length ? "ready" : active ? "working" : "warn"}`;
    label.textContent = ready === services.length ? "Studio prêt" : `${ready}/${services.length} moteurs`;
  }

  async function refresh() {
    refreshButton.disabled = true;
    try {
      render(await request("/api/runtime/services"));
      return payload;
    } finally {
      refreshButton.disabled = false;
    }
  }

  async function prepareAll() {
    if (preparing) return;
    preparing = true;
    prepareButton.disabled = true;
    refreshButton.disabled = true;
    prepareButton.textContent = text("preparing");
    try {
      let snapshot = await request("/api/runtime/services");
      render(snapshot);
      if (!snapshot.enabled) throw new Error(text("unavailable"));
      announcePreparation("GENERATING", text("preparing"), snapshot.services);

      for (const service of snapshot.services || []) {
        if (service.state === "ready") continue;
        const action = service.actions?.start ? "start" : service.actions?.restart ? "restart" : null;
        if (action) {
          const result = await request(`/api/runtime/services/${encodeURIComponent(service.name)}/${action}`, { method: "POST" });
          snapshot = result.runtime;
          render(snapshot);
          announcePreparation("GENERATING", `${service.display_name} · ${result.service.detail}`, snapshot.services);
        }
      }

      const deadline = Date.now() + 300000;
      while (Date.now() < deadline) {
        snapshot = await request("/api/runtime/services");
        render(snapshot);
        const services = snapshot.services || [];
        const ready = services.filter((service) => service.state === "ready").length;
        announcePreparation("GENERATING", `${ready}/${services.length} moteurs prêts`, services);
        if (services.length && ready === services.length) {
          const studio = await request("/api/status");
          if (studio.status !== "ready") throw new Error(text("incomplete"));
          announcePreparation("COMPLETED", text("prepared"), services);
          window.SerreStudio?.notify?.(text("prepared"));
          return;
        }
        const blocked = services.find((service) => ["missing", "failed"].includes(service.state) && !service.actions?.start && !service.actions?.restart);
        if (blocked) throw new Error(`${blocked.display_name} · ${blocked.detail}`);
        await wait(1500);
      }
      throw new Error(text("timeout"));
    } catch (error) {
      announcePreparation("FAILED", error.message);
      window.SerreStudio?.notify?.(error.message, true);
    } finally {
      preparing = false;
      prepareButton.disabled = false;
      refreshButton.disabled = false;
      prepareButton.textContent = text("prepare");
    }
  }

  async function control(name, action, button) {
    if (button) button.disabled = true;
    summary.textContent = text("working");
    try {
      const result = await request(`/api/runtime/services/${encodeURIComponent(name)}/${action}`, { method: "POST" });
      render(result.runtime);
      window.SerreStudio?.notify?.(`${result.service.display_name} · ${result.service.detail}`);
      window.SerreNotifications?.refresh?.().catch(() => {});
      return result.service;
    } catch (error) {
      window.SerreStudio?.notify?.(error.message, true);
      await refresh().catch(() => {});
      return null;
    }
  }

  async function showLogs(name) {
    try {
      const result = await request(`/api/runtime/services/${encodeURIComponent(name)}/logs?limit=250`);
      document.querySelector("#runtime-log-title").textContent = result.display_name;
      document.querySelector("#runtime-log-path").textContent = result.path;
      document.querySelector("#runtime-log-content").textContent = result.lines.join("\n") || text("noLogs");
      logViewer.classList.remove("hidden");
      document.querySelector("#runtime-log-content").scrollTop = document.querySelector("#runtime-log-content").scrollHeight;
    } catch (error) {
      window.SerreStudio?.notify?.(error.message, true);
    }
  }

  refreshButton.addEventListener("click", () => refresh().catch((error) => window.SerreStudio?.notify?.(error.message, true)));
  prepareButton.addEventListener("click", () => void prepareAll());
  document.querySelector("#runtime-log-close")?.addEventListener("click", () => logViewer.classList.add("hidden"));
  window.addEventListener("studio:language-changed", () => render(payload));
  document.addEventListener("DOMContentLoaded", () => refresh().catch(() => {}));
  window.setInterval(() => { if (!document.hidden) refresh().catch(() => {}); }, 7000);

  window.SerreRuntimeManager = { refresh, control, showLogs, prepareAll, current: () => payload };
  return window.SerreRuntimeManager;
})();
