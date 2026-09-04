const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const sources = { story: "model", keyframe: "model", audio: "model", video: "model" };
let currentJob = null;
let pollTimer = null;
let currentFrameUrls = [];
let currentFrameIndex = 0;

async function api(path, options = {}) {
  const response = await fetch(path, options);
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(body.detail || `Erreur HTTP ${response.status}`);
    error.status = response.status;
    throw error;
  }
  return body;
}

function notify(message, error = false) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.toggle("error", error);
  toast.classList.remove("hidden");
  window.setTimeout(() => toast.classList.add("hidden"), 5000);
  if (error) window.SerreNotifications?.captureError(message).catch(() => {});
}

function shot() {
  const value = JSON.parse($("#shot-editor").value);
  if (!value.id) throw new Error("Le Shot doit contenir un id.");
  return value;
}

function validateEditor() {
  try {
    const value = shot();
    $("#json-state").textContent = `${value.id} · JSON valide`;
    $("#json-state").style.color = "var(--green)";
    return true;
  } catch (error) {
    $("#json-state").textContent = `JSON invalide · ${error.message}`;
    $("#json-state").style.color = "var(--danger)";
    return false;
  }
}

async function refreshStatus() {
  try {
    const status = await api("/api/status");
    $("#app-version").textContent = "v" + status.version;
    $("#comfy-url").value = status.comfyui_url;
    const ready = status.status === "ready";
    $("#connection-dot").className = `dot ${status.comfyui ? "ready" : "error"}`;
    $("#connection-label").textContent = status.comfyui ? "ComfyUI connecté" : "ComfyUI hors ligne";
    $("#setup-badge").textContent = ready ? "Prêt" : status.profiles_configured ? "Modèles manquants" : "Workflows absents";
    $("#setup-badge").className = `badge ${ready ? "ready" : "warn"}`;
    renderModels(status.models || []);
    $("#downloads-location").textContent = "Téléchargements : " + status.downloads_dir;
    if (!ready) $("#settings-panel").classList.remove("hidden");
    window.dispatchEvent(new CustomEvent("studio:status", { detail: status }));
    return status;
  } catch (error) {
    $("#connection-dot").className = "dot error";
    $("#connection-label").textContent = "Studio indisponible";
    notify(error.message, true);
  }
}

function renderModels(models) {
  const list = $("#model-list");
  list.replaceChildren();
  let readyToInstall = false;
  for (const model of models) {
    const row = document.createElement("div");
    row.className = "model";
    const info = document.createElement("div");
    const name = document.createElement("strong");
    name.textContent = model.role;
    const path = document.createElement("small");
    path.textContent = `models/${model.folder}/${model.filename}`;
    info.append(name, path);
    const state = document.createElement("span");
    const installed = model.installed || model.state === "installed";
    state.className = `model-state ${installed ? "ok" : "missing"}`;
    state.textContent = installed ? "Installé" : "À télécharger";
    if (!installed && model.state === "ready") {
      state.textContent = "Prêt à installer";
      readyToInstall = true;
    } else if (!installed && model.state === "downloading") {
      const megabytes = Math.round((model.downloaded_bytes || 0) / 1048576);
      state.textContent = megabytes ? "Téléchargement · " + megabytes + " Mo" : "Téléchargement";
    }
    const link = document.createElement("a");
    link.href = model.url;
    link.target = "_blank";
    link.rel = "noreferrer";
    link.textContent = model.installed ? "Source" : "Télécharger ↗";
    row.append(info, state, link);
    list.append(row);
  }
  $("#install-downloads").disabled = !readyToInstall;
}

async function installDownloads() {
  $("#install-downloads").disabled = true;
  try {
    const result = await api("/api/models/install", { method: "POST" });
    if (!result.installed.length) {
      notify("Aucun téléchargement terminé à installer.");
    } else {
      notify(result.installed.length + " modèle(s) installé(s). Redémarre ComfyUI.");
    }
    await refreshStatus();
  } catch (error) {
    notify(error.message, true);
  }
}

