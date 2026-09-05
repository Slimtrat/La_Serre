from __future__ import annotations

import importlib
import logging
from collections.abc import Callable
from pathlib import Path
from types import ModuleType
from typing import Any, cast
from urllib.parse import urljoin, urlsplit

from apps.desktop.lifecycle import DesktopPreferenceStore, NativeWindowLifecycle, WindowHandle
from apps.desktop.runtime import APP_NAME, APP_VERSION, EmbeddedStudioServer
from apps.desktop.tray import Tray, create_system_tray


class DesktopDependencyError(RuntimeError):
    pass


class DesktopBridge:
    """Small, explicit API exposed to the UI for detachable native panels."""

    def __init__(
        self,
        base_url: str,
        runtime_root: Path,
        lifecycle: NativeWindowLifecycle,
    ) -> None:
        self.base_url = base_url.rstrip("/") + "/"
        self.runtime_root = runtime_root
        self.lifecycle = lifecycle

    def app_info(self) -> dict[str, object]:
        return {
            "name": APP_NAME,
            "version": APP_VERSION,
            "native": True,
            "dataDirectory": str(self.runtime_root),
            "detachablePanels": True,
            "backgroundAvailable": self.lifecycle.background_available,
        }

    def desktop_preferences(self) -> dict[str, object]:
        return self.lifecycle.app_preferences()

    def configure_desktop(
        self,
        close_behavior: str | None = None,
        notifications_enabled: bool | None = None,
    ) -> dict[str, object]:
        return self.lifecycle.configure(
            close_behavior=close_behavior,
            notifications_enabled=notifications_enabled,
        )

    def resolve_close_request(
        self,
        action: str,
        remember: bool = False,
    ) -> dict[str, object]:
        return self.lifecycle.resolve_close_request(action, remember)

    def open_panel(
        self,
        path: str,
        title: str = APP_NAME,
        width: int = 960,
        height: int = 720,
    ) -> dict[str, object]:
        parsed = urlsplit(path)
        if parsed.scheme or parsed.netloc or not path.startswith("/") or path.startswith("//"):
            raise ValueError("A panel path must be an absolute local application path")
        safe_title = title.strip()[:100] or APP_NAME
        safe_width = min(max(int(width), 640), 3840)
        safe_height = min(max(int(height), 480), 2160)
        webview = load_webview()
        create_window = cast(Callable[..., object], webview.create_window)
        create_window(
            safe_title,
            urljoin(self.base_url, path.removeprefix("/")),
            width=safe_width,
            height=safe_height,
            min_size=(480, 360),
            text_select=True,
        )
        return {"opened": True, "title": safe_title, "path": path}


def launch_native_window(
    server: EmbeddedStudioServer,
    runtime_root: Path,
    *,
    width: int = 1440,
    height: int = 900,
    maximized: bool = True,
    debug: bool = False,
) -> None:
    endpoint = server.start()
    webview = load_webview()
    create_window = cast(Callable[..., object], webview.create_window)
    start = cast(Callable[..., object], webview.start)
    preferences = DesktopPreferenceStore(runtime_root)
    lifecycle = NativeWindowLifecycle(preferences)
    bridge = DesktopBridge(endpoint.url, runtime_root, lifecycle)
    storage_path = runtime_root / "webview"
    storage_path.mkdir(parents=True, exist_ok=True)
    tray: Tray | None = None

    logging.getLogger(__name__).info("Opening native Studio window")
    try:
        window = cast(
            Any,
            create_window(
                APP_NAME,
                endpoint.url,
                js_api=bridge,
                width=width,
                height=height,
                min_size=(1024, 700),
                maximized=maximized,
                confirm_close=False,
                text_select=True,
                background_color="#090713",
            ),
        )
        lifecycle.attach_window(cast(WindowHandle, window))
        window.events.closing += lifecycle.on_window_closing
        tray = create_system_tray(lifecycle, preferences, endpoint.url)
        lifecycle.attach_tray(tray)
        tray.start()
        start(
            debug=debug,
            private_mode=False,
            storage_path=str(storage_path),
        )
    finally:
        if tray is not None:
            tray.stop()
        server.stop()


def load_webview() -> ModuleType:
    try:
        return importlib.import_module("webview")
    except ModuleNotFoundError as exc:
        raise DesktopDependencyError(
            'The native shell requires pywebview. Install it with: pip install -e ".[desktop]"'
        ) from exc
