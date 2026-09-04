from __future__ import annotations

import json
import threading
import uuid
from datetime import UTC, datetime
from pathlib import Path
from typing import Any, Literal

from engine.production.artifacts import write_text_atomic

NotificationLevel = Literal["info", "success", "warning", "error"]
_LOCK = threading.Lock()


class StudioNotificationLog:
    """Append-only project activity log with persistent read state."""

    def __init__(self, output_root: Path) -> None:
        self.root = output_root.resolve() / ".studio"
        self.events_path = self.root / "notifications.jsonl"
        self.read_path = self.root / "notifications-read.json"

    def publish(
        self,
        level: NotificationLevel,
        title: str,
        message: str,
        *,
        source: str,
        context: dict[str, object] | None = None,
    ) -> dict[str, object]:
        event: dict[str, object] = {
            "id": uuid.uuid4().hex,
            "timestamp": datetime.now(UTC).isoformat(),
            "level": level,
            "title": title[:120],
            "message": message[:2000],
            "source": source[:80],
            "context": context or {},
        }
        with _LOCK:
            self.root.mkdir(parents=True, exist_ok=True)
            with self.events_path.open("a", encoding="utf-8") as handle:
                handle.write(json.dumps(event, ensure_ascii=False) + "\n")
        return {**event, "read": False}

    def listing(self, *, limit: int = 100) -> dict[str, object]:
        limit = max(1, min(limit, 200))
        read_ids = self._read_ids()
        events = self._events()[-limit:]
        notifications = [
            {**event, "read": str(event.get("id")) in read_ids}
            for event in reversed(events)
        ]
        return {
            "notifications": notifications,
            "unread": sum(not item["read"] for item in notifications),
            "unread_errors": sum(
                not item["read"] and item.get("level") == "error"
                for item in notifications
            ),
        }

    def mark_read(self, ids: list[str] | None = None) -> dict[str, object]:
        with _LOCK:
            event_ids = {str(item.get("id")) for item in self._events()}
            read_ids = self._read_ids()
            if ids is None:
                read_ids.update(event_ids)
            else:
                read_ids.update(item for item in ids if item in event_ids)
            write_text_atomic(
                self.read_path,
                json.dumps({"ids": sorted(read_ids)}, ensure_ascii=False, indent=2) + "\n",
            )
        return self.listing()

    def _events(self) -> list[dict[str, Any]]:
        if not self.events_path.is_file():
            return []
        events: list[dict[str, Any]] = []
        for line in self.events_path.read_text(encoding="utf-8").splitlines():
            try:
                payload = json.loads(line)
            except ValueError:
                continue
            if isinstance(payload, dict):
                events.append(payload)
        return events

    def _read_ids(self) -> set[str]:
        if not self.read_path.is_file():
            return set()
        try:
            payload: Any = json.loads(self.read_path.read_text(encoding="utf-8"))
        except (OSError, ValueError):
            return set()
        ids = payload.get("ids", []) if isinstance(payload, dict) else []
        return {str(item) for item in ids if isinstance(item, str)}