async function saveConfig() {
  await api("/api/config", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ comfyui_url: $("#comfy-url").value }),
  });
  notify("Adresse ComfyUI enregistrée.");
  await refreshStatus();
}

async function buildWorkflows() {
  try {
    $("#build-workflows").disabled = true;
    const result = await api("/api/workflows/generate", { method: "POST" });
    renderModels(result.models);
    if (result.missing_nodes.length) throw new Error(`Nœuds manquants : ${result.missing_nodes.join(", ")}`);
    notify("Workflows SDXL et LTX créés. Télécharge les modèles encore indiqués.");
    await refreshStatus();
  } catch (error) { notify(error.message, true); }
  finally { $("#build-workflows").disabled = false; }
}

function setSource(slot, value) {
  sources[slot] = value;
  window.dispatchEvent(new CustomEvent("studio:source", { detail: { slot, value } }));
  const group = $(`.segmented[data-source="${slot}"]`);
  $$('button', group).forEach((button) => button.classList.toggle("selected", button.dataset.value === value));
  const dropzone = $(`[data-dropzone="${slot}"]`);
  if (dropzone) dropzone.classList.toggle("hidden", value !== "manual");
}

async function uploadAsset(slot, file) {
  if (!validateEditor()) throw new Error("Corrige le Shot JSON avant l’import.");
  const id = shot().id;
  const result = await api(`/api/assets/${id}/${slot}?filename=${encodeURIComponent(file.name)}`, {
    method: "PUT",
    headers: { "Content-Type": file.type || "application/octet-stream" },
    body: file,
  });
  const url = `${result.url}?v=${Date.now()}`;
  if (slot === "keyframe") showImage(url);
  if (slot === "video") showVideo(url);
  if (slot === "audio") showAudio(url);
  if (slot === "story") $("#story-editor").value = await file.text();
  const card = $('.segmented[data-source="' + slot + '"]')?.closest(".stage-card");
  if (card) $(".stage-status", card).textContent = result.filename + " importé";
  window.dispatchEvent(
    new CustomEvent("studio:asset", { detail: { slot, record: result } }),
  );
  notify(`${file.name} branché sur l’étape ${slot}.`);
}

async function refreshAssets() {
  if (!validateEditor()) return;
  const id = shot().id;
  const assets = await api("/api/assets/" + id);
  for (const slot of ["story", "shot", "keyframe", "audio", "video"]) {
    const record = assets[slot];
    if (!record) continue;
    if (slot !== "shot") setSource(slot, "manual");
    const url = "/api/assets/" + id + "/" + slot + "/content?v=" + Date.now();
    if (slot === "shot") {
      const importedShot = await fetch(url).then((response) => response.json());
      $("#shot-editor").value = JSON.stringify(importedShot, null, 2);
      validateEditor();
    }
    if (slot === "keyframe") showImage(url);
    if (slot === "video") showVideo(url);
    if (slot === "audio") showAudio(url);
    if (slot === "story") {
      $("#story-editor").value = await fetch(url).then((response) => response.text());
    }
    const card = $('.segmented[data-source="' + slot + '"]')?.closest(".stage-card");
    if (card) $(".stage-status", card).textContent = record.filename + " importé";
  }
  const generated = await api("/api/outputs/" + id);
  if (generated.keyframes?.length) showKeyframes(generated.keyframes);
  else if (generated.keyframe) showImage(generated.keyframe + "?v=" + Date.now());
  if (generated.video) showVideo(generated.video + "?v=" + Date.now());
  window.dispatchEvent(
    new CustomEvent("studio:assets", {
      detail: { shotId: id, assets, outputs: generated },
    }),
  );
}

