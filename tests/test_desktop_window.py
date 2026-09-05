from __future__ import annotations

from pathlib import Path
from types import SimpleNamespace
from typing import Any

import pytest

from apps.desktop import window as desktop_window
from apps.desktop.runtime import ServerEndpoint


class FakeEvent:
    def __init__(self) -> None:
        self.handlers: list[object] = []

    def __iadd__(self, handler: object) -> FakeEvent:
        self.handlers.append(handler)
        return self


class FakeWindow:
    def __init__(self) -> None:
        self.events = SimpleNamespace(closing=FakeEvent())

    def hide(self) -> None: ...

    def show(self) -> None: ...

    def restore(self) -> None: ...

    def destroy(self) -> None: ...

    def evaluate_js(self, script: str) -> object:
        return script


class FakeServer:
    def __init__(self) -> None:
        self.started = False
        self.stopped = False

    def start(self) -> ServerEndpoint:
        self.started = True
        return ServerEndpoint("127.0.0.1", 43210)

    def stop(self) -> None:
        self.stopped = True


class FakeTray:
    available = True

    def __init__(self) -> None:
        self.started = False
        self.stopped = False

    def start(self) -> None:
        self.started = True

    def stop(self) -> None:
        self.stopped = True

    def notify(self, title: str, message: str) -> None:
        del title, message


def test_native_window_wires_and_cleans_up_the_tray(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    native_window = FakeWindow()
    tray = FakeTray()
    created: dict[str, Any] = {}

    def create_window(*args: object, **kwargs: object) -> FakeWindow:
        created["args"] = args
        created["kwargs"] = kwargs
        return native_window

    fake_webview = SimpleNamespace(create_window=create_window, start=lambda **_kwargs: None)
    monkeypatch.setattr(desktop_window, "load_webview", lambda: fake_webview)
    monkeypatch.setattr(desktop_window, "create_system_tray", lambda *_args: tray)
    server = FakeServer()

    desktop_window.launch_native_window(server, tmp_path)  # type: ignore[arg-type]

    assert server.started is True
    assert server.stopped is True
    assert tray.started is True
    assert tray.stopped is True
    assert len(native_window.events.closing.handlers) == 1
    bridge = created["kwargs"]["js_api"]
    assert bridge.app_info()["backgroundAvailable"] is True
