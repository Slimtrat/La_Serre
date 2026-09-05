from __future__ import annotations

import asyncio
import json
import re
import threading
import uuid
from collections import Counter
from collections.abc import Callable
from dataclasses import dataclass, field
from datetime import UTC, datetime
from enum import StrEnum
from pathlib import Path
from typing import Any

from apps.api.assets import AssetStore
from apps.api.job_manager import JobManager, StudioJob
from apps.api.run_history import RunHistory
from apps.api.schemas import JobMode
from apps.api.stage_actions import ShotStageService, StageKind
from engine.config import Settings
from engine.director.models import Shot
from engine.production.artifacts import sha256_file, write_text_atomic
from engine.world.catalog import EpisodeCatalog

SHOT_ID = re.compile(r"^S\d{2}E\d{3}-S\d{2}$")
EPISODE_ID = re.compile(r"^S\d{2}E\d{3}$")
QUEUE_FILENAME = "production-queue.json"
ACTIVE_STATUSES = {"queued", "running"}
TERMINAL_STATUSES = {"completed", "failed", "cancelled", "awaiting_approval"}


class QueueKind(StrEnum):
    KEYFRAME = "keyframe"
    VIDEO = "video"
    VOICE = "voice"
    MUSIC = "music"


class QueueStatus(StrEnum):
    QUEUED = "queued"
    RUNNING = "running"
    AWAITING_APPROVAL = "awaiting_approval"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


@dataclass(slots=True)
class QueueItem:
    id: str
    episode_id: str
    shot_id: str
    kind: QueueKind
    shot: dict[str, object]
    priority: int = 0
    sequence: int = 0
    status: QueueStatus = QueueStatus.QUEUED
    message: str = "En attente"
    progress: int = 0
    attempts: int = 0
    force: bool = False
    keyframe_source: str = "model"
    tts: str = "auto"
    linked_job_id: str | None = None
    error: str | None = None
    created_at: str = field(default_factory=lambda: datetime.now(UTC).isoformat())
    updated_at: str = field(default_factory=lambda: datetime.now(UTC).isoformat())

    def public(self, position: int) -> dict[str, object]:
        return {
            "id": self.id,
            "episode_id": self.episode_id,
            "shot_id": self.shot_id,
            "kind": self.kind.value,
            "priority": self.priority,
            "position": position,
            "status": self.status.value,
            "message": self.message,
            "progress": self.progress,
            "attempts": self.attempts,
            "force": self.force,
            "keyframe_source": self.keyframe_source,
            "linked_job_id": self.linked_job_id,
            "error": self.error,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
            "requires_human_approval": self.status is QueueStatus.AWAITING_APPROVAL,
        }

    def stored(self) -> dict[str, object]:
        return {
            "id": self.id,
            "episode_id": self.episode_id,
            "shot_id": self.shot_id,
            "kind": self.kind.value,
            "shot": self.shot,
            "priority": self.priority,
            "sequence": self.sequence,
            "status": self.status.value,
            "message": self.message,
            "progress": self.progress,
            "attempts": self.attempts,
            "force": self.force,
            "keyframe_source": self.keyframe_source,
            "tts": self.tts,
            "linked_job_id": self.linked_job_id,
            "error": self.error,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
        }

    @classmethod
    def restore(cls, raw: dict[str, object]) -> QueueItem:
        shot_raw = raw.get("shot")
        if not isinstance(shot_raw, dict):
            raise ValueError("Queue item has no shot payload")
        shot = Shot.model_validate(shot_raw)
        item = cls(
            id=str(raw["id"]),
            episode_id=str(raw.get("episode_id") or shot.id.rsplit("-S", 1)[0]),
            shot_id=shot.id,
            kind=QueueKind(str(raw["kind"])),
            shot=shot.model_dump(mode="json"),
            priority=_as_int(raw.get("priority"), 0),
            sequence=_as_int(raw.get("sequence"), 0),
            status=QueueStatus(str(raw.get("status", QueueStatus.QUEUED))),
            message=str(raw.get("message", "En attente")),
            progress=_as_int(raw.get("progress"), 0),
            attempts=_as_int(raw.get("attempts"), 0),
            force=bool(raw.get("force", False)),
            keyframe_source=str(raw.get("keyframe_source", "model")),
            tts=str(raw.get("tts", "auto")),
            linked_job_id=(str(raw["linked_job_id"]) if raw.get("linked_job_id") else None),
            error=str(raw["error"]) if raw.get("error") else None,
            created_at=str(raw.get("created_at", datetime.now(UTC).isoformat())),
            updated_at=str(raw.get("updated_at", datetime.now(UTC).isoformat())),
        )
        if item.status is QueueStatus.RUNNING:
            item.status = QueueStatus.QUEUED
            item.message = "Interrompu par le redémarrage — reprise manuelle requise"
            item.linked_job_id = None
        return item


