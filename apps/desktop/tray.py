"""Windows notification-area integration for the desktop Studio."""

from __future__ import annotations

import importlib
import json
import logging
import sys
import threading
import urllib.error
import urllib.parse
import urllib.request
from collections.abc import Callable, Mapping
from dataclasses import dataclass
from enum import StrEnum
from pathlib import Path
from typing import Any, Protocol, cast

from apps.desktop.lifecycle import DesktopPreferenceStore, NativeWindowLifecycle

LOGGER = logging.getLogger(__name__)
POLL_INTERVAL_SECONDS = 2.0


class StudioIndicator(StrEnum):
    IDLE = "idle"
    READY = "ready"
    WORKING = "working"
    DEGRADED = "degraded"
    ERROR = "error"


INDICATOR_LABELS = {
    StudioIndicator.IDLE: "Inactif",
    StudioIndicator.READY: "Prêt",
    StudioIndicator.WORKING: "Production active",
    StudioIndicator.DEGRADED: "Partiellement prêt",
    StudioIndicator.ERROR: "Erreur",
}
INDICATOR_COLORS = {
    StudioIndicator.IDLE: "#788179",
    StudioIndicator.READY: "#76d48c",
    StudioIndicator.WORKING: "#6ba7ff",
    StudioIndicator.DEGRADED: "#e8a456",
    StudioIndicator.ERROR: "#e56868",
}


@dataclass(frozen=True, slots=True)
class RuntimeSummary:
    name: str
    display_name: str
    state: str
    managed: bool
    can_start: bool
    can_stop: bool

    @classmethod
    def from_payload(cls, payload: Mapping[str, object]) -> RuntimeSummary:
        actions = payload.get("actions")
        action_map = actions if isinstance(actions, Mapping) else {}
        return cls(
            name=str(payload.get("name", "runtime")),
            display_name=str(payload.get("display_name", payload.get("name", "Runtime"))),
            state=str(payload.get("state", "unavailable")),
            managed=bool(payload.get("managed", False)),
            can_start=bool(action_map.get("start", False)),
            can_stop=bool(action_map.get("stop", False)),
        )


@dataclass(frozen=True, slots=True)
class StudioStatus:
    indicator: StudioIndicator
    jobs_active: int
    jobs_blocked: int
    runtimes: tuple[RuntimeSummary, ...]
    notifications: tuple[dict[str, object], ...] = ()

    @classmethod
    def from_payload(cls, payload: Mapping[str, object]) -> StudioStatus:
        try:
            indicator = StudioIndicator(str(payload.get("state", StudioIndicator.IDLE)))
        except ValueError:
            indicator = StudioIndicator.ERROR
        jobs = payload.get("jobs")
        job_map = jobs if isinstance(jobs, Mapping) else {}
        raw_runtimes = payload.get("runtimes")
        runtimes = tuple(
            RuntimeSummary.from_payload(item)
            for item in (raw_runtimes if isinstance(raw_runtimes, list) else [])
            if isinstance(item, Mapping)
        )
        raw_notifications = payload.get("notifications")
        notifications = tuple(
            dict(item)
            for item in (raw_notifications if isinstance(raw_notifications, list) else [])
            if isinstance(item, Mapping)
        )
        return cls(
            indicator=indicator,
            jobs_active=_safe_int(job_map.get("active")),
            jobs_blocked=_safe_int(job_map.get("blocked")),
            runtimes=runtimes,
            notifications=notifications,
        )

    @classmethod
    def disconnected(cls) -> StudioStatus:
        return cls(StudioIndicator.ERROR, 0, 0, ())

    @property
    def label(self) -> str:
        return INDICATOR_LABELS[self.indicator]

    @property
    def tooltip(self) -> str:
        runtime_text = " · ".join(
            f"{runtime.display_name}: {_runtime_label(runtime.state)}"
            for runtime in self.runtimes
        ) or "Moteurs: indisponibles"
        tooltip = (
            f"La Serre · {self.label}\n{runtime_text}\n"
            f"Jobs: {self.jobs_active} actif(s)"
        )
        if self.jobs_blocked:
            tooltip += f" · {self.jobs_blocked} bloqué(s)"
        return tooltip[:127]


