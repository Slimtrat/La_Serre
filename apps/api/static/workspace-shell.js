const workspaceShell = (() => {
  const buttons = Array.from(document.querySelectorAll("[data-workspace-target]"));
  const allowed = new Set(buttons.map((button) => button.dataset.workspaceTarget));
  const contextShot = document.querySelector("#context-shot");
  const contextShotLabel = document.querySelector("#context-shot-label");

  function show(view) {
    if (!allowed.has(view)) return;
    document.body.dataset.workspaceView = view;
    buttons.forEach((button) => {
      const selected = button.dataset.workspaceTarget === view;
      button.classList.toggle("selected", selected);
      button.setAttribute("aria-pressed", String(selected));
    });
    try { localStorage.setItem("serre-studio-workspace-view", view); } catch (_error) { /* no-op */ }
    window.setTimeout(() => window.dispatchEvent(new Event("resize")), 20);
  }

  buttons.forEach((button) => button.addEventListener("click", () => show(button.dataset.workspaceTarget)));
  document.querySelector('[data-context-action="bible"]')?.addEventListener("click", () => show("bible"));
  document.querySelector("#series-cast-open")?.addEventListener("click", () => {
    show("bible");
    window.SerreBible?.selectCategory?.("characters");
  });
  contextShot?.addEventListener("click", () => show("graph"));
  document.querySelector('[data-tool-action="assets"]')?.addEventListener("click", () => window.SerreAssetDrawer?.open());
  document.querySelector(".service-status")?.addEventListener("click", () => show("settings"));
  window.addEventListener("studio:shot-selected", (event) => {
    const shot = event.detail?.shot;
    const index = event.detail?.index;
    if (!contextShotLabel || !shot) return;
    contextShotLabel.textContent = index ? String(index).padStart(2, "0") : shot.id;
    contextShot.title = (window.SerreI18n?.t("shell.shot") || "Plan") + " · " + (shot.title || shot.id);
  });
  window.addEventListener("studio:episode-cleared", () => {
    if (contextShotLabel) contextShotLabel.textContent = "—";
  });
  let initial = "guided";
  try {
    const requested = new URLSearchParams(window.location.search).get("view");
    initial = allowed.has(requested) ? requested : localStorage.getItem("serre-studio-workspace-view") || initial;
  } catch (_error) { /* no-op */ }
  window.SerreWorkspace = { show };
  show(allowed.has(initial) ? initial : "guided");
  return { show };
})();
