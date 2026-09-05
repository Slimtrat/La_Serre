(() => {
  const STAGES = ["story", "plan", "frames", "sound", "video"];
  const POSITION_KEY = "serre-studio-demo-position-v1";
  const COPY = {
    fr: {
      title: "Démo express", subtitle: "5 ÉTAPES · IA LOCALE + APERÇUS", open: "Démo express",
      intro: "Décris une micro-histoire, puis génère, contrôle et valide chaque maillon.",
      approve: "Valider", reject: "Refuser", reset: "Recommencer",
      close: "Fermer", progress: "{done}/5 étapes validées", waiting: "Prêt à imaginer",
      locked: "Valide l’étape précédente", generated: "À contrôler", approved: "Validé", rejected: "Refusé · à refaire",
      generating: "Génération en cours…", failed: "Échec · réessayer", empty: "Aucune proposition pour le moment.",
      source: "Point de départ", sourceHint: "Ex. Deux sorcières découvrent que la plante qui les empoisonne les relie aussi.",
      aiMode: "Ollama écrit réellement l’histoire et le plan. Les médias restent des aperçus économiques.",
      previewMode: "Ollama est indisponible : histoire locale d’exemple et aperçus économiques explicites.",
      modelMissingMode: "Tes modèles Ollama sont dédiés au code. Installe Qwen3 4B pour une vraie écriture narrative.",
      complete: "Chaîne complète : la mini-vidéo est validée.",
      realAi: "IA LOCALE RÉELLE", localPreview: "APERÇU LOCAL · SANS IA", generatedBy: "Produit par {provider}",
      openGraph: "Ouvrir le vrai graphe", graphHint: "Images et vidéos ComfyUI se génèrent dans le graphe de production.",
      installModel: "Installer Qwen3 4B", installingModel: "Installation de Qwen3 4B…",
      modelInstalled: "Qwen3 4B est installé : la vraie écriture IA est disponible.",
      actions: {
        storyAi: "✦ Écrire avec Ollama", storyPreview: "Créer un exemple local",
        planAi: "✦ Découper avec Ollama", planPreview: "Créer un découpage local",
        frames: "Créer 3 aperçus locaux", sound: "Synthétiser l’ambiance", video: "Assembler avec FFmpeg",
      },
      stages: {
        story: ["Histoire", "Une intention courte, lisible et modifiable."],
        plan: ["Découpage", "Trois temps, trois actions, trois répliques."],
        frames: ["Images", "Trois poses cohérentes dans un cadre fantasy."],
        sound: ["Son", "Une ambiance synthétique très légère."],
        video: ["Mini-vidéo", "Mouvement, fondus, son et sous-titres."],
      },
    },
    en: {
      title: "Express demo", subtitle: "5 STEPS · LOCAL AI + PREVIEWS", open: "Express demo",
      intro: "Describe a micro-story, then generate, review, and approve every link.",
      approve: "Approve", reject: "Reject", reset: "Start over", close: "Close",
      progress: "{done}/5 approved steps", waiting: "Ready to imagine", locked: "Approve the previous step",
      generated: "Needs review", approved: "Approved", rejected: "Rejected · redo", generating: "Generating…",
      failed: "Failed · retry", empty: "No proposal yet.", source: "Starting point",
      sourceHint: "E.g. Two witches discover that the plant poisoning them also binds them together.",
      aiMode: "Ollama genuinely writes the story and plan. Media remains an explicit low-cost preview.",
      previewMode: "Ollama is unavailable: local example story and explicit low-cost previews.",
      modelMissingMode: "Your Ollama models are code-focused. Install Qwen3 4B for real narrative writing.",
      complete: "Chain complete: the mini-video is approved.",
      realAi: "REAL LOCAL AI", localPreview: "LOCAL PREVIEW · NO AI", generatedBy: "Produced by {provider}",
      openGraph: "Open the real graph", graphHint: "ComfyUI image and video generation lives in the production graph.",
      installModel: "Install Qwen3 4B", installingModel: "Installing Qwen3 4B…",
      modelInstalled: "Qwen3 4B is installed: real AI writing is now available.",
      actions: {
        storyAi: "✦ Write with Ollama", storyPreview: "Create a local example",
        planAi: "✦ Plan with Ollama", planPreview: "Create a local shot plan",
        frames: "Create 3 local previews", sound: "Synthesize ambience", video: "Assemble with FFmpeg",
      },
      stages: {
        story: ["Story", "A short, readable, editable intent."],
        plan: ["Shot plan", "Three beats, three actions, three lines."],
        frames: ["Images", "Three coherent poses in a fantasy frame."],
        sound: ["Sound", "A very lightweight synthetic ambience."],
        video: ["Mini-video", "Motion, fades, sound, and subtitles."],
      },
    },
  };
  window.SerreI18n?.register?.("fr", { shell: { demo: "Démo", demoTitle: "Lancer la démo express guidée" } });
  window.SerreI18n?.register?.("en", { shell: { demo: "Demo", demoTitle: "Start the guided express demo" } });
  let dialog = null;
  let state = null;
  let selected = "story";
  let busy = false;
  let drag = null;
  let draft = "";
  let capabilities = { ollama: { ready: false, selected_model: null }, stages: {} };

  function locale() { return window.SerreI18n?.locale?.() === "en" ? "en" : "fr"; }
  function copy() { return COPY[locale()]; }
  function h(value) {
    return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
  }
  function interpolate(value, variables) {
    return Object.entries(variables).reduce((text, [key, replacement]) => text.replaceAll(`{${key}}`, replacement), value);
  }
  function currentStage(id = selected) { return state?.stages?.find((stage) => stage.id === id); }
  function statusCopy(status) { return copy()[status] || status; }
  function approvedCount() { return state?.stages?.filter((stage) => stage.status === "approved").length || 0; }
  function engineFor(stageId) {
    return ["story", "plan"].includes(stageId) && capabilities.ollama?.ready ? "ai" : "preview";
  }
  function actionCopy(stageId) {
    const actions = copy().actions;
    if (stageId === "story") return engineFor(stageId) === "ai" ? actions.storyAi : actions.storyPreview;
    if (stageId === "plan") return engineFor(stageId) === "ai" ? actions.planAi : actions.planPreview;
    return actions[stageId];
  }

  async function api(path, options = {}) {
    if (window.SerreStudio?.api) return window.SerreStudio.api(path, options);
    const response = await fetch(path, options);
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.detail || `HTTP ${response.status}`);
    return body;
  }

  function body(method, payload = {}) {
    return { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ locale: locale(), ...payload }) };
  }

  function notify(message, error = false) {
    window.SerreStudio?.notify?.(message, error);
  }

  function dispatchActivity(activeStage, status, message) {
    if (!state) return;
    window.dispatchEvent(new CustomEvent("studio:demo-job", {
      detail: { state, activeStage, status, message },
    }));
  }

  function stageContent(stage) {
    const c = copy();
    if (stage.id === "story") {
      const value = stage.content || draft;
      return `<label class="demo-story-label">${h(c.source)}
        <textarea id="demo-story-input" maxlength="2000" placeholder="${h(c.sourceHint)}">${h(value)}</textarea>
      </label>`;
    }
    if (!stage.content) return `<p class="demo-empty">${h(c.empty)}</p>`;
    if (stage.id === "plan") {
      return `<div class="demo-beats">${stage.content.map((beat, index) => `
        <article><span>0${index + 1}</span><div><strong>${h(beat.title)}</strong><p>${h(beat.action)}</p><blockquote>${h(beat.dialogue)}</blockquote></div></article>`).join("")}</div>`;
    }
    if (stage.id === "frames") {
      return `<div class="demo-frames">${stage.assets.map((asset, index) => `
        <figure><img src="${h(asset.url)}" alt="${h(asset.label)}"><figcaption>0${index + 1} · ${h(stage.content[index]?.action)}</figcaption></figure>`).join("")}</div>`;
    }
    if (stage.id === "sound") {
      const audio = stage.assets.find((asset) => asset.kind === "audio");
      return `<div class="demo-audio"><i aria-hidden="true">♫</i><div><p>${h(stage.content.description)}</p><audio controls src="${h(audio?.url)}"></audio></div></div>`;
    }
    const video = stage.assets.find((asset) => asset.kind === "video");
    return `<div class="demo-video"><video controls loop playsinline poster="${h(state.stages.find((item) => item.id === "frames")?.assets?.[2]?.url)}" src="${h(video?.url)}"></video>
      <p>${h(stage.content.mode)} · ${h(stage.content.resolution)} · ${h(stage.content.duration)} s</p></div>`;
  }

  function provenanceContent(stage) {
    const provenance = stage.provenance;
    if (!provenance) return "";
    const c = copy();
    const provider = provenance.model
      ? `${provenance.label || provenance.provider} · ${provenance.model}`
      : provenance.label || provenance.provider;
    return `<aside class="demo-provenance ${provenance.real_ai ? "is-ai" : "is-preview"}">
      <strong>${h(provenance.real_ai ? c.realAi : c.localPreview)}</strong>
      <span>${h(interpolate(c.generatedBy, { provider }))}</span>
    </aside>`;
  }

  function renderInspector() {
    const stage = currentStage();
    const c = copy();
    const [title, description] = c.stages[stage.id];
    const canImagine = !busy && stage.status !== "locked" && stage.status !== "generating";
    const canDecide = !busy && ["generated", "approved"].includes(stage.status);
    return `<section class="demo-inspector" data-demo-stage="${stage.id}">
      <header><div><small>ÉTAPE ${String(STAGES.indexOf(stage.id) + 1).padStart(2, "0")}</small><h3>${h(title)}</h3><p>${h(description)}</p></div><span class="demo-state ${h(stage.status)}">${h(statusCopy(stage.status))}</span></header>
      <div class="demo-output">${stageContent(stage)}</div>
      ${provenanceContent(stage)}
      ${stage.feedback ? `<p class="demo-feedback">↳ ${h(stage.feedback)}</p>` : ""}
      <footer>
        <button class="button secondary demo-imagine" type="button" data-demo-imagine="${stage.id}" ${canImagine ? "" : "disabled"}>${h(actionCopy(stage.id))}</button>
        <div><button class="button ghost" type="button" data-demo-reject="${stage.id}" ${canDecide ? "" : "disabled"}>${h(c.reject)}</button>
        <button class="button primary" type="button" data-demo-approve="${stage.id}" ${stage.status === "generated" && !busy ? "" : "disabled"}>${h(c.approve)}</button></div>
      </footer>
    </section>`;
  }

  function render() {
    if (!dialog || !state) return;
    const c = copy();
    const done = approvedCount();
    dialog.querySelector("[data-demo-title]").textContent = c.title;
    dialog.querySelector("[data-demo-subtitle]").textContent = c.subtitle;
    dialog.querySelector("[data-demo-close]").setAttribute("aria-label", c.close);
    dialog.querySelector("[data-demo-intro]").textContent = c.intro;
    dialog.querySelector("[data-demo-progress-copy]").textContent = interpolate(c.progress, { done: String(done) });
    dialog.querySelector("[data-demo-progress-value]").style.width = `${done * 20}%`;
    dialog.querySelector("[data-demo-reset]").textContent = c.reset;
    dialog.querySelector("[data-demo-graph]").textContent = c.openGraph;
    dialog.querySelector("[data-demo-graph]").title = c.graphHint;
    const install = dialog.querySelector("[data-demo-install-model]");
    install.textContent = busy ? c.installingModel : c.installModel;
    install.classList.toggle("hidden", capabilities.ollama?.reason !== "narrative_model_missing");
    dialog.querySelector("[data-demo-mode]").textContent = state.complete
      ? c.complete
      : capabilities.ollama?.ready
        ? c.aiMode
        : capabilities.ollama?.reason === "narrative_model_missing" ? c.modelMissingMode : c.previewMode;
    const chain = dialog.querySelector("[data-demo-chain]");
    chain.innerHTML = state.stages.map((stage, index) => {
      const [title, description] = c.stages[stage.id];
      const available = !busy && stage.status !== "locked" && stage.status !== "generating";
      return `<article class="demo-chain-step ${stage.status} ${selected === stage.id ? "selected" : ""}" data-demo-select="${stage.id}">
        <button class="demo-step-select" type="button" data-demo-select="${stage.id}"><span>${String(index + 1).padStart(2, "0")}</span><div><strong>${h(title)}</strong><small>${h(description)}</small><em>${h(statusCopy(stage.status))}</em></div></button>
        <button class="demo-step-imagine" type="button" data-demo-imagine="${stage.id}" ${available ? "" : "disabled"} title="${h(actionCopy(stage.id))}"><span aria-hidden="true">${["story", "plan"].includes(stage.id) && engineFor(stage.id) === "ai" ? "✦" : "›"}</span><strong>${h(actionCopy(stage.id).replace(/^✦\s*/, ""))}</strong></button>
      </article>`;
    }).join("");
    dialog.querySelector("[data-demo-inspector]").innerHTML = renderInspector();
    const video = dialog.querySelector(".demo-video video");
    if (video && !busy) video.play().catch(() => {});
  }

  function createDialog() {
    dialog = document.createElement("dialog");
    dialog.id = "demo-production-dialog";
    dialog.className = "demo-production-dialog";
    dialog.setAttribute("aria-labelledby", "demo-production-title");
    dialog.setAttribute("aria-modal", "false");
    dialog.innerHTML = `<section class="demo-shell">
      <header class="demo-heading" data-demo-drag>
        <div><span aria-hidden="true">✦</span><div><h2 id="demo-production-title" data-demo-title></h2><small data-demo-subtitle></small></div></div>
        <button type="button" data-demo-close>×</button>
      </header>
      <div class="demo-progress"><div><strong data-demo-intro></strong><span data-demo-progress-copy></span></div><i><b data-demo-progress-value></b></i></div>
      <div class="demo-workspace"><nav data-demo-chain aria-label="Étapes de la démo"></nav><main data-demo-inspector></main></div>
      <footer class="demo-footer"><small data-demo-mode></small><div><button class="button primary hidden" type="button" data-demo-install-model></button><button class="button secondary" type="button" data-demo-graph></button><button class="button ghost" type="button" data-demo-reset></button></div></footer>
    </section>`;
    document.body.append(dialog);
    dialog.addEventListener("click", handleClick);
    dialog.addEventListener("keydown", (event) => { if (event.key === "Escape") close(); });
    const handle = dialog.querySelector("[data-demo-drag]");
    handle.addEventListener("pointerdown", startDrag);
    handle.addEventListener("pointermove", moveDrag);
    handle.addEventListener("pointerup", endDrag);
    handle.addEventListener("pointercancel", endDrag);
  }

  async function load() {
    [state, capabilities] = await Promise.all([
      api(`/api/demo?locale=${locale()}`),
      api("/api/demo/capabilities").catch(() => capabilities),
    ]);
    if (!currentStage(selected)) selected = "story";
    const story = currentStage("story");
    if (story?.content) draft = story.content;
    render();
  }

  async function imagine(stageId) {
    if (busy) return;
    const stage = currentStage(stageId);
    if (!stage || stage.status === "locked") return;
    if (selected === "story") draft = dialog.querySelector("#demo-story-input")?.value || draft;
    selected = stageId;
    busy = true;
    stage.status = "generating";
    render();
    dispatchActivity(stageId, "GENERATING", copy().generating);
    try {
      state = await api(`/api/demo/${stageId}/imagine`, body("POST", {
        instruction: stageId === "story" ? draft : "",
        engine: engineFor(stageId),
      }));
      const updated = currentStage(stageId);
      if (stageId === "story" && updated?.content) draft = updated.content;
      dispatchActivity(stageId, "AWAITING_REVIEW", copy().generated);
    } catch (error) {
      stage.status = "failed";
      dispatchActivity(stageId, "FAILED", error.message);
      notify(error.message, true);
    } finally {
      busy = false;
      render();
    }
  }

  async function decide(stageId, action) {
    if (busy) return;
    busy = true;
    try {
      state = await api(`/api/demo/${stageId}/${action}`, body("POST"));
      const index = STAGES.indexOf(stageId);
      if (action === "approve" && index + 1 < STAGES.length) selected = STAGES[index + 1];
      else selected = stageId;
      const status = state.complete ? "COMPLETED" : "AWAITING_REVIEW";
      dispatchActivity(selected, status, action === "approve" ? copy().approved : copy().rejected);
    } catch (error) {
      notify(error.message, true);
    } finally {
      busy = false;
      render();
    }
  }

  async function reset() {
    if (busy) return;
    busy = true;
    try {
      state = await api("/api/demo/reset", body("POST"));
      selected = "story"; draft = "";
      dispatchActivity("story", "AWAITING_REVIEW", copy().waiting);
    } catch (error) { notify(error.message, true); }
    finally { busy = false; render(); }
  }

  async function installNarrativeModel() {
    if (busy) return;
    busy = true;
    render();
    window.dispatchEvent(new CustomEvent("studio:runtime-preparation", {
      detail: { status: "GENERATING", message: copy().installingModel },
    }));
    try {
      capabilities = await api("/api/demo/recommended-model/install", { method: "POST" });
      window.dispatchEvent(new CustomEvent("studio:runtime-preparation", {
        detail: { status: "COMPLETED", message: copy().modelInstalled },
      }));
      notify(copy().modelInstalled);
    } catch (error) {
      window.dispatchEvent(new CustomEvent("studio:runtime-preparation", {
        detail: { status: "FAILED", message: error.message },
      }));
      notify(error.message, true);
    } finally {
      busy = false;
      render();
    }
  }

  function handleClick(event) {
    if (event.target.closest("[data-demo-close]")) return close();
    if (event.target.closest("[data-demo-install-model]")) return void installNarrativeModel();
    if (event.target.closest("[data-demo-graph]")) {
      close();
      window.SerreWorkspace?.show("graph");
      return;
    }
    if (event.target.closest("[data-demo-reset]")) return void reset();
    const imagineButton = event.target.closest("[data-demo-imagine]");
    if (imagineButton) return void imagine(imagineButton.dataset.demoImagine);
    const approve = event.target.closest("[data-demo-approve]");
    if (approve) return void decide(approve.dataset.demoApprove, "approve");
    const reject = event.target.closest("[data-demo-reject]");
    if (reject) return void decide(reject.dataset.demoReject, "reject");
    const select = event.target.closest("[data-demo-select]");
    if (select) { selected = select.dataset.demoSelect; render(); }
  }

  function readPosition() {
    try { const value = JSON.parse(localStorage.getItem(POSITION_KEY)); return Number.isFinite(value?.x) ? value : null; }
    catch (_error) { return null; }
  }
  function place(x, y) {
    const rect = dialog.getBoundingClientRect();
    const left = Math.max(8, Math.min(x, innerWidth - rect.width - 8));
    const top = Math.max(66, Math.min(y, innerHeight - rect.height - 8));
    dialog.style.left = `${left}px`; dialog.style.top = `${top}px`; dialog.classList.add("positioned");
    return { x: left, y: top };
  }
  function startDrag(event) {
    if (event.button !== 0 || event.target.closest("button")) return;
    const rect = dialog.getBoundingClientRect();
    drag = { id: event.pointerId, x: event.clientX - rect.left, y: event.clientY - rect.top };
    place(rect.left, rect.top); event.currentTarget.setPointerCapture(event.pointerId);
  }
  function moveDrag(event) { if (drag?.id === event.pointerId) place(event.clientX - drag.x, event.clientY - drag.y); }
  function endDrag(event) {
    if (drag?.id !== event.pointerId) return;
    const rect = dialog.getBoundingClientRect(); drag = null;
    try { localStorage.setItem(POSITION_KEY, JSON.stringify({ x: rect.left, y: rect.top })); } catch (_error) { /* optional */ }
  }

  async function open() {
    if (!dialog) createDialog();
    if (!dialog.open) dialog.show();
    await load();
    const saved = readPosition();
    requestAnimationFrame(() => place(saved?.x ?? Math.max(8, (innerWidth - dialog.offsetWidth) / 2), saved?.y ?? 78));
  }
  function close() { if (dialog?.open) dialog.close(); }

  function init() {
    document.querySelector("#demo-production-open")?.addEventListener("click", () => open().catch((error) => notify(error.message, true)));
    window.addEventListener("studio:open-demo", () => open().catch((error) => notify(error.message, true)));
    window.addEventListener("studio:project-changing", close);
    window.addEventListener("studio:language-changed", () => { if (dialog?.open) load().catch(() => {}); });
    window.addEventListener("resize", () => { if (dialog?.open) { const rect = dialog.getBoundingClientRect(); place(rect.left, rect.top); } });
  }
  window.SerreDemo = { open, close, state: () => state };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