class DesktopApiClient:
    """Small loopback-only client used by the tray thread."""

    def __init__(self, base_url: str, *, timeout_seconds: float = 1.5) -> None:
        parsed = urllib.parse.urlsplit(base_url)
        if parsed.scheme != "http" or parsed.hostname not in {"127.0.0.1", "::1", "localhost"}:
            raise ValueError("The desktop tray can only monitor a loopback Studio endpoint")
        self.base_url = base_url.rstrip("/")
        self.timeout_seconds = timeout_seconds

    def status(self) -> StudioStatus:
        return StudioStatus.from_payload(self._request("GET", "/api/desktop/status"))

    def runtime_action(self, name: str, action: str) -> None:
        safe_name = urllib.parse.quote(name, safe="")
        self._request("POST", f"/api/runtime/services/{safe_name}/{action}")

    def _request(self, method: str, path: str) -> dict[str, object]:
        request = urllib.request.Request(self.base_url + path, method=method)
        try:
            with urllib.request.urlopen(  # noqa: S310 - constructed loopback endpoint.
                request,
                timeout=self.timeout_seconds,
            ) as response:
                payload = json.load(response)
        except (OSError, ValueError, urllib.error.URLError) as exc:
            raise RuntimeError(f"Studio endpoint unavailable: {path}") from exc
        if not isinstance(payload, dict):
            raise RuntimeError(f"Unexpected Studio response: {path}")
        return cast(dict[str, object], payload)


StatusCallback = Callable[[StudioStatus], None]
NotificationCallback = Callable[[str, str], None]


class StudioStatusMonitor:
    def __init__(
        self,
        client: DesktopApiClient,
        on_status: StatusCallback,
        on_notification: NotificationCallback,
        *,
        interval_seconds: float = POLL_INTERVAL_SECONDS,
    ) -> None:
        self.client = client
        self.on_status = on_status
        self.on_notification = on_notification
        self.interval_seconds = interval_seconds
        self._stop = threading.Event()
        self._thread: threading.Thread | None = None
        self._known_notification_ids: set[str] | None = None

    def start(self) -> None:
        if self._thread and self._thread.is_alive():
            return
        self._stop.clear()
        self._thread = threading.Thread(
            target=self._run,
            name="serre-tray-status",
            daemon=True,
        )
        self._thread.start()

    def stop(self, timeout_seconds: float = 3.0) -> None:
        self._stop.set()
        thread = self._thread
        if thread is not None:
            thread.join(timeout=max(0.0, timeout_seconds))
        self._thread = None

    def poll_once(self) -> StudioStatus:
        status = self.client.status()
        self.on_status(status)
        self._publish_new_notifications(status.notifications)
        return status

    def _run(self) -> None:
        while not self._stop.is_set():
            try:
                self.poll_once()
            except Exception:
                LOGGER.warning("Could not refresh the system tray status", exc_info=True)
                self.on_status(StudioStatus.disconnected())
            self._stop.wait(self.interval_seconds)

    def _publish_new_notifications(
        self,
        notifications: tuple[dict[str, object], ...],
    ) -> None:
        current = {str(item.get("id")) for item in notifications if item.get("id")}
        if self._known_notification_ids is None:
            self._known_notification_ids = current
            return
        new_items = [
            item
            for item in reversed(notifications)
            if item.get("id") and str(item["id"]) not in self._known_notification_ids
        ]
        self._known_notification_ids.update(current)
        if len(self._known_notification_ids) > 1000:
            self._known_notification_ids = current
        for item in new_items:
            if item.get("level") not in {"success", "error"}:
                continue
            self.on_notification(str(item.get("title", "La Serre")), str(item.get("message", "")))


class Tray(Protocol):
    @property
    def available(self) -> bool: ...

    def start(self) -> None: ...

    def stop(self) -> None: ...

    def notify(self, title: str, message: str) -> None: ...


