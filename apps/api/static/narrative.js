const narrativeStudio = window.SerreStudio;

async function narrativeRequest(path, options = {}) {
  const response = await fetch(path, options);
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.detail || "Erreur du Director local");
  return body;
}

async function refreshNarrativeStatus() {
  const select = document.querySelector("#ollama-model");
  const button = document.querySelector("#draft-shot");
  const label = document.querySelector("#ollama-state");
  try {
    const status = await narrativeRequest("/api/narrative/status");
    window.dispatchEvent(new CustomEvent("studio:narrative-status", { detail: status }));
    select.replaceChildren();
    if (!status.ready || !status.models.length) {
      select.append(new Option("Ollama hors ligne", ""));
      button.disabled = true;
      label.textContent = "Lance Ollama pour activer le Director";
      return;
    }
    for (const model of status.models) {
      const details = [model.parameter_size, model.quantization].filter(Boolean).join(" · ");
      select.append(new Option(details ? model.name + " — " + details : model.name, model.name));
    }
    select.value = status.selected_model || status.models[0].name;
    button.disabled = false;
    label.textContent = status.models.length + " modèle(s) local(aux) disponible(s)";
  } catch (error) {
    window.dispatchEvent(new CustomEvent("studio:narrative-status", { detail: { ready: false } }));
    button.disabled = true;
    label.textContent = error.message;
  }
}

async function draftShot() {
  const button = document.querySelector("#draft-shot");
  const source = document.querySelector("#story-editor").value.trim();
  if (source.length < 20) {
    narrativeStudio.notify("Décris la situation en au moins 20 caractères.", true);
    return;
  }
  let current;
  try {
    current = narrativeStudio.shot();
  } catch (error) {
    narrativeStudio.notify("Le Shot courant doit au moins fournir un id et une durée.", true);
    return;
  }
  button.disabled = true;
  button.textContent = "Director en cours…";
  window.dispatchEvent(new CustomEvent("studio:narrative-job", { detail: { state: "running" } }));
  try {
    const result = await narrativeRequest("/api/narrative/shot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source_text: source,
        shot_id: current.id,
        duration: current.duration,
        model: document.querySelector("#ollama-model").value,
      }),
    });
    const editor = document.querySelector("#shot-editor");
    editor.value = JSON.stringify(result.shot, null, 2);
    editor.dispatchEvent(new Event("input"));
    window.dispatchEvent(new CustomEvent("studio:narrative-draft", {
      detail: { provider: "ollama", model: result.model, prompt: source },
    }));
    const card = document.querySelector('[data-job-stage="input"]');
    card.classList.add("completed");
    card.querySelector(".stage-status").textContent =
      "Shot proposé par " + result.model + " · " + result.attempts + " essai(s)";
    window.dispatchEvent(new CustomEvent("studio:narrative-job", { detail: { state: "ready" } }));
    narrativeStudio.notify("Shot proposé et validé. Tu peux encore tout modifier.");
  } catch (error) {
    window.dispatchEvent(new CustomEvent("studio:narrative-job", { detail: { state: "failed" } }));
    narrativeStudio.notify(error.message, true);
  } finally {
    button.disabled = false;
    button.textContent = "Proposer le Shot";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  document.querySelector("#draft-shot").addEventListener("click", draftShot);
  refreshNarrativeStatus();
});
