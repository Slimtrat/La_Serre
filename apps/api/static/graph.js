const studioGraph = (() => {
  const viewport = document.querySelector("#graph-viewport");
  const world = document.querySelector("#graph-world");
  const links = document.querySelector("#graph-links");
  const minimap = document.querySelector("#graph-minimap");
  const minimapWorld = document.querySelector("#graph-minimap-world");
  const minimapWindow = document.querySelector("#graph-minimap-window");
  const zoomLabel = document.querySelector("#graph-zoom-label");
  const positionLabel = document.querySelector("#graph-position");
  const nodes = Array.from(document.querySelectorAll(".graph-node"));

  if (!viewport || !world || !links || !nodes.length) return null;

  const WORLD_WIDTH = 2440;
  const WORLD_HEIGHT = 900;
  const MIN_SCALE = 0.38;
  const MAX_SCALE = 1.35;
  const LAYOUT_KEY = "serre-studio-graph-layout-v1";
  const VIEW_KEY = "serre-studio-graph-view-v1";
  const nodeById = Object.fromEntries(nodes.map((node) => [node.dataset.nodeId, node]));
  const edgeTooltip = document.createElement("aside");
  edgeTooltip.className = "graph-edge-tooltip hidden";
  edgeTooltip.setAttribute("role", "tooltip");
  const edgeTooltipRoute = document.createElement("strong");
  const edgeTooltipDescription = document.createElement("span");
  edgeTooltip.append(edgeTooltipRoute, edgeTooltipDescription);
  viewport.append(edgeTooltip);

  const definitions = {
    story: {
      description: "Le matériau narratif du plan : une idée, une scène écrite ou un texte importé.",
      provider: "Ollama ou fichier texte",
      slot: "story",
      actions: [["Éditer l’histoire", "story"], ["Importer un texte", "import-story"]],
    },
    director: {
      description: "Le Director transforme l’histoire en instructions de mise en scène structurées.",
      provider: "Ollama local",
      actions: [["Proposer le Shot", "draft"], ["Voir le prompt", "story"]],
    },
    shot: {
      description: "Le contrat JSON reproductible qui relie cadrage, intention, personnages et génération.",
      provider: "Schéma Pydantic",
      actions: [["Ouvrir le Shot JSON", "shot"], ["Générer le plan", "generate-all"]],
    },
    cast: {
      description: "Les fiches canoniques garantissent que les personnages restent botaniques et reconnaissables.",
      provider: "Bible privée du projet",
      actions: [["Voir le casting", "episode"]],
    },
    keyframe: {
      description: "L’image maîtresse fixe l’identité, la composition et la lumière avant l’animation.",
      provider: "SDXL ou image importée",
      slot: "keyframe",
      actions: [["Générer les poses", "generate-keyframe"], ["Voir le sous-workflow", "workflow-keyframe"], ["Importer une image", "import-keyframe"]],
    },
    review: {
      description: "Le contrôle humain valide la silhouette, le visage, la botanique et la composition.",
      provider: "Validation créative",
      actions: [["Voir les sorties", "previews"], ["Voir la continuité", "workflow-keyframe-guide"], ["Régénérer", "generate-keyframe"]],
    },
    motion: {
      description: "La keyframe approuvée devient un clip, tout en conservant l’identité du personnage.",
      provider: "LTX Video ou vidéo importée",
      slot: "video",
      actions: [["Animer les poses", "generate-video"], ["Voir le sous-workflow", "workflow-video"], ["Importer une vidéo", "import-video"]],
    },
    voice: {
      description: "Une piste de voix, d’ambiance ou d’effets peut être créée ailleurs puis déposée ici.",
      provider: "Audio importé, TTS ensuite",
      slot: "audio",
      actions: [["Importer un son", "import-audio"]],
    },
    mix: {
      description: "La future étape de synchronisation assemblera voix, ambiance, musique et effets.",
      provider: "Mixage local à connecter",
      actions: [["Voir l’audio", "audio"]],
    },
    montage: {
      description: "Les clips approuvés seront ordonnés, ajustés et assemblés automatiquement.",
      provider: "FFmpeg à connecter",
      actions: [["Voir les sorties", "previews"]],
    },
    export: {
      description: "L’épisode final réunira image, mouvement, son et manifeste de production.",
      provider: "Export vertical 1080 × 1920",
      actions: [["Voir la traçabilité", "artifacts"]],
    },
  };

  const edges = [
    ["story", "director"], ["cast", "director"], ["director", "shot"],
    ["shot", "keyframe"], ["cast", "keyframe"], ["keyframe", "review"],
    ["review", "motion"], ["shot", "voice"], ["voice", "mix"],
    ["motion", "montage"], ["mix", "montage"], ["montage", "export"],
  ];
  const edgeDescriptions = {
    "story>director": "Le texte fournit l’intention narrative à mettre en scène.",
    "cast>director": "Le casting contraint les personnages et leur identité visuelle.",
    "director>shot": "La mise en scène devient un contrat de plan reproductible.",
    "shot>keyframe": "Le cadrage, l’action et la lumière pilotent les images clés.",
    "cast>keyframe": "Les références du casting maintiennent la continuité des personnages.",
    "keyframe>review": "Les trois poses sont soumises à la validation créative.",
    "review>motion": "Les poses approuvées guident l’animation vidéo.",
    "shot>voice": "Le dialogue et son intention pilotent la synthèse vocale.",
    "voice>mix": "La voix rejoint la musique et l’ambiance dans le mix.",
    "motion>montage": "Le clip animé devient une source du montage final.",
    "mix>montage": "La bande-son mixée est synchronisée avec les plans.",
    "montage>export": "Le montage validé est encodé avec ses sous-titres et son manifeste.",
  };
  const stageNodeById = {
    input: "shot",
    prompt: "director",
    references: "cast",
    keyframe: "keyframe",
    video: "motion",
    artifacts: "export",
    music: "mix",
  };

  const defaultView = { x: 24, y: 8, scale: 0.68 };
  let view = { ...defaultView };
  let selectedId = "story";
  let outputs = {};
  let liveJobId = null;
  let activityNodeId = null;
  let draggingNode = null;
  let panning = null;

  const defaultLayout = Object.fromEntries(nodes.map((node) => [node.dataset.nodeId, { x: Number(node.dataset.x), y: Number(node.dataset.y) }]));

  function readStorage(key, fallback) {
    try {
      const value = JSON.parse(localStorage.getItem(key));
      return value && typeof value === "object" ? value : fallback;
    } catch (_error) {
      return fallback;
    }
  }

  const savedLayout = readStorage(LAYOUT_KEY, {});
  const savedView = readStorage(VIEW_KEY, null);
  if (savedView && Number.isFinite(savedView.x) && Number.isFinite(savedView.y) && Number.isFinite(savedView.scale)) {
    view = savedView;
  }

  nodes.forEach((node) => {
    const saved = savedLayout[node.dataset.nodeId];
    const x = saved && Number.isFinite(saved.x) ? saved.x : Number(node.dataset.x);
    const y = saved && Number.isFinite(saved.y) ? saved.y : Number(node.dataset.y);
    node.dataset.x = String(x);
    node.dataset.y = String(y);
    node.style.left = x + "px";
    node.style.top = y + "px";
  });

  function clamp(value, minimum, maximum) {
    return Math.min(maximum, Math.max(minimum, value));
  }

  function persistLayout() {
    const layout = {};
    nodes.forEach((node) => {
      layout[node.dataset.nodeId] = { x: Number(node.dataset.x), y: Number(node.dataset.y) };
    });
    localStorage.setItem(LAYOUT_KEY, JSON.stringify(layout));
  }

  function persistView() {
    localStorage.setItem(VIEW_KEY, JSON.stringify(view));
  }

  function renderView(save) {
    world.style.transform = "translate(" + view.x + "px, " + view.y + "px) scale(" + view.scale + ")";
    zoomLabel.value = Math.round(view.scale * 100) + " %";
    zoomLabel.textContent = zoomLabel.value;
    positionLabel.textContent = "x " + Math.round(-view.x / view.scale) + " · y " + Math.round(-view.y / view.scale);
    updateMinimap();
    if (save) persistView();
  }

  function connectionPath(sourceNode, targetNode) {
    const sx = Number(sourceNode.dataset.x) + sourceNode.offsetWidth;
    const sy = Number(sourceNode.dataset.y) + sourceNode.offsetHeight / 2;
    const tx = Number(targetNode.dataset.x);
    const ty = Number(targetNode.dataset.y) + targetNode.offsetHeight / 2;
    const distance = Math.max(90, Math.abs(tx - sx) * 0.48);
    return "M " + sx + " " + sy + " C " + (sx + distance) + " " + sy + ", " + (tx - distance) + " " + ty + ", " + tx + " " + ty;
  }

  function drawEdges() {
    Array.from(links.querySelectorAll(".graph-link,.graph-link-hit")).forEach((path) => path.remove());
    edges.forEach(([from, to]) => {
      const source = nodeById[from];
      const target = nodeById[to];
      if (!source || !target) return;
      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("d", connectionPath(source, target));
      path.setAttribute("marker-end", "url(#graph-arrow)");
      path.setAttribute("class", "graph-link link-" + (target.dataset.state || "idle"));
      path.dataset.from = from;
      path.dataset.to = to;
      if (activityNodeId && (from === activityNodeId || to === activityNodeId)) {
        path.classList.add("activity-link");
      }
      links.appendChild(path);
      const hit = document.createElementNS("http://www.w3.org/2000/svg", "path");
      hit.setAttribute("d", path.getAttribute("d"));
      hit.setAttribute("class", "graph-link-hit");
      hit.dataset.from = from;
      hit.dataset.to = to;
      hit.addEventListener("pointerenter", (event) => showEdgeTooltip(event, from, to, path));
      hit.addEventListener("pointermove", positionEdgeTooltip);
      hit.addEventListener("pointerleave", () => hideEdgeTooltip(path));
      links.appendChild(hit);
    });
  }

  function positionEdgeTooltip(event) {
    const viewportBounds = viewport.getBoundingClientRect();
    const tooltipBounds = edgeTooltip.getBoundingClientRect();
    const x = clamp(
      event.clientX - viewportBounds.left + 14,
      8,
      Math.max(8, viewportBounds.width - tooltipBounds.width - 8),
    );
    const y = clamp(
      event.clientY - viewportBounds.top + 14,
      8,
      Math.max(8, viewportBounds.height - tooltipBounds.height - 8),
    );
    edgeTooltip.style.left = x + "px";
    edgeTooltip.style.top = y + "px";
  }

  function showEdgeTooltip(event, from, to, path) {
    edgeTooltipRoute.textContent = nodeTitle(from) + " → " + nodeTitle(to);
    edgeTooltipDescription.textContent = edgeDescriptions[from + ">" + to]
      || "Dépendance du pipeline de production.";
    edgeTooltip.classList.remove("hidden");
    path.classList.add("connection-hover");
    nodeById[from]?.classList.add("connection-hover");
    nodeById[to]?.classList.add("connection-hover");
    positionEdgeTooltip(event);
  }

  function hideEdgeTooltip(path) {
    edgeTooltip.classList.add("hidden");
    path.classList.remove("connection-hover");
    nodes.forEach((node) => node.classList.remove("connection-hover"));
  }

  function buildMinimap() {
    minimapWorld.innerHTML = "";
    nodes.forEach((node) => {
      const marker = document.createElement("span");
      marker.className = "graph-minimap-node";
      marker.dataset.nodeId = node.dataset.nodeId;
      minimapWorld.appendChild(marker);
    });
  }

  function updateMinimap() {
    const miniWidth = minimap.clientWidth || 176;
    const miniHeight = minimap.clientHeight || 72;
    const ratioX = miniWidth / WORLD_WIDTH;
    const ratioY = miniHeight / WORLD_HEIGHT;
    Array.from(minimapWorld.children).forEach((marker) => {
      const node = nodeById[marker.dataset.nodeId];
      marker.style.left = Number(node.dataset.x) * ratioX + "px";
      marker.style.top = Number(node.dataset.y) * ratioY + "px";
      marker.style.width = Math.max(8, node.offsetWidth * ratioX) + "px";
      marker.style.height = Math.max(5, node.offsetHeight * ratioY) + "px";
      marker.className = "graph-minimap-node state-" + (node.dataset.state || "idle");
    });
    const visibleX = clamp(-view.x / view.scale, 0, WORLD_WIDTH);
    const visibleY = clamp(-view.y / view.scale, 0, WORLD_HEIGHT);
    const visibleWidth = Math.min(WORLD_WIDTH, viewport.clientWidth / view.scale);
    const visibleHeight = Math.min(WORLD_HEIGHT, viewport.clientHeight / view.scale);
    minimapWindow.style.left = visibleX * ratioX + "px";
    minimapWindow.style.top = visibleY * ratioY + "px";
    minimapWindow.style.width = visibleWidth * ratioX + "px";
    minimapWindow.style.height = visibleHeight * ratioY + "px";
  }

  function nodeState(id, state, label) {
    const node = nodeById[id];
    if (!node) return;
    Array.from(node.classList).filter((name) => name.startsWith("state-")).forEach((name) => node.classList.remove(name));
    node.classList.add("state-" + state);
    node.dataset.state = state;
    const status = node.querySelector(".graph-node-status");
    if (label) status.textContent = label;
    if (id === selectedId) renderInspector(id);
    drawEdges();
    updateMinimap();
  }

  function nodeTitle(id) {
    return nodeById[id]?.querySelector("strong")?.textContent || id;
  }

  function connectionsForStage(stageId) {
    const nodeId = stageNodeById[stageId] || stageId;
    if (!nodeById[nodeId]) return [];
    return edges
      .filter(([from, to]) => from === nodeId || to === nodeId)
      .map(([from, to]) => ({
        direction: to === nodeId ? "Entrée" : "Sortie",
        from,
        to,
        fromLabel: nodeTitle(from),
        toLabel: nodeTitle(to),
        description: edgeDescriptions[from + ">" + to] || "Dépendance du pipeline de production.",
      }));
  }

  function focusActivityStage(stageId) {
    activityNodeId = stageNodeById[stageId] || stageId || null;
    nodes.forEach((node) => {
      const nodeId = node.dataset.nodeId;
      const related = activityNodeId && edges.some(
        ([from, to]) => (from === activityNodeId && to === nodeId)
          || (to === activityNodeId && from === nodeId),
      );
      node.classList.toggle("activity-focus", nodeId === activityNodeId);
      node.classList.toggle("activity-related", Boolean(related));
    });
    drawEdges();
  }

  function cacheBusted(url, jobId, suffix = "") {
    if (!url) return "";
    return url + (url.includes("?") ? "&" : "?") + "job=" + encodeURIComponent(jobId) + suffix;
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
    if (active) return stageNodeById[active.id || active.name];
    if (job.status === "AWAITING_KEYFRAME_APPROVAL") return "keyframe";
    if (job.media?.video || job.status === "GENERATED") return "motion";
    if (job.mode === "video") return "motion";
    return "keyframe";
  }

  function renderLivePreview(job) {
    if (!job?.id) return;
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
    const progress = media.keyframe_progress || { completed: keyframes.length, total: Math.max(1, keyframes.length) };
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
    } else if (progress.total > 0) {
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
    container.innerHTML = "";
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

  function runAction(action) {
    const studio = window.SerreStudio;
    const scrollTo = (selector) => {
      const element = document.querySelector(selector);
      if (!element) return;
      element.scrollIntoView({ behavior: "smooth", block: "center" });
      if (typeof element.focus === "function") element.focus({ preventScroll: true });
    };
    if (["story", "shot", "audio"].includes(action)) window.SerreWorkspace?.show("plan");
    if (["previews", "artifacts"].includes(action)) window.SerreWorkspace?.show("outputs");
    if (action === "story") scrollTo("#story-editor");
    if (action === "shot") scrollTo("#shot-editor");
    if (action === "episode") scrollTo("#episode-title");
    if (action === "previews") scrollTo("#preview-panel");
    if (action === "audio") scrollTo("[data-dropzone='audio']");
    if (action === "artifacts") scrollTo("[data-job-stage='artifacts']");
    if (action === "draft") document.querySelector("#draft-shot")?.click();
    if (action === "generate-keyframe") studio?.startJob("keyframe");
    if (action === "generate-video") studio?.startJob("video");
    if (action === "generate-all") studio?.startJob("all");
    if (action.startsWith("workflow-")) {
      window.SerreWorkflowGraph?.open(action.replace("workflow-", ""));
    }
    if (action.startsWith("import-")) {
      const slot = action.replace("import-", "");
      document.querySelector("[data-dropzone='" + slot + "'] input")?.click();
    }
  }

  function renderInspector(id) {
    const node = nodeById[id];
    const definition = definitions[id];
    if (!node || !definition) return;
    document.querySelector("#graph-inspector-index").textContent = node.querySelector(".graph-node-index").textContent;
    document.querySelector("#graph-inspector-type").textContent = node.querySelector(".graph-node-type").textContent;
    document.querySelector("#graph-inspector-title").textContent = node.querySelector("strong").textContent;
    document.querySelector("#graph-inspector-description").textContent = definition.description;
    document.querySelector("#graph-inspector-provider").textContent = definition.provider;
    document.querySelector("#graph-inspector-status").textContent = node.querySelector(".graph-node-status").textContent;
    const actions = document.querySelector("#graph-inspector-actions");
    actions.innerHTML = "";
    definition.actions.forEach(([label, action], index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "button " + (index === 0 ? "primary" : "ghost");
      button.textContent = label;
      button.addEventListener("click", () => runAction(action));
      actions.appendChild(button);
    });
    const drop = document.querySelector("#graph-inspector-drop");
    drop.classList.toggle("hidden", !definition.slot);
    if (definition.slot) drop.textContent = "Dépose " + (definition.slot === "story" ? "un texte" : definition.slot === "keyframe" ? "une image" : definition.slot === "audio" ? "un son" : "une vidéo") + " directement sur ce nœud.";
    inspectorPreview(id);
  }

  function selectNode(id) {
    selectedId = id;
    nodes.forEach((node) => node.classList.toggle("selected", node.dataset.nodeId === id));
    renderInspector(id);
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

  function fitGraph() {
    const margin = 70;
    const minX = Math.min(...nodes.map((node) => Number(node.dataset.x)));
    const minY = Math.min(...nodes.map((node) => Number(node.dataset.y)));
    const maxX = Math.max(...nodes.map((node) => Number(node.dataset.x) + node.offsetWidth));
    const maxY = Math.max(...nodes.map((node) => Number(node.dataset.y) + node.offsetHeight));
    const scaleX = (viewport.clientWidth - margin * 2) / (maxX - minX);
    const scaleY = (viewport.clientHeight - margin * 2) / (maxY - minY);
    view.scale = clamp(Math.min(scaleX, scaleY), MIN_SCALE, 0.92);
    view.x = (viewport.clientWidth - (maxX - minX) * view.scale) / 2 - minX * view.scale;
    view.y = (viewport.clientHeight - (maxY - minY) * view.scale) / 2 - minY * view.scale;
    renderView(true);
  }

  function resetGraph() {
    localStorage.removeItem(LAYOUT_KEY);
    nodes.forEach((node) => {
      const x = defaultLayout[node.dataset.nodeId].x;
      const y = defaultLayout[node.dataset.nodeId].y;
      node.dataset.x = String(x);
      node.dataset.y = String(y);
      node.style.left = x + "px";
      node.style.top = y + "px";
    });
    view = { ...defaultView };
    requestAnimationFrame(() => {
      drawEdges();
      renderView(true);
    });
  }

  function uploadToNode(id, file) {
    const slot = definitions[id]?.slot;
    if (!slot || !file) return;
    nodeState(id, "running", "Import en cours…");
    window.SerreStudio?.uploadAsset(slot, file).catch(() => nodeState(id, "failed", "Import échoué"));
  }

  nodes.forEach((node) => {
    node.dataset.state = Array.from(node.classList).find((name) => name.startsWith("state-"))?.replace("state-", "") || "idle";
    node.addEventListener("click", (event) => {
      if (node.dataset.wasDragged === "true") {
        node.dataset.wasDragged = "false";
        event.preventDefault();
        return;
      }
      selectNode(node.dataset.nodeId);
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
      const x = clamp(draggingNode.startX + dx, 0, WORLD_WIDTH - node.offsetWidth);
      const y = clamp(draggingNode.startY + dy, 0, WORLD_HEIGHT - node.offsetHeight);
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
      if (!definitions[node.dataset.nodeId]?.slot) return;
      event.preventDefault();
      node.classList.add("drop-target");
    });
    node.addEventListener("dragleave", () => node.classList.remove("drop-target"));
    node.addEventListener("drop", (event) => {
      event.preventDefault();
      node.classList.remove("drop-target");
      uploadToNode(node.dataset.nodeId, event.dataTransfer.files[0]);
    });
  });

  viewport.addEventListener("pointerdown", (event) => {
    if (event.button !== 0 || event.target.closest(".graph-node") || event.target.closest(".graph-minimap")) return;
    viewport.setPointerCapture(event.pointerId);
    panning = { pointerId: event.pointerId, clientX: event.clientX, clientY: event.clientY, x: view.x, y: view.y };
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
    zoomAt(view.scale * (event.deltaY > 0 ? 0.9 : 1.1), event.clientX, event.clientY);
  }, { passive: false });

  document.querySelector("#graph-zoom-in").addEventListener("click", () => {
    const rect = viewport.getBoundingClientRect();
    zoomAt(view.scale * 1.15, rect.left + rect.width / 2, rect.top + rect.height / 2);
  });
  document.querySelector("#graph-zoom-out").addEventListener("click", () => {
    const rect = viewport.getBoundingClientRect();
    zoomAt(view.scale / 1.15, rect.left + rect.width / 2, rect.top + rect.height / 2);
  });
  document.querySelector("#graph-fit").addEventListener("click", fitGraph);
  document.querySelector("#graph-reset").addEventListener("click", resetGraph);

  minimap.addEventListener("pointerdown", (event) => {
    event.stopPropagation();
    const rect = minimap.getBoundingClientRect();
    const worldX = ((event.clientX - rect.left) / rect.width) * WORLD_WIDTH;
    const worldY = ((event.clientY - rect.top) / rect.height) * WORLD_HEIGHT;
    view.x = viewport.clientWidth / 2 - worldX * view.scale;
    view.y = viewport.clientHeight / 2 - worldY * view.scale;
    renderView(true);
  });

  window.addEventListener("studio:episode-loaded", (event) => {
    const detail = event.detail;
    if (!detail?.episode) return;
    nodeState("story", "ready", "Épisode chargé");
    nodeState("cast", "ready", (detail.characters?.length || 0) + " personnages canoniques");
    nodeState("shot", "ready", (detail.shots?.length || 0) + " plans disponibles");
  });
  window.addEventListener("studio:shot-selected", (event) => {
    const shot = event.detail?.shot;
    if (shot?.shot_id) nodeState("shot", "ready", shot.shot_id + " sélectionné");
  });
  window.addEventListener("studio:assets", (event) => {
    const detail = event.detail || {};
    outputs = detail.outputs || {};
    if (detail.assets?.story) nodeState("story", "ready", "Texte importé");
    if (detail.assets?.audio) nodeState("voice", "ready", "Son disponible");
    if (detail.assets?.keyframe || outputs.keyframe) {
      nodeState("keyframe", "ready", detail.assets?.keyframe ? "Image importée" : "Image générée");
      nodeState("review", "running", "À approuver");
    }
    if (detail.assets?.video || outputs.video) {
      nodeState("motion", "ready", detail.assets?.video ? "Vidéo importée" : "Clip généré");
      nodeState("review", "ready", "Sorties disponibles");
    }
    inspectorPreview(selectedId);
  });
  window.addEventListener("studio:asset", (event) => {
    const slot = event.detail?.slot;
    const mapping = { story: "story", keyframe: "keyframe", audio: "voice", video: "motion" };
    if (slot === "keyframe") outputs.keyframe = event.detail?.record?.url;
    if (slot === "video") outputs.video = event.detail?.record?.url;
    if (mapping[slot]) nodeState(mapping[slot], "ready", "Import terminé");
    inspectorPreview(selectedId);
  });
  window.addEventListener("studio:job", (event) => {
    const job = event.detail?.job || event.detail;
    if (!job) return;
    outputs = { ...outputs, ...(job.media || {}) };
    (job.stages || []).forEach((stage) => {
      const id = stageNodeById[stage.id || stage.name];
      if (!id) return;
      const state = stage.status === "completed" ? "ready" : stage.status === "running" ? "running" : stage.status === "failed" ? "failed" : "pending";
      const label = stage.status === "completed" ? "Terminé" : stage.status === "running" ? "En cours…" : stage.status === "failed" ? "Échec" : "En attente";
      nodeState(id, state, label);
    });
    if (job.status === "AWAITING_KEYFRAME_APPROVAL") nodeState("review", "running", "Décision requise");
    if (job.status === "GENERATED") nodeState("review", "ready", "Plan généré");
    renderLivePreview(job);
  });
  window.addEventListener("studio:status", (event) => {
    const available = Boolean(event.detail?.comfyui);
    ["keyframe", "motion"].forEach((id) => {
      if (["ready", "running"].includes(nodeById[id].dataset.state)) return;
      nodeState(id, "pending", available ? "Modèle prêt" : "ComfyUI hors ligne · import possible");
    });
  });
  window.addEventListener("studio:narrative-status", (event) => {
    const ready = Boolean(event.detail?.ready);
    nodeState("director", ready ? "idle" : "pending", ready ? "Disponible" : "Ollama hors ligne");
  });
  window.addEventListener("studio:narrative-job", (event) => {
    const state = event.detail?.state || "idle";
    const labels = { running: "Découpage en cours…", ready: "Shot proposé", failed: "Échec du Director" };
    nodeState("director", state, labels[state] || "Disponible");
    if (state === "ready") nodeState("shot", "ready", "Proposition validée");
  });

  window.addEventListener("resize", () => {
    drawEdges();
    updateMinimap();
  });

  buildMinimap();
  renderView(false);
  requestAnimationFrame(() => {
    drawEdges();
    updateMinimap();
  });
  renderInspector(selectedId);

  return { fitGraph, selectNode, nodeState, connectionsForStage, focusActivityStage };
})();

window.SerreGraph = studioGraph;
