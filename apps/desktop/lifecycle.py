"""Desktop lifecycle primitives shared by the native window and system tray.

The lifecycle deliberately lives outside pywebview and pystray. The domain
rules can therefore be tested without a GUI, and frozen PyInstaller builds do
not need to import optional native dependencies until the desktop starts.
"""

from __future__ import annotations

import json
import logging
import threading
from dataclasses import asdict, dataclass
from enum import StrEnum
from pathlib import Path
from typing import Protocol

LOGGER = logging.getLogger(__name__)
PREFERENCES_FILENAME = "desktop-lifecycle.json"


class CloseBehavior(StrEnum):
    ASK = "ask"
    BACKGROUND = "background"
    QUIT = "quit"


@dataclass(frozen=True, slots=True)
class DesktopPreferences:
    close_behavior: CloseBehavior = CloseBehavior.ASK
    notifications_enabled: bool = True

    def public(self, *, background_available: bool) -> dict[str, object]:
        return {
            "closeBehavior": self.close_behavior.value,
            "notificationsEnabled": self.notifications_enabled,
            "backgroundAvailable": background_available,
        }


class DesktopPreferenceStore:
    """Persist desktop-only preferences without coupling them to a project."""

    def __init__(self, runtime_root: Path) -> None:
        self.path = runtime_root.resolve() / ".studio" / PREFERENCES_FILENAME
        self._lock = threading.RLock()

    def load(self) -> DesktopPreferences:
        with self._lock:
            try:
                raw = json.loads(self.path.read_text(encoding="utf-8"))
            except FileNotFoundError:
                return DesktopPreferences()
            except (OSError, ValueError):
                LOGGER.warning("Ignoring invalid desktop lifecycle preferences", exc_info=True)
                return DesktopPreferences()
            if not isinstance(raw, dict):
                return DesktopPreferences()
            try:
                behavior = CloseBehavior(str(raw.get("close_behavior", CloseBehavior.ASK)))
            except ValueError:
                behavior = CloseBehavior.ASK
            enabled = raw.get("notifications_enabled", True)
            return DesktopPreferences(
                close_behavior=behavior,
                notifications_enabled=enabled if isinstance(enabled, bool) else True,
            )

    def save(self, preferences: DesktopPreferences) -> DesktopPreferences:
        payload = {"schema_version": 1, **asdict(preferences)}
        payload["close_behavior"] = preferences.close_behavior.value
        serialized = json.dumps(payload, ensure_ascii=False, indent=2) + "\n"
        with self._lock:
            self.path.parent.mkdir(parents=True, exist_ok=True)
            temporary = self.path.with_suffix(".tmp")
            temporary.write_text(serialized, encoding="utf-8")
            temporary.replace(self.path)
        return preferences

    def update(
        self,
        *,
        close_behavior: CloseBehavior | str | None = None,
        notifications_enabled: bool | None = None,
    ) -> DesktopPreferences:
        current = self.load()
        updated = DesktopPreferences(
            close_behavior=(
                CloseBehavior(close_behavior)
                if close_behavior is not None
                else current.close_behavior
            ),
            notifications_enabled=(
                notifications_enabled
                if notifications_enabled is not None
                else current.notifications_enabled
            ),
        )
        return self.save(updated)


class WindowHandle(Protocol):
    def hide(self) -> None: ...

    def show(self) -> None: ...

    def restore(self) -> None: ...

    def destroy(self) -> None: ...

    def evaluate_js(self, script: str) -> object: ...


class TrayHandle(Protocol):
    @property
    def available(self) -> bool: ...

    def notify(self, title: str, message: str) -> None: ...


class NativeWindowLifecycle:
    """Separate hiding the main window from shutting down the application."""

    def __init__(self, preferences: DesktopPreferenceStore) -> None:
        self.preferences = preferences
        self._window: WindowHandle | None = None
        self._tray: TrayHandle | None = None
        self._shutting_down = False
        self._lock = threading.RLock()

    @property
    def background_available(self) -> bool:
        tray = self._tray
        return bool(tray and tray.available)

    @property
    def shutting_down(self) -> bool:
        with self._lock:
            return self._shutting_down

    def attach_window(self, window: WindowHandle) -> None:
        self._window = window

    def attach_tray(self, tray: TrayHandle) -> None:
        self._tray = tray

    def app_preferences(self) -> dict[str, object]:
        return self.preferences.load().public(
            background_available=self.background_available,
        )

    def configure(
        self,
        *,
        close_behavior: str | None = None,
        notifications_enabled: bool | None = None,
    ) -> dict[str, object]:
        if close_behavior == CloseBehavior.BACKGROUND and not self.background_available:
            raise ValueError("La zone de notification n’est pas disponible sur ce système")
        saved = self.preferences.update(
            close_behavior=close_behavior,
            notifications_enabled=notifications_enabled,
        )
        return saved.public(background_available=self.background_available)

    def on_window_closing(self) -> bool:
        """Return False to cancel pywebview's close and keep the process alive."""
        if self.shutting_down:
            return True
        behavior = self.preferences.load().close_behavior
        if behavior is CloseBehavior.QUIT:
            with self._lock:
                self._shutting_down = True
            return True
        if behavior is CloseBehavior.BACKGROUND and self.hide_to_background():
            return False
        return self._request_close_choice()

    def resolve_close_request(self, action: str, remember: bool = False) -> dict[str, object]:
        try:
            choice = CloseBehavior(action)
        except ValueError as exc:
            raise ValueError("Choix de fermeture inconnu") from exc
        if choice is CloseBehavior.ASK:
            return {"accepted": False, **self.app_preferences()}
        if remember:
            self.configure(close_behavior=choice.value)
        if choice is CloseBehavior.BACKGROUND:
            accepted = self.hide_to_background()
        else:
            self.request_shutdown()
            accepted = True
        return {"accepted": accepted, "action": choice.value, **self.app_preferences()}

    def hide_to_background(self) -> bool:
        window = self._window
        if window is None or not self.background_available:
            return False
        try:
            window.hide()
            tray = self._tray
            if tray is not None:
                tray.notify(
                    "La Serre reste active",
                    "Les générations et moteurs gérés continuent en arrière-plan.",
                )
            LOGGER.info("Main Studio window hidden to the notification area")
            return True
        except Exception:
            LOGGER.exception("Could not hide the Studio window")
            return False

    def show(self, view: str | None = None) -> None:
        window = self._window
        if window is None:
            return
        try:
            window.show()
            window.restore()
            if view:
                scripts = {
                    "jobs": "window.SerreProductionQueue?.open?.();",
                    "journal": "document.querySelector('#notification-toggle')?.click();",
                    "runtimes": "window.SerreWorkspace?.show?.('settings');",
                }
                script = scripts.get(view)
                if script:
                    window.evaluate_js(script)
        except Exception:
            LOGGER.exception("Could not restore the Studio window")

    def request_shutdown(self) -> None:
        with self._lock:
            if self._shutting_down:
                return
            self._shutting_down = True
        LOGGER.info("Complete desktop shutdown requested")
        window = self._window
        if window is not None:
            try:
                window.destroy()
            except Exception:
                LOGGER.exception("Could not destroy the Studio window")

    def _request_close_choice(self) -> bool:
        window = self._window
        if window is None:
            return True
        try:
            window.evaluate_js(
                "window.dispatchEvent(new CustomEvent('serre:native-close-request'));"
            )
            return False
        except Exception:
            LOGGER.exception("Could not display the close choice")
            if self.hide_to_background():
                return False
            with self._lock:
                self._shutting_down = True
            return True
