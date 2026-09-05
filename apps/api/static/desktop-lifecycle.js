(() => {
  let preferences = null;
  let api = null;

  window.SerreI18n?.register?.("fr", { desktop: {
    lifecycle: "APPLICATION WINDOWS", title: "Fenêtre et arrière-plan",
    closeAction: "À la fermeture", ask: "Demander à chaque fois", background: "Continuer en arrière-plan", quit: "Quitter complètement",
    notifications: "Notifications Windows pour les générations terminées ou en erreur",
    help: "En arrière-plan, les jobs et les moteurs lancés par La Serre continuent. Quitter arrête uniquement les moteurs gérés par le Studio.",
    unavailable: "La zone de notification est indisponible : la fermeture complète reste active.",
    dialogTitle: "Que faire à la fermeture ?", dialogCopy: "Tu peux cacher la fenêtre sans interrompre la production locale.",
    backgroundTitle: "Réduire La Serre en arrière-plan", backgroundHelp: "Jobs et moteurs gérés continuent près de l’horloge Windows.",
    quitTitle: "Quitter complètement", quitHelp: "Le Studio et ses moteurs gérés sont arrêtés proprement. Les moteurs externes ne sont jamais touchés.",
    remember: "Mémoriser mon choix", cancel: "Annuler", continue: "Continuer",
  }});
  window.SerreI18n?.register?.("en", { desktop: {
    lifecycle: "WINDOWS APPLICATION", title: "Window and background mode",
    closeAction: "When closing", ask: "Ask every time", background: "Keep running in background", quit: "Quit completely",
    notifications: "Windows notifications for completed or failed generations",
    help: "In background mode, jobs and engines started by La Serre keep running. Quit stops only Studio-managed engines.",
    unavailable: "The notification area is unavailable: closing the application remains enabled.",
    dialogTitle: "What should happen when closing?", dialogCopy: "You can hide the window without interrupting local production.",
    backgroundTitle: "Keep La Serre running in background", backgroundHelp: "Jobs and managed engines continue next to the Windows clock.",
    quitTitle: "Quit completely", quitHelp: "The Studio and managed engines stop cleanly. External engines are never touched.",
    remember: "Remember my choice", cancel: "Cancel", continue: "Continue",
  }});

  function t(key) { return window.SerreI18n?.t?.("desktop." + key) || key; }

  const settings = document.createElement("section");
  settings.className = "desktop-lifecycle-settings";
  settings.hidden = true;
  settings.innerHTML = `
    <header><p class="eyebrow" data-i18n="desktop.lifecycle">APPLICATION WINDOWS</p><h3 data-i18n="desktop.title">Fenêtre et arrière-plan</h3></header>
    <div class="desktop-lifecycle-fields">
      <label><span data-i18n="desktop.closeAction">À la fermeture</span><select id="desktop-close-behavior">
        <option value="ask" data-i18n="desktop.ask">Demander à chaque fois</option>
        <option value="background" data-i18n="desktop.background">Continuer en arrière-plan</option>
        <option value="quit" data-i18n="desktop.quit">Quitter complètement</option>
      </select></label>
      <label class="desktop-lifecycle-toggle"><input id="desktop-notifications" type="checkbox" /><span data-i18n="desktop.notifications">Notifications Windows pour les générations terminées ou en erreur</span></label>
    </div>
    <p class="desktop-lifecycle-help" data-i18n="desktop.help">En arrière-plan, les jobs et les moteurs lancés par La Serre continuent. Quitter arrête uniquement les moteurs gérés par le Studio.</p>`;
  document.querySelector("#settings-panel .runtime-manager")?.after(settings);

  const backdrop = document.createElement("div");
  backdrop.className = "desktop-close-backdrop";
  backdrop.hidden = true;
  backdrop.innerHTML = `
    <form class="desktop-close-dialog" role="dialog" aria-modal="true" aria-labelledby="desktop-close-title">
      <p class="eyebrow" data-i18n="desktop.lifecycle">APPLICATION WINDOWS</p>
      <h2 id="desktop-close-title" data-i18n="desktop.dialogTitle">Que faire à la fermeture ?</h2>
      <p data-i18n="desktop.dialogCopy">Tu peux cacher la fenêtre sans interrompre la production locale.</p>
      <fieldset class="desktop-close-options">
        <label class="desktop-close-option" data-close-option="background"><input type="radio" name="close-action" value="background" checked /><span><strong data-i18n="desktop.backgroundTitle">Réduire La Serre en arrière-plan</strong><small data-i18n="desktop.backgroundHelp">Jobs et moteurs gérés continuent près de l’horloge Windows.</small></span></label>
        <label class="desktop-close-option"><input type="radio" name="close-action" value="quit" /><span><strong data-i18n="desktop.quitTitle">Quitter complètement</strong><small data-i18n="desktop.quitHelp">Le Studio et ses moteurs gérés sont arrêtés proprement. Les moteurs externes ne sont jamais touchés.</small></span></label>
      </fieldset>
      <label class="desktop-close-remember"><input name="remember" type="checkbox" /><span data-i18n="desktop.remember">Mémoriser mon choix</span></label>
      <div class="desktop-close-actions"><button class="button ghost" name="cancel" type="button" data-i18n="desktop.cancel">Annuler</button><button class="button primary" type="submit" data-i18n="desktop.continue">Continuer</button></div>
    </form>`;
  document.body.append(backdrop);

  const closeSelect = settings.querySelector("#desktop-close-behavior");
  const notificationToggle = settings.querySelector("#desktop-notifications");
  const backgroundOption = closeSelect.querySelector('option[value="background"]');
  const dialogBackground = backdrop.querySelector('[data-close-option="background"]');
  const dialogBackgroundInput = dialogBackground.querySelector("input");

  function render(next) {
    preferences = next;
    settings.hidden = false;
    closeSelect.value = !next.backgroundAvailable && next.closeBehavior === "background"
      ? "ask"
      : next.closeBehavior || "ask";
    notificationToggle.checked = next.notificationsEnabled !== false;
    backgroundOption.disabled = !next.backgroundAvailable;
    dialogBackgroundInput.disabled = !next.backgroundAvailable;
    dialogBackground.classList.toggle("is-unavailable", !next.backgroundAvailable);
    if (!next.backgroundAvailable) backdrop.querySelector('input[value="quit"]').checked = true;
    const help = settings.querySelector(".desktop-lifecycle-help");
    help.dataset.i18n = "desktop." + (next.backgroundAvailable ? "help" : "unavailable");
    help.textContent = t(next.backgroundAvailable ? "help" : "unavailable");
    window.SerreI18n?.translate?.(settings);
    window.SerreI18n?.translate?.(backdrop);
  }

  async function save() {
    if (!api) return;
    render(await api.configure_desktop(closeSelect.value, notificationToggle.checked));
  }

  closeSelect.addEventListener("change", () => save().catch((error) => window.SerreStudio?.notify?.(error.message, true)));
  notificationToggle.addEventListener("change", () => save().catch((error) => window.SerreStudio?.notify?.(error.message, true)));
  backdrop.querySelector('[name="cancel"]').addEventListener("click", () => { backdrop.hidden = true; });
  backdrop.addEventListener("click", (event) => { if (event.target === backdrop) backdrop.hidden = true; });
  backdrop.querySelector("form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    backdrop.hidden = true;
    await api?.resolve_close_request(String(data.get("close-action")), data.get("remember") === "on");
  });
  document.addEventListener("keydown", (event) => { if (event.key === "Escape" && !backdrop.hidden) backdrop.hidden = true; });

  async function connect() {
    api = window.pywebview?.api;
    if (!api?.desktop_preferences) return;
    render(await api.desktop_preferences());
  }
  window.addEventListener("pywebviewready", () => connect().catch(() => {}));
  window.addEventListener("serre:native-close-request", async () => {
    if (!api) await connect();
    if (!api) return;
    render(await api.desktop_preferences());
    backdrop.hidden = false;
    backdrop.querySelector("input:not(:disabled)")?.focus();
  });
  if (window.pywebview?.api) connect().catch(() => {});
})();