@dataclass(slots=True)
class QueueState:
    path: Path
    paused: bool = False
    recovered: bool = False
    sequence: int = 0
    items: list[QueueItem] = field(default_factory=list)


@dataclass(frozen=True, slots=True)
class BatchResult:
    enqueued: tuple[str, ...]
    skipped: tuple[dict[str, str], ...]

    def public(self) -> dict[str, object]:
        return {"enqueued": list(self.enqueued), "skipped": list(self.skipped)}


class ProductionQueueManager:
    """Persistent, explicit and human-gated production queue for the active project."""

    def __init__(
        self,
        settings_provider: Callable[[], Settings],
        catalog_provider: Callable[[], EpisodeCatalog],
        job_manager: JobManager,
        stage_service: ShotStageService,
        *,
        poll_interval_seconds: float = 0.25,
    ) -> None:
        if poll_interval_seconds <= 0:
            raise ValueError("poll_interval_seconds must be positive")
        self.settings_provider = settings_provider
        self.catalog_provider = catalog_provider
        self.job_manager = job_manager
        self.stage_service = stage_service
        self.poll_interval_seconds = poll_interval_seconds
        self._states: dict[Path, QueueState] = {}
        self._lock = threading.RLock()
        self._worker: asyncio.Task[None] | None = None
        self._worker_path: Path | None = None

    def listing(self) -> dict[str, object]:
        state = self._current_state()
        with self._lock:
            return self._listing_locked(state)

    def has_active_jobs(self) -> bool:
        state = self._current_state()
        with self._lock:
            return any(
                item.status is QueueStatus.RUNNING
                or (not state.paused and item.status is QueueStatus.QUEUED)
                for item in state.items
            )

    async def enqueue(
        self,
        shot_payload: dict[str, object],
        kind: QueueKind,
        *,
        priority: int = 0,
        force: bool = False,
        tts: str = "auto",
    ) -> dict[str, object]:
        shot = Shot.model_validate(shot_payload)
        settings = await asyncio.to_thread(self.settings_provider)
        keyframe_source = self._validate_task(settings, shot, kind)
        state = self._state_for(settings.output_dir)
        with self._lock:
            item = self._append_locked(
                state,
                shot,
                kind,
                priority=priority,
                force=force,
                tts=tts,
                keyframe_source=keyframe_source,
            )
            self._save_locked(state)
        self._ensure_worker(state)
        return item.public(self._position(state, item.id))

    async def enqueue_missing(
        self,
        episode_id: str,
        *,
        priority: int = 0,
        tts: str = "auto",
    ) -> tuple[BatchResult, dict[str, object]]:
        return await self._enqueue_batch(
            episode_id,
            approved_only=False,
            priority=priority,
            tts=tts,
        )

    async def enqueue_approved(
        self,
        episode_id: str,
        *,
        priority: int = 0,
        tts: str = "auto",
    ) -> tuple[BatchResult, dict[str, object]]:
        return await self._enqueue_batch(
            episode_id,
            approved_only=True,
            priority=priority,
            tts=tts,
        )

    async def pause(self) -> dict[str, object]:
        state = self._current_state()
        with self._lock:
            state.paused = True
            self._save_locked(state)
            return self._listing_locked(state)

    async def resume(self) -> dict[str, object]:
        state = self._current_state()
        with self._lock:
            state.paused = False
            state.recovered = False
            self._save_locked(state)
        self._ensure_worker(state)
        return self.listing()

    async def cancel(self, item_id: str) -> dict[str, object]:
        state = self._current_state()
        linked_job_id: str | None = None
        with self._lock:
            item = self._find_locked(state, item_id)
            if item.status not in {QueueStatus.QUEUED, QueueStatus.RUNNING}:
                raise ValueError("Seule une tâche en attente ou active peut être annulée")
            linked_job_id = item.linked_job_id
            item.status = QueueStatus.CANCELLED
            item.message = "Annulée par l’utilisateur"
            item.error = None
            item.updated_at = datetime.now(UTC).isoformat()
            self._save_locked(state)
        if linked_job_id:
            await self.job_manager.cancel(linked_job_id)
        return item.public(self._position(state, item.id))

    async def retry(self, item_id: str) -> dict[str, object]:
        state = self._current_state()
        with self._lock:
            item = self._find_locked(state, item_id)
            if item.status not in {
                QueueStatus.FAILED,
                QueueStatus.CANCELLED,
                QueueStatus.AWAITING_APPROVAL,
            }:
                raise ValueError(
                    "Seule une tâche échouée, annulée ou en validation peut être relancée"
                )
            if item.kind is QueueKind.VIDEO:
                settings = self.settings_provider()
                self._validate_task(settings, Shot.model_validate(item.shot), item.kind)
            item.status = QueueStatus.QUEUED
            item.message = "Relance demandée"
            item.progress = 0
            item.force = True
            item.error = None
            item.linked_job_id = None
            item.updated_at = datetime.now(UTC).isoformat()
            self._save_locked(state)
        self._ensure_worker(state)
        return item.public(self._position(state, item.id))

    def set_priority(self, item_id: str, priority: int) -> dict[str, object]:
        if not -100 <= priority <= 100:
            raise ValueError("La priorité doit être comprise entre -100 et 100")
        state = self._current_state()
        with self._lock:
            item = self._find_locked(state, item_id)
            if item.status is QueueStatus.RUNNING:
                raise ValueError("La priorité d’une tâche active ne peut pas changer")
            item.priority = priority
            item.updated_at = datetime.now(UTC).isoformat()
            self._save_locked(state)
            return item.public(self._position(state, item.id))

    def reorder(self, item_ids: list[str]) -> dict[str, object]:
        state = self._current_state()
        with self._lock:
            pending = [item for item in state.items if item.status is QueueStatus.QUEUED]
            pending_ids = {item.id for item in pending}
            if len(item_ids) != len(set(item_ids)) or set(item_ids) != pending_ids:
                raise ValueError("L’ordre doit contenir chaque tâche en attente une seule fois")
            by_id = {item.id: item for item in pending}
            priorities = [by_id[item_id].priority for item_id in item_ids]
            if priorities != sorted(priorities, reverse=True):
                raise ValueError("L’ordre manuel doit respecter les niveaux de priorité")
            for sequence, item_id in enumerate(item_ids, start=state.sequence + 1):
                by_id[item_id].sequence = sequence
            state.sequence += len(item_ids)
            self._save_locked(state)
            return self._listing_locked(state)

    def clear_finished(self) -> dict[str, object]:
        state = self._current_state()
        with self._lock:
            state.items = [
                item
                for item in state.items
                if item.status in {QueueStatus.QUEUED, QueueStatus.RUNNING}
            ]
            self._save_locked(state)
            return self._listing_locked(state)

    def approve_keyframe(self, shot_id: str) -> dict[str, object]:
        if not SHOT_ID.fullmatch(shot_id):
            raise ValueError("Identifiant de plan invalide")
        settings = self.settings_provider()
        source, keyframe = self._keyframe_source(settings, shot_id)
        if keyframe is None or source is None:
            raise ValueError("Aucune keyframe à approuver")
        approval = {
            "schema_version": 1,
            "shot_id": shot_id,
            "sha256": sha256_file(keyframe),
            "source": source,
            "approved_at": datetime.now(UTC).isoformat(),
        }
        approval_path = settings.output_dir / shot_id / "keyframe-approval.json"
        write_text_atomic(
            approval_path,
            json.dumps(approval, ensure_ascii=False, indent=2) + "\n",
        )
        manifest_path = settings.output_dir / shot_id / "generation.json"
        manifest = self._read_mapping(manifest_path)
        if manifest:
            manifest["status"] = "APPROVED"
            write_text_atomic(
                manifest_path,
                json.dumps(manifest, ensure_ascii=False, indent=2) + "\n",
            )
        RunHistory.append_event(
            settings.output_dir / shot_id / "studio-log.jsonl",
            {
                "timestamp": approval["approved_at"],
                "stage": "keyframe-approval",
                "status": "completed",
                "message": "Version de keyframe approuvée par l’utilisateur",
                "sha256": approval["sha256"],
            },
        )
        state = self._state_for(settings.output_dir)
        with self._lock:
            for item in state.items:
                if item.shot_id == shot_id and item.status is QueueStatus.AWAITING_APPROVAL:
                    item.status = QueueStatus.COMPLETED
                    item.message = "Keyframe approuvée par l’utilisateur"
                    item.updated_at = datetime.now(UTC).isoformat()
            self._save_locked(state)
        return approval

    async def _enqueue_batch(
        self,
        episode_id: str,
        *,
        approved_only: bool,
        priority: int,
        tts: str,
    ) -> tuple[BatchResult, dict[str, object]]:
        if not EPISODE_ID.fullmatch(episode_id):
            raise ValueError("Identifiant d’épisode invalide")
        settings, package = await asyncio.gather(
            asyncio.to_thread(self.settings_provider),
            asyncio.to_thread(lambda: self.catalog_provider().load(episode_id)),
        )
        state = self._state_for(settings.output_dir)
        enqueued: list[str] = []
        skipped: list[dict[str, str]] = []
        with self._lock:
            for shot in package.shots:
                keyframe_source, keyframe = self._keyframe_source(settings, shot.id)
                approved_source = self._approved_keyframe_source(settings, shot.id)
                video_exists = self._has_output_or_asset(settings, shot.id, "video")
                voice_exists = self._has_voice_or_asset(settings, shot.id)
                candidates: list[tuple[QueueKind, str]] = []
                if approved_only:
                    if approved_source and not video_exists:
                        candidates.append((QueueKind.VIDEO, approved_source))
                    elif not video_exists:
                        skipped.append(
                            {
                                "shot_id": shot.id,
                                "kind": QueueKind.VIDEO.value,
                                "reason": "Validation humaine de la keyframe requise",
                            }
                        )
                else:
                    if keyframe is None:
                        candidates.append((QueueKind.KEYFRAME, "model"))
                    elif approved_source and not video_exists:
                        candidates.append((QueueKind.VIDEO, approved_source))
                    elif not video_exists:
                        skipped.append(
                            {
                                "shot_id": shot.id,
                                "kind": QueueKind.VIDEO.value,
                                "reason": "Keyframe présente mais non approuvée",
                            }
                        )
                    if shot.dialogue is not None and not voice_exists:
                        candidates.append((QueueKind.VOICE, "model"))

                for kind, source in candidates:
                    duplicate = self._active_duplicate(state, shot.id, kind)
                    if duplicate:
                        skipped.append(
                            {
                                "shot_id": shot.id,
                                "kind": kind.value,
                                "reason": "Déjà dans la file",
                            }
                        )
                        continue
                    item = self._append_locked(
                        state,
                        shot,
                        kind,
                        priority=priority,
                        tts=tts,
                        keyframe_source=source or keyframe_source or "model",
                    )
                    enqueued.append(item.id)
            self._save_locked(state)
            listing = self._listing_locked(state)
        self._ensure_worker(state)
        return BatchResult(tuple(enqueued), tuple(skipped)), listing

    def _validate_task(self, settings: Settings, shot: Shot, kind: QueueKind) -> str:
        if kind is QueueKind.VIDEO:
            source = self._approved_keyframe_source(settings, shot.id)
            if source is None:
                raise ValueError("La vidéo exige une approbation humaine de la keyframe courante")
            return source
        if kind is QueueKind.VOICE and shot.dialogue is None:
            raise ValueError("Ce plan ne contient aucune réplique")
        return "model"

    def _append_locked(
        self,
        state: QueueState,
        shot: Shot,
        kind: QueueKind,
        *,
        priority: int,
        force: bool = False,
        tts: str = "auto",
        keyframe_source: str = "model",
    ) -> QueueItem:
        if not -100 <= priority <= 100:
            raise ValueError("La priorité doit être comprise entre -100 et 100")
        duplicate = self._active_duplicate(state, shot.id, kind)
        if duplicate:
            raise ValueError(f"{shot.id} · {kind.value} est déjà dans la file")
        state.sequence += 1
        item = QueueItem(
            id=uuid.uuid4().hex,
            episode_id=shot.id.rsplit("-S", 1)[0],
            shot_id=shot.id,
            kind=kind,
            shot=shot.model_dump(mode="json"),
            priority=priority,
            sequence=state.sequence,
            force=force,
            tts=tts,
            keyframe_source=keyframe_source,
        )
        state.items.append(item)
        return item

    def _ensure_worker(self, state: QueueState) -> None:
        with self._lock:
            if state.paused or not any(item.status is QueueStatus.QUEUED for item in state.items):
                return
            if self._worker is not None and not self._worker.done():
                return
            self._worker_path = state.path
            self._worker = asyncio.create_task(self._worker_loop(state.path))

    async def _worker_loop(self, path: Path) -> None:
        try:
            while True:
                with self._lock:
                    state = self._states[path]
                    if state.paused:
                        return
                    item = next(
                        (
                            candidate
                            for candidate in self._ordered(state)
                            if candidate.status is QueueStatus.QUEUED
                        ),
                        None,
                    )
                    if item is None:
                        return
                    item.status = QueueStatus.RUNNING
                    item.message = "Démarrage"
                    item.progress = 1
                    item.attempts += 1
                    item.updated_at = datetime.now(UTC).isoformat()
                    self._save_locked(state)
                try:
                    await self._execute_item(state, item)
                except asyncio.CancelledError:
                    raise
                except Exception as exc:
                    with self._lock:
                        if item.status is not QueueStatus.CANCELLED:
                            item.status = QueueStatus.FAILED
                            item.message = str(exc)
                            item.error = f"{type(exc).__name__}: {exc}"
                            item.updated_at = datetime.now(UTC).isoformat()
                            self._save_locked(state)
        finally:
            with self._lock:
                if self._worker_path == path:
                    self._worker = None
                    self._worker_path = None
                loaded_state = self._states.get(path)
                restart = bool(
                    loaded_state
                    and not loaded_state.paused
                    and any(item.status is QueueStatus.QUEUED for item in loaded_state.items)
                )
            if restart and loaded_state is not None:
                self._ensure_worker(loaded_state)

    async def _execute_item(self, state: QueueState, item: QueueItem) -> None:
        if item.kind in {QueueKind.KEYFRAME, QueueKind.VIDEO}:
            mode: JobMode = "keyframe" if item.kind is QueueKind.KEYFRAME else "video"
            job = await self.job_manager.start(
                item.shot,
                mode,
                item.force,
                item.keyframe_source,
            )
            with self._lock:
                item.linked_job_id = job.id
                item.updated_at = datetime.now(UTC).isoformat()
                self._save_locked(state)
                cancel_requested = item.status is QueueStatus.CANCELLED
            if cancel_requested:
                await self.job_manager.cancel(job.id)
                return
            await self._follow_job(state, item, job)
            return
        stage: StageKind = "voice" if item.kind is QueueKind.VOICE else "music"
        result = await asyncio.to_thread(
            self.stage_service.generate,
            stage,
            item.shot,
            tts=item.tts,
        )
        with self._lock:
            if item.status is QueueStatus.CANCELLED:
                return
            item.status = QueueStatus.COMPLETED
            item.progress = 100
            item.message = str(result.get("message", "Étape terminée"))
            item.updated_at = datetime.now(UTC).isoformat()
            self._save_locked(state)

    async def _follow_job(self, state: QueueState, item: QueueItem, job: StudioJob) -> None:
        terminal = {
            "GENERATED",
            "AWAITING_KEYFRAME_APPROVAL",
            "FAILED",
            "CANCELLED",
        }
        while job.status not in terminal:
            self._copy_job_progress(state, item, job)
            await asyncio.sleep(self.poll_interval_seconds)
        self._copy_job_progress(state, item, job)
        with self._lock:
            if item.status is QueueStatus.CANCELLED:
                return
            if job.status == "AWAITING_KEYFRAME_APPROVAL":
                item.status = QueueStatus.AWAITING_APPROVAL
                item.progress = 100
                item.message = "Keyframe produite — validation humaine requise"
            elif job.status == "GENERATED":
                item.status = QueueStatus.COMPLETED
                item.progress = 100
                item.message = job.message
            elif job.status == "CANCELLED":
                item.status = QueueStatus.CANCELLED
                item.message = job.message
            else:
                item.status = QueueStatus.FAILED
                item.message = job.message
                item.error = job.message
            item.updated_at = datetime.now(UTC).isoformat()
            self._save_locked(state)

    def _copy_job_progress(self, state: QueueState, item: QueueItem, job: StudioJob) -> None:
        progress = job.progress()
        percent = _as_int(progress.get("percent"), 0)
        with self._lock:
            changed = item.progress != percent or item.message != job.message
            item.progress = percent
            item.message = job.message
            if changed:
                item.updated_at = datetime.now(UTC).isoformat()
                self._save_locked(state)

    def _current_state(self) -> QueueState:
        settings = self.settings_provider()
        return self._state_for(settings.output_dir)

    def _state_for(self, output_root: Path) -> QueueState:
        path = output_root.resolve() / ".studio" / QUEUE_FILENAME
        with self._lock:
            state = self._states.get(path)
            if state is None:
                state = self._load(path)
                self._states[path] = state
            return state

    def _load(self, path: Path) -> QueueState:
        raw = self._read_mapping(path)
        if not raw:
            return QueueState(path=path)
        raw_items = raw.get("items", [])
        items: list[QueueItem] = []
        recovered = False
        if isinstance(raw_items, list):
            for candidate in raw_items:
                if not isinstance(candidate, dict):
                    continue
                try:
                    old_status = str(candidate.get("status", ""))
                    item = QueueItem.restore(candidate)
                except (KeyError, TypeError, ValueError):
                    continue
                recovered = recovered or old_status in ACTIVE_STATUSES
                items.append(item)
        return QueueState(
            path=path,
            paused=bool(raw.get("paused", False)) or recovered,
            recovered=recovered,
            sequence=max((item.sequence for item in items), default=0),
            items=items,
        )

    def _save_locked(self, state: QueueState) -> None:
        payload = {
            "schema_version": 1,
            "paused": state.paused,
            "updated_at": datetime.now(UTC).isoformat(),
            "items": [item.stored() for item in state.items[-500:]],
        }
        write_text_atomic(
            state.path,
            json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
        )

    def _listing_locked(self, state: QueueState) -> dict[str, object]:
        ordered = self._ordered(state)
        positions = {item.id: index for index, item in enumerate(ordered, start=1)}
        counts = Counter(item.status.value for item in state.items)
        active = next((item for item in ordered if item.status is QueueStatus.RUNNING), None)
        episodes: list[dict[str, object]] = []
        for episode_id in sorted({item.episode_id for item in state.items}):
            episode_items = [item for item in state.items if item.episode_id == episode_id]
            episodes.append(self._aggregate(episode_id, episode_items))
        return {
            "paused": state.paused,
            "recovered": state.recovered,
            "active_item_id": active.id if active else None,
            "counts": dict(sorted(counts.items())),
            "progress": self._aggregate("all", state.items),
            "episodes": episodes,
            "items": [item.public(positions[item.id]) for item in ordered],
        }

    @staticmethod
    def _aggregate(identifier: str, items: list[QueueItem]) -> dict[str, object]:
        completed = sum(item.status.value in TERMINAL_STATUSES for item in items)
        percent = round(sum(item.progress for item in items) / len(items)) if items else 0
        return {
            "id": identifier,
            "completed": completed,
            "total": len(items),
            "percent": percent,
            "failed": sum(item.status is QueueStatus.FAILED for item in items),
            "awaiting_approval": sum(
                item.status is QueueStatus.AWAITING_APPROVAL for item in items
            ),
        }

    @staticmethod
    def _ordered(state: QueueState) -> list[QueueItem]:
        return sorted(
            state.items,
            key=lambda item: (
                item.status is not QueueStatus.RUNNING,
                item.status is not QueueStatus.QUEUED,
                -item.priority,
                item.sequence,
            ),
        )

    def _position(self, state: QueueState, item_id: str) -> int:
        return next(
            index for index, item in enumerate(self._ordered(state), start=1) if item.id == item_id
        )

    @staticmethod
    def _find_locked(state: QueueState, item_id: str) -> QueueItem:
        item = next((candidate for candidate in state.items if candidate.id == item_id), None)
        if item is None:
            raise KeyError(item_id)
        return item

    @staticmethod
    def _active_duplicate(state: QueueState, shot_id: str, kind: QueueKind) -> QueueItem | None:
        return next(
            (
                item
                for item in state.items
                if item.shot_id == shot_id
                and item.kind is kind
                and item.status in {QueueStatus.QUEUED, QueueStatus.RUNNING}
            ),
            None,
        )

    @staticmethod
    def _read_mapping(path: Path) -> dict[str, Any]:
        try:
            raw = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, ValueError):
            return {}
        return raw if isinstance(raw, dict) else {}

    @staticmethod
    def _has_output_or_asset(settings: Settings, shot_id: str, slot: str) -> bool:
        filename = "clip.mp4" if slot == "video" else "keyframe.png"
        if (settings.output_dir / shot_id / filename).is_file():
            return True
        assets = ProductionQueueManager._read_mapping(
            settings.output_dir / shot_id / "imports" / "assets.json"
        )
        record = assets.get(slot)
        imported_filename = record.get("filename") if isinstance(record, dict) else None
        return bool(
            isinstance(imported_filename, str)
            and (settings.output_dir / shot_id / "imports" / imported_filename).is_file()
        )

    @staticmethod
    def _has_voice_or_asset(settings: Settings, shot_id: str) -> bool:
        destination = settings.output_dir / shot_id
        if any((destination / name).is_file() for name in ("voice.wav", "voice.mp3")):
            return True
        assets = ProductionQueueManager._read_mapping(destination / "imports" / "assets.json")
        record = assets.get("audio")
        filename = record.get("filename") if isinstance(record, dict) else None
        return bool(isinstance(filename, str) and (destination / "imports" / filename).is_file())

    @staticmethod
    def _keyframe_source(settings: Settings, shot_id: str) -> tuple[str | None, Path | None]:
        generated = settings.output_dir / shot_id / "keyframe.png"
        if generated.is_file():
            return "model", generated
        imported = AssetStore(settings.output_dir).get(shot_id, "keyframe")
        if imported:
            return "manual", imported[1]
        return None, None

    @classmethod
    def _approved_keyframe_source(cls, settings: Settings, shot_id: str) -> str | None:
        source, keyframe = cls._keyframe_source(settings, shot_id)
        if source is None or keyframe is None:
            return None
        approval = cls._read_mapping(settings.output_dir / shot_id / "keyframe-approval.json")
        if (
            approval.get("shot_id") == shot_id
            and approval.get("sha256") == sha256_file(keyframe)
            and approval.get("source") == source
        ):
            return source
        manifest = cls._read_mapping(settings.output_dir / shot_id / "generation.json")
        if source == "model" and str(manifest.get("status", "")).upper() == "APPROVED":
            return source
        return None


def _as_int(value: object, default: int) -> int:
    if isinstance(value, int) and not isinstance(value, bool):
        return value
    if isinstance(value, str):
        try:
            return int(value)
        except ValueError:
            return default
    return default
