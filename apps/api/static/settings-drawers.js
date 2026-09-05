(() => {
  const STORAGE_KEY = "serre-studio-settings-drawer-v1";
  const drawers = Array.from(document.querySelectorAll("#settings-panel .settings-drawer"));
  if (!drawers.length) return;

  function openDrawer(id, options = {}) {
    const target = document.getElementById(id);
    if (!target?.classList.contains("settings-drawer")) return false;
    drawers.forEach((drawer) => { drawer.open = drawer === target; });
    try { localStorage.setItem(STORAGE_KEY, id); } catch (_error) { /* private mode */ }
    if (options.attention) {
      target.classList.add("is-attention");
      window.setTimeout(() => target.classList.remove("is-attention"), 2200);
    }
    if (options.scroll !== false) target.scrollIntoView({ behavior: "smooth", block: "start" });
    return true;
  }

  drawers.forEach((drawer) => drawer.addEventListener("toggle", () => {
    if (!drawer.open) return;
    drawers.forEach((candidate) => { if (candidate !== drawer) candidate.open = false; });
    try { localStorage.setItem(STORAGE_KEY, drawer.id); } catch (_error) { /* private mode */ }
  }));

  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && document.getElementById(saved)) openDrawer(saved, { scroll: false });
  } catch (_error) { /* private mode */ }

  window.SerreSettings = Object.freeze({ openDrawer });
})();
