const workflowGraph = (() => {
  const dialog = document.querySelector("#workflow-graph-dialog");
  const viewport = document.querySelector("#workflow-graph-viewport");
  const world = document.querySelector("#workflow-graph-world");
  const nodesRoot = document.querySelector("#workflow-graph-nodes");
  const links = document.querySelector("#workflow-graph-links");
  const tabs = Array.from(document.querySelectorAll("[data-workflow-kind]"));
  if (!dialog || !viewport || !world || !nodesRoot || !links) return null;

  const cache = new Map();
  let currentKind = "keyframe";
  let activeKind = null;
  let scale = 1;
  let currentGraph = null;

  function nodeHeight(node) {
    return Math.max(118, 73 + Math.max(node.parameters.length, node.bindings.length) * 19);
  }

  function displayValue(value) {
    if (value === null) return "null";
    if (typeof value === "string") return value.length > 28 ? value.slice(0, 27) + "…" : value;
    return String(value);
  }

  function renderNode(node) {
    const card = document.createElement("article");
    card.className = "workflow-comfy-node" + (node.is_output ? " output-node" : "");
    card.dataset.nodeId = node.id;
    card.style.left = node.x + "px";
    card.style.top = node.y + "px";
    card.style.minHeight = nodeHeight(node) + "px";

    const header = document.createElement("header");
    const title = document.createElement("strong");
    title.textContent = node.title;
    const type = document.createElement("small");
    type.textContent = node.id + " · " + node.class_type;
    header.append(title, type);
    const values = document.createElement("dl");
    const bindings = new Map(node.bindings.map((binding) => [binding.input, binding.source]));
    node.parameters.slice(0, 7).forEach((parameter) => {
      const row = document.createElement("div");
      const name = document.createElement("dt");
      name.textContent = parameter.name;
      const value = document.createElement("dd");
      if (bindings.has(parameter.name)) {
        value.className = "workflow-binding";
        value.textContent = bindings.get(parameter.name);
        value.title = "Valeur injectée par le Studio : " + bindings.get(parameter.name);
      } else {
        value.textContent = displayValue(parameter.value);
        value.title = String(parameter.value);
      }
      row.append(name, value);
      values.append(row);
    });
    node.bindings.filter((binding) => !node.parameters.some((parameter) => parameter.name === binding.input)).forEach((binding) => {
      const row = document.createElement("div");
      const name = document.createElement("dt");
      name.textContent = binding.input;
      const value = document.createElement("dd");
      value.className = "workflow-binding";
      value.textContent = binding.source;
      row.append(name, value);
      values.append(row);
    });
    card.append(header, values);
    return card;
  }

  function drawEdges(graph) {
    links.replaceChildren();
    links.setAttribute("width", graph.width);
    links.setAttribute("height", graph.height);
    graph.edges.forEach((edge) => {
      const source = nodesRoot.querySelector("[data-node-id='" + CSS.escape(edge.source) + "']");
      const target = nodesRoot.querySelector("[data-node-id='" + CSS.escape(edge.target) + "']");
      if (!source || !target) return;
      const sx = source.offsetLeft + source.offsetWidth;
      const sy = source.offsetTop + source.offsetHeight / 2;
      const tx = target.offsetLeft;
      const ty = target.offsetTop + target.offsetHeight / 2;
      const bend = Math.max(65, (tx - sx) * .46);
      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("class", "workflow-graph-link");
      path.setAttribute("d", "M " + sx + " " + sy + " C " + (sx + bend) + " " + sy + ", " + (tx - bend) + " " + ty + ", " + tx + " " + ty);
      links.append(path);
    });
  }

  function updateScale(nextScale) {
    scale = Math.min(1.5, Math.max(.35, nextScale));
    world.style.zoom = String(scale);
    const label = document.querySelector("#workflow-graph-zoom-label");
    label.value = Math.round(scale * 100) + " %";
    label.textContent = label.value;
  }

  function fit() {
    if (!currentGraph) return;
    const x = (viewport.clientWidth - 36) / currentGraph.width;
    const y = (viewport.clientHeight - 36) / currentGraph.height;
    updateScale(Math.min(1, x, y));
    viewport.scrollTo({ left: 0, top: 0 });
  }

  async function load(kind) {
    currentKind = kind;
    tabs.forEach((tab) => tab.classList.toggle("selected", tab.dataset.workflowKind === kind));
    let graph = cache.get(kind);
    if (!graph) {
      graph = await window.SerreStudio.api("/api/workflow-graphs/" + kind);
      cache.set(kind, graph);
    }
    const title = {
      keyframe: "Pose initiale",
      "keyframe-guide": "Continuité entre les poses",
      video: "Animation multi-images",
    }[kind];
    renderGraph(graph, title);
  }

  function renderGraph(graph, title) {
    currentGraph = graph;
    document.querySelector("#workflow-graph-title").textContent = title;
    document.querySelector("#workflow-graph-profile").textContent = graph.profile_id + " · " + graph.nodes.length + " nœuds · " + graph.edges.length + " liaisons";
    world.style.width = graph.width + "px";
    world.style.height = graph.height + "px";
    nodesRoot.replaceChildren(...graph.nodes.map(renderNode));
    requestAnimationFrame(() => {
      drawEdges(graph);
      fit();
    });
  }

  async function loadTemplate(templateId, label) {
    currentKind = "template:" + templateId;
    tabs.forEach((tab) => tab.classList.remove("selected"));
    let graph = cache.get(currentKind);
    if (!graph) {
      graph = await window.SerreStudio.api("/api/workflow-templates/" + encodeURIComponent(templateId) + "/graph");
      cache.set(currentKind, graph);
    }
    renderGraph(graph, label || templateId);
  }

  async function open(kind = "keyframe") {
    if (!dialog.open) dialog.show();
    try {
      await load(kind);
    } catch (error) {
      window.SerreStudio.notify(error.message, true);
    }
  }

  async function openTemplate(templateId, label) {
    if (!dialog.open) dialog.show();
    try {
      await loadTemplate(templateId, label);
    } catch (error) {
      window.SerreStudio.notify(error.message, true);
    }
  }

  tabs.forEach((tab) => tab.addEventListener("click", () => load(tab.dataset.workflowKind).catch((error) => window.SerreStudio.notify(error.message, true))));
  document.querySelector("#workflow-graph-close").addEventListener("click", () => dialog.close());
  document.querySelector("#workflow-graph-zoom-in").addEventListener("click", () => updateScale(scale * 1.15));
  document.querySelector("#workflow-graph-zoom-out").addEventListener("click", () => updateScale(scale / 1.15));
  document.querySelector("#workflow-graph-fit").addEventListener("click", fit);
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });

  const toolbar = dialog.querySelector(".workflow-graph-toolbar");
  let dragging = null;
  toolbar.addEventListener("pointerdown", (event) => {
    if (event.button !== 0 || event.target.closest("button, nav, output")) return;
    const rect = dialog.getBoundingClientRect();
    toolbar.setPointerCapture(event.pointerId);
    dragging = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, left: rect.left, top: rect.top };
  });
  toolbar.addEventListener("pointermove", (event) => {
    if (!dragging || dragging.pointerId !== event.pointerId) return;
    const left = Math.max(0, Math.min(window.innerWidth - dialog.offsetWidth, dragging.left + event.clientX - dragging.x));
    const top = Math.max(0, Math.min(window.innerHeight - dialog.offsetHeight, dragging.top + event.clientY - dragging.y));
    dialog.style.left = left + "px";
    dialog.style.top = top + "px";
    dialog.style.right = "auto";
    dialog.style.bottom = "auto";
  });
  const finishDrag = () => { dragging = null; };
  toolbar.addEventListener("pointerup", finishDrag);
  toolbar.addEventListener("pointercancel", finishDrag);
  window.addEventListener("studio:job", (event) => {
    const job = event.detail?.job || event.detail;
    activeKind = job?.active_workflow || null;
    tabs.forEach((tab) => tab.classList.toggle("live", tab.dataset.workflowKind === activeKind));
    const live = document.querySelector("#workflow-graph-live");
    live.classList.toggle("live", Boolean(activeKind));
    live.textContent = activeKind ? "Exécution · " + activeKind : "Inactif";
    if (dialog.open && activeKind && currentKind !== activeKind) load(activeKind).catch(() => {});
  });

  window.SerreWorkflowGraph = { open, openTemplate };
  return window.SerreWorkflowGraph;
})();
