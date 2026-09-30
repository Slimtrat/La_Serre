from __future__ import annotations

import json
import threading
import uuid
from datetime import UTC, datetime, timedelta
from enum import StrEnum
from pathlib import Path
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from engine.production.artifacts import write_text_atomic


class ActivityStatus(StrEnum):
    QUEUED = "QUEUED"
    GENERATING = "GENERATING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"


class StageStatus(StrEnum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


class ActivityModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class ActivityGraphTarget(ActivityModel):
    scope: Literal["series", "episode", "shot"]
    id: str = Field(min_length=1, max_length=120)
    node_id: str = Field(min_length=1, max_length=160)


class ActivityStage(ActivityModel):
    id: str = Field(min_length=1, max_length=80)
    status: StageStatus = StageStatus.PENDING
    message: str = "En attente"


class ActivityEvent(ActivityModel):
    timestamp: datetime
    stage: str
    status: str
    message: str


class StudioActivity(ActivityModel):
    id: str = Field(pattern=r"^activity-[a-f0-9]{32}$")
    kind: Literal["external"] = "external"
    title: str = Field(min_length=1, max_length=200)
    status: ActivityStatus = ActivityStatus.QUEUED
    message: str
    graph: ActivityGraphTarget
    created_at: datetime
    updated_at: datetime
    completed_at: datetime | None = None
    stages: list[ActivityStage]
    events: list[ActivityEvent] = Field(default_factory=list)

    def public(self) -> dict[str, object]:
        completed = sum(stage.status is StageStatus.COMPLETED for stage in self.stages)
        active = next(
            (
                stage.id
                for stage in self.stages
                if stage.status in {StageStatus.RUNNING, StageStatus.FAILED}
            ),
            None,
        )
        terminal = self.status in {ActivityStatus.COMPLETED, ActivityStatus.FAILED}
        total = len(self.stages)
        payload = self.model_dump(mode="json")
        payload["progress"] = {
            "percent": 100
            if self.status is ActivityStatus.COMPLETED
            else round(100 * completed / max(1, total)),
            "completed": total if self.status is ActivityStatus.COMPLETED else completed,
            "total": total,
            "active_stage": active,
            "elapsed_seconds": max(
                0,
                round(((self.completed_at or datetime.now(UTC)) - self.created_at).total_seconds()),
            ),
            "indeterminate": not terminal and active is not None,
        }
        return payload


class StudioActivityStore:
    """Atomic bridge that makes local/CLI work visible in the Studio graph."""

    _lock = threading.RLock()

    def __init__(self, output_root: Path) -> None:
        self.path = output_root.resolve() / ".studio" / "external-activity.json"

    def load(self) -> StudioActivity | None:
        with self._lock:
            if not self.path.is_file():
                return None
            return StudioActivity.model_validate_json(self.path.read_text(encoding="utf-8"))

    def active(self, *, max_age: timedelta = timedelta(hours=2)) -> StudioActivity | None:
        activity = self.load()
        if activity is None or activity.status not in {
            ActivityStatus.QUEUED,
            ActivityStatus.GENERATING,
        }:
            return None
        if datetime.now(UTC) - activity.updated_at > max_age:
            return None
        return activity

    def recent(self, *, max_age: timedelta = timedelta(minutes=5)) -> StudioActivity | None:
        activity = self.load()
        if activity is None:
            return None
        if datetime.now(UTC) - activity.updated_at > max_age:
            return None
        return activity

    def start(
        self,
        *,
        title: str,
        message: str,
        graph: ActivityGraphTarget,
        stages: list[str],
    ) -> StudioActivity:
        if not stages or len(set(stages)) != len(stages):
            raise ValueError("Activity stages must be non-empty and unique")
        now = datetime.now(UTC)
        activity = StudioActivity(
            id=f"activity-{uuid.uuid4().hex}",
            title=title,
            status=ActivityStatus.QUEUED,
            message=message,
            graph=graph,
            created_at=now,
            updated_at=now,
            stages=[ActivityStage(id=stage) for stage in stages],
            events=[
                ActivityEvent(
                    timestamp=now,
                    stage="job",
                    status="queued",
                    message=message,
                )
            ],
        )
        return self._save(activity)

    def update(
        self,
        activity_id: str,
        *,
        stage: str,
        status: StageStatus,
        message: str,
    ) -> StudioActivity:
        with self._lock:
            activity = self._require(activity_id)
            if stage not in {item.id for item in activity.stages}:
                raise ValueError(f"Unknown activity stage: {stage}")
            now = datetime.now(UTC)
            stages = []
            for item in activity.stages:
                next_status = item.status
                next_message = item.message
                if item.id == stage:
                    next_status = status
                    next_message = message
                elif status is StageStatus.RUNNING and item.status is StageStatus.RUNNING:
                    next_status = StageStatus.COMPLETED
                stages.append(
                    item.model_copy(update={"status": next_status, "message": next_message})
                )
            overall = (
                ActivityStatus.FAILED if status is StageStatus.FAILED else ActivityStatus.GENERATING
            )
            changed = activity.model_copy(
                update={
                    "status": overall,
                    "message": message,
                    "updated_at": now,
                    "completed_at": now if overall is ActivityStatus.FAILED else None,
                    "stages": stages,
                    "events": [
                        *activity.events,
                        ActivityEvent(
                            timestamp=now,
                            stage=stage,
                            status=status.value,
                            message=message,
                        ),
                    ],
                }
            )
            return self._save(changed)

    def complete(self, activity_id: str, message: str) -> StudioActivity:
        with self._lock:
            activity = self._require(activity_id)
            now = datetime.now(UTC)
            changed = activity.model_copy(
                update={
                    "status": ActivityStatus.COMPLETED,
                    "message": message,
                    "updated_at": now,
                    "completed_at": now,
                    "stages": [
                        item.model_copy(update={"status": StageStatus.COMPLETED})
                        for item in activity.stages
                    ],
                    "events": [
                        *activity.events,
                        ActivityEvent(
                            timestamp=now,
                            stage="job",
                            status="completed",
                            message=message,
                        ),
                    ],
                }
            )
            return self._save(changed)

    def fail(self, activity_id: str, *, stage: str, message: str) -> StudioActivity:
        return self.update(
            activity_id,
            stage=stage,
            status=StageStatus.FAILED,
            message=message,
        )

    def _require(self, activity_id: str) -> StudioActivity:
        activity = self.load()
        if activity is None or activity.id != activity_id:
            raise ValueError(f"Unknown studio activity: {activity_id}")
        return activity

    def _save(self, activity: StudioActivity) -> StudioActivity:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        write_text_atomic(self.path, json.dumps(activity.model_dump(mode="json"), indent=2) + "\n")
        return activity
