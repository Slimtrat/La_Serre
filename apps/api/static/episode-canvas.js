const episodeCanvas = (() => {
  const workbench = document.querySelector(".graph-workbench");
  const track = document.querySelector("#graph-shot-track");
  const activeLabel = document.querySelector("#graph-active-shot");
  const progressLabel = document.querySelector("#graph-episode-progress-label");
  const progressBar = document.querySelector("#graph-episode-progress-bar");
  const focusButton = document.querySelector("#graph-focus");

  if (!workbench || !track || !focusButton) return null;

  let episodePackage = null;
  let selectedShotId = null;
  let renderVersion = 0;
  const outputByShot = new Map();

  function outputState(output) {
    if (output?.video) return "complete";
    if (output?.keyframe) return "review";
    return "empty";
  }

  function outputLabel(output) {
    if (output?.video) return "Clip prêt";
    if (output?.keyframe) return "Keyframe à valider";
    return "À produire";
  }

  function updateProgress() {
    const shots = episodePackage?.shots || [];
    const complete = shots.filter((shot) => outputState(outputByShot.get(shot.id)) === "complete").length;
    const review = shots.filter((shot) => outputState(outputByShot.get(shot.id)) === "review").length;
    const total = shots.length;
    progressLabel.textContent = complete + " / " + total + " clips finalisés" + (review ? " · " + review + " à valider" : "");
    progressBar.style.width = (total ? complete / total * 100 : 0) + "%";
    progressBar.parentElement.setAttribute("aria-valuenow", String(complete));
    progressBar.parentElement.setAttribute("aria-valuemax", String(total || 1));
  }

  function updateShotButton(shotId) {
    const button = track.querySelector("[data-shot-id='" + shotId + "']");
    if (!button) return;
    const output = outputByShot.get(shotId);
    const state = outputState(output);
    button.classList.remove("state-empty", "state-review", "state-complete");
    button.classList.add("state-" + state);
    button.querySelector(".graph-shot-state").textContent = outputLabel(output);
    updateProgress();
  }

  function updateSelection(shot, index) {
    if (!shot) return;
    selectedShotId = shot.id;
    track.querySelectorAll(".graph-shot-tab").forEach((button) => {
      const selected = button.dataset.shotId === selectedShotId;
      button.classList.toggle("selected", selected);
      button.setAttribute("aria-selected", String(selected));
    });
    activeLabel.textContent = "Plan " + String(index).padStart(2, "0") + " · " + shot.duration + " s · " + shot.camera.shot_type.replaceAll("_", " ");
  }

  function makeShotButton(shot, index) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "graph-shot-tab state-empty";
    button.dataset.shotId = shot.id;
    button.setAttribute("role", "tab");
    button.setAttribute("aria-selected", "false");
    button.setAttribute("aria-label", "Plan " + (index + 1) + ", " + shot.duration + " secondes, " + shot.camera.shot_type.replaceAll("_", " "));

    const number = document.createElement("strong");
    number.textContent = "S" + String(index + 1).padStart(2, "0");
    const duration = document.createElement("small");
    duration.textContent = shot.duration + " s";
    const state = document.createElement("span");
    state.className = "graph-shot-state";
    state.textContent = "À produire";
    button.append(number, duration, state);
    button.addEventListener("click", () => window.selectEpisodeShot?.(shot.id));
    button.addEventListener("keydown", (event) => {
      if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
      event.preventDefault();
      const buttons = Array.from(track.querySelectorAll(".graph-shot-tab"));
      const offset = event.key === "ArrowRight" ? 1 : -1;
      const next = buttons[(buttons.indexOf(button) + offset + buttons.length) % buttons.length];
      next.focus();
      next.click();
    });
    return button;
  }

  async function loadOutput(shotId, version) {
    try {
      const output = await window.SerreStudio.api("/api/outputs/" + shotId);
      if (version !== renderVersion) return;
      outputByShot.set(shotId, output);
      updateShotButton(shotId);
    } catch (_error) {
      if (version !== renderVersion) return;
      outputByShot.set(shotId, null);
      updateShotButton(shotId);
    }
  }

  function renderEpisode(packageData) {
    episodePackage = packageData;
    renderVersion += 1;
    const version = renderVersion;
    outputByShot.clear();
    track.replaceChildren();
    packageData.shots.forEach((shot, index) => track.append(makeShotButton(shot, index)));
    updateProgress();
    packageData.shots.forEach((shot) => loadOutput(shot.id, version));
  }

  function refreshSelectedOutput(detail) {
    if (!selectedShotId || detail?.shotId !== selectedShotId) return;
    outputByShot.set(selectedShotId, detail.outputs || null);
    updateShotButton(selectedShotId);
  }

  function setFocus(active) {
    workbench.classList.toggle("focus-mode", active);
    document.body.classList.toggle("graph-focus-open", active);
    focusButton.setAttribute("aria-pressed", String(active));
    focusButton.textContent = active ? "Quitter le focus" : "Mode focus";
    window.setTimeout(() => window.dispatchEvent(new Event("resize")), 20);
  }

  focusButton.addEventListener("click", () => setFocus(!workbench.classList.contains("focus-mode")));
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && workbench.classList.contains("focus-mode")) setFocus(false);
  });

  window.addEventListener("studio:episode-loaded", (event) => renderEpisode(event.detail));
  window.addEventListener("studio:shot-selected", (event) => updateSelection(event.detail?.shot, event.detail?.index));
  window.addEventListener("studio:assets", (event) => refreshSelectedOutput(event.detail));
  window.addEventListener("studio:job", (event) => {
    const job = event.detail?.job || event.detail;
    if (!selectedShotId || !["GENERATED", "AWAITING_KEYFRAME_APPROVAL"].includes(job?.status)) return;
    window.setTimeout(() => loadOutput(selectedShotId, renderVersion), 120);
  });

  return { setFocus };
})();
