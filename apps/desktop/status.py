"""Aggregate backend activity into the five desktop indicator states."""

from __future__ import annotations

from collections.abc import Mapping


def build_desktop_status(
    runtime_listing: Mapping[str, object],
    queue_listing: Mapping[str, object],
    *,
    has_direct_activity: bool,
    notifications: Mapping[str, object],
) -> dict[str, object]:
    raw_services = runtime_listing.get("services")
    services = [
        dict(item)
        for item in (raw_services if isinstance(raw_services, list) else [])
        if isinstance(item, Mapping)
    ]
    raw_counts = queue_listing.get("counts")
    counts = raw_counts if isinstance(raw_counts, Mapping) else {}
    queued = _count(counts.get("queued"))
    running = _count(counts.get("running"))
    blocked = _count(counts.get("failed"))
    active = running + (0 if queue_listing.get("paused") is True else queued)
    if has_direct_activity and active == 0:
        active = 1

    states = {str(service.get("state", "unavailable")) for service in services}
    if "failed" in states or blocked:
        state = "error"
    elif active:
        state = "working"
    elif services and states == {"ready"}:
        state = "ready"
    elif "ready" in states or states & {"checking", "starting", "restarting", "unavailable"}:
        state = "degraded"
    else:
        state = "idle"

    raw_notifications = notifications.get("notifications")
    recent_notifications = [
        dict(item)
        for item in (raw_notifications if isinstance(raw_notifications, list) else [])
        if isinstance(item, Mapping)
    ][:20]
    return {
        "state": state,
        "jobs": {
            "active": active,
            "queued": queued,
            "running": running,
            "blocked": blocked,
        },
        "runtimes": services,
        "notifications": recent_notifications,
    }


def _count(value: object) -> int:
    try:
        return max(0, int(str(value)))
    except (TypeError, ValueError):
        return 0
