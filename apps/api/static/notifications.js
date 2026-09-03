const notificationCenter = (() => {
  const toggle = document.querySelector("#notification-toggle");
  const panel = document.querySelector("#notification-panel");
  const badge = document.querySelector("#notification-badge");
  const list = document.querySelector("#notification-list");
  const readAll = document.querySelector("#notification-read-all");
  if (!toggle || !panel || !badge || !list || !readAll) return null;

  let notifications = [];
  let lastError = { message: "", at: 0 };

  async function request(path, options = {}) {
    const response = await fetch(path, options);
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.detail || `Erreur HTTP ${response.status}`);
    return body;
  }

  function formatDate(value) {
    return new Intl.DateTimeFormat("fr-FR", {
      hour: "2-digit", minute: "2-digit", second: "2-digit",
    }).format(new Date(value));
  }

  function render(payload) {
    notifications = payload.notifications || [];
    const unread = Number(payload.unread || 0);
    const unreadErrors = Number(payload.unread_errors || 0);
    badge.textContent = String(unread);
    badge.classList.toggle("hidden", unread === 0);
    badge.classList.toggle("has-errors", unreadErrors > 0);
    list.replaceChildren();
    if (!notifications.length) {
      const empty = document.createElement("li");
      empty.className = "empty";
      empty.textContent = "Aucune notification pour ce projet.";
      list.append(empty);
      return;
    }
    for (const item of notifications) {
      const row = document.createElement("li");
      row.className = `level-${item.level}${item.read ? " read" : ""}`;
      const entry = document.createElement("div");
      entry.className = "notification-entry";
      const title = document.createElement("strong");
      title.textContent = item.title;
      const message = document.createElement("span");
      message.textContent = item.message;
      const meta = document.createElement("small");
      meta.textContent = `${formatDate(item.timestamp)} · ${item.source}`;
      entry.append(title, message, meta);
      row.append(entry);
      list.append(row);
    }
  }

  async function refresh() {
    const payload = await request("/api/notifications?limit=100");
    render(payload);
    return payload;
  }

  async function captureError(message) {
    const now = Date.now();
    if (lastError.message === message && now - lastError.at < 30000) return;
    lastError = { message, at: now };
    await request("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        level: "error",
        title: "Erreur du Studio",
        message,
        source: "interface",
      }),
    });
    await refresh();
  }

  toggle.addEventListener("click", () => {
    const open = panel.classList.toggle("hidden") === false;
    toggle.setAttribute("aria-expanded", String(open));
    if (open) refresh().catch(() => {});
  });
  readAll.addEventListener("click", async () => {
    const payload = await request("/api/notifications/read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: null }),
    });
    render(payload);
  });
  document.addEventListener("click", (event) => {
    if (panel.classList.contains("hidden")) return;
    if (panel.contains(event.target) || toggle.contains(event.target)) return;
    panel.classList.add("hidden");
    toggle.setAttribute("aria-expanded", "false");
  });
  window.addEventListener("studio:project-changed", () => {
    notifications = [];
    render({ notifications: [], unread: 0, unread_errors: 0 });
    refresh().catch(() => {});
  });
  window.setInterval(() => {
    if (!document.hidden) refresh().catch(() => {});
  }, 5000);
  refresh().catch(() => {});

  window.SerreNotifications = { captureError, refresh };
  return window.SerreNotifications;
})();
