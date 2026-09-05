(() => {
  const rail = document.querySelector(".studio-tools");
  if (!rail || document.querySelector("#studio-tools-menu")) return;

  window.SerreI18n?.register?.("fr", { shell: { moreTools: "Outils", moreToolsTitle: "Ouvrir les outils du Studio", closeTools: "Fermer les outils" } });
  window.SerreI18n?.register?.("en", { shell: { moreTools: "Tools", moreToolsTitle: "Open Studio tools", closeTools: "Close tools" } });

  const menu = document.createElement("div");
  menu.id = "studio-tools-menu";
  menu.className = "studio-tools-menu";
  menu.hidden = true;
  menu.setAttribute("role", "menu");
  menu.setAttribute("aria-label", "Outils du Studio");

  const toggle = document.createElement("button");
  toggle.id = "studio-tools-menu-toggle";
  toggle.className = "studio-tools-menu-toggle";
  toggle.type = "button";
  toggle.setAttribute("aria-expanded", "false");
  toggle.setAttribute("aria-controls", menu.id);
  toggle.setAttribute("data-i18n-title", "shell.moreToolsTitle");
  toggle.setAttribute("title", "Ouvrir les outils du Studio");
  toggle.innerHTML = '<span aria-hidden="true">•••</span><strong data-i18n="shell.moreTools">Outils</strong>';

  const menuHeading = document.createElement("header");
  const menuTitle = document.createElement("strong");
  menuTitle.setAttribute("data-i18n", "shell.moreTools");
  menuTitle.textContent = "Outils";
  const close = document.createElement("button");
  close.type = "button";
  close.setAttribute("data-i18n-aria-label", "shell.closeTools");
  close.setAttribute("aria-label", "Fermer les outils");
  close.textContent = "×";
  menuHeading.append(menuTitle, close);

  const actions = document.createElement("div");
  actions.className = "studio-tools-menu-actions";
  for (const selector of ["#project-explorer-toggle", "[data-tool-action=assets]", "#demo-production-open", "#getting-started-open", "#settings-toggle", ".language-switcher"]) {
    const control = rail.querySelector(selector) || document.querySelector(selector);
    if (!control) continue;
    control.classList.add("studio-tools-menu-item");
    if (control instanceof HTMLElement && control.matches("button")) control.setAttribute("role", "menuitem");
    actions.append(control);
  }
  menu.append(menuHeading, actions);
  rail.append(toggle, menu);

  function setOpen(open) {
    menu.hidden = !open;
    toggle.setAttribute("aria-expanded", String(open));
    rail.classList.toggle("tools-menu-open", open);
    if (open) menu.querySelector("button, select")?.focus();
  }
  toggle.addEventListener("click", () => setOpen(menu.hidden));
  close.addEventListener("click", () => { setOpen(false); toggle.focus(); });
  actions.addEventListener("click", (event) => {
    if (event.target.closest("button") && !event.target.closest("#language-select")) setOpen(false);
  });
  document.addEventListener("pointerdown", (event) => {
    if (!menu.hidden && !rail.contains(event.target)) setOpen(false);
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !menu.hidden) { setOpen(false); toggle.focus(); }
  });
  window.addEventListener("studio:workspace-changed", () => setOpen(false));
})();
