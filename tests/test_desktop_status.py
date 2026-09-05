from __future__ import annotations

from apps.desktop.status import build_desktop_status


def _runtime(state: str, *, managed: bool = False) -> dict[str, object]:
    return {
        "name": state,
        "display_name": state.title(),
        "state": state,
        "managed": managed,
        "actions": {"start": state == "stopped", "stop": managed},
    }


def test_desktop_status_covers_the_five_indicator_states() -> None:
    notifications = {"notifications": []}
    assert build_desktop_status(
        {"services": [_runtime("stopped")]},
        {"counts": {}},
        has_direct_activity=False,
        notifications=notifications,
    )["state"] == "idle"
    assert build_desktop_status(
        {"services": [_runtime("ready"), _runtime("ready")]},
        {"counts": {}},
        has_direct_activity=False,
        notifications=notifications,
    )["state"] == "ready"
    assert build_desktop_status(
        {"services": [_runtime("ready")]},
        {"counts": {"running": 1}},
        has_direct_activity=False,
        notifications=notifications,
    )["state"] == "working"
    assert build_desktop_status(
        {"services": [_runtime("ready"), _runtime("missing")]},
        {"counts": {}},
        has_direct_activity=False,
        notifications=notifications,
    )["state"] == "degraded"
    assert build_desktop_status(
        {"services": [_runtime("failed")]},
        {"counts": {}},
        has_direct_activity=False,
        notifications=notifications,
    )["state"] == "error"


def test_desktop_status_counts_direct_activity_and_bounds_notifications() -> None:
    result = build_desktop_status(
        {"services": [_runtime("ready")]},
        {"counts": {}},
        has_direct_activity=True,
        notifications={"notifications": [{"id": str(index)} for index in range(30)]},
    )

    assert result["state"] == "working"
    assert result["jobs"] == {"active": 1, "queued": 0, "running": 0, "blocked": 0}
    assert len(result["notifications"]) == 20  # type: ignore[arg-type]


def test_a_paused_queue_is_not_reported_as_active_work() -> None:
    result = build_desktop_status(
        {"services": [_runtime("ready")]},
        {"paused": True, "counts": {"queued": 2}},
        has_direct_activity=False,
        notifications={"notifications": []},
    )

    assert result["state"] == "ready"
    assert result["jobs"] == {"active": 0, "queued": 2, "running": 0, "blocked": 0}
