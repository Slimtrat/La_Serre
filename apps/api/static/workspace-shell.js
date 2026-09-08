const workspaceShell = (() => {
  const buttons = Array.from(document.querySelectorAll("[data-workspace-target]"));
  const allowed = new Set(buttons.map((button) => button.dataset.workspaceTarget));
  const contextShot = document.querySelector("#context-shot");
  const contextShotLabel = document.querySelector("#context-shot-label");
  const reactRoot = document.querySelector("#studio-react-root");
  const legacyDock = document.querySelector("[data-legacy-navigation-slot='view-dock']");
  const legacyTopbar = document.querySelector(".topbar");

  function setLegacySurfaceAvailable(surface, available) {
    if (!surface) return;
    surface.hidden = !available;
    surface.inert = !available;
    if (available) {
      surface.removeAttribute("aria-hidden");
      surface.style.removeProperty("display");
    } else {
      surface.setAttribute("aria-hidden", "true");
      surface.style.display = "none";
    }
  }

  function refreshShellOwnership() {
    const reactOwnsShell = reactRoot?.dataset.shellOwner === "react";
    document.body.dataset.shellOwner = reactOwnsShell ? "react" : "legacy";
    setLegacySurfaceAvailable(legacyDock, !reactOwnsShell);
    setLegacySurfaceAvailable(legacyTopbar, !reactOwnsShell);
    return reactOwnsShell;
  }

  function show(view) {
    if (!allowed.has(view)) return;
    const previous = document.body.dataset.workspaceView || null;
    document.body.dataset.workspaceView = view;
    buttons.forEach((button) => {
      const selected = button.dataset.workspaceTarget === view;
      button.classList.toggle("selected", selected);
      button.setAttribute("aria-pressed", String(selected));
    });
    try { localStorage.setItem("serre-studio-workspace-view", view); } catch (_error) { /* no-op */ }
    if (previous !== view) {
      window.dispatchEvent(new CustomEvent("studio:workspace-changed", { detail: { view } }));
    }
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
  const current = () => document.body.dataset.workspaceView || null;
  window.SerreWorkspace = { show, current, refreshShellOwnership };
  refreshShellOwnership();
  if (reactRoot) {
    new MutationObserver(refreshShellOwnership).observe(reactRoot, {
      attributes: true,
      attributeFilter: ["data-shell-owner"],
    });
  }
  window.addEventListener("studio:shell-owner-changed", refreshShellOwnership);
  show(allowed.has(initial) ? initial : "guided");
  return { show, current, refreshShellOwnership };
})();
