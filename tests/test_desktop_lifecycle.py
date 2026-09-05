from __future__ import annotations

import json
from pathlib import Path

import pytest

from apps.desktop.lifecycle import (
    CloseBehavior,
    DesktopPreferenceStore,
    NativeWindowLifecycle,
)


class FakeWindow:
    def __init__(self) -> None:
        self.hidden = False
        self.shown = False
        self.restored = False
        self.destroyed = False
        self.scripts: list[str] = []

    def hide(self) -> None:
        self.hidden = True

    def show(self) -> None:
        self.shown = True

    def restore(self) -> None:
        self.restored = True

    def destroy(self) -> None:
        self.destroyed = True

    def evaluate_js(self, script: str) -> object:
        self.scripts.append(script)
        return None


class FakeTray:
    def __init__(self, available: bool = True) -> None:
        self._available = available
        self.notifications: list[tuple[str, str]] = []

    @property
    def available(self) -> bool:
        return self._available

    def notify(self, title: str, message: str) -> None:
        self.notifications.append((title, message))


def _lifecycle(tmp_path: Path, *, tray_available: bool = True) -> tuple[
    NativeWindowLifecycle, FakeWindow, FakeTray, DesktopPreferenceStore
]:
    store = DesktopPreferenceStore(tmp_path)
    lifecycle = NativeWindowLifecycle(store)
    window = FakeWindow()
    tray = FakeTray(tray_available)
    lifecycle.attach_window(window)
    lifecycle.attach_tray(tray)
    return lifecycle, window, tray, store


def test_preferences_are_global_versioned_and_resilient(tmp_path: Path) -> None:
    store = DesktopPreferenceStore(tmp_path)
    assert store.load().close_behavior is CloseBehavior.ASK

    saved = store.update(close_behavior="background", notifications_enabled=False)
    raw = json.loads(store.path.read_text(encoding="utf-8"))

    assert saved.close_behavior is CloseBehavior.BACKGROUND
    assert saved.notifications_enabled is False
    assert raw == {
        "schema_version": 1,
        "close_behavior": "background",
        "notifications_enabled": False,
    }

    store.path.write_text("not json", encoding="utf-8")
    assert store.load().close_behavior is CloseBehavior.ASK


def test_ask_close_is_cancelled_while_the_choice_is_displayed(tmp_path: Path) -> None:
    lifecycle, window, _tray, _store = _lifecycle(tmp_path)

    should_close = lifecycle.on_window_closing()

    assert should_close is False
    assert window.hidden is False
    assert "serre:native-close-request" in window.scripts[-1]


def test_background_close_hides_window_and_keeps_process_alive(tmp_path: Path) -> None:
    lifecycle, window, tray, store = _lifecycle(tmp_path)
    store.update(close_behavior="background")

    should_close = lifecycle.on_window_closing()

    assert should_close is False
    assert window.hidden is True
    assert window.destroyed is False
    assert tray.notifications


def test_remembered_quit_destroys_window_on_dialog_resolution(tmp_path: Path) -> None:
    lifecycle, window, _tray, store = _lifecycle(tmp_path)

    result = lifecycle.resolve_close_request("quit", remember=True)

    assert result["accepted"] is True
    assert window.destroyed is True
    assert lifecycle.shutting_down is True
    assert store.load().close_behavior is CloseBehavior.QUIT


def test_background_cannot_be_selected_without_a_native_tray(tmp_path: Path) -> None:
    lifecycle, _window, _tray, _store = _lifecycle(tmp_path, tray_available=False)

    with pytest.raises(ValueError, match="notification"):
        lifecycle.configure(close_behavior="background")


def test_show_restores_window_and_opens_requested_tool(tmp_path: Path) -> None:
    lifecycle, window, _tray, _store = _lifecycle(tmp_path)

    lifecycle.show("jobs")

    assert window.shown is True
    assert window.restored is True
    assert "SerreProductionQueue" in window.scripts[-1]
