(() => {
  const drawer = document.querySelector("#asset-drawer");
  const backdrop = document.querySelector("#asset-drawer-backdrop");
  const openButton = document.querySelector('[data-tool-action="assets"]');
  if (!drawer || !backdrop || !openButton) return;

  window.SerreI18n?.register?.("fr", {
    assetDrawer: {
      title: "Bibliothèque d’assets", subtitle: "Tous les médias du projet, prêts à être réutilisés.",
      close: "Fermer la bibliothèque", search: "Rechercher un asset…", allTypes: "Tous les types",
      allCharacters: "Tous les personnages", allLocations: "Tous les lieux", allEpisodes: "Tous les épisodes",
      allStatuses: "Tous les statuts", loading: "Indexation du projet…", empty: "Aucun asset ne correspond à ces filtres.",
      indexed: "{count} assets indexés", result: "{count} résultats", drag: "Glisse vers un nœud ou un slot compatible",
      provenance: "Provenance", source: "Source", engine: "Moteur", model: "Modèle", files: "Fichiers",
      uses: "Utilisations", target: "Destination", currentShot: "Plan courant", reuse: "Réutiliser",
      noTarget: "Cet asset est consultable mais ne correspond à aucun slot de production.",
      reused: "Asset réutilisé dans {slot} sans nouvelle copie.", preview: "Aperçu de l’asset",
      types: { image: "Images", video: "Vidéos", audio: "Audio", text: "Textes", character: "Personnages", background: "Décors", data: "Données", file: "Fichiers" },
      statuses: { imported: "Importé", generated: "Généré", reused: "Réutilisé", reference: "Référence", archived: "Archivé", library: "Bibliothèque" },
      slots: { story: "Histoire", shot: "Shot JSON", keyframe: "Keyframe", audio: "Voix / son", video: "Vidéo" },
    },
  });
  window.SerreI18n?.register?.("en", {
    assetDrawer: {
      title: "Asset library", subtitle: "Every project asset, ready to reuse.", close: "Close asset library",
      search: "Search assets…", allTypes: "All types", allCharacters: "All characters", allLocations: "All locations",
      allEpisodes: "All episodes", allStatuses: "All statuses", loading: "Indexing project…",
      empty: "No asset matches these filters.", indexed: "{count} indexed assets", result: "{count} results",
      drag: "Drag to a compatible node or slot", provenance: "Provenance", source: "Source", engine: "Engine",
      model: "Model", files: "Files", uses: "Uses", target: "Destination", currentShot: "Current shot",
      reuse: "Reuse", noTarget: "This asset can be inspected but does not match a production slot.",
      reused: "Asset reused in {slot} without a new copy.", preview: "Asset preview",
      types: { image: "Images", video: "Videos", audio: "Audio", text: "Texts", character: "Characters", background: "Backgrounds", data: "Data", file: "Files" },
      statuses: { imported: "Imported", generated: "Generated", reused: "Reused", reference: "Reference", archived: "Archived", library: "Library" },
      slots: { story: "Story", shot: "Shot JSON", keyframe: "Keyframe", audio: "Voice / sound", video: "Video" },
    },
  });

  const search = drawer.querySelector("#asset-search");
  const grid = drawer.querySelector("#asset-grid");
  const count = drawer.querySelector("#asset-count");
  const detail = drawer.querySelector("#asset-detail");
  const filters = {
    kind: drawer.querySelector("#asset-filter-kind"),
    character: drawer.querySelector("#asset-filter-character"),
    location: drawer.querySelector("#asset-filter-location"),
    episode: drawer.querySelector("#asset-filter-episode"),
    status: drawer.querySelector("#asset-filter-status"),
  };
  let state = { items: [], facets: {}, selected: null, revision: 0 };
  let debounce = 0;
  let dragged = null;

  const t = (key, params = {}) => window.SerreI18n?.t("assetDrawer." + key, params) || key;
  const humanBytes = (value) => {
    const bytes = Number(value || 0);
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / 1024 / 1024).toFixed(1) + " MB";
  };
  const localeDate = (value) => {
    try { return new Intl.DateTimeFormat(window.SerreI18n?.getLocale?.() || "fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)); }
    catch (_error) { return value || "—"; }
  };

  function setOpen(open) {
    drawer.hidden = !open;
    backdrop.hidden = !open;
    drawer.setAttribute("aria-hidden", String(!open));
    openButton.setAttribute("aria-expanded", String(open));
    document.body.classList.toggle("asset-drawer-open", open);
    if (open) {
      refresh().catch(reportError);
      window.setTimeout(() => search.focus(), 30);
    } else openButton.focus({ preventScroll: true });
  }

  function params() {
    const query = new URLSearchParams();
    if (search.value.trim()) query.set("q", search.value.trim());
    Object.entries(filters).forEach(([key, select]) => select.value && query.set(key, select.value));
    return query;
  }

  async function refresh({ keepSelection = true } = {}) {
    const revision = ++state.revision;
    grid.setAttribute("aria-busy", "true");
    if (!state.items.length) grid.innerHTML = '<p class="asset-drawer-message">' + t("loading") + "</p>";
    const payload = await window.SerreStudio.api("/api/asset-catalog?" + params());
    if (revision !== state.revision) return;
    const selectedId = keepSelection ? state.selected?.id : null;
    state = { ...state, items: payload.items || [], facets: payload.facets || {} };
    populateFilters();
    renderGrid();
    const next = state.items.find((item) => item.id === selectedId) || state.items[0] || null;
    select(next);
    count.textContent = t("result", { count: payload.total }) + " · " + t("indexed", { count: payload.indexed_total });
    grid.setAttribute("aria-busy", "false");
  }

  function populateFilters() {
    const definitions = {
      kind: ["allTypes", "kinds"], character: ["allCharacters", "characters"],
      location: ["allLocations", "locations"], episode: ["allEpisodes", "episodes"], status: ["allStatuses", "statuses"],
    };
    Object.entries(definitions).forEach(([name, [emptyLabel, facet]]) => {
      const select = filters[name];
      const current = select.value;
      select.replaceChildren(new Option(t(emptyLabel), ""));
      (state.facets[facet] || []).forEach((entry) => {
        let label = entry.label;
        if (name === "kind") label = t("types." + entry.value);
        if (name === "status") label = t("statuses." + entry.value);
        select.add(new Option(label + " · " + entry.count, entry.value));
      });
      if (Array.from(select.options).some((option) => option.value === current)) select.value = current;
    });
  }

  function renderGrid() {
    grid.replaceChildren();
    if (!state.items.length) {
      const empty = document.createElement("p");
      empty.className = "asset-drawer-message";
      empty.textContent = t("empty");
      grid.append(empty);
      return;
    }
    state.items.forEach((item) => {
      const card = document.createElement("button");
      card.type = "button";
      card.className = "asset-card";
      card.dataset.assetId = item.id;
      card.draggable = item.compatible_slots.length > 0;
      card.setAttribute("aria-label", item.name + ". " + t("types." + item.kind));
      card.title = item.compatible_slots.length ? t("drag") : item.name;
      const visual = document.createElement("span");
      visual.className = "asset-card-visual kind-" + item.kind;
      if (item.kind === "image") {
        const image = document.createElement("img");
        image.src = item.content_url;
        image.alt = "";
        image.loading = "lazy";
        visual.append(image);
      } else {
        visual.textContent = ({ video: "▶", audio: "♫", text: "¶", character: "♟", background: "⌂", data: "{}" })[item.kind] || "◇";
      }
      const copy = document.createElement("span");
      copy.className = "asset-card-copy";
      const name = document.createElement("strong");
      name.textContent = item.name;
      const meta = document.createElement("small");
      meta.textContent = t("types." + item.kind) + " · " + humanBytes(item.bytes);
      const tags = document.createElement("span");
      tags.className = "asset-card-tags";
      (item.statuses || []).slice(0, 2).forEach((status) => {
        const tag = document.createElement("i");
        tag.textContent = t("statuses." + status);
        tags.append(tag);
      });
      copy.append(name, meta, tags);
      card.append(visual, copy);
      card.addEventListener("click", () => select(item));
      card.addEventListener("dragstart", (event) => startDrag(event, item));
      card.addEventListener("dragend", finishDrag);
      grid.append(card);
    });
  }

  function select(item) {
    state.selected = item;
    grid.querySelectorAll(".asset-card").forEach((card) => card.classList.toggle("selected", card.dataset.assetId === item?.id));
    detail.replaceChildren();
    if (!item) return;
    const heading = document.createElement("header");
    heading.innerHTML = "<small>" + t("types." + item.kind) + "</small>";
    const title = document.createElement("h3");
    title.textContent = item.name;
    heading.append(title);
    const preview = document.createElement("div");
    preview.className = "asset-detail-preview kind-" + item.kind;
    preview.setAttribute("aria-label", t("preview"));
    if (item.kind === "image") preview.append(Object.assign(document.createElement("img"), { src: item.content_url, alt: item.name }));
    else if (item.kind === "video") preview.append(Object.assign(document.createElement("video"), { src: item.content_url, controls: true, muted: true }));
    else if (item.kind === "audio") preview.append(Object.assign(document.createElement("audio"), { src: item.content_url, controls: true }));
    else {
      const text = document.createElement("pre");
      text.textContent = t("loading");
      preview.append(text);
      const selectedId = item.id;
      fetch(item.content_url).then((response) => response.text()).then((value) => {
        if (state.selected?.id === selectedId) text.textContent = value.slice(0, 12000);
      }).catch(() => { text.textContent = item.name; });
    }
    detail.append(heading, preview, provenance(item), reuseControls(item));
  }

  function provenance(item) {
    const section = document.createElement("section");
    section.className = "asset-provenance";
    const title = document.createElement("h4");
    title.textContent = t("provenance");
    const list = document.createElement("dl");
    const rows = [
      [t("source"), (item.sources || []).join(", ") || item.source],
      [t("engine"), item.provider || "—"], [t("model"), item.model || "—"],
      [t("uses"), String(item.usage_count || 0)], ["SHA-256", item.sha256.slice(0, 16) + "…"],
      ["Date", localeDate(item.updated_at)], [t("files"), (item.files || []).map((entry) => entry.path).join("\n")],
    ];
    rows.forEach(([label, value]) => {
      const row = document.createElement("div");
      const term = document.createElement("dt");
      const description = document.createElement("dd");
      term.textContent = label;
      description.textContent = value;
      row.append(term, description);
      list.append(row);
    });
    section.append(title, list);
    return section;
  }

  function reuseControls(item) {
    const section = document.createElement("section");
    section.className = "asset-reuse";
    if (!item.compatible_slots.length) {
      section.textContent = t("noTarget");
      return section;
    }
    const label = document.createElement("label");
    label.textContent = t("target") + " · " + t("currentShot");
    const select = document.createElement("select");
    item.compatible_slots.forEach((slot) => select.add(new Option(t("slots." + slot), slot)));
    const button = document.createElement("button");
    button.className = "button primary";
    button.type = "button";
    button.textContent = t("reuse");
    button.addEventListener("click", () => reuse(item.id, select.value).catch(reportError));
    label.append(select);
    section.append(label, button);
    return section;
  }

  function startDrag(event, item) {
    dragged = { assetId: item.id, compatibleSlots: item.compatible_slots, kind: item.kind, name: item.name };
    event.dataTransfer.effectAllowed = "link";
    event.dataTransfer.setData("application/x-serre-asset", JSON.stringify(dragged));
    event.dataTransfer.setData("text/plain", item.name);
    document.body.classList.add("asset-dragging");
    window.dispatchEvent(new CustomEvent("studio:asset-drag-start", { detail: dragged }));
  }

  function finishDrag() {
    dragged = null;
    document.body.classList.remove("asset-dragging");
    window.dispatchEvent(new CustomEvent("studio:asset-drag-end"));
  }

  async function reuse(assetId, slot) {
    const shot = window.SerreStudio.shot();
    const record = await window.SerreStudio.api("/api/assets/" + encodeURIComponent(shot.id) + "/" + encodeURIComponent(slot) + "/reuse", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ asset_id: assetId }),
    });
    if (slot !== "shot") window.SerreStudio.setSource(slot, "manual");
    await window.SerreStudio.refreshAssets();
    window.dispatchEvent(new CustomEvent("studio:asset", { detail: { slot, record } }));
    window.SerreStudio.notify(t("reused", { slot: t("slots." + slot) }));
    await refresh();
    return record;
  }

  function transfer(event) {
    const raw = event.dataTransfer?.getData("application/x-serre-asset");
    if (!raw) return null;
    try { return JSON.parse(raw); } catch (_error) { return null; }
  }
  function canDrop(slot) { return Boolean(dragged?.compatibleSlots?.includes(slot)); }
  function reportError(error) { window.SerreStudio?.notify?.(error.message || String(error), true); }

  openButton.setAttribute("aria-haspopup", "dialog");
  openButton.setAttribute("aria-controls", drawer.id);
  openButton.setAttribute("aria-expanded", "false");
  drawer.querySelector("#asset-drawer-close").addEventListener("click", () => setOpen(false));
  backdrop.addEventListener("click", () => setOpen(false));
  search.addEventListener("input", () => {
    window.clearTimeout(debounce);
    debounce = window.setTimeout(() => refresh().catch(reportError), 220);
  });
  Object.values(filters).forEach((select) => select.addEventListener("change", () => refresh().catch(reportError)));
  document.addEventListener("keydown", (event) => { if (event.key === "Escape" && !drawer.hidden) setOpen(false); });
  window.addEventListener("studio:project-changing", () => { state = { items: [], facets: {}, selected: null, revision: state.revision + 1 }; });
  window.addEventListener("studio:project-changed", () => { if (!drawer.hidden) refresh({ keepSelection: false }).catch(reportError); });
  window.addEventListener("studio:language-changed", () => { if (!drawer.hidden) refresh().catch(reportError); });

  window.SerreAssetDrawer = { open: () => setOpen(true), close: () => setOpen(false), refresh, reuse, transfer, canDrop, dragged: () => dragged };
})();
