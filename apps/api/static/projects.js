const projectSwitcher = (() => {
  const select = document.querySelector("#project-select");
  const openButton = document.querySelector("#project-create-open");
  const dialog = document.querySelector("#project-create-dialog");
  const closeButton = document.querySelector("#project-create-close");
  const form = document.querySelector("#project-create-form");
  const nameInput = document.querySelector("#project-create-name");
  if (!select || !openButton || !dialog || !closeButton || !form || !nameInput) return null;

  let state = { active_id: null, projects: [], storage: null };
  let cloneContentOnCreate = true;
  let projectPendingRemoval = null;
  const style = document.createElement("link");
  style.rel = "stylesheet";
  style.href = "/static/project-storage.css";
  document.head.append(style);

  const deleteDiscoveryButton = document.createElement("button");
  deleteDiscoveryButton.id = "project-discovery-delete";
  deleteDiscoveryButton.className = "context-action hidden";
  deleteDiscoveryButton.type = "button";
  deleteDiscoveryButton.title = "Supprimer le projet Découverte";
  deleteDiscoveryButton.setAttribute("aria-label", "Supprimer le projet Découverte");
  deleteDiscoveryButton.textContent = "Supprimer";
  openButton.after(deleteDiscoveryButton);

  const manageButton = document.createElement("button");
  manageButton.id = "project-manage-open";
  manageButton.className = "context-action";
  manageButton.type = "button";
  manageButton.title = "Emplacement et gestion des projets";
  manageButton.setAttribute("aria-label", "Emplacement et gestion des projets");
  manageButton.textContent = window.SerreI18n?.t("shell.manageProjects") || "Projets";
  deleteDiscoveryButton.after(manageButton);

  document.body.insertAdjacentHTML("beforeend", `
    <dialog id="project-manage-dialog" class="project-manage-dialog" aria-labelledby="project-manage-title">
      <div class="project-manage-shell">
        <header>
          <div><p class="eyebrow">FICHIERS DU STUDIO</p><h2 id="project-manage-title">Emplacement des projets</h2></div>
          <button id="project-manage-close" class="button ghost" type="button">Fermer</button>
        </header>
        <p class="project-manage-intro">Chaque projet garde ses fichiers de travail et ses rendus dans un espace isolé. Les chemins affichés sont absolus.</p>
        <div id="project-manage-list" class="project-manage-list"></div>
      </div>
    </dialog>
    <dialog id="project-remove-dialog" class="project-remove-dialog" aria-labelledby="project-remove-title">
      <form method="dialog" id="project-remove-form">
        <header>
          <div><p class="eyebrow">ZONE SENSIBLE</p><h2 id="project-remove-title">Retirer le projet</h2></div>
          <button class="button ghost" value="cancel" type="submit">Annuler</button>
        </header>
        <p id="project-remove-copy"></p>
        <section class="removal-choice">
          <div><strong>Désenregistrer seulement</strong><small>Le projet disparaît du Studio, mais tous ses fichiers restent sur le disque.</small></div>
          <button id="project-unregister-confirm" class="button secondary" type="button">Conserver les fichiers</button>
        </section>
        <section class="removal-choice danger">
          <div><strong>Supprimer work + output</strong><small id="project-delete-warning">Suppression définitive limitée aux dossiers vérifiés de ce projet.</small></div>
          <label>Recopie le nom exact<input id="project-delete-confirmation" autocomplete="off" /></label>
          <button id="project-delete-confirm" class="button danger" type="button" disabled>Supprimer les fichiers</button>
        </section>
      </form>
    </dialog>
  `);

  const manageDialog = document.querySelector("#project-manage-dialog");
  const manageClose = document.querySelector("#project-manage-close");
  const manageList = document.querySelector("#project-manage-list");
  const removeDialog = document.querySelector("#project-remove-dialog");
  const removeCopy = document.querySelector("#project-remove-copy");
  const unregisterConfirm = document.querySelector("#project-unregister-confirm");
  const deleteConfirmation = document.querySelector("#project-delete-confirmation");
  const deleteConfirm = document.querySelector("#project-delete-confirm");
  const deleteWarning = document.querySelector("#project-delete-warning");

  const settingsPanel = document.querySelector("#settings-panel");
  const storageHost = document.querySelector("#settings-storage-host") || settingsPanel;
  const storageCard = document.createElement("section");
  storageCard.id = "project-storage-settings";
  storageCard.className = "project-storage-settings";
  storageCard.innerHTML = `
    <header><div><p class="eyebrow">STOCKAGE DES PROJETS</p><h3>Dossiers work et output</h3></div><span id="project-storage-layout" class="badge">—</span></header>
    <p>Ces racines s’appliquent aux prochains projets. Aucun projet existant n’est déplacé automatiquement.</p>
    <div class="project-storage-fields">
      <label>Racine work<input id="project-work-root" spellcheck="false" /></label>
      <label>Racine output<input id="project-output-root" spellcheck="false" /></label>
    </div>
    <div class="project-storage-actions">
      <label class="storage-same-root"><input id="project-roots-together" type="checkbox" /> Utiliser la même racine</label>
      <button id="project-storage-save" class="button secondary" type="button">Enregistrer les emplacements</button>
    </div>
    <small id="project-storage-preview"></small>
  `;
  storageHost?.append(storageCard);
  const workRootInput = storageCard.querySelector("#project-work-root");
  const outputRootInput = storageCard.querySelector("#project-output-root");
  const rootsTogether = storageCard.querySelector("#project-roots-together");
  const storageSave = storageCard.querySelector("#project-storage-save");
  const storageLayout = storageCard.querySelector("#project-storage-layout");
  const storagePreview = storageCard.querySelector("#project-storage-preview");

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
    const active = (payload.projects || []).find((project) => project.id === payload.active_id);
    deleteDiscoveryButton.classList.toggle("hidden", !active?.deletable);
    renderStorage(payload.storage);
    renderProjectManager();
  }

  function renderStorage(storage) {
    if (!storage || document.activeElement === workRootInput || document.activeElement === outputRootInput) return;
    workRootInput.value = storage.work_root || "";
    outputRootInput.value = storage.output_root || "";
    rootsTogether.checked = storage.layout === "shared-root";
    storageLayout.textContent = rootsTogether.checked ? "Racine commune" : "Racines séparées";
    updateStoragePreview();
  }

  function updateStoragePreview() {
    if (rootsTogether.checked) outputRootInput.value = workRootInput.value;
    outputRootInput.disabled = rootsTogether.checked;
    const example = "nom-du-projet";
    storagePreview.textContent = rootsTogether.checked
      ? `Structure : ${workRootInput.value || "<racine>"}/${example}/work + /output`
      : `Structure : ${workRootInput.value || "<work>"}/${example} et ${outputRootInput.value || "<output>"}/${example}`;
  }

  function pathRow(label, path, projectId, role) {
    const row = document.createElement("div");
    row.className = "project-path-row";
    const copy = document.createElement("button");
    copy.type = "button";
    copy.className = "button ghost compact";
    copy.textContent = "Copier";
    copy.addEventListener("click", () => copyPath(path));
    const open = document.createElement("button");
    open.type = "button";
    open.className = "button ghost compact";
    open.textContent = "Ouvrir";
    open.addEventListener("click", () => openFolder(projectId, role));
    const text = document.createElement("div");
    const title = document.createElement("small");
    title.textContent = label;
    const code = document.createElement("code");
    code.textContent = path;
    text.append(title, code);
    row.append(text, copy, open);
    return row;
  }

  function renderProjectManager() {
    if (!manageList) return;
    manageList.replaceChildren();
    for (const project of state.projects || []) {
      const card = document.createElement("article");
      card.className = "project-location-card";
      if (project.active) card.classList.add("active");
      const header = document.createElement("header");
      const identity = document.createElement("div");
      const title = document.createElement("strong");
      title.textContent = project.name;
      const meta = document.createElement("small");
      meta.textContent = project.active ? "Projet actif" : project.storage_managed ? "Projet géré par le Studio" : "Projet historique";
      identity.append(title, meta);
      header.append(identity);
      if (!project.active && (state.projects || []).length > 1) {
        const remove = document.createElement("button");
        remove.type = "button";
        remove.className = "button ghost compact";
        remove.textContent = "Retirer…";
        remove.addEventListener("click", () => openRemoval(project));
        header.append(remove);
      }
      card.append(
        header,
        pathRow("Dossier work", project.work_dir, project.id, "work"),
        pathRow("Dossier output", project.output_dir, project.id, "output"),
      );
      manageList.append(card);
    }
  }

  async function copyPath(path) {
    try {
      await navigator.clipboard.writeText(path);
      window.SerreStudio?.notify("Chemin copié.");
    } catch (_error) {
      const helper = document.createElement("textarea");
      helper.value = path;
      document.body.append(helper);
      helper.select();
      document.execCommand("copy");
      helper.remove();
      window.SerreStudio?.notify("Chemin copié.");
    }
  }

  async function openFolder(projectId, role) {
    try {
      await request(`/api/projects/${encodeURIComponent(projectId)}/open-folder`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
    } catch (error) {
      window.SerreStudio?.notify(error.message, true);
    }
  }

  function openRemoval(project) {
    if (project.active) {
      window.SerreStudio?.notify("Change d’abord de projet actif.", true);
      return;
    }
    projectPendingRemoval = project;
    removeCopy.textContent = `Que veux-tu faire de « ${project.name} » ?`;
    deleteConfirmation.value = "";
    deleteConfirmation.disabled = !project.storage_managed;
    deleteConfirm.disabled = true;
    deleteWarning.textContent = project.storage_managed
      ? "Suppression définitive limitée aux dossiers vérifiés de ce projet."
      : "Projet historique : les fichiers ne peuvent être supprimés automatiquement.";
    if (manageDialog.open) manageDialog.close();
    removeDialog.showModal();
  }

  async function removeProject(deleteFiles) {
    const project = projectPendingRemoval;
    if (!project) return null;
    try {
      const payload = await request(
        `/api/projects/${encodeURIComponent(project.id)}/remove`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mode: deleteFiles ? "delete_files" : "keep_files",
            confirmation: deleteFiles ? deleteConfirmation.value : null,
          }),
        },
      );
      render(payload);
      removeDialog.close();
      projectPendingRemoval = null;
      window.dispatchEvent(new CustomEvent("studio:project-changed", { detail: payload }));
      window.SerreStudio?.notify(
        deleteFiles
          ? "Projet et dossiers vérifiés supprimés."
          : "Projet désenregistré. Ses fichiers sont conservés.",
      );
      return payload;
    } catch (error) {
      window.SerreStudio?.notify(error.message, true);
      return null;
    }
  }

  async function saveStorage() {
    storageSave.disabled = true;
    try {
      const payload = await request("/api/projects/storage", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          work_root: workRootInput.value,
          output_root: rootsTogether.checked ? workRootInput.value : outputRootInput.value,
        }),
      });
      render(payload);
      window.SerreStudio?.notify("Emplacements enregistrés pour les prochains projets.");
    } catch (error) {
      window.SerreStudio?.notify(error.message, true);
    } finally {
      storageSave.disabled = false;
    }
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

  function openCreate({ cloneContent = true } = {}) {
    cloneContentOnCreate = cloneContent;
    form.reset();
    dialog.showModal();
    nameInput.focus();
  }

  async function create(name, { cloneContent = true } = {}) {
    window.dispatchEvent(new CustomEvent("studio:project-changing"));
    const payload = await request("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, clone_content: cloneContent }),
    });
    render(payload);
    dialog.close();
    window.dispatchEvent(new CustomEvent("studio:project-changed", { detail: payload }));
    window.SerreStudio?.notify(
      cloneContent
        ? "Projet créé. Le scénario est prêt, les sorties sont isolées."
        : "Projet vierge créé. Tu peux maintenant écrire ton propre épisode.",
    );
    return payload;
  }

  async function deleteDiscovery(projectId = state.active_id) {
    const project = state.projects.find((item) => item.id === projectId);
    if (!project?.deletable || project.kind !== "discovery") return null;
    if (!window.confirm("Retirer le projet Découverte du Studio ? Tes autres projets seront conservés.")) {
      return null;
    }
    window.dispatchEvent(
      new CustomEvent("studio:project-changing", {
        detail: { previous: project.id, deleting: true },
      }),
    );
    try {
      const payload = await request(
        "/api/projects/" + encodeURIComponent(project.id),
        { method: "DELETE" },
      );
      render(payload);
      window.dispatchEvent(new CustomEvent("studio:project-changed", { detail: payload }));
      window.SerreStudio?.notify("Le projet Découverte a été retiré. Tes projets sont intacts.");
      return payload;
    } catch (error) {
      window.SerreStudio?.notify(error.message, true);
      await refresh();
      return null;
    }
  }

  select.addEventListener("change", () => activate(select.value));
  openButton.addEventListener("click", () => openCreate({ cloneContent: true }));
  deleteDiscoveryButton.addEventListener("click", () => deleteDiscovery());
  manageButton.addEventListener("click", () => {
    renderProjectManager();
    manageDialog.showModal();
  });
  manageClose.addEventListener("click", () => manageDialog.close());
  unregisterConfirm.addEventListener("click", () => removeProject(false));
  deleteConfirmation.addEventListener("input", () => {
    deleteConfirm.disabled = !projectPendingRemoval?.storage_managed
      || deleteConfirmation.value !== projectPendingRemoval.name;
  });
  deleteConfirm.addEventListener("click", () => removeProject(true));
  rootsTogether.addEventListener("change", updateStoragePreview);
  workRootInput.addEventListener("input", updateStoragePreview);
  outputRootInput.addEventListener("input", updateStoragePreview);
  storageSave.addEventListener("click", saveStorage);
  closeButton.addEventListener("click", () => dialog.close());
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const submit = form.querySelector("button[type='submit']");
    submit.disabled = true;
    try {
      await create(nameInput.value, { cloneContent: cloneContentOnCreate });
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
  window.SerreProjects = {
    ready,
    refresh,
    activate,
    create,
    openCreate,
    deleteDiscovery,
    openManager: () => manageDialog.showModal(),
    removeProject,
    saveStorage,
    current: () => state,
  };
  return window.SerreProjects;
})();
