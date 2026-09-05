from __future__ import annotations

from pathlib import Path

import pytest

from apps.desktop import tray as tray_module
from apps.desktop.lifecycle import DesktopPreferenceStore, NativeWindowLifecycle
from apps.desktop.tray import (
    DesktopApiClient,
    NullSystemTray,
    StudioIndicator,
    StudioStatus,
    StudioStatusMonitor,
)


class FakeClient:
    def __init__(self, statuses: list[StudioStatus]) -> None:
        self.statuses = statuses

    def status(self) -> StudioStatus:
        return self.statuses.pop(0)


def _notification(identifier: str, level: str = "success") -> dict[str, object]:
    return {"id": identifier, "level": level, "title": "Terminé", "message": "S01 prêt"}


def test_status_parses_runtime_actions_and_builds_bounded_tooltip() -> None:
    status = StudioStatus.from_payload(
        {
            "state": "working",
            "jobs": {"active": 2, "blocked": 1},
            "runtimes": [
                {
                    "name": "comfyui",
                    "display_name": "ComfyUI",
                    "state": "ready",
                    "managed": True,
                    "actions": {"start": False, "stop": True},
                }
            ],
        }
    )

    assert status.indicator is StudioIndicator.WORKING
    assert status.runtimes[0].can_stop is True
    assert "ComfyUI: prêt" in status.tooltip
    assert len(status.tooltip) <= 127


def test_monitor_baselines_old_events_then_notifies_new_success_and_error() -> None:
    seen: list[StudioStatus] = []
    notices: list[tuple[str, str]] = []
    first = StudioStatus(StudioIndicator.READY, 0, 0, (), (_notification("old"),))
    second = StudioStatus(
        StudioIndicator.ERROR,
        0,
        1,
        (),
        (_notification("error", "error"), _notification("info", "info"), _notification("old")),
    )
    client = FakeClient([first, second])
    monitor = StudioStatusMonitor(
        client,  # type: ignore[arg-type]
        seen.append,
        lambda title, message: notices.append((title, message)),
    )

    monitor.poll_once()
    monitor.poll_once()

    assert [item.indicator for item in seen] == [StudioIndicator.READY, StudioIndicator.ERROR]
    assert notices == [("Terminé", "S01 prêt")]


def test_tray_client_refuses_non_loopback_endpoints() -> None:
    with pytest.raises(ValueError, match="loopback"):
        DesktopApiClient("https://studio.example.test")


def test_tray_factory_has_an_explicit_missing_dependency_fallback(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    preferences = DesktopPreferenceStore(tmp_path)
    lifecycle = NativeWindowLifecycle(preferences)

    def missing(_name: str) -> object:
        raise ImportError("not installed")

    monkeypatch.setattr(tray_module.importlib, "import_module", missing)

    result = tray_module.create_system_tray(
        lifecycle,
        preferences,
        "http://127.0.0.1:8000",
    )

    assert isinstance(result, NullSystemTray)
    assert result.available is False
