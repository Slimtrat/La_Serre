const desktopWorkspace = (() => {
  const STORAGE_KEY = "serre-studio-desktop-layout-v1";
  const definitions = [
    { id: "graph", title: "Production", selector: ".graph-workbench", nativeWidth: 1440, nativeHeight: 900 },
    { id: "plan", title: "Plan", selector: ".workspace-grid", nativeWidth: 1280, nativeHeight: 820 },
    { id: "outputs", title: "Sorties", selector: "#preview-panel", nativeWidth: 1280, nativeHeight: 820 },
    { id: "settings", title: "Réglages", selector: "#settings-panel", nativeWidth: 900, nativeHeight: 700 },
  ];
  const shell = document.querySelector(".shell");
  const tabs = Array.from(document.querySelectorAll(".app-nav [data-workspace-target]"));
  if (!shell || !tabs.length) return null;

  let zIndex = 70;
  let saveFrame = 0;
  const panels = new Map();
  const saved = readLayout();
  const floatingLayer = document.createElement("div");
  floatingLayer.className = "desktop-floating-layer";
  floatingLayer.setAttribute("aria-label", "Fenêtres détachées");
  document.body.append(floatingLayer);

  const emptyState = document.createElement("section");
  emptyState.className = "desktop-dock-empty";
  emptyState.setAttribute("aria-live", "polite");
  const emptyContent = document.createElement("div");
  const emptyTitle = document.createElement("strong");
  const emptyCopy = document.createElement("span");
  const emptyButton = document.createElement("button");
  emptyButton.className = "button secondary";
  emptyButton.type = "button";
  emptyContent.append(emptyTitle, emptyCopy, emptyButton);
  emptyState.append(emptyContent);
  shell.append(emptyState);

  function readLayout() {
    try {
      const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      return value && value.version === 1 ? value : { version: 1, panels: {} };
    } catch (_error) {
      return { version: 1, panels: {} };
    }
  }

  function snapshot(panel) {
    const floating = panel.state.mode === "floating";
    const measurable = floating && !panel.state.closed && !panel.frame.hidden;
    const rectangle = measurable ? panel.frame.getBoundingClientRect() : null;
    const layerRectangle = floatingLayer.getBoundingClientRect();
    return {
      mode: panel.state.mode,
      closed: panel.state.closed,
      x: measurable ? Math.round(rectangle.left - layerRectangle.left) : panel.state.x,
      y: measurable ? Math.round(rectangle.top - layerRectangle.top) : panel.state.y,
      width: measurable ? Math.round(rectangle.width) : panel.state.width,
      height: measurable ? Math.round(rectangle.height) : panel.state.height,
      z: Number(panel.frame.style.zIndex) || panel.state.z || 70,
    };
  }

  function persistLayout() {
    const state = { version: 1, active: document.body.dataset.workspaceView || "graph", panels: {} };
    panels.forEach((panel, id) => { state.panels[id] = snapshot(panel); });
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (_error) { /* no-op */ }
  }

  function saveLayout() {
    window.cancelAnimationFrame(saveFrame);
    saveFrame = window.requestAnimationFrame(persistLayout);
  }

  function actionButton(action, label, glyph) {
    const button = document.createElement("button");
    button.className = "desktop-panel-action";
    button.type = "button";
    button.dataset.windowAction = action;
    button.setAttribute("aria-label", label);
    button.title = label;
    button.textContent = glyph;
    return button;
  }

  function createPanel(definition) {
    const content = document.querySelector(definition.selector);
    if (!content) return null;
    const anchor = document.createComment("desktop-panel-" + definition.id);
    content.parentNode.insertBefore(anchor, content);
    const frame = document.createElement("section");
    frame.id = "desktop-panel-" + definition.id;
    frame.className = "desktop-panel-frame desktop-panel-docked";
    frame.dataset.desktopPanel = definition.id;
    frame.setAttribute("role", "tabpanel");
    frame.setAttribute("aria-label", definition.title);
    const bar = document.createElement("header");
    bar.className = "desktop-panel-bar";
    bar.tabIndex = 0;
    bar.setAttribute("aria-label", definition.title + ". Alt plus flèches pour déplacer; Maj Alt plus flèches pour redimensionner.");
    const status = document.createElement("i");
    status.className = "desktop-panel-status";
    status.setAttribute("aria-hidden", "true");
    const title = document.createElement("strong");
    title.className = "desktop-panel-title";
    title.textContent = definition.title;
    const mode = document.createElement("span");
    mode.className = "desktop-panel-mode";
    mode.textContent = "ancré";
    const actions = document.createElement("div");
    actions.className = "desktop-panel-actions";
    const dockButton = actionButton("dock", "Détacher le panneau " + definition.title, "↗");
    const nativeButton = actionButton("native", "Ouvrir " + definition.title + " dans une vraie fenêtre native", "▣");
    nativeButton.hidden = true;
    const closeButton = actionButton("close", "Fermer le panneau " + definition.title, "×");
    actions.append(dockButton, nativeButton, closeButton);
    bar.append(status, title, mode, actions);
    const contentHost = document.createElement("div");
    contentHost.className = "desktop-panel-content";
    contentHost.append(content);
    frame.append(bar, contentHost);
    anchor.parentNode.insertBefore(frame, anchor.nextSibling);

    const persisted = saved.panels?.[definition.id] || {};
    const panel = {
      ...definition, anchor, frame, bar, modeLabel: mode, dockButton, nativeButton,
      state: {
        mode: persisted.mode === "floating" ? "floating" : "docked",
        closed: Boolean(persisted.closed),
        x: Number.isFinite(persisted.x) ? persisted.x : null,
        y: Number.isFinite(persisted.y) ? persisted.y : null,
        width: Number.isFinite(persisted.width) ? persisted.width : null,
        height: Number.isFinite(persisted.height) ? persisted.height : null,
        z: Number.isFinite(persisted.z) ? persisted.z : null,
      },
    };
    panels.set(definition.id, panel);
    dockButton.addEventListener("click", () => panel.state.mode === "floating" ? dockPanel(panel, true) : floatPanel(panel, true));
    nativeButton.addEventListener("click", () => openNativePanel(panel));
    closeButton.addEventListener("click", () => closePanel(panel));
    bar.addEventListener("dblclick", (event) => {
      if (event.target.closest("button")) return;
      if (panel.state.mode === "floating") dockPanel(panel, true);
      else floatPanel(panel, true);
    });
    bar.addEventListener("pointerdown", (event) => startDrag(event, panel));
    bar.addEventListener("keydown", (event) => moveWithKeyboard(event, panel));
    frame.addEventListener("pointerdown", () => focusPanel(panel));
    if (window.ResizeObserver) new ResizeObserver(() => {
      if (panel.state.mode === "floating" && !panel.state.closed) saveLayout();
    }).observe(frame);
    return panel;
  }

  async function openNativePanel(panel) {
    const api = window.pywebview?.api;
    if (typeof api?.open_panel !== "function") return;
    panel.nativeButton.disabled = true;
    try {
      await api.open_panel("/?view=" + panel.id, panel.title, panel.nativeWidth, panel.nativeHeight);
    } catch (error) {
      console.error("Impossible d’ouvrir la fenêtre native", error);
    } finally {
      panel.nativeButton.disabled = false;
    }
  }

  function exposeNativeWindowActions() {
    const available = typeof window.pywebview?.api?.open_panel === "function";
    panels.forEach((panel) => { panel.nativeButton.hidden = !available; });
    document.body.classList.toggle("native-window-actions-ready", available);
  }

  function constrainBounds(bounds, layer = floatingLayer.getBoundingClientRect()) {
    const minWidth = Math.min(430, Math.max(280, layer.width - 12));
    const minHeight = Math.min(270, Math.max(210, layer.height - 12));
    const width = Math.min(Math.max(bounds.width, minWidth), Math.max(minWidth, layer.width - 12));
    const height = Math.min(Math.max(bounds.height, minHeight), Math.max(minHeight, layer.height - 12));
    return {
      width, height,
      x: Math.min(Math.max(bounds.x, 6), Math.max(6, layer.width - width - 6)),
      y: Math.min(Math.max(bounds.y, 6), Math.max(6, layer.height - height - 6)),
    };
  }

  function windowBounds(panel, useSaved = true) {
    const layer = floatingLayer.getBoundingClientRect();
    const width = useSaved && panel.state.width ? panel.state.width : Math.min(1050, Math.max(430, layer.width * .72));
    const height = useSaved && panel.state.height ? panel.state.height : Math.min(720, Math.max(300, layer.height * .78));
    const index = definitions.findIndex((definition) => definition.id === panel.id);
    return constrainBounds({
      width, height,
      x: useSaved && panel.state.x !== null ? panel.state.x : Math.max(8, (layer.width - width) / 2 + index * 14),
      y: useSaved && panel.state.y !== null ? panel.state.y : 12 + index * 13,
    }, layer);
  }

  function applyBounds(panel, bounds) {
    panel.frame.style.left = Math.round(bounds.x) + "px";
    panel.frame.style.top = Math.round(bounds.y) + "px";
    panel.frame.style.width = Math.round(bounds.width) + "px";
    panel.frame.style.height = Math.round(bounds.height) + "px";
    Object.assign(panel.state, bounds);
  }

  function focusPanel(panel) {
    if (panel.state.mode !== "floating") return;
    zIndex += 1;
    panel.frame.style.zIndex = String(zIndex);
    panel.state.z = zIndex;
    panels.forEach((candidate) => candidate.frame.classList.toggle("is-active-window", candidate === panel));
    updateTabs();
  }

  function floatPanel(panel, shouldFocus = false) {
    panel.state.mode = "floating";
    panel.state.closed = false;
    panel.frame.hidden = false;
    panel.frame.classList.remove("desktop-panel-docked");
    panel.frame.classList.add("desktop-panel-floating");
    floatingLayer.append(panel.frame);
    applyBounds(panel, windowBounds(panel));
    panel.modeLabel.textContent = "détaché";
    panel.dockButton.textContent = "↙";
    panel.dockButton.setAttribute("aria-label", "Ré-ancrer le panneau " + panel.title);
    panel.dockButton.title = "Ré-ancrer le panneau " + panel.title;
    focusPanel(panel);
    updateEmptyState();
    saveLayout();
    notifyResize();
    if (shouldFocus) panel.bar.focus({ preventScroll: true });
  }

  function dockPanel(panel, shouldFocus = false) {
    if (panel.state.mode === "floating") Object.assign(panel.state, snapshot(panel));
    panel.state.mode = "docked";
    panel.state.closed = false;
    panel.frame.hidden = false;
    panel.frame.classList.remove("desktop-panel-floating", "is-active-window", "is-dragging");
    panel.frame.classList.add("desktop-panel-docked");
    panel.frame.removeAttribute("style");
    panel.anchor.parentNode.insertBefore(panel.frame, panel.anchor.nextSibling);
    panel.modeLabel.textContent = "ancré";
    panel.dockButton.textContent = "↗";
    panel.dockButton.setAttribute("aria-label", "Détacher le panneau " + panel.title);
    panel.dockButton.title = "Détacher le panneau " + panel.title;
    updateTabs();
    updateEmptyState();
    saveLayout();
    notifyResize();
    if (shouldFocus) panel.bar.focus({ preventScroll: true });
  }

  function closePanel(panel) {
    panel.state.closed = true;
    panel.frame.hidden = true;
    panel.frame.classList.remove("is-active-window", "is-dragging");
    updateTabs();
    updateEmptyState();
    saveLayout();
    tabs.find((candidate) => candidate.dataset.workspaceTarget === panel.id)?.focus({ preventScroll: true });
  }

  function reopenPanel(panel) {
    panel.state.closed = false;
    panel.frame.hidden = false;
    if (panel.state.mode === "floating") {
      if (panel.frame.parentNode !== floatingLayer) floatingLayer.append(panel.frame);
      applyBounds(panel, windowBounds(panel));
      focusPanel(panel);
      panel.bar.focus({ preventScroll: true });
    } else {
      panel.anchor.parentNode.insertBefore(panel.frame, panel.anchor.nextSibling);
    }
    updateTabs();
    updateEmptyState();
    saveLayout();
    notifyResize();
  }

  function startDrag(event, panel) {
    if (panel.state.mode !== "floating" || event.button !== 0 || event.target.closest("button")) return;
    event.preventDefault();
    focusPanel(panel);
    const layer = floatingLayer.getBoundingClientRect();
    const rectangle = panel.frame.getBoundingClientRect();
    const offsetX = event.clientX - rectangle.left;
    const offsetY = event.clientY - rectangle.top;
    panel.frame.classList.add("is-dragging");
    panel.bar.setPointerCapture(event.pointerId);
    const move = (moveEvent) => {
      const current = panel.frame.getBoundingClientRect();
      applyBounds(panel, constrainBounds({
        x: moveEvent.clientX - layer.left - offsetX,
        y: moveEvent.clientY - layer.top - offsetY,
        width: current.width,
        height: current.height,
      }, layer));
    };
    const stop = () => {
      panel.frame.classList.remove("is-dragging");
      panel.bar.removeEventListener("pointermove", move);
      panel.bar.removeEventListener("pointerup", stop);
      panel.bar.removeEventListener("pointercancel", stop);
      saveLayout();
    };
    panel.bar.addEventListener("pointermove", move);
    panel.bar.addEventListener("pointerup", stop);
    panel.bar.addEventListener("pointercancel", stop);
  }

  function moveWithKeyboard(event, panel) {
    if (panel.state.mode !== "floating" || !event.altKey || !event.key.startsWith("Arrow")) return;
    event.preventDefault();
    const rectangle = panel.frame.getBoundingClientRect();
    const layer = floatingLayer.getBoundingClientRect();
    const step = event.ctrlKey ? 40 : 12;
    const bounds = { x: rectangle.left - layer.left, y: rectangle.top - layer.top, width: rectangle.width, height: rectangle.height };
    const horizontal = event.key === "ArrowRight" ? step : event.key === "ArrowLeft" ? -step : 0;
    const vertical = event.key === "ArrowDown" ? step : event.key === "ArrowUp" ? -step : 0;
    if (event.shiftKey) { bounds.width += horizontal; bounds.height += vertical; }
    else { bounds.x += horizontal; bounds.y += vertical; }
    applyBounds(panel, constrainBounds(bounds, layer));
    saveLayout();
  }

  function activatePanel(id, reopen = false) {
    const panel = panels.get(id);
    if (!panel) return;
    if (reopen && panel.state.closed) reopenPanel(panel);
    if (!panel.state.closed && panel.state.mode === "floating") focusPanel(panel);
    updateTabs();
    updateEmptyState();
    saveLayout();
  }

  function updateTabs() {
    const active = document.body.dataset.workspaceView || "graph";
    tabs.forEach((tab) => {
      const panel = panels.get(tab.dataset.workspaceTarget);
      const selected = tab.dataset.workspaceTarget === active;
      tab.setAttribute("aria-selected", String(selected));
      tab.setAttribute("tabindex", selected ? "0" : "-1");
      tab.setAttribute("aria-controls", "desktop-panel-" + tab.dataset.workspaceTarget);
      tab.classList.toggle("is-floating", panel?.state.mode === "floating" && !panel.state.closed);
      tab.classList.toggle("is-closed", Boolean(panel?.state.closed));
    });
  }

  function updateEmptyState() {
    const panel = panels.get(document.body.dataset.workspaceView || "graph");
    const show = panel && (panel.state.closed || panel.state.mode === "floating");
    emptyState.classList.toggle("is-visible", Boolean(show));
    if (!show) return;
    emptyTitle.textContent = panel.state.closed ? panel.title + " est fermé" : panel.title + " est détaché";
    emptyCopy.textContent = panel.state.closed
      ? "Rouvre ce panneau pour reprendre le travail exactement où tu l’avais laissé."
      : "Le panneau est disponible dans une fenêtre libre au-dessus de cet espace.";
    emptyButton.textContent = panel.state.closed ? "Rouvrir le panneau" : "Mettre la fenêtre au premier plan";
    emptyButton.onclick = () => panel.state.closed ? reopenPanel(panel) : focusPanel(panel);
  }

  function notifyResize() {
    window.setTimeout(() => window.dispatchEvent(new Event("resize")), 30);
  }

  definitions.forEach(createPanel);
  window.addEventListener("pywebviewready", exposeNativeWindowActions);
  exposeNativeWindowActions();
  panels.forEach((panel) => {
    const shouldRemainClosed = panel.state.closed;
    if (panel.state.mode === "floating") floatPanel(panel);
    if (shouldRemainClosed) {
      panel.state.closed = true;
      panel.frame.hidden = true;
    }
    zIndex = Math.max(zIndex, panel.state.z || 0);
  });
  tabs.forEach((tab, index) => {
    tab.addEventListener("click", () => activatePanel(tab.dataset.workspaceTarget, true));
    tab.addEventListener("keydown", (event) => {
      if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
      event.preventDefault();
      let nextIndex = index;
      if (event.key === "Home") nextIndex = 0;
      else if (event.key === "End") nextIndex = tabs.length - 1;
      else nextIndex = (index + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
      tabs[nextIndex].focus();
      tabs[nextIndex].click();
    });
  });

  const nativeShow = window.SerreWorkspace?.show;
  if (nativeShow) window.SerreWorkspace.show = (view) => { nativeShow(view); activatePanel(view, true); };
  window.addEventListener("resize", () => {
    panels.forEach((panel) => {
      if (panel.state.mode !== "floating" || panel.state.closed) return;
      const rectangle = panel.frame.getBoundingClientRect();
      const layer = floatingLayer.getBoundingClientRect();
      applyBounds(panel, constrainBounds({
        x: rectangle.left - layer.left, y: rectangle.top - layer.top,
        width: rectangle.width, height: rectangle.height,
      }, layer));
    });
    saveLayout();
  });
  window.addEventListener("beforeunload", persistLayout);

  document.body.classList.add("desktop-workspace-ready");
  let requestedView = null;
  try { requestedView = new URLSearchParams(window.location.search).get("view"); } catch (_error) { /* no-op */ }
  const initial = panels.has(requestedView)
    ? requestedView
    : panels.has(saved.active) ? saved.active : document.body.dataset.workspaceView || "graph";
  if (nativeShow && initial !== document.body.dataset.workspaceView) nativeShow(initial);
  activatePanel(initial);
  window.SerreDesktop = {
    close: (id) => panels.has(id) && closePanel(panels.get(id)),
    dock: (id) => panels.has(id) && dockPanel(panels.get(id), true),
    float: (id) => panels.has(id) && floatPanel(panels.get(id), true),
    open: (id) => panels.has(id) && reopenPanel(panels.get(id)),
    reset: () => {
      panels.forEach((panel) => dockPanel(panel));
      try { localStorage.removeItem(STORAGE_KEY); } catch (_error) { /* no-op */ }
    },
  };
  return window.SerreDesktop;
})();
