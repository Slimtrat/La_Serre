const studioGraph = (() => {
  const viewport = document.querySelector("#graph-viewport");
  const world = document.querySelector("#graph-world");
  const links = document.querySelector("#graph-links");
  const minimap = document.querySelector("#graph-minimap");
  const minimapWorld = document.querySelector("#graph-minimap-world");
  const minimapWindow = document.querySelector("#graph-minimap-window");
  const zoomLabel = document.querySelector("#graph-zoom-label");
  const positionLabel = document.querySelector("#graph-position");
  if (!viewport || !world || !links || !minimap || !minimapWorld || !minimapWindow) {
    return null;
  }

  const MIN_SCALE = 0.28;
  const MAX_SCALE = 1.45;
  const stageNodeById = {
    input: "shot",
    prompt: "director",
    references: "cast",
    keyframe: "keyframe",
    video: "motion",
    artifacts: "export",
    music: "mix",
    voice: "voice",
    mix: "mix",
    montage: "montage",
    export: "export",
  };
  const runtimeStates = new Set(["idle", "ready", "active", "done", "blocked", "stale", "error"]);
  const legacyRuntimeStates = {
    running: "active",
    pending: "ready",
    future: "blocked",
    failed: "error",
    optional: "idle",
  };

  let graphDefinition = null;
  let nodes = [];
  let nodeById = {};
  let view = { x: 24, y: 8, scale: 0.68 };
  let selectedId = null;
  let focusNodeId = null;
  let focusEnabled = true;
  let activityNodeId = null;
  let outputs = {};
  let liveJobId = null;
  let draggingNode = null;
  let panning = null;
  let loadRevision = 0;
  let synchronizingContext = false;

  const edgeTooltip = document.createElement("aside");
  edgeTooltip.className = "graph-edge-tooltip hidden";
  edgeTooltip.setAttribute("role", "tooltip");
  const edgeTooltipRoute = document.createElement("strong");
  const edgeTooltipDescription = document.createElement("span");
  edgeTooltip.append(edgeTooltipRoute, edgeTooltipDescription);
  viewport.append(edgeTooltip);

  function canonicalRuntimeState(state) {
    const canonical = legacyRuntimeStates[state] || state;
    return runtimeStates.has(canonical) ? canonical : "idle";
  }

  function contextKey(prefix, graph = graphDefinition) {
    if (!graph) return prefix + ":pending";
    return prefix + ":" + graph.scope + ":" + encodeURIComponent(graph.id);
  }

  function readStorage(key, fallback) {
    try {
      const value = JSON.parse(localStorage.getItem(key));
      return value && typeof value === "object" ? value : fallback;
    } catch (_error) {
      return fallback;
    }
  }

  function persistLayout() {
    if (!graphDefinition) return;
    const layout = {};
    nodes.forEach((node) => {
      layout[node.dataset.nodeId] = {
        x: Number(node.dataset.x),
        y: Number(node.dataset.y),
      };
    });
    localStorage.setItem(contextKey("serre-studio-graph-layout-v2"), JSON.stringify(layout));
  }

  function persistView() {
    if (!graphDefinition) return;
    localStorage.setItem(contextKey("serre-studio-graph-view-v2"), JSON.stringify(view));
  }

  function clamp(value, minimum, maximum) {
    return Math.min(maximum, Math.max(minimum, value));
  }

  function worldWidth() {
    return graphDefinition?.viewport?.width || 2440;
  }

  function worldHeight() {
    return graphDefinition?.viewport?.height || 900;
  }

  function graphEdges() {
    return graphDefinition?.edges || [];
  }

  function installArrowMarkers() {
    const definitionsElement = links.querySelector("defs");
    if (!definitionsElement) return;
    const markers = {
      core: "#4e9fff",
      optional: "#f4a261",
      stale: "#d8a33f",
      error: "#e05a68",
    };
    Object.entries(markers).forEach(([name, color]) => {
      if (definitionsElement.querySelector("#graph-arrow-" + name)) return;
      const marker = document.createElementNS("http://www.w3.org/2000/svg", "marker");
      marker.id = "graph-arrow-" + name;
      marker.setAttribute("markerWidth", "10");
      marker.setAttribute("markerHeight", "10");
      marker.setAttribute("refX", "8");
      marker.setAttribute("refY", "5");
      marker.setAttribute("orient", "auto");
      const arrow = document.createElementNS("http://www.w3.org/2000/svg", "path");
      arrow.setAttribute("d", "M 0 0 L 10 5 L 0 10 z");
      arrow.setAttribute("fill", color);
      marker.appendChild(arrow);
      definitionsElement.appendChild(marker);
    });
  }

  function buildLegend() {
    viewport.querySelector(".graph-legend")?.remove();
    const legend = document.createElement("aside");
    legend.className = "graph-legend";
    legend.setAttribute("aria-label", "Légende du graphe");
    [
      ["core", "Flux principal"],
      ["optional", "Branche optionnelle"],
      ["active", "Étape active"],
      ["error", "Erreur"],
    ].forEach(([kind, label]) => {
      const item = document.createElement("span");
      item.className = "graph-legend-item legend-" + kind;
      const sample = document.createElement("i");
      sample.setAttribute("aria-hidden", "true");
      const text = document.createElement("span");
      text.textContent = label;
      item.append(sample, text);
      legend.appendChild(item);
    });
    viewport.appendChild(legend);
  }

  function createNode(definition, savedLayout) {
    const node = document.createElement("button");
    const state = canonicalRuntimeState(definition.state);
    const structure = ["core", "optional", "container"].includes(definition.structure)
      ? definition.structure
      : "core";
    const saved = savedLayout[definition.id];
    const x = Number.isFinite(saved?.x) ? saved.x : definition.position.x;
    const y = Number.isFinite(saved?.y) ? saved.y : definition.position.y;
    node.type = "button";
    node.className = "graph-node structure-" + structure + " state-" + state;
    node.dataset.nodeId = definition.id;
    node.dataset.structure = structure;
    node.dataset.state = state;
    node.dataset.runtimeState = state;
    node.dataset.x = String(x);
    node.dataset.y = String(y);
    node.style.left = x + "px";
    node.style.top = y + "px";
    node.setAttribute(
      "aria-label",
      definition.label + " · " + (definition.status || state),
    );

    const index = document.createElement("span");
    index.className = "graph-node-index";
    index.textContent = definition.index || "•";
    const type = document.createElement("span");
    type.className = "graph-node-type";
    type.textContent = definition.type_label;
    const title = document.createElement("strong");
    title.textContent = definition.label;
    const subtitle = document.createElement("small");
    subtitle.textContent = definition.subtitle || "";
    const status = document.createElement("span");
    status.className = "graph-node-status";
    status.textContent = definition.status || state;
    node.append(index, type, title, subtitle, status);

    if (definition.container) {
      const container = document.createElement("span");
      container.className = "graph-node-container";
      container.textContent = "OUVRIR ↗";
      container.setAttribute("aria-hidden", "true");
      node.appendChild(container);
    }
    if (definition.progress) {
      const progress = document.createElement("span");
      progress.className = "graph-node-progress";
      progress.setAttribute("role", "progressbar");
      progress.setAttribute("aria-valuemin", "0");
      progress.setAttribute("aria-valuemax", "100");
      progress.setAttribute("aria-valuenow", String(definition.progress.percent));
      progress.title = definition.progress.label || "";
      const fill = document.createElement("i");
      fill.style.width = definition.progress.percent + "%";
      progress.appendChild(fill);
      node.appendChild(progress);
    }
    bindNode(node);
    return node;
  }

  function renderNodes() {
    world.querySelectorAll(".graph-node").forEach((node) => node.remove());
    const savedLayout = readStorage(contextKey("serre-studio-graph-layout-v2"), {});
    nodes = graphDefinition.nodes.map((definition) => createNode(definition, savedLayout));
    nodes.forEach((node) => world.appendChild(node));
    nodeById = Object.fromEntries(nodes.map((node) => [node.dataset.nodeId, node]));
  }

  function renderContext() {
    const title = document.querySelector(".graph-toolbar h2");
    const subtitle = document.querySelector(".graph-subtitle");
    if (title) title.textContent = graphDefinition.title;
    if (subtitle) subtitle.textContent = graphDefinition.subtitle || "Graphe de production";
    const active = document.querySelector("#graph-active-shot");
    if (active) active.textContent = graphDefinition.scope.toUpperCase() + " · " + graphDefinition.id;
    const progress = graphDefinition.progress || { completed: 0, total: 0, percent: 0, label: "" };
    const progressLabel = document.querySelector("#graph-episode-progress-label");
    if (progressLabel) {
      progressLabel.textContent = progress.label || progress.completed + " / " + progress.total;
    }
    const progressTrack = document.querySelector(".graph-progress-track");
    progressTrack?.setAttribute("aria-valuenow", String(progress.percent));
    progressTrack?.setAttribute("aria-valuemax", "100");
    const progressBar = document.querySelector("#graph-episode-progress-bar");
    if (progressBar) progressBar.style.width = progress.percent + "%";
    renderBreadcrumbs();
  }

  function renderBreadcrumbs() {
    const track = document.querySelector("#graph-shot-track");
    if (!track) return;
    track.replaceChildren();
    const targets = [{ scope: "series", id: "series", label: "Série" }];
    const episodeId = graphDefinition.metadata?.episode_id
      || (graphDefinition.scope === "episode" ? graphDefinition.id : null);
    if (episodeId) targets.push({ scope: "episode", id: episodeId, label: episodeId });
    if (graphDefinition.scope === "shot") {
      targets.push({ scope: "shot", id: graphDefinition.id, label: graphDefinition.id.split("-").at(-1) });
    }
    targets.forEach((target) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "graph-context-crumb";
      button.textContent = target.label;
      button.dataset.scope = target.scope;
      button.dataset.id = target.id;
      button.setAttribute(
        "aria-current",
        target.scope === graphDefinition.scope ? "page" : "false",
      );
      button.addEventListener("click", () => navigateTo(target).catch(reportError));
      track.appendChild(button);
    });
  }

  function renderView(save = false) {
    world.style.transform =
      "translate(" + view.x + "px, " + view.y + "px) scale(" + view.scale + ")";
    if (zoomLabel) {
      zoomLabel.value = Math.round(view.scale * 100) + " %";
      zoomLabel.textContent = zoomLabel.value;
    }
    if (positionLabel) {
      positionLabel.textContent =
        "x " + Math.round(-view.x / view.scale)
        + " · y " + Math.round(-view.y / view.scale);
    }
    updateMinimap();
    if (save) persistView();
  }

  function connectionPath(sourceNode, targetNode) {
    const sx = Number(sourceNode.dataset.x) + sourceNode.offsetWidth;
    const sy = Number(sourceNode.dataset.y) + sourceNode.offsetHeight / 2;
    const tx = Number(targetNode.dataset.x);
    const ty = Number(targetNode.dataset.y) + targetNode.offsetHeight / 2;
    const distance = Math.max(90, Math.abs(tx - sx) * 0.48);
    return "M " + sx + " " + sy + " C " + (sx + distance) + " " + sy
      + ", " + (tx - distance) + " " + ty + ", " + tx + " " + ty;
  }

  function propagationFrom(nodeId) {
    const impactedNodes = new Set();
    const impactedEdges = new Set();
    if (!nodeId || !nodeById[nodeId]) return { nodes: impactedNodes, edges: impactedEdges };
    const queue = [nodeId];
    impactedNodes.add(nodeId);
    while (queue.length) {
      const current = queue.shift();
      graphEdges().filter((edge) => edge.source === current).forEach((edge) => {
        impactedEdges.add(edge.id);
        if (impactedNodes.has(edge.target)) return;
        impactedNodes.add(edge.target);
        queue.push(edge.target);
      });
    }
    return { nodes: impactedNodes, edges: impactedEdges };
  }

  function drawEdges() {
    links.querySelectorAll(".graph-link,.graph-link-hit").forEach((path) => path.remove());
    const propagation = propagationFrom(activityNodeId);
    graphEdges().forEach((edge) => {
      const source = nodeById[edge.source];
      const target = nodeById[edge.target];
      if (!source || !target) return;
      const structure = edge.structure === "optional" ? "optional" : "core";
      const targetState = canonicalRuntimeState(target.dataset.state || edge.state);
      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      const shape = connectionPath(source, target);
      const marker = targetState === "error" || targetState === "stale"
        ? targetState
        : structure;
      path.setAttribute("d", shape);
      path.setAttribute("marker-end", "url(#graph-arrow-" + marker + ")");
      path.setAttribute(
        "class",
        "graph-link edge-" + structure + " edge-state-" + targetState,
      );
      path.dataset.edgeId = edge.id;
      path.dataset.from = edge.source;
      path.dataset.to = edge.target;
      path.dataset.structure = structure;
      if (
        edge.active
        || source.dataset.state === "active"
        || target.dataset.state === "active"
      ) {
        path.classList.add("edge-active");
      }
      if (activityNodeId && edge.source === activityNodeId) {
        path.classList.add("activity-link");
      }
      if (propagation.edges.has(edge.id)) path.classList.add("impact-link");
      if (focusEnabled && focusNodeId) {
        const focused = edge.source === focusNodeId || edge.target === focusNodeId;
        path.classList.toggle("focus-path", focused && structure === "core");
        path.classList.toggle("focus-optional", focused && structure === "optional");
        path.classList.toggle("focus-muted", !focused);
      }
      links.appendChild(path);

      const hit = document.createElementNS("http://www.w3.org/2000/svg", "path");
      hit.setAttribute("d", shape);
      hit.setAttribute("class", "graph-link-hit");
      hit.dataset.edgeId = edge.id;
      hit.addEventListener("pointerenter", (event) => showEdgeTooltip(event, edge, path));
      hit.addEventListener("pointermove", positionEdgeTooltip);
      hit.addEventListener("pointerleave", () => hideEdgeTooltip(path));
      links.appendChild(hit);
    });
  }

  function positionEdgeTooltip(event) {
    const viewportBounds = viewport.getBoundingClientRect();
    const tooltipBounds = edgeTooltip.getBoundingClientRect();
    edgeTooltip.style.left = clamp(
      event.clientX - viewportBounds.left + 14,
      8,
      Math.max(8, viewportBounds.width - tooltipBounds.width - 8),
    ) + "px";
    edgeTooltip.style.top = clamp(
      event.clientY - viewportBounds.top + 14,
      8,
      Math.max(8, viewportBounds.height - tooltipBounds.height - 8),
    ) + "px";
  }

  function showEdgeTooltip(event, edge, path) {
    const kind = edge.structure === "optional" ? "branche optionnelle" : "flux principal";
    edgeTooltipRoute.textContent =
      nodeTitle(edge.source) + " → " + nodeTitle(edge.target) + " · " + kind;
    edgeTooltipDescription.textContent =
      edge.description || "Dépendance du pipeline de production.";
    edgeTooltip.classList.remove("hidden");
    path.classList.add("connection-hover");
    nodeById[edge.source]?.classList.add("connection-hover");
    nodeById[edge.target]?.classList.add("connection-hover");
    positionEdgeTooltip(event);
  }

  function hideEdgeTooltip(path) {
    edgeTooltip.classList.add("hidden");
    path.classList.remove("connection-hover");
    nodes.forEach((node) => node.classList.remove("connection-hover"));
  }

  function buildMinimap() {
    minimapWorld.replaceChildren();
    nodes.forEach((node) => {
      const marker = document.createElement("span");
      marker.className = "graph-minimap-node";
      marker.dataset.nodeId = node.dataset.nodeId;
      minimapWorld.appendChild(marker);
    });
  }

  function updateMinimap() {
    if (!graphDefinition) return;
    const miniWidth = minimap.clientWidth || 176;
    const miniHeight = minimap.clientHeight || 72;
    const ratioX = miniWidth / worldWidth();
    const ratioY = miniHeight / worldHeight();
    Array.from(minimapWorld.children).forEach((marker) => {
      const node = nodeById[marker.dataset.nodeId];
      if (!node) return;
      marker.style.left = Number(node.dataset.x) * ratioX + "px";
      marker.style.top = Number(node.dataset.y) * ratioY + "px";
      marker.style.width = Math.max(8, node.offsetWidth * ratioX) + "px";
      marker.style.height = Math.max(5, node.offsetHeight * ratioY) + "px";
      marker.className = "graph-minimap-node structure-" + node.dataset.structure
        + " state-" + canonicalRuntimeState(node.dataset.state);
    });
    const visibleX = clamp(-view.x / view.scale, 0, worldWidth());
    const visibleY = clamp(-view.y / view.scale, 0, worldHeight());
    const visibleWidth = Math.min(worldWidth(), viewport.clientWidth / view.scale);
    const visibleHeight = Math.min(worldHeight(), viewport.clientHeight / view.scale);
    minimapWindow.style.left = visibleX * ratioX + "px";
    minimapWindow.style.top = visibleY * ratioY + "px";
    minimapWindow.style.width = visibleWidth * ratioX + "px";
    minimapWindow.style.height = visibleHeight * ratioY + "px";
  }

  function definitionFor(id) {
    return graphDefinition?.nodes.find((node) => node.id === id);
  }

  function nodeTitle(id) {
    return definitionFor(id)?.label || nodeById[id]?.querySelector("strong")?.textContent || id;
  }

  function nodeState(id, state, label) {
    const node = nodeById[id];
    if (!node) return;
    const runtimeState = canonicalRuntimeState(state);
    Array.from(node.classList)
      .filter((name) => name.startsWith("state-"))
      .forEach((name) => node.classList.remove(name));
    node.classList.add("state-" + runtimeState);
    node.dataset.state = runtimeState;
    node.dataset.runtimeState = runtimeState;
    const status = node.querySelector(".graph-node-status");
    if (label && status) status.textContent = label;
    const definition = definitionFor(id);
    if (definition) {
      definition.state = runtimeState;
      if (label) definition.status = label;
    }
    if (id === selectedId) renderInspector(id);
    drawEdges();
    updateMinimap();
  }

  function connectionsForStage(stageId) {
    const nodeId = nodeForStage(stageId);
    if (!nodeById[nodeId]) return [];
    return graphEdges()
      .filter((edge) => edge.source === nodeId || edge.target === nodeId)
      .map((edge) => ({
        direction: edge.target === nodeId ? "Entrée" : "Sortie",
        from: edge.source,
        to: edge.target,
        fromLabel: nodeTitle(edge.source),
        toLabel: nodeTitle(edge.target),
        structure: edge.structure,
        description: edge.description || "Dépendance du pipeline de production.",
      }));
  }

  function nodeForStage(stageId) {
    if (graphDefinition?.scope === "episode") {
      if (["voice", "music", "mix"].includes(stageId)) return "audio:" + graphDefinition.id;
      if (["montage", "export", "artifacts"].includes(stageId)) {
        return "master:" + graphDefinition.id;
      }
    }
    return stageNodeById[stageId] || stageId;
  }

  function applyFocusPath(id) {
    focusNodeId = id && nodeById[id] ? id : null;
    world.classList.toggle("has-focus-path", Boolean(focusEnabled && focusNodeId));
    const connections = new Map();
    if (focusEnabled && focusNodeId) {
      graphEdges()
        .filter((edge) => edge.source === focusNodeId || edge.target === focusNodeId)
        .forEach((edge) => {
          const neighbor = edge.source === focusNodeId ? edge.target : edge.source;
          connections.set(neighbor, edge.structure);
        });
    }
    nodes.forEach((node) => {
      const idForNode = node.dataset.nodeId;
      const relation = connections.get(idForNode);
      node.classList.toggle("focus-node", focusEnabled && idForNode === focusNodeId);
      node.classList.toggle("focus-path", relation === "core");
      node.classList.toggle("focus-optional", relation === "optional");
      node.classList.toggle(
        "focus-muted",
        Boolean(focusEnabled && focusNodeId) && idForNode !== focusNodeId && !relation,
      );
    });
  }

  function selectNode(id, { focus = true } = {}) {
    if (!nodeById[id]) return;
    selectedId = id;
    nodes.forEach((node) => node.classList.toggle("selected", node.dataset.nodeId === id));
    applyFocusPath(focus ? id : null);
    drawEdges();
    renderInspector(id);
  }

  function renderInspector(id) {
    const definition = definitionFor(id);
    if (!definition) return;
    const coherenceContext = { graph: graphDefinition, node: definition, nodeId: id };
    window.SerreCoherence?.reset(id);
    document.querySelector("#graph-inspector-index").textContent = definition.index || "•";
    document.querySelector("#graph-inspector-type").textContent = definition.type_label;
    document.querySelector("#graph-inspector-title").textContent = definition.label;
    document.querySelector("#graph-inspector-description").textContent = definition.description;
    document.querySelector("#graph-inspector-provider").textContent = definition.provider;
    document.querySelector("#graph-inspector-status").textContent = definition.status;
    const actions = document.querySelector("#graph-inspector-actions");
    actions.replaceChildren();
    definition.actions.forEach((action, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "button " + (action.primary || index === 0 ? "primary" : "ghost");
      button.textContent = action.label;
      button.dataset.graphAction = action.id;
      button.addEventListener("click", () => runAction(action).catch(reportError));
      actions.appendChild(button);
    });
    const drop = document.querySelector("#graph-inspector-drop");
    drop.classList.toggle("hidden", !definition.slot);
    if (definition.slot) {
      drop.textContent = "Dépose un fichier pour « " + definition.label + " ».";
    }
    inspectorPreview(id);
    window.SerreCoherence?.loadLatest(coherenceContext).catch(reportError);
  }

  async function runAction(action) {
    if (action.kind === "navigate" && action.target) return navigateTo(action.target);
    if (action.kind === "workspace") return openWorkspaceTarget(action.value);
    if (action.kind === "generate") return window.SerreStudio?.startJob(action.value);
    if (action.kind === "stage") {
      document.querySelector("[data-stage-action='" + action.value + "']")?.click();
      return;
    }
    if (action.kind === "workflow") return window.SerreWorkflowGraph?.open(action.value);
    if (action.kind === "validate") {
      return window.SerreCoherence?.run(action.value, {
        graph: graphDefinition,
        node: definitionFor(selectedId),
        nodeId: selectedId,
      });
    }
    if (action.kind === "import") {
      document.querySelector("[data-dropzone='" + action.value + "'] input")?.click();
      return;
    }
    if (action.kind === "director") document.querySelector("#draft-shot")?.click();
  }

  function openWorkspaceTarget(value) {
    if (value === "casting") {
      window.SerreWorkspace?.show("bible");
      window.SerreBible?.selectCategory?.("characters");
      return;
    }
    const [viewName, anchor] = value.split("#", 2);
    window.SerreWorkspace?.show(viewName);
    if (!anchor) return;
    requestAnimationFrame(() => {
      const element = document.querySelector("#" + anchor);
      element?.scrollIntoView({ behavior: "smooth", block: "center" });
      element?.focus?.({ preventScroll: true });
    });
  }

  function bindNode(node) {
    node.addEventListener("click", (event) => {
      if (node.dataset.wasDragged === "true") {
        node.dataset.wasDragged = "false";
        event.preventDefault();
        return;
      }
      selectNode(node.dataset.nodeId);
    });
    node.addEventListener("dblclick", () => {
      const target = definitionFor(node.dataset.nodeId)?.container;
      if (target) navigateTo(target).catch(reportError);
    });
    node.addEventListener("pointerdown", (event) => {
      if (event.button !== 0) return;
      event.stopPropagation();
      node.setPointerCapture(event.pointerId);
      draggingNode = {
        node,
        pointerId: event.pointerId,
        startClientX: event.clientX,
        startClientY: event.clientY,
        startX: Number(node.dataset.x),
        startY: Number(node.dataset.y),
        moved: false,
      };
      node.classList.add("dragging");
    });
    node.addEventListener("pointermove", (event) => {
      if (!draggingNode || draggingNode.node !== node) return;
      const dx = (event.clientX - draggingNode.startClientX) / view.scale;
      const dy = (event.clientY - draggingNode.startClientY) / view.scale;
      if (Math.abs(dx) + Math.abs(dy) > 5) draggingNode.moved = true;
      const x = clamp(draggingNode.startX + dx, 0, worldWidth() - node.offsetWidth);
      const y = clamp(draggingNode.startY + dy, 0, worldHeight() - node.offsetHeight);
      node.dataset.x = String(Math.round(x));
      node.dataset.y = String(Math.round(y));
      node.style.left = x + "px";
      node.style.top = y + "px";
      drawEdges();
      updateMinimap();
    });
    const finishNodeDrag = () => {
      if (!draggingNode || draggingNode.node !== node) return;
      node.dataset.wasDragged = draggingNode.moved ? "true" : "false";
      node.classList.remove("dragging");
      if (draggingNode.moved) persistLayout();
      draggingNode = null;
    };
    node.addEventListener("pointerup", finishNodeDrag);
    node.addEventListener("pointercancel", finishNodeDrag);
    node.addEventListener("dragover", (event) => {
      if (!definitionFor(node.dataset.nodeId)?.slot) return;
      event.preventDefault();
      node.classList.add("drop-target");
    });
    node.addEventListener("dragleave", () => node.classList.remove("drop-target"));
    node.addEventListener("drop", (event) => {
      event.preventDefault();
      node.classList.remove("drop-target");
      uploadToNode(node.dataset.nodeId, event.dataTransfer.files[0]);
    });
  }

  function uploadToNode(id, file) {
    const slot = definitionFor(id)?.slot;
    if (!slot || !file) return;
    nodeState(id, "active", "Import en cours…");
    window.SerreStudio?.uploadAsset(slot, file)
      .catch(() => nodeState(id, "error", "Import échoué"));
  }

  async function requestGraph(scope, id) {
    const path = "/api/graphs/" + encodeURIComponent(scope) + "/" + encodeURIComponent(id);
    if (window.SerreStudio?.api) return window.SerreStudio.api(path);
    const response = await fetch(path);
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.detail || "Graphe indisponible");
    return body;
  }

  async function loadGraph(scope, id, { fit = false } = {}) {
    const revision = ++loadRevision;
    viewport.classList.add("graph-loading");
    try {
      const payload = await requestGraph(scope, id);
      if (revision !== loadRevision) return null;
      graphDefinition = payload;
      selectedId = null;
      focusNodeId = null;
      activityNodeId = null;
      liveJobId = null;
      world.classList.remove("has-focus-path");
      world.style.width = worldWidth() + "px";
      world.style.height = worldHeight() + "px";
      links.setAttribute("width", String(worldWidth()));
      links.setAttribute("height", String(worldHeight()));
      renderNodes();
      renderContext();
      buildMinimap();
      const savedView = readStorage(contextKey("serre-studio-graph-view-v2"), null);
      if (
        !fit
        && savedView
        && Number.isFinite(savedView.x)
        && Number.isFinite(savedView.y)
        && Number.isFinite(savedView.scale)
      ) {
        view = savedView;
      } else {
        view = { x: 24, y: 8, scale: 0.68 };
      }
      requestAnimationFrame(() => {
        if (revision !== loadRevision) return;
        drawEdges();
        if (fit || !savedView) fitGraph(false);
        else renderView(false);
        selectNode(graphDefinition.nodes[0]?.id, { focus: false });
      });
      window.dispatchEvent(
        new CustomEvent("studio:graph-context", {
          detail: { scope: graphDefinition.scope, id: graphDefinition.id },
        }),
      );
      return payload;
    } finally {
      if (revision === loadRevision) viewport.classList.remove("graph-loading");
    }
  }

  async function synchronizeEpisode(episodeId) {
    const select = document.querySelector("#episode-select");
    if (!select || select.value === episodeId) return;
    const option = Array.from(select.options).find((item) => item.value === episodeId);
    if (!option) return;
    synchronizingContext = true;
    try {
      const loaded = new Promise((resolve) => {
        window.addEventListener("studio:episode-loaded", resolve, { once: true });
      });
      select.value = episodeId;
      select.dispatchEvent(new Event("change"));
      await loaded;
    } finally {
      synchronizingContext = false;
    }
  }

  async function navigateTo(target) {
    if (!target?.scope || !target?.id) return null;
    if (target.scope === "episode") await synchronizeEpisode(target.id);
    if (target.scope === "shot") {
      const episodeId = target.id.slice(0, target.id.lastIndexOf("-S"));
      await synchronizeEpisode(episodeId);
      synchronizingContext = true;
      try {
        document.querySelector("[data-shot-id='" + target.id + "']")?.click();
      } finally {
        synchronizingContext = false;
      }
    }
    return loadGraph(target.scope, target.id);
  }

  function reportError(error) {
    window.SerreStudio?.notify?.(error.message || String(error), true);
  }

  function zoomAt(nextScale, clientX, clientY) {
    const rect = viewport.getBoundingClientRect();
    const px = clientX - rect.left;
    const py = clientY - rect.top;
    const worldX = (px - view.x) / view.scale;
    const worldY = (py - view.y) / view.scale;
    view.scale = clamp(nextScale, MIN_SCALE, MAX_SCALE);
    view.x = px - worldX * view.scale;
    view.y = py - worldY * view.scale;
    renderView(true);
  }

  function fitGraph(save = true) {
    if (!nodes.length) return;
    const margin = 70;
    const minX = Math.min(...nodes.map((node) => Number(node.dataset.x)));
    const minY = Math.min(...nodes.map((node) => Number(node.dataset.y)));
    const maxX = Math.max(
      ...nodes.map((node) => Number(node.dataset.x) + node.offsetWidth),
    );
    const maxY = Math.max(
      ...nodes.map((node) => Number(node.dataset.y) + node.offsetHeight),
    );
    const scaleX = (viewport.clientWidth - margin * 2) / Math.max(1, maxX - minX);
    const scaleY = (viewport.clientHeight - margin * 2) / Math.max(1, maxY - minY);
    view.scale = clamp(Math.min(scaleX, scaleY), MIN_SCALE, 0.92);
    view.x = (viewport.clientWidth - (maxX - minX) * view.scale) / 2 - minX * view.scale;
    view.y = (viewport.clientHeight - (maxY - minY) * view.scale) / 2 - minY * view.scale;
    renderView(save);
  }

  function resetGraph() {
    if (!graphDefinition) return;
    localStorage.removeItem(contextKey("serre-studio-graph-layout-v2"));
    graphDefinition.nodes.forEach((definition) => {
      const node = nodeById[definition.id];
      if (!node) return;
      node.dataset.x = String(definition.position.x);
      node.dataset.y = String(definition.position.y);
      node.style.left = definition.position.x + "px";
      node.style.top = definition.position.y + "px";
    });
    localStorage.removeItem(contextKey("serre-studio-graph-view-v2"));
    requestAnimationFrame(() => {
      drawEdges();
      fitGraph(true);
    });
  }

  function focusActivityStage(stageId) {
    activityNodeId = nodeForStage(stageId);
    const propagation = propagationFrom(activityNodeId);
    nodes.forEach((node) => {
      const id = node.dataset.nodeId;
      node.classList.toggle("activity-focus", id === activityNodeId);
      node.classList.toggle(
        "activity-related",
        Boolean(activityNodeId) && id !== activityNodeId && propagation.nodes.has(id),
      );
    });
    drawEdges();
  }

  function cacheBusted(url, jobId, suffix = "") {
    if (!url) return "";
    return url + (url.includes("?") ? "&" : "?")
      + "job=" + encodeURIComponent(jobId) + suffix;
  }

  function clearLivePreviews(exceptId = null) {
    nodes.forEach((node) => {
      if (node.dataset.nodeId === exceptId) return;
      node.querySelector(".graph-node-live-preview")?.remove();
      node.classList.remove("has-live-preview");
    });
  }

  function previewTarget(job) {
    const stages = job.stages || [];
    const active = stages.find((stage) => stage.status === "running")
      || stages.find((stage) => stage.status === "failed");
    if (active) return nodeForStage(active.id || active.name);
    if (job.status === "AWAITING_KEYFRAME_APPROVAL") return "keyframe";
    if (job.media?.video || job.status === "GENERATED" || job.mode === "video") {
      return "motion";
    }
    return "keyframe";
  }

  function renderLivePreview(job) {
    if (!job?.id || graphDefinition?.scope !== "shot") return;
    if (liveJobId !== job.id) {
      clearLivePreviews();
      liveJobId = job.id;
    }
    const targetId = previewTarget(job);
    const node = nodeById[targetId];
    if (!node) return;
    clearLivePreviews(targetId);
    let overlay = node.querySelector(".graph-node-live-preview");
    if (!overlay) {
      overlay = document.createElement("span");
      overlay.className = "graph-node-live-preview";
      overlay.setAttribute("aria-live", "polite");
      node.appendChild(overlay);
    }
    node.classList.add("has-live-preview");
    overlay.replaceChildren();
    const media = job.media || {};
    const keyframes = media.keyframes || (media.keyframe ? [media.keyframe] : []);
    const progress = media.keyframe_progress || {
      completed: keyframes.length,
      total: Math.max(1, keyframes.length),
    };
    const head = document.createElement("span");
    head.className = "graph-node-live-head";
    const shot = document.createElement("strong");
    shot.textContent = job.shot_id || "Plan en cours";
    const badge = document.createElement("small");
    badge.textContent = media.video
      ? "CLIP PRÊT"
      : progress.total > 1
        ? progress.completed + "/" + progress.total + " POSES"
        : job.status.replaceAll("_", " ");
    head.append(shot, badge);
    overlay.append(head);
    const mediaBox = document.createElement("span");
    mediaBox.className = "graph-node-live-media";
    if (media.video) {
      const video = document.createElement("video");
      video.src = cacheBusted(media.video, job.id);
      video.muted = true;
      video.loop = true;
      video.autoplay = true;
      video.playsInline = true;
      video.setAttribute("aria-label", "Clip généré pour " + (job.shot_id || "le plan"));
      mediaBox.append(video);
      video.play().catch(() => {});
    } else {
      for (let index = 0; index < progress.total; index += 1) {
        if (keyframes[index]) {
          const image = document.createElement("img");
          image.src = cacheBusted(keyframes[index], job.id, "&pose=" + index);
          image.alt = "Pose " + (index + 1) + " sur " + progress.total;
          mediaBox.append(image);
        } else {
          const waiting = document.createElement("span");
          waiting.className = "graph-node-live-waiting";
          waiting.textContent = String(index + 1);
          mediaBox.append(waiting);
        }
      }
    }
    overlay.append(mediaBox);
    const message = document.createElement("span");
    message.className = "graph-node-live-message";
    message.textContent = job.message || "Production en cours…";
    overlay.append(message);
    requestAnimationFrame(() => {
      drawEdges();
      updateMinimap();
    });
  }

  function inspectorPreview(id) {
    const container = document.querySelector("#graph-inspector-preview");
    container.replaceChildren();
    container.classList.add("hidden");
    if (id === "keyframe" && outputs.keyframe) {
      const image = document.createElement("img");
      image.src = outputs.keyframe + "?graph=" + Date.now();
      image.alt = "Dernière keyframe du plan";
      container.appendChild(image);
      container.classList.remove("hidden");
    } else if (id === "motion" && outputs.video) {
      const video = document.createElement("video");
      video.src = outputs.video + "?graph=" + Date.now();
      video.controls = true;
      video.muted = true;
      video.loop = true;
      container.appendChild(video);
      container.classList.remove("hidden");
    }
  }

  viewport.addEventListener("pointerdown", (event) => {
    if (
      event.button !== 0
      || event.target.closest(".graph-node")
      || event.target.closest(".graph-minimap")
      || event.target.closest(".graph-legend")
    ) return;
    viewport.setPointerCapture(event.pointerId);
    panning = {
      pointerId: event.pointerId,
      clientX: event.clientX,
      clientY: event.clientY,
      x: view.x,
      y: view.y,
    };
    viewport.classList.add("panning");
  });
  viewport.addEventListener("pointermove", (event) => {
    if (!panning || panning.pointerId !== event.pointerId) return;
    view.x = panning.x + event.clientX - panning.clientX;
    view.y = panning.y + event.clientY - panning.clientY;
    renderView(false);
  });
  const finishPan = () => {
    if (!panning) return;
    panning = null;
    viewport.classList.remove("panning");
    persistView();
  };
  viewport.addEventListener("pointerup", finishPan);
  viewport.addEventListener("pointercancel", finishPan);
  viewport.addEventListener("wheel", (event) => {
    event.preventDefault();
    zoomAt(
      view.scale * (event.deltaY > 0 ? 0.9 : 1.1),
      event.clientX,
      event.clientY,
    );
  }, { passive: false });

  document.querySelector("#graph-zoom-in")?.addEventListener("click", () => {
    const rect = viewport.getBoundingClientRect();
    zoomAt(view.scale * 1.15, rect.left + rect.width / 2, rect.top + rect.height / 2);
  });
  document.querySelector("#graph-zoom-out")?.addEventListener("click", () => {
    const rect = viewport.getBoundingClientRect();
    zoomAt(view.scale / 1.15, rect.left + rect.width / 2, rect.top + rect.height / 2);
  });
  document.querySelector("#graph-fit")?.addEventListener("click", () => fitGraph(true));
  document.querySelector("#graph-reset")?.addEventListener("click", resetGraph);
  minimap.addEventListener("pointerdown", (event) => {
    event.stopPropagation();
    const rect = minimap.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * worldWidth();
    const y = ((event.clientY - rect.top) / rect.height) * worldHeight();
    view.x = viewport.clientWidth / 2 - x * view.scale;
    view.y = viewport.clientHeight / 2 - y * view.scale;
    renderView(true);
  });

  window.addEventListener("studio:episode-loaded", (event) => {
    if (synchronizingContext) return;
    const episodeId = event.detail?.episode?.id;
    if (episodeId) loadGraph("episode", episodeId).catch(reportError);
  });
  window.addEventListener("studio:shot-selected", (event) => {
    if (synchronizingContext) return;
    const shotId = event.detail?.shot?.id || event.detail?.shot?.shot_id;
    if (shotId) loadGraph("shot", shotId).catch(reportError);
  });
  window.addEventListener("studio:episode-cleared", () => {
    loadGraph("series", "series", { fit: true }).catch(reportError);
  });
  window.addEventListener("studio:project-changing", () => {
    loadRevision += 1;
    graphDefinition = null;
    world.querySelectorAll(".graph-node").forEach((node) => node.remove());
    links.querySelectorAll(".graph-link,.graph-link-hit").forEach((edge) => edge.remove());
  });
  window.addEventListener("studio:project-changed", () => {
    loadGraph("series", "series", { fit: true }).catch(reportError);
  });
  window.addEventListener("studio:assets", (event) => {
    if (graphDefinition?.scope !== "shot") return;
    const detail = event.detail || {};
    outputs = detail.outputs || {};
    if (detail.assets?.story) nodeState("story", "done", "Texte importé");
    if (detail.assets?.audio) nodeState("voice", "done", "Son disponible");
    if (detail.assets?.keyframe || outputs.keyframe) {
      nodeState("keyframe", "done", detail.assets?.keyframe ? "Image importée" : "Image générée");
      nodeState("review", "active", "À approuver");
    }
    if (detail.assets?.video || outputs.video) {
      nodeState("motion", "done", detail.assets?.video ? "Vidéo importée" : "Clip généré");
      nodeState("review", "done", "Sorties disponibles");
    }
    inspectorPreview(selectedId);
  });
  window.addEventListener("studio:asset", (event) => {
    if (graphDefinition?.scope !== "shot") return;
    const slot = event.detail?.slot;
    const mapping = { story: "story", keyframe: "keyframe", audio: "voice", video: "motion" };
    if (slot === "keyframe") outputs.keyframe = event.detail?.record?.url;
    if (slot === "video") outputs.video = event.detail?.record?.url;
    if (mapping[slot]) nodeState(mapping[slot], "done", "Import terminé");
    inspectorPreview(selectedId);
  });
  window.addEventListener("studio:job", (event) => {
    if (graphDefinition?.scope !== "shot") return;
    const job = event.detail?.job || event.detail;
    if (!job) return;
    outputs = { ...outputs, ...(job.media || {}) };
    (job.stages || []).forEach((stage) => {
      const id = nodeForStage(stage.id || stage.name);
      if (!nodeById[id]) return;
      const state = stage.status === "completed"
        ? "done"
        : stage.status === "running"
          ? "active"
          : stage.status === "failed"
            ? "error"
            : "ready";
      const label = stage.status === "completed"
        ? "Terminé"
        : stage.status === "running"
          ? "En cours…"
          : stage.status === "failed"
            ? "Échec"
            : "En attente";
      nodeState(id, state, label);
    });
    if (job.status === "AWAITING_KEYFRAME_APPROVAL") {
      nodeState("review", "active", "Décision requise");
    }
    if (job.status === "GENERATED") nodeState("review", "done", "Plan généré");
    renderLivePreview(job);
  });
  window.addEventListener("studio:episode-job", (event) => {
    if (graphDefinition?.scope !== "episode") return;
    const job = event.detail?.job || event.detail;
    if (!job || job.episode_id !== graphDefinition.id) return;
    (job.stages || []).forEach((stage) => {
      const id = nodeForStage(stage.id || stage.name);
      if (!nodeById[id]) return;
      const state = stage.status === "completed"
        ? "done"
        : stage.status === "running"
          ? "active"
          : stage.status === "failed"
            ? "error"
            : "ready";
      nodeState(id, state, stage.message || state);
    });
    if (job.status === "GENERATED") {
      nodeState("master:" + graphDefinition.id, "done", "Épisode finalisé");
    }
  });
  window.addEventListener("studio:status", (event) => {
    if (graphDefinition?.scope !== "shot") return;
    const available = Boolean(event.detail?.comfyui);
    ["keyframe", "motion"].forEach((id) => {
      if (["done", "active"].includes(nodeById[id]?.dataset.state)) return;
      nodeState(
        id,
        available ? "ready" : "blocked",
        available ? "Modèle prêt" : "ComfyUI hors ligne · import possible",
      );
    });
  });
  window.addEventListener("studio:narrative-status", (event) => {
    if (graphDefinition?.scope !== "shot") return;
    const ready = Boolean(event.detail?.ready);
    nodeState("director", ready ? "idle" : "blocked", ready ? "Disponible" : "Ollama hors ligne");
  });
  window.addEventListener("studio:narrative-job", (event) => {
    if (graphDefinition?.scope !== "shot") return;
    const state = event.detail?.state || "idle";
    const labels = {
      running: "Découpage en cours…",
      ready: "Shot proposé",
      failed: "Échec du Director",
    };
    nodeState("director", state, labels[state] || "Disponible");
    if (state === "ready") nodeState("shot", "done", "Proposition validée");
  });
  window.addEventListener("studio:coherence", (event) => {
    const report = event.detail?.report;
    const id = event.detail?.nodeId;
    const node = nodeById[id];
    if (!report || !node) return;
    node.dataset.coherence = report.status;
    let badge = node.querySelector(".graph-node-coherence");
    if (!badge) {
      badge = document.createElement("span");
      badge.className = "graph-node-coherence";
      node.appendChild(badge);
    }
    const blockers = (report.findings || []).filter((item) => item.severity === "blocker").length;
    const warnings = (report.findings || []).filter((item) => item.severity === "warning").length;
    badge.textContent = blockers ? blockers + " bloquant(s)" : warnings ? warnings + " à vérifier" : "Cohérent";
    badge.title = report.summary;
    drawEdges();
  });
  window.addEventListener("studio:coherence-approved", (event) => {
    const id = event.detail?.nodeId;
    const node = nodeById[id];
    if (!node) return;
    node.dataset.coherence = "approved";
    const badge = node.querySelector(".graph-node-coherence");
    if (badge) badge.textContent = "Validé humainement";
  });
  window.addEventListener("resize", () => {
    drawEdges();
    updateMinimap();
  });

  installArrowMarkers();
  buildLegend();
  document.addEventListener("DOMContentLoaded", () => {
    loadGraph("series", "series", { fit: true }).catch(reportError);
  });

  return {
    fitGraph,
    selectNode,
    nodeState,
    connectionsForStage,
    focusActivityStage,
    showImpactFrom: focusActivityStage,
    load: loadGraph,
    navigate: navigateTo,
    current: () => graphDefinition,
  };
})();

window.SerreGraph = studioGraph;
