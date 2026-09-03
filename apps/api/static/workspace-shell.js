const workspaceShell = (() => {
  const buttons = Array.from(document.querySelectorAll("[data-workspace-target]"));
  const allowed = new Set(buttons.map((button) => button.dataset.workspaceTarget));

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
  let initial = "graph";
  try { initial = localStorage.getItem("serre-studio-workspace-view") || initial; } catch (_error) { /* no-op */ }
  window.SerreWorkspace = { show };
  show(allowed.has(initial) ? initial : "graph");
  return { show };
})();
