(function editorialHistoryBootstrap() {
  "use strict";

  const dialog = document.querySelector("#editorial-history-dialog");
  const openButton = document.querySelector("#editorial-history-open");
  if (!dialog || !openButton) return;

  const form = document.querySelector("#editorial-form");
  const status = document.querySelector("#editorial-status");
  const leftSelect = document.querySelector("#editorial-left");
  const rightSelect = document.querySelector("#editorial-right");
  const diffRoot = document.querySelector("#editorial-diff");
  const explanation = document.querySelector("#editorial-explanation");
  let scope = "shot";
  let episodePackage = null;
  let currentShot = null;
  let listing = null;
  let comparison = null;
  let provenance = { provider: "manual" };

  function api(path, options = {}) {
    return window.SerreStudio.api(path, options);
  }

  function reloadEpisode() {
    const episodeId = episodePackage?.episode?.id;
    if (!episodeId) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const timeout = window.setTimeout(() => {
        window.removeEventListener("studio:episode-loaded", loaded);
        reject(new Error("Le rechargement de l’épisode a expiré."));
      }, 8000);
      function loaded(event) {
        if (event.detail?.episode?.id !== episodeId) return;
        window.clearTimeout(timeout);
        window.removeEventListener("studio:episode-loaded", loaded);
        resolve();
      }
      window.addEventListener("studio:episode-loaded", loaded);
      window.dispatchEvent(new CustomEvent("studio:episode-reload"));
    });
  }

  function setStatus(message, state = "ready") {
    status.textContent = message;
    status.className = "badge " + (state === "error" ? "warn" : state);
  }

  function field(name) {
    return form.querySelector('[data-editorial-field="' + name + '"]');
  }

  function formatDate(value) {
    if (!value) return "Date inconnue";
    return new Intl.DateTimeFormat(window.SerreI18n?.getLocale?.() || "fr-FR", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date(value));
  }

  function versionLabel(item) {
    const kind = item.current ? "Canon" : item.kind === "variant" ? "Variante" : "Version";
    return kind + " · " + item.name;
  }

  function query() {
    const params = new URLSearchParams({ scope });
    if (scope === "shot" && currentShot) params.set("shot_id", currentShot.id);
    return params;
  }

  function fillEditor(editor) {
    for (const [name, value] of Object.entries(editor || {})) {
      if (field(name)) field(name).value = value || "";
    }
    const speaker = field("speaker");
    speaker.replaceChildren();
    for (const character of currentShot?.characters || []) {
      speaker.append(new Option(character.name, character.id));
    }
    if (editor?.speaker) speaker.value = editor.speaker;
  }

  function renderVersions() {
    const root = document.querySelector("#editorial-version-list");
    root.replaceChildren();
    const items = [listing.current, ...(listing.versions || [])];
    for (const item of items) {
      const card = document.createElement("article");
      card.className = "editorial-version-card "
        + (item.current ? "current" : item.kind === "variant" ? "variant" : "");
      const title = document.createElement("strong");
      title.textContent = item.name;
      const kind = document.createElement("span");
      kind.className = "badge";
      kind.textContent = item.current ? "Canon" : item.kind === "variant" ? "Variante" : "Version";
      const detail = document.createElement("small");
      detail.textContent = item.description;
      const meta = document.createElement("small");
      const provider = item.provenance?.model || item.provenance?.provider || "manuel";
      meta.textContent = formatDate(item.created_at) + " · " + provider
        + (item.dependency_count ? " · " + item.dependency_count + " rendu(s) lié(s)" : "");
      card.append(title, detail, meta, kind);
      if (!item.current) {
        const promote = document.createElement("button");
        promote.type = "button";
        promote.className = "button ghost";
        promote.textContent = "Choisir comme canon";
        promote.addEventListener("click", () => promoteVersion(item.id));
        card.append(promote);
      }
      root.append(card);
    }

    const previousLeft = leftSelect.value;
    const previousRight = rightSelect.value;
    leftSelect.replaceChildren();
    rightSelect.replaceChildren();
    for (const item of items) {
      leftSelect.append(new Option(versionLabel(item), item.id));
      rightSelect.append(new Option(versionLabel(item), item.id));
    }
    leftSelect.value = items.some((item) => item.id === previousLeft)
      ? previousLeft : items[1]?.id || "current";
    rightSelect.value = items.some((item) => item.id === previousRight)
      ? previousRight : "current";
    document.querySelector("#editorial-current-name").textContent = listing.current.name;
    document.querySelector("#editorial-explain").disabled = true;
  }

  async function refresh({ keepEditor = false } = {}) {
    if (!episodePackage) throw new Error("Sélectionne d’abord un épisode.");
    if (scope === "shot" && !currentShot) throw new Error("Sélectionne d’abord un plan.");
    setStatus("Chargement…");
    listing = await api(
      "/api/editorial-history/" + episodePackage.episode.id + "?" + query()
    );
    renderVersions();
    if (!keepEditor) fillEditor(listing.editor);
    setStatus("Prêt");
  }

  function buildPayload(kind) {
    const packageData = episodePackage;
    const payload = {
      scope,
      kind,
      name: document.querySelector("#editorial-name").value.trim(),
      shot_id: scope === "shot" ? currentShot.id : null,
      provenance,
    };
    if (!payload.name) throw new Error("Donne un nom à cette version.");
    if (scope === "episode") {
      const episode = structuredClone(packageData.episode);
      episode.title = field("title").value.trim();
      episode.logline = field("logline").value.trim();
      episode.narrative_source = field("narrative_source").value.trim();
      for (const name of ["hook", "setup", "conflict", "reveal", "cliffhanger"]) {
        episode.story[name] = field(name).value.trim();
      }
      payload.episode = episode;
      payload.shots = packageData.shots;
    } else {
      const shot = structuredClone(currentShot);
      shot.action = field("action").value.trim();
      const text = field("dialogue").value.trim();
      if (!text) {
        shot.dialogue = null;
      } else {
        const existing = shot.dialogue || {};
        shot.dialogue = {
          speaker: field("speaker").value || shot.characters[0].id,
          text,
          performance: {
            intensity: .5,
            pace: 0,
            pitch: 0,
            volume: 0,
            pause_before_seconds: 0,
            pause_after_seconds: 0,
            ...(existing.performance || {}),
            intention: field("intention").value.trim() || "Sous-entendu",
            emotion: field("emotion").value.trim() || "Contenue",
          },
        };
      }
      payload.shot = shot;
      payload.shot_source = field("shot_source").value.trim();
    }
    return payload;
  }

  async function save(kind) {
    setStatus(kind === "variant" ? "Création…" : "Enregistrement…", "running");
    form.querySelectorAll("button").forEach((button) => { button.disabled = true; });
    try {
      const payload = buildPayload(kind);
      await api("/api/editorial-history/" + episodePackage.episode.id, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (kind === "version") {
        await reloadEpisode();
        currentShot = episodePackage.shots.find((shot) => shot.id === currentShot?.id)
          || episodePackage.shots[0];
      }
      provenance = { provider: "manual" };
      document.querySelector("#editorial-name").value = "";
      await refresh();
      window.SerreStudio.refreshAssets().catch(() => {});
      window.SerreStudio.notify(
        kind === "variant"
          ? "Variante créée sans modifier le canon."
          : "Nouvelle version canonique enregistrée ; les anciens rendus restent archivés."
      );
    } finally {
      form.querySelectorAll("button").forEach((button) => { button.disabled = false; });
    }
  }

  function renderComparison(result) {
    comparison = result;
    diffRoot.replaceChildren();
    explanation.classList.add("hidden");
    document.querySelector("#editorial-diff-title").textContent = result.changed
      ? result.changes.length + " différence(s)"
      : "Versions identiques";
    const choices = document.createElement("div");
    choices.className = "editorial-choice";
    for (const side of ["left", "right"]) {
      const item = result[side];
      if (item.current) continue;
      const button = document.createElement("button");
      button.type = "button";
      button.className = "button ghost";
      button.textContent = "Choisir « " + item.name + " »";
      button.addEventListener("click", () => promoteVersion(item.id));
      choices.append(button);
    }
    if (choices.children.length) diffRoot.append(choices);
    if (!result.changed) {
      const empty = document.createElement("p");
      empty.className = "empty";
      empty.textContent = "Même histoire, mêmes intentions et mêmes réglages.";
      diffRoot.append(empty);
    }
    for (const change of result.changes) {
      const row = document.createElement("article");
      row.className = "editorial-diff-row";
      const label = document.createElement("strong");
      label.textContent = change.field;
      const before = document.createElement("p");
      before.textContent = change.before;
      const after = document.createElement("p");
      after.textContent = change.after;
      row.append(label, before, after);
      diffRoot.append(row);
    }
    document.querySelector("#editorial-explain").disabled = false;
  }

  async function compare() {
    setStatus("Comparaison…", "running");
    const params = query();
    params.set("left", leftSelect.value);
    params.set("right", rightSelect.value);
    const result = await api(
      "/api/editorial-history/" + episodePackage.episode.id + "/compare?" + params
    );
    renderComparison(result);
    setStatus("Comparaison prête");
  }

  async function explainDifferences() {
    if (!comparison) return;
    const button = document.querySelector("#editorial-explain");
    button.disabled = true;
    button.textContent = "✦ Analyse locale…";
    explanation.classList.remove("hidden");
    explanation.replaceChildren();
    explanation.textContent = "Ollama relit les écarts. Le résumé déterministe prendra le relais si nécessaire.";
    try {
      const result = await api(
        "/api/editorial-history/" + episodePackage.episode.id + "/compare/explain",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            scope,
            shot_id: scope === "shot" ? currentShot.id : null,
            left: leftSelect.value,
            right: rightSelect.value,
          }),
        }
      );
      explanation.replaceChildren();
      const title = document.createElement("h3");
      title.textContent = result.summary;
      const reason = document.createElement("p");
      reason.textContent = result.reason;
      const recommendation = document.createElement("p");
      const labels = { left: "Préférence : version gauche", right: "Préférence : version droite", either: "Pas de préférence automatique" };
      recommendation.textContent = labels[result.recommendation] || labels.either;
      const risks = document.createElement("p");
      risks.textContent = (result.risks || []).join(" · ");
      const source = document.createElement("small");
      source.textContent = result.provenance.provider === "ollama"
        ? "Explication Ollama · " + result.provenance.model
        : "Explication déterministe · Ollama indisponible";
      explanation.append(title, reason, recommendation, risks, source);
    } catch (error) {
      explanation.textContent = "Explication impossible : " + error.message;
      explanation.classList.add("error");
    } finally {
      button.disabled = false;
      button.textContent = "✦ Expliquer les différences";
    }
  }

  async function promoteVersion(versionId) {
    if (!window.confirm("Choisir cette version comme canon ? Le canon actuel et ses rendus seront archivés.")) return;
    setStatus("Promotion…", "running");
    const params = query();
    await api(
      "/api/editorial-history/" + episodePackage.episode.id + "/" + versionId
        + "/promote?" + params,
      { method: "POST" }
    );
    await reloadEpisode();
    currentShot = episodePackage.shots.find((shot) => shot.id === currentShot?.id)
      || episodePackage.shots[0];
    await refresh();
    window.SerreStudio.refreshAssets().catch(() => {});
    window.SerreStudio.notify("Version promue en canon ; dépendances compatibles restaurées.");
  }

  function selectScope(next) {
    scope = next;
    document.querySelectorAll("[data-editorial-scope]").forEach((button) => {
      button.classList.toggle("selected", button.dataset.editorialScope === scope);
    });
    document.querySelectorAll("[data-editorial-fields]").forEach((fieldset) => {
      fieldset.classList.toggle("hidden", fieldset.dataset.editorialFields !== scope);
    });
    comparison = null;
    refresh().catch(showError);
  }

  function showError(error) {
    setStatus("Erreur", "error");
    window.SerreStudio.notify(error.message, true);
  }

  openButton.addEventListener("click", () => {
    if (!episodePackage) return showError(new Error("Sélectionne d’abord un épisode."));
    dialog.showModal();
    selectScope(currentShot ? "shot" : "episode");
  });
  document.querySelector("#editorial-history-close").addEventListener("click", () => dialog.close());
  document.querySelectorAll("[data-editorial-scope]").forEach((button) => {
    button.addEventListener("click", () => selectScope(button.dataset.editorialScope));
  });
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    save("version").catch(showError);
  });
  form.querySelector('[data-editorial-save="variant"]').addEventListener("click", () => {
    save("variant").catch(showError);
  });
  document.querySelector("#editorial-compare").addEventListener("click", () => compare().catch(showError));
  document.querySelector("#editorial-explain").addEventListener("click", () => explainDifferences().catch(showError));
  window.addEventListener("studio:episode-loaded", (event) => {
    episodePackage = event.detail;
  });
  window.addEventListener("studio:shot-selected", (event) => {
    episodePackage = { ...(episodePackage || {}), episode: event.detail.episode };
    currentShot = event.detail.shot;
  });
  window.addEventListener("studio:episode-cleared", () => {
    episodePackage = null;
    currentShot = null;
    if (dialog.open) dialog.close();
  });
  window.addEventListener("studio:narrative-draft", (event) => {
    provenance = event.detail || { provider: "ollama" };
  });
})();