function bindDropzone(zone) {
  const slot = zone.dataset.dropzone;
  const input = $("input", zone);
  input.addEventListener("change", () => input.files[0] && uploadAsset(slot, input.files[0]).catch((e) => notify(e.message, true)));
  for (const event of ["dragenter", "dragover"]) zone.addEventListener(event, (e) => { e.preventDefault(); zone.classList.add("drag"); });
  for (const event of ["dragleave", "drop"]) zone.addEventListener(event, (e) => { e.preventDefault(); zone.classList.remove("drag"); });
  zone.addEventListener("drop", (event) => event.dataTransfer.files[0] && uploadAsset(slot, event.dataTransfer.files[0]).catch((e) => notify(e.message, true)));
}

async function startJob(mode) {
  try {
    if (!validateEditor()) throw new Error("Le Shot JSON est invalide.");
    if (sources.video === "manual" && mode !== "keyframe") {
      throw new Error("Le slot vidéo est manuel : dépose directement ton clip.");
    }
    if (mode === "all" && sources.keyframe === "manual") mode = "video";
    setWorking(true);
    const job = await api("/api/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        shot: shot(), mode,
        keyframe_source: sources.keyframe,
        force: false,
      }),
    });
    if (pollTimer) window.clearInterval(pollTimer);
    currentJob = job.id;
    renderJob(job);
    pollTimer = window.setTimeout(pollJob, 1000);
  } catch (error) { setWorking(false); notify(error.message, true); }
}

async function pollJob() {
  const jobId = currentJob;
  if (!jobId) return;
  try {
    const job = await api(`/api/jobs/${jobId}`);
    if (currentJob !== jobId) return;
    renderJob(job);
    if (["GENERATED", "AWAITING_KEYFRAME_APPROVAL", "FAILED"].includes(job.status)) {
      window.clearTimeout(pollTimer);
      pollTimer = null;
      currentJob = null;
      setWorking(false);
      if (job.status === "FAILED") notify(job.message, true);
      else notify(job.message);
    } else {
      pollTimer = window.setTimeout(pollJob, 1000);
    }
  } catch (error) {
    if (currentJob !== jobId) return;
    window.clearTimeout(pollTimer);
    pollTimer = null;
    currentJob = null;
    setWorking(false);
    if (error.status === 404) {
      await refreshAssets().catch(() => {});
      await window.SerreOutputConsole?.refreshHistory().catch(() => {});
      notify("Le serveur a redémarré. Les sorties sauvegardées ont été rechargées.");
      return;
    }
    notify(error.message, true);
  }
}

function withRevision(url, revision) {
  return url + (url.includes("?") ? "&" : "?") + "run=" + encodeURIComponent(revision);
}

function renderJob(job) {
  window.dispatchEvent(new CustomEvent("studio:job", { detail: job }));
  $("#job-badge").textContent = job.status.replaceAll("_", " ");
  $("#job-message").textContent = job.message;
  for (const stage of job.stages) {
    const card = $(`[data-job-stage="${stage.id}"]`);
    if (!card) continue;
    card.classList.remove("running", "completed", "failed");
    if (stage.status !== "pending" && stage.status !== "skipped") card.classList.add(stage.status);
    $(".stage-status", card).textContent = stage.message;
  }
  if (job.media.keyframes?.length) {
    showKeyframes(job.media.keyframes.map((url) => withRevision(url, job.id)));
  } else if (job.media.keyframe) {
    showImage(withRevision(job.media.keyframe, job.id));
  }
  if (job.media.video) showVideo(withRevision(job.media.video, job.id));
  window.SerreOutputConsole?.renderLog(job.events || [], "Exécution en cours");
}

function showImage(url) {
  showKeyframes([url]);
}
function showKeyframes(urls) {
  const signature = urls.join("\n");
  if (signature === currentFrameUrls.join("\n")) return;
  currentFrameUrls = urls;
  currentFrameIndex = 0;
  renderFrame();
  $("#keyframe-strip").classList.remove("hidden");
  $("#image-empty").classList.add("hidden");
}