class NullSystemTray:
    """Explicit fallback: the app remains usable and closes normally."""

    available = False

    def start(self) -> None:
        LOGGER.warning(
            "System tray unavailable; background close mode is disabled. "
            "Install the desktop extra to enable pystray and Pillow."
        )

    def stop(self) -> None:
        return

    def notify(self, title: str, message: str) -> None:
        del title, message


class SystemTray:
    """pystray adapter with a dynamic status icon and safe runtime controls."""

    def __init__(
        self,
        lifecycle: NativeWindowLifecycle,
        preferences: DesktopPreferenceStore,
        client: DesktopApiClient,
        pystray: Any,
        image_module: Any,
        draw_module: Any,
    ) -> None:
        self.lifecycle = lifecycle
        self.preferences = preferences
        self.client = client
        self._pystray = pystray
        self._image_module = image_module
        self._draw_module = draw_module
        self._status = StudioStatus(StudioIndicator.IDLE, 0, 0, ())
        self._status_lock = threading.RLock()
        self._started = False
        menu = self._build_menu()
        self._icon = pystray.Icon(
            "serre-studio",
            self._render_icon(self._status.indicator),
            self._status.tooltip,
            menu,
        )
        self._monitor = StudioStatusMonitor(client, self._set_status, self.notify)

    @property
    def available(self) -> bool:
        return self._started

    def start(self) -> None:
        if self._started:
            return
        try:
            self._icon.run_detached()
        except Exception:
            LOGGER.exception("Could not start the Windows system tray icon")
            return
        self._started = True
        self._monitor.start()
        LOGGER.info("Windows notification-area icon started")

    def stop(self) -> None:
        self._monitor.stop()
        if self._started:
            try:
                self._icon.stop()
            except Exception:
                LOGGER.exception("Could not stop the system tray icon")
        self._started = False

    def notify(self, title: str, message: str) -> None:
        if not self._started or not self.preferences.load().notifications_enabled:
            return
        try:
            self._icon.notify(message[:240], title[:64])
        except Exception:
            LOGGER.warning("Could not display a Windows notification", exc_info=True)

    def _build_menu(self) -> Any:
        item = self._pystray.MenuItem
        menu = self._pystray.Menu
        return menu(
            item("Ouvrir La Serre", self._open, default=True),
            menu.SEPARATOR,
            item(lambda _item: f"Studio : {self._current().label}", None, enabled=False),
            item(lambda _item: self._runtime_menu_text(), None, enabled=False),
            menu.SEPARATOR,
            item("Démarrer les moteurs", self._start_runtimes, enabled=self._can_start),
            item("Arrêter les moteurs gérés", self._stop_runtimes, enabled=self._can_stop),
            menu.SEPARATOR,
            item("Voir les jobs", self._show_jobs),
            item("Voir le journal", self._show_journal),
            item("Réglages des moteurs", self._show_runtimes),
            item(
                "Notifications Windows",
                self._toggle_notifications,
                checked=lambda _item: self.preferences.load().notifications_enabled,
            ),
            menu.SEPARATOR,
            item("Quitter complètement", self._quit),
        )

    def _set_status(self, status: StudioStatus) -> None:
        with self._status_lock:
            self._status = status
        if not self._started:
            return
        self._icon.title = status.tooltip
        self._icon.icon = self._render_icon(status.indicator)
        try:
            self._icon.update_menu()
        except Exception:
            LOGGER.debug("Could not refresh the tray menu", exc_info=True)

    def _current(self) -> StudioStatus:
        with self._status_lock:
            return self._status

    def _runtime_menu_text(self) -> str:
        status = self._current()
        if not status.runtimes:
            return "Moteurs : indisponibles"
        return " · ".join(
            f"{runtime.display_name} {_runtime_label(runtime.state)}"
            for runtime in status.runtimes
        )

    def _can_start(self, _item: object) -> bool:
        return any(runtime.can_start for runtime in self._current().runtimes)

    def _can_stop(self, _item: object) -> bool:
        return any(
            runtime.managed and runtime.can_stop for runtime in self._current().runtimes
        )

    def _run_runtime_actions(self, action: str) -> None:
        runtimes = self._current().runtimes
        for runtime in runtimes:
            allowed = (
                runtime.can_start
                if action == "start"
                else runtime.managed and runtime.can_stop
            )
            if not allowed:
                continue
            try:
                self.client.runtime_action(runtime.name, action)
            except RuntimeError:
                LOGGER.warning("Runtime tray action failed for %s", runtime.name, exc_info=True)

    def _async_action(self, action: str) -> None:
        threading.Thread(
            target=self._run_runtime_actions,
            args=(action,),
            name=f"serre-tray-{action}",
            daemon=True,
        ).start()

    def _open(self, _icon: object, _item: object) -> None:
        self.lifecycle.show()

    def _start_runtimes(self, _icon: object, _item: object) -> None:
        self._async_action("start")

    def _stop_runtimes(self, _icon: object, _item: object) -> None:
        self._async_action("stop")

    def _show_jobs(self, _icon: object, _item: object) -> None:
        self.lifecycle.show("jobs")

    def _show_journal(self, _icon: object, _item: object) -> None:
        self.lifecycle.show("journal")

    def _show_runtimes(self, _icon: object, _item: object) -> None:
        self.lifecycle.show("runtimes")

    def _toggle_notifications(self, _icon: object, _item: object) -> None:
        enabled = not self.preferences.load().notifications_enabled
        self.preferences.update(notifications_enabled=enabled)
        self._icon.update_menu()

    def _quit(self, _icon: object, _item: object) -> None:
        self.lifecycle.request_shutdown()

    def _render_icon(self, indicator: StudioIndicator) -> Any:
        bundle_root = Path(str(getattr(sys, "_MEIPASS", Path(__file__).parents[2])))
        icon_path = bundle_root / "assets" / "branding" / "la-serre-icon-tray.png"
        try:
            with self._image_module.open(icon_path) as source:
                image = source.convert("RGBA").resize(
                    (64, 64),
                    self._image_module.Resampling.LANCZOS,
                )
        except (AttributeError, OSError, ValueError):
            LOGGER.warning("Could not load the La Serre tray icon", exc_info=True)
            image = self._image_module.new("RGBA", (64, 64), "#090d0b")
            drawing = self._draw_module.Draw(image)
            drawing.rounded_rectangle(
                (4, 4, 59, 59),
                radius=14,
                outline="#8fcf9d",
                width=5,
            )
            drawing.rounded_rectangle(
                (17, 15, 47, 49),
                radius=9,
                outline="#a387c4",
                width=4,
            )
        drawing = self._draw_module.Draw(image)
        drawing.ellipse(
            (43, 43, 60, 60),
            fill=INDICATOR_COLORS[indicator],
            outline="#08100a",
            width=3,
        )
        return image


def create_system_tray(
    lifecycle: NativeWindowLifecycle,
    preferences: DesktopPreferenceStore,
    base_url: str,
) -> Tray:
    try:
        pystray = importlib.import_module("pystray")
        image_module = importlib.import_module("PIL.Image")
        draw_module = importlib.import_module("PIL.ImageDraw")
        return SystemTray(
            lifecycle,
            preferences,
            DesktopApiClient(base_url),
            pystray,
            image_module,
            draw_module,
        )
    except (ImportError, OSError, RuntimeError):
        LOGGER.warning("Native tray dependencies are unavailable", exc_info=True)
        return NullSystemTray()


def _runtime_label(state: str) -> str:
    return {
        "ready": "prêt",
        "starting": "démarre",
        "restarting": "redémarre",
        "stopped": "arrêté",
        "missing": "absent",
        "failed": "erreur",
        "unavailable": "indisponible",
        "checking": "vérification",
    }.get(state, state)


def _safe_int(value: object) -> int:
    try:
        return max(0, int(str(value)))
    except (TypeError, ValueError):
        return 0
