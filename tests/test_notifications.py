import json
from pathlib import Path
from typing import Any, cast

from apps.api.notifications import StudioNotificationLog


def test_notifications_persist_order_context_and_unread_counts(tmp_path: Path) -> None:
    log = StudioNotificationLog(tmp_path)
    first = log.publish(
        "error",
        "Erreur GPU",
        "Le rendu a échoué",
        source="shot-job",
        context={"shot_id": "S01E001-S01"},
    )
    second = log.publish(
        "success",
        "Plan généré",
        "Le rendu est disponible",
        source="shot-job",
    )

    listing = StudioNotificationLog(tmp_path).listing()
    notifications = cast(list[dict[str, Any]], listing["notifications"])

    assert [item["id"] for item in notifications] == [
        second["id"],
        first["id"],
    ]
    assert notifications[1]["context"] == {
        "shot_id": "S01E001-S01"
    }
    assert listing["unread"] == 2
    assert listing["unread_errors"] == 1


def test_notifications_mark_known_ids_or_all_as_read(tmp_path: Path) -> None:
    log = StudioNotificationLog(tmp_path)
    first = log.publish("error", "A", "a", source="test")
    second = log.publish("info", "B", "b", source="test")

    partial = log.mark_read([str(first["id"]), "unknown-id"])

    assert partial["unread"] == 1
    assert partial["unread_errors"] == 0
    saved = json.loads(log.read_path.read_text(encoding="utf-8"))
    assert saved["ids"] == [first["id"]]

    complete = StudioNotificationLog(tmp_path).mark_read()
    notifications = cast(list[dict[str, Any]], complete["notifications"])
    assert complete["unread"] == 0
    assert all(item["read"] for item in notifications)
    assert {item["id"] for item in notifications} == {
        first["id"],
        second["id"],
    }


def test_notifications_ignore_corrupt_lines_and_bound_direct_limits(tmp_path: Path) -> None:
    log = StudioNotificationLog(tmp_path)
    log.publish("info", "Premier", "1", source="test")
    latest = log.publish("info", "Dernier", "2", source="test")
    with log.events_path.open("a", encoding="utf-8") as handle:
        handle.write("not-json\n")

    listing = log.listing(limit=0)
    notifications = cast(list[dict[str, Any]], listing["notifications"])

    assert [item["id"] for item in notifications] == [latest["id"]]