function versioned(url) {
  return url + (url.includes("?") ? "&" : "?") + "v=" + Date.now();
}

function renderFrame() {
  if (!currentFrameUrls.length) return;
  currentFrameIndex = (currentFrameIndex + currentFrameUrls.length) % currentFrameUrls.length;
  const image = $("#keyframe-preview");
  const source = currentFrameUrls[currentFrameIndex];
  if (image.dataset.source !== source) {
    image.src = versioned(source);
    image.dataset.source = source;
  }
  image.alt = `Pose d’action ${currentFrameIndex + 1} sur ${currentFrameUrls.length}`;
  $("#frame-counter").textContent = `${currentFrameIndex + 1} / ${currentFrameUrls.length}`;
  const picker = $("#frame-picker");
  picker.replaceChildren();
  const labels = ["Début", "Milieu", "Fin"];
  currentFrameUrls.forEach((_url, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = labels[index] || `Pose ${index + 1}`;
    button.classList.toggle("selected", index === currentFrameIndex);
    button.addEventListener("click", () => { currentFrameIndex = index; renderFrame(); });
    picker.append(button);
  });
}

function clearMedia() {
  currentFrameUrls = [];
  delete $("#keyframe-preview").dataset.source;
  $("#keyframe-preview").removeAttribute("src");
  $("#keyframe-strip").classList.add("hidden");
  $("#image-empty").classList.remove("hidden");
  for (const [media, empty] of [["#video-preview", "#video-empty"], ["#audio-preview", "#audio-empty"]]) {
    const element = $(media);
    element.removeAttribute("src");
    delete element.dataset.source;
    element.classList.add("hidden");
    $(empty).classList.remove("hidden");
  }
}

function showVideo(url) {
  const video = $("#video-preview");
  if (video.dataset.source !== url) {
    video.src = url;
    video.dataset.source = url;
  }
  video.classList.remove("hidden");
  $("#video-empty").classList.add("hidden");
}
function showAudio(url) {
  const audio = $("#audio-preview");
  if (audio.dataset.source !== url) {
    audio.src = url;
    audio.dataset.source = url;
  }
  audio.classList.remove("hidden");
  $("#audio-empty").classList.add("hidden");
}
function setWorking(value) { $$("#generate-all,#generate-keyframe,#continue-video,[data-stage-action='keyframe'],[data-stage-action='video']").forEach((button) => button.disabled = value); }

function resetForProject() {
  if (pollTimer) window.clearTimeout(pollTimer);
  pollTimer = null;
  currentJob = null;
  setWorking(false);
  clearMedia();
  $("#job-badge").textContent = "Aucun rendu";
  $("#job-message").textContent = "Sélectionne un plan dans le projet actif.";
  for (const slot of Object.keys(sources)) setSource(slot, "model");
}

async function runStage(kind, button) {
  if (kind === "validate") {
    if (!validateEditor()) throw new Error("Le plan est invalide.");
    button.disabled = true;
    button.classList.add("running");
    try {
      const report = await window.SerreCoherence?.currentShot("all");
      const card = button.closest(".stage-card");
      const status = card?.querySelector(".stage-status");
      card?.classList.toggle("completed", Boolean(report?.approved_at));
      card?.classList.toggle("failed", report?.status === "fail");
      if (status && report) status.textContent = report.summary;
      return report;
    } finally {
      button.disabled = false;
      button.classList.remove("running");
    }
  }
  if (kind === "keyframe") return startJob("keyframe");
  if (kind === "video") return startJob("video");
  if (kind === "history") {
    window.SerreWorkspace?.show("outputs");
    return window.SerreOutputConsole?.refreshHistory();
  }
  button.disabled = true;
  button.classList.add("running");
  const activityId = "stage-" + kind + "-" + Date.now();
  window.dispatchEvent(new CustomEvent("studio:stage-job", {
    detail: {
      id: activityId,
      kind,
      status: "GENERATING",
      message: "Génération de l’étape " + kind,
      created_at: new Date().toISOString(),
    },
  }));
  try {
    const result = await api("/api/stages/" + kind, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shot: shot(), tts: "auto" }),
    });
    if (result.media?.audio) showAudio(versioned(result.media.audio));
    notify(result.message);
    window.dispatchEvent(new CustomEvent("studio:stage", { detail: result }));
    window.dispatchEvent(new CustomEvent("studio:stage-job", {
      detail: { ...result, id: activityId, kind, status: "COMPLETED" },
    }));
    await refreshAssets();
  } catch (error) {
    window.dispatchEvent(new CustomEvent("studio:stage-job", {
      detail: {
        id: activityId,
        kind,
        status: "FAILED",
        message: error.message,
      },
    }));
    throw error;
  } finally {
    button.disabled = false;
    button.classList.remove("running");
  }
}

