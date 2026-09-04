const episodeStudio = window.SerreStudio;
let loadedEpisode = null;
let catalogBound = false;
let castingReturnFocus = null;

function castingDetails() {
  return document.querySelector(".episode-details");
}

function closeCasting({ restoreFocus = true } = {}) {
  const details = castingDetails();
  if (!details) return false;
  const summary = details.querySelector("summary");
  details.open = false;
  summary?.setAttribute("aria-expanded", "false");
  if (restoreFocus) {
    const focusTarget = castingReturnFocus?.isConnected ? castingReturnFocus : summary;
    focusTarget?.focus({ preventScroll: true });
  }
  castingReturnFocus = null;
  return true;
}

function openCasting({ returnFocus = document.activeElement } = {}) {
  const details = castingDetails();
  if (!details) return false;
  if (returnFocus instanceof HTMLElement) castingReturnFocus = returnFocus;
  details.open = true;
  details.querySelector("summary")?.setAttribute("aria-expanded", "true");
  requestAnimationFrame(() => {
    const panel = details.querySelector(".episode-details-grid");
    panel?.focus({ preventScroll: true });
  });
  return true;
}

window.SerreEpisode = Object.freeze({ openCasting, closeCasting });

async function episodeRequest(path) {
  const response = await fetch(path);
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.detail || "Catalogue d’épisodes inaccessible");
  return body;
}

function renderCast(characters) {
  const cast = document.querySelector("#episode-cast");
  cast.replaceChildren();
  for (const character of characters) {
    const card = document.createElement("div");
    card.className = "character-chip";
    const initials = character.name.slice(0, 2).toUpperCase();
    const mark = document.createElement("span");
    mark.textContent = initials;
    const text = document.createElement("div");
    const name = document.createElement("strong");
    name.textContent = character.name;
    const role = document.createElement("small");
    role.textContent = character.role;
    text.append(name, role);
    card.append(mark, text);
    card.title = character.visual_description;
    cast.append(card);
  }
}

function selectEpisodeShot(shotId) {
  if (!loadedEpisode) return;
  const selected = loadedEpisode.shots.find((shot) => shot.id === shotId);
  if (!selected) return;
  const editor = document.querySelector("#shot-editor");
  editor.value = JSON.stringify(selected, null, 2);
  editor.dispatchEvent(new Event("input"));
  document.querySelector("#story-editor").value =
    loadedEpisode.episode.shot_sources[shotId] || loadedEpisode.episode.narrative_source;
  for (const button of document.querySelectorAll(".shot-button")) {
    button.classList.toggle("selected", button.dataset.shotId === shotId);
  }
  const index = loadedEpisode.episode.shot_order.indexOf(shotId) + 1;
  document.querySelector("#episode-state").textContent =
    "Plan " + index + " sur " + loadedEpisode.shots.length + " · prêt à générer";
  window.dispatchEvent(
    new CustomEvent("studio:shot-selected", {
      detail: { episode: loadedEpisode.episode, shot: selected, index },
    }),
  );
  episodeStudio.refreshAssets().catch(() => {});
}

function renderShotStrip(packageData) {
  const strip = document.querySelector("#episode-shots");
  strip.replaceChildren();
  packageData.shots.forEach((shot, index) => {
    const button = document.createElement("button");
    button.className = "shot-button";
    button.dataset.shotId = shot.id;
    const number = document.createElement("strong");
    number.textContent = "S" + String(index + 1).padStart(2, "0");
    const description = document.createElement("small");
    description.textContent = shot.duration + "s · " + shot.camera.shot_type;
    button.append(number, description);
    button.addEventListener("click", () => selectEpisodeShot(shot.id));
    strip.append(button);
  });
}

async function loadEpisode(episodeId) {
  loadedEpisode = await episodeRequest("/api/episodes/" + episodeId);
  const episode = loadedEpisode.episode;
  document.querySelector("#episode-title").textContent = episode.id + " — " + episode.title;
  document.querySelector("#episode-logline").textContent = episode.logline;
  document.querySelector("#episode-duration").textContent =
    episode.duration_target + " secondes · " + loadedEpisode.shots.length + " plans";
  renderCast(loadedEpisode.characters);
  renderShotStrip(loadedEpisode);
  window.dispatchEvent(
    new CustomEvent("studio:episode-loaded", { detail: loadedEpisode }),
  );
  selectEpisodeShot(episode.shot_order[0]);
}

async function initEpisodeCatalog() {
  const listing = await episodeRequest("/api/episodes");
  const select = document.querySelector("#episode-select");
  select.replaceChildren();
  if (!listing.episodes.length) {
    select.append(new Option("Aucun épisode", ""));
    select.disabled = true;
    document.querySelector("#episode-state").textContent = "Catalogue vide";
    document.querySelector("#episode-title").textContent = "Projet sans épisode";
    document.querySelector("#episode-logline").textContent = "Ajoute un épisode au contenu privé de ce projet.";
    document.querySelector("#episode-shots").replaceChildren();
    document.querySelector("#episode-cast").replaceChildren();
    window.dispatchEvent(new CustomEvent("studio:episode-cleared"));
    return;
  }
  for (const episode of listing.episodes) {
    select.append(new Option(episode.id + " — " + episode.title, episode.id));
  }
  if (!catalogBound) {
    select.addEventListener("change", () => loadEpisode(select.value));
    catalogBound = true;
  }
  await loadEpisode(select.value);
}

document.addEventListener("DOMContentLoaded", async () => {
  const details = document.querySelector(".episode-details");
  if (details) {
    const summary = details.querySelector("summary");
    details.addEventListener("toggle", () => {
      summary?.setAttribute("aria-expanded", String(details.open));
    });
    document.addEventListener("pointerdown", (event) => {
      if (details.open && !details.contains(event.target)) closeCasting();
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && details.open) {
        closeCasting();
      }
    });
  }
  await window.SerreProjects?.ready.catch(() => {});
  initEpisodeCatalog().catch((error) => episodeStudio.notify(error.message, true));
});
window.addEventListener("studio:project-changed", () => {
  loadedEpisode = null;
  closeCasting({ restoreFocus: false });
  initEpisodeCatalog().catch((error) => episodeStudio.notify(error.message, true));
});
