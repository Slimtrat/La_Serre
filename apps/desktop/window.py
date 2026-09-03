from __future__ import annotations

import importlib
import logging
from collections.abc import Callable
from pathlib import Path
from types import ModuleType
from typing import cast
from urllib.parse import urljoin, urlsplit

from apps.desktop.runtime import APP_NAME, APP_VERSION, EmbeddedStudioServer


class DesktopDependencyError(RuntimeError):
    pass


class DesktopBridge:
    """Small, explicit API exposed to the UI for detachable native panels."""

    def __init__(self, base_url: str, runtime_root: Path) -> None:
        self.base_url = base_url.rstrip("/") + "/"
        self.runtime_root = runtime_root

    def app_info(self) -> dict[str, object]:
        return {
            "name": APP_NAME,
            "version": APP_VERSION,
            "native": True,
            "dataDirectory": str(self.runtime_root),
            "detachablePanels": True,
        }

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
    bridge = DesktopBridge(endpoint.url, runtime_root)
    storage_path = runtime_root / "webview"
    storage_path.mkdir(parents=True, exist_ok=True)

    logging.getLogger(__name__).info("Opening native Studio window")
    try:
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
        )
        start(
            debug=debug,
            private_mode=False,
            storage_path=str(storage_path),
        )
    finally:
        server.stop()


def load_webview() -> ModuleType:
    try:
        return importlib.import_module("webview")
    except ModuleNotFoundError as exc:
        raise DesktopDependencyError(
            'The native shell requires pywebview. Install it with: pip install -e ".[desktop]"'
        ) from exc