async function importAdvanced(kind, file) {
  const workflow = JSON.parse(await file.text());
  const inspected = await api("/api/workflows/import", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind, workflow }) });
  notify(`${inspected.targets.length} entrées détectées. Le workflow est importé ; le preset automatique reste recommandé.`);
}

async function init() {
  const example = await fetch("/api/example-shot").then((response) => response.json());
  $("#shot-editor").value = JSON.stringify(example, null, 2);
  validateEditor();
  $("#shot-editor").addEventListener("input", validateEditor);
  $("#shot-editor").addEventListener("blur", () => refreshAssets().catch(() => {}));
  $("#settings-toggle").addEventListener("click", () => window.SerreWorkspace?.show("settings"));
  $("#save-config").addEventListener("click", () => saveConfig().catch((e) => notify(e.message, true)));
  $("#build-workflows").addEventListener("click", buildWorkflows);
  $("#install-downloads").addEventListener("click", installDownloads);
  $("#generate-all").addEventListener("click", () => startJob("all"));
  $("#generate-keyframe").addEventListener("click", () => startJob("keyframe"));
  $("#continue-video").addEventListener("click", () => startJob("video"));
  $("#frame-prev").addEventListener("click", () => { currentFrameIndex -= 1; renderFrame(); });
  $("#frame-next").addEventListener("click", () => { currentFrameIndex += 1; renderFrame(); });
  $$('[data-stage-action]').forEach((button) => button.addEventListener("click", () => runStage(button.dataset.stageAction, button).catch((error) => notify(error.message, true))));
  $$(".segmented button:not(:disabled)").forEach((button) => button.addEventListener("click", () => setSource(button.parentElement.dataset.source, button.dataset.value)));
  $$('[data-dropzone]').forEach(bindDropzone);
  $("#shot-file").addEventListener("change", async (event) => { const file = event.target.files[0]; if (file) { $("#shot-editor").value = await file.text(); validateEditor(); await refreshAssets(); } });
  $("#advanced-keyframe").addEventListener("change", (event) => event.target.files[0] && importAdvanced("keyframe", event.target.files[0]).catch((e) => notify(e.message, true)));
  $("#advanced-video").addEventListener("change", (event) => event.target.files[0] && importAdvanced("video", event.target.files[0]).catch((e) => notify(e.message, true)));
  await refreshStatus();
  await refreshAssets();
  window.setInterval(() => !document.hidden && refreshStatus(), 15000);
}

window.addEventListener("studio:project-changing", resetForProject);
window.addEventListener("studio:project-changed", () => refreshStatus());

window.SerreStudio = {
  api,
  notify,
  refreshAssets,
  setSource,
  shot,
  startJob,
  showAudio,
  showKeyframes,
  showVideo,
  clearMedia,
  uploadAsset,
  validateEditor,
};
document.addEventListener("DOMContentLoaded", () => init().catch((error) => notify(error.message, true)));
