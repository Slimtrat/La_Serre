const projectSwitcher = (() => {
  const select = document.querySelector("#project-select");
  const openButton = document.querySelector("#project-create-open");
  const dialog = document.querySelector("#project-create-dialog");
  const closeButton = document.querySelector("#project-create-close");
  const form = document.querySelector("#project-create-form");
  const nameInput = document.querySelector("#project-create-name");
  if (!select || !openButton || !dialog || !closeButton || !form || !nameInput) return null;

  let state = { active_id: null, projects: [] };

  async function request(path, options = {}) {
    const response = await fetch(path, options);
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(body.detail || `Erreur HTTP ${response.status}`);
      error.status = response.status;
      throw error;
    }
    return body;
  }

  function render(payload) {
    state = payload;
    select.replaceChildren();
    for (const project of payload.projects || []) {
      select.append(new Option(project.name, project.id));
    }
    select.value = payload.active_id;
    select.disabled = (payload.projects || []).length < 2;
  }

  async function refresh() {
    const payload = await request("/api/projects");
    render(payload);
    return payload;
  }

  async function activate(projectId) {
    if (!projectId || projectId === state.active_id) return;
    const previous = state.active_id;
    window.dispatchEvent(new CustomEvent("studio:project-changing", { detail: { previous, projectId } }));
    try {
      const payload = await request(`/api/projects/${encodeURIComponent(projectId)}/activate`, { method: "POST" });
      render(payload);
      window.dispatchEvent(new CustomEvent("studio:project-changed", { detail: payload }));
    } catch (error) {
      select.value = previous;
      window.SerreStudio?.notify(error.message, true);
    }
  }

  select.addEventListener("change", () => activate(select.value));
  openButton.addEventListener("click", () => {
    form.reset();
    dialog.showModal();
    nameInput.focus();
  });
  closeButton.addEventListener("click", () => dialog.close());
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const submit = form.querySelector("button[type='submit']");
    submit.disabled = true;
    window.dispatchEvent(new CustomEvent("studio:project-changing"));
    try {
      const payload = await request("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: nameInput.value, clone_content: true }),
      });
      render(payload);
      dialog.close();
      window.dispatchEvent(new CustomEvent("studio:project-changed", { detail: payload }));
      window.SerreStudio?.notify("Projet créé. Le scénario est prêt, les sorties sont isolées.");
    } catch (error) {
      window.SerreStudio?.notify(error.message, true);
    } finally {
      submit.disabled = false;
    }
  });

  const ready = refresh().catch((error) => {
    select.replaceChildren(new Option("Projet indisponible", ""));
    throw error;
  });
  window.SerreProjects = { ready, refresh, activate };
  return window.SerreProjects;
})();
