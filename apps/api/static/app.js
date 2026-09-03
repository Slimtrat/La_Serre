const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const sources = { story: "manual", keyframe: "model", audio: "manual", video: "model" };
let currentJob = null;
let pollTimer = null;

async function api(path, options = {}) {
  const response = await fetch(path, options);
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.detail || `Erreur HTTP ${response.status}`);
  return body;
}

function notify(message, error = false) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.toggle("error", error);
  toast.classList.remove("hidden");
  window.setTimeout(() => toast.classList.add("hidden"), 5000);
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
    $("#comfy-url").value = status.comfyui_url;
    const ready = status.status === "ready";
    $("#connection-dot").className = `dot ${status.comfyui ? "ready" : "error"}`;
    $("#connection-label").textContent = status.comfyui ? "ComfyUI connecté" : "ComfyUI hors ligne";
    $("#setup-badge").textContent = ready ? "Prêt" : status.profiles_configured ? "Modèles manquants" : "Workflows absents";
    $("#setup-badge").className = `badge ${ready ? "ready" : "warn"}`;
    renderModels(status.models || []);
    $("#downloads-location").textContent = "Téléchargements : " + status.downloads_dir;
    if (!ready) $("#settings-panel").classList.remove("hidden");
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
  const card = $('.segmented[data-source="' + slot + '"]')?.closest(".stage-card");
  if (card) $(".stage-status", card).textContent = result.filename + " importé";
  notify(`${file.name} branché sur l’étape ${slot}.`);
}

async function refreshAssets() {
  if (!validateEditor()) return;
  const id = shot().id;
  const assets = await api("/api/assets/" + id);
  for (const slot of ["story", "keyframe", "audio", "video"]) {
    const record = assets[slot];
    if (!record) continue;
    setSource(slot, "manual");
    const url = "/api/assets/" + id + "/" + slot + "/content?v=" + Date.now();
    if (slot === "keyframe") showImage(url);
    if (slot === "video") showVideo(url);
    if (slot === "audio") showAudio(url);
    const card = $('.segmented[data-source="' + slot + '"]')?.closest(".stage-card");
    if (card) $(".stage-status", card).textContent = record.filename + " importé";
  }
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
        force: $("#force-output").checked,
      }),
    });
    currentJob = job.id;
    renderJob(job);
    pollTimer = window.setInterval(pollJob, 1000);
  } catch (error) { setWorking(false); notify(error.message, true); }
}

async function pollJob() {
  try {
    const job = await api(`/api/jobs/${currentJob}`);
    renderJob(job);
    if (["GENERATED", "AWAITING_KEYFRAME_APPROVAL", "FAILED"].includes(job.status)) {
      window.clearInterval(pollTimer);
      setWorking(false);
      if (job.status === "FAILED") notify(job.message, true);
      else notify(job.message);
    }
  } catch (error) { window.clearInterval(pollTimer); setWorking(false); notify(error.message, true); }
}

function renderJob(job) {
  $("#job-badge").textContent = job.status.replaceAll("_", " ");
  $("#job-message").textContent = job.message;
  for (const stage of job.stages) {
    const card = $(`[data-job-stage="${stage.id}"]`);
    if (!card) continue;
    card.classList.remove("running", "completed", "failed");
    if (stage.status !== "pending" && stage.status !== "skipped") card.classList.add(stage.status);
    $(".stage-status", card).textContent = stage.message;
  }
  if (job.media.keyframe) showImage(`${job.media.keyframe}?v=${Date.now()}`);
  if (job.media.video) showVideo(`${job.media.video}?v=${Date.now()}`);
}

function showImage(url) { $("#keyframe-preview").src = url; $("#keyframe-preview").classList.remove("hidden"); $("#image-empty").classList.add("hidden"); }
function showVideo(url) { $("#video-preview").src = url; $("#video-preview").classList.remove("hidden"); $("#video-empty").classList.add("hidden"); }
function showAudio(url) { $("#audio-preview").src = url; $("#audio-preview").classList.remove("hidden"); $("#audio-empty").classList.add("hidden"); }
function setWorking(value) { $$("#generate-all,#generate-keyframe,#continue-video").forEach((button) => button.disabled = value); }

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
  $("#settings-toggle").addEventListener("click", () => $("#settings-panel").classList.toggle("hidden"));
  $("#save-config").addEventListener("click", () => saveConfig().catch((e) => notify(e.message, true)));
  $("#build-workflows").addEventListener("click", buildWorkflows);
  $("#install-downloads").addEventListener("click", installDownloads);
  $("#generate-all").addEventListener("click", () => startJob("all"));
  $("#generate-keyframe").addEventListener("click", () => startJob("keyframe"));
  $("#continue-video").addEventListener("click", () => startJob("video"));
  $$(".segmented button:not(:disabled)").forEach((button) => button.addEventListener("click", () => setSource(button.parentElement.dataset.source, button.dataset.value)));
  $$('[data-dropzone]').forEach(bindDropzone);
  $("#shot-file").addEventListener("change", async (event) => { const file = event.target.files[0]; if (file) { $("#shot-editor").value = await file.text(); validateEditor(); await refreshAssets(); } });
  $("#advanced-keyframe").addEventListener("change", (event) => event.target.files[0] && importAdvanced("keyframe", event.target.files[0]).catch((e) => notify(e.message, true)));
  $("#advanced-video").addEventListener("change", (event) => event.target.files[0] && importAdvanced("video", event.target.files[0]).catch((e) => notify(e.message, true)));
  await refreshStatus();
  await refreshAssets();
  window.setInterval(() => !document.hidden && refreshStatus(), 15000);
}

document.addEventListener("DOMContentLoaded", () => init().catch((error) => notify(error.message, true)));
