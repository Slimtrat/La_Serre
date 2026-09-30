from __future__ import annotations

import hashlib
import json
from collections.abc import Callable, Mapping
from pathlib import Path
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

from apps.api.episode_job_manager import EpisodeJobManager
from apps.api.production_queue import ProductionQueueManager, QueueKind
from apps.api.run_history import RunHistory
from apps.api.schemas import EpisodeGenerationRequest
from apps.api.studio_snapshot import StudioJourneySnapshot
from engine.config import Settings
from engine.director.models import Shot
from engine.world.catalog import EpisodeCatalog


class CockpitModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class CockpitAction(CockpitModel):
    code: str
    label: str
    method: Literal["GET", "POST", "PUT", "PATCH", "DELETE"]
    target: str
    enabled: bool = True
    body: dict[str, object] | None = None
    reason: str | None = None


class CockpitBlocker(CockpitModel):
    code: str
    message: str
    resolutions: list[CockpitAction] = Field(default_factory=list)


class ArtifactState(CockpitModel):
    kind: Literal["keyframe", "video", "voice"]
    required: bool
    present: bool
    approved: bool
    source: Literal["generated", "imported"] | None = None
    url: str | None = None
    sha256: str | None = None
    provenance: dict[str, object] = Field(default_factory=dict)
    stale: bool = False


class ShotCockpitState(CockpitModel):
    id: str
    index: int = Field(ge=1)
    duration: float = Field(gt=0)
    shot: dict[str, object]
    status: Literal[
        "blocked",
        "ready",
        "queued",
        "running",
        "awaiting_approval",
        "failed",
        "stale",
        "complete",
    ]
    stale: bool = False
    artifacts: dict[Literal["keyframe", "video", "voice"], ArtifactState]
    blockers: list[CockpitBlocker] = Field(default_factory=list)
    next_actions: list[CockpitAction] = Field(default_factory=list)
    queue_items: list[dict[str, object]] = Field(default_factory=list)
    history: list[dict[str, Any]] = Field(default_factory=list)


class EpisodeCockpitSnapshot(CockpitModel):
    schema_version: int = 1
    episode: dict[str, object]
    revision: str
    capabilities: dict[str, bool]
    readiness: dict[str, object]
    master: dict[str, object]
    queue: dict[str, object]
    shots: list[ShotCockpitState]
    blockers: list[CockpitBlocker] = Field(default_factory=list)
    next_actions: list[CockpitAction] = Field(default_factory=list)


class CockpitEnqueueRequest(CockpitModel):
    kind: QueueKind
    priority: int = Field(default=0, ge=-100, le=100)
    tts: Literal["auto", "edge", "sapi", "none"] = "auto"
    confirm_replace_approved: bool = False


class ProductionCockpitService:
    """Versioned read model and guarded mutations for the episode production workspace."""

    def __init__(
        self,
        settings_provider: Callable[[], Settings],
        catalog_provider: Callable[[], EpisodeCatalog],
        queue: ProductionQueueManager,
        episode_jobs: EpisodeJobManager,
        snapshot_provider: Callable[[], StudioJourneySnapshot],
    ) -> None:
        self.settings_provider = settings_provider
        self.catalog_provider = catalog_provider
        self.queue = queue
        self.episode_jobs = episode_jobs
        self.snapshot_provider = snapshot_provider

    def build(self, episode_id: str) -> EpisodeCockpitSnapshot:
        package = self.catalog_provider().load(episode_id)
        settings = self.settings_provider()
        journey = self.snapshot_provider()
        if journey.active_episode_id != episode_id:
            # The journey can point at another episode. Its global capabilities remain valid,
            # while readiness and stale state are recomputed for this explicit episode.
            stale_ids: set[str] = set()
        else:
            stale_ids = {
                str(item["id"])
                for item in journey.stale_artifacts
                if isinstance(item.get("id"), str)
            }
        queue_payload = self.queue.listing()
        raw_items = queue_payload.get("items")
        queue_items = raw_items if isinstance(raw_items, list) else []
        rows = [
            self._shot_state(
                shot,
                index=index,
                settings=settings,
                capabilities=journey.capabilities.model_dump(),
                stale=shot.id in stale_ids,
                queue_items=[
                    item
                    for item in queue_items
                    if isinstance(item, dict) and item.get("shot_id") == shot.id
                ],
            )
            for index, shot in enumerate(package.shots, start=1)
        ]
        required = sum(
            int(artifact.required)
            for row in rows
            for artifact in row.artifacts.values()
        )
        present = sum(
            int(artifact.required and artifact.present)
            for row in rows
            for artifact in row.artifacts.values()
        )
        approved = sum(
            int(artifact.required and artifact.approved)
            for row in rows
            for artifact in row.artifacts.values()
        )
        complete = sum(row.status == "complete" for row in rows)
        assemblable = bool(rows) and complete == len(rows)
        master = self._master(settings, episode_id)
        latest_job = self.episode_jobs.latest_for_episode(episode_id)
        blockers: list[CockpitBlocker] = []
        if not rows:
            blockers.append(self._blocker("SHOTS_REQUIRED", "The episode has no shots."))
        elif not assemblable:
            blockers.append(
                self._blocker(
                    "PRODUCTION_INCOMPLETE",
                    "Every required source must be present, current and approved before assembly.",
                )
            )
        readiness: dict[str, object] = {
            "total_shots": len(rows),
            "complete_shots": complete,
            "required_media": required,
            "present_media": present,
            "approved_media": approved,
            "assemblable": assemblable,
        }
        episode = package.episode.model_dump(mode="json")
        payload_for_revision = {
            "episode": episode,
            "capabilities": journey.capabilities.model_dump(),
            "readiness": readiness,
            "master": master,
            "shots": [row.model_dump(mode="json") for row in rows],
            "queue": queue_payload,
            "job": latest_job.public() if latest_job else None,
        }
        revision = hashlib.sha256(
            json.dumps(payload_for_revision, sort_keys=True, separators=(",", ":")).encode()
        ).hexdigest()
        assemble_body = EpisodeGenerationRequest().model_dump(mode="json")
        assemble_action = CockpitAction(
            code="ASSEMBLE_EPISODE",
            label="Assemble episode",
            method="POST",
            target=f"/api/episodes/{episode_id}/production-cockpit/assemble",
            enabled=assemblable,
            body=assemble_body,
            reason=None if assemblable else "All required sources must be approved first.",
        )
        master["job"] = latest_job.public() if latest_job else None
        return EpisodeCockpitSnapshot(
            episode=episode,
            revision=revision,
            capabilities=journey.capabilities.model_dump(),
            readiness=readiness,
            master=master,
            queue=queue_payload,
            shots=rows,
            blockers=blockers,
            next_actions=[
                CockpitAction(
                    code="PRODUCE_MISSING",
                    label="Produce missing media",
                    method="POST",
                    target="/api/production-queue/batch/missing",
                    body={"episode_id": episode_id, "priority": 0, "tts": "auto"},
                ),
                assemble_action,
                CockpitAction(
                    code="INSPECT_PIPELINE",
                    label="Inspect pipeline",
                    method="GET",
                    target=f"#/advanced/graph?episode={episode_id}",
                ),
            ],
        )

    async def enqueue_shot(
        self,
        episode_id: str,
        shot_id: str,
        request: CockpitEnqueueRequest,
    ) -> dict[str, object]:
        shot = self._shot(episode_id, shot_id)
        settings = self.settings_provider()
        keyframe = self._keyframe(settings, shot_id, stale=False)
        selected = {
            QueueKind.KEYFRAME: keyframe,
            QueueKind.VIDEO: self._video(
                settings, shot_id, keyframe.approved, stale=False
            ),
            QueueKind.VOICE: self._voice(
                settings, shot_id, shot.dialogue is not None, stale=False
            ),
            QueueKind.MUSIC: None,
        }[request.kind]
        if selected is not None and selected.approved and not request.confirm_replace_approved:
            raise PermissionError(
                f"The current {selected.kind} is approved; explicit replacement "
                "confirmation is required."
            )
        return await self.queue.enqueue(
            shot.model_dump(mode="json"),
            request.kind,
            priority=request.priority,
            force=request.confirm_replace_approved,
            tts=request.tts,
        )

    async def assemble(
        self, episode_id: str, request: EpisodeGenerationRequest
    ) -> dict[str, object]:
        snapshot = self.build(episode_id)
        if snapshot.readiness.get("assemblable") is not True:
            raise PermissionError(
                "Every required source must be present, current and approved before assembly."
            )
        job = await self.episode_jobs.start(episode_id, request)
        return job.public()

    def _shot(self, episode_id: str, shot_id: str) -> Shot:
        package = self.catalog_provider().load(episode_id)
        try:
            return next(shot for shot in package.shots if shot.id == shot_id)
        except StopIteration as exc:
            raise KeyError(shot_id) from exc

    def _shot_state(
        self,
        shot: Shot,
        *,
        index: int,
        settings: Settings,
        capabilities: Mapping[str, bool],
        stale: bool,
        queue_items: list[dict[str, object]],
    ) -> ShotCockpitState:
        keyframe = self._keyframe(settings, shot.id, stale)
        video = self._video(settings, shot.id, keyframe.approved, stale)
        voice = self._voice(settings, shot.id, shot.dialogue is not None, stale)
        artifacts = {"keyframe": keyframe, "video": video, "voice": voice}
        statuses = {str(item.get("status", "")) for item in queue_items}
        blockers: list[CockpitBlocker] = []
        if stale:
            blockers.append(
                self._blocker("STALE_SOURCE", "This shot depends on changed canonical content.")
            )
        if keyframe.present and not keyframe.approved and not video.source == "imported":
            blockers.append(
                self._blocker(
                    "KEYFRAME_APPROVAL_REQUIRED",
                    "The current keyframe requires explicit human approval.",
                )
            )
        if not video.present and not capabilities.get("video", False):
            blockers.append(
                CockpitBlocker(
                    code="VIDEO_RUNTIME_UNAVAILABLE",
                    message=(
                        "Local video generation is unavailable; manual import "
                        "remains available."
                    ),
                    resolutions=[
                        CockpitAction(
                            code="OPEN_SETUP",
                            label="Open setup",
                            method="GET",
                            target="#/settings",
                        ),
                        CockpitAction(
                            code="IMPORT_VIDEO",
                            label="Import video",
                            method="PUT",
                            target=f"/api/assets/{shot.id}/video?filename=clip.mp4",
                        ),
                    ],
                )
            )
        required_artifacts = [item for item in artifacts.values() if item.required]
        complete = bool(required_artifacts) and all(
            item.present and item.approved and not item.stale for item in required_artifacts
        )
        if stale:
            status = "stale"
        elif "running" in statuses:
            status = "running"
        elif "queued" in statuses:
            status = "queued"
        elif "awaiting_approval" in statuses or (keyframe.present and not keyframe.approved):
            status = "awaiting_approval"
        elif complete:
            status = "complete"
        elif "failed" in statuses:
            status = "failed"
        elif blockers:
            status = "blocked"
        else:
            status = "ready"
        actions = self._shot_actions(
            shot, keyframe, video, voice, capabilities, queue_items
        )
        return ShotCockpitState(
            id=shot.id,
            index=index,
            duration=shot.duration,
            shot=shot.model_dump(mode="json"),
            status=status,
            stale=stale,
            artifacts=artifacts,
            blockers=blockers,
            next_actions=actions,
            queue_items=queue_items,
            history=RunHistory(settings.output_dir).list_runs(shot.id),
        )

    def _shot_actions(
        self,
        shot: Shot,
        keyframe: ArtifactState,
        video: ArtifactState,
        voice: ArtifactState,
        capabilities: Mapping[str, bool],
        queue_items: list[dict[str, object]],
    ) -> list[CockpitAction]:
        episode_id = shot.id.rsplit("-S", 1)[0]
        enqueue_target = (
            f"/api/episodes/{episode_id}/production-cockpit/"
            f"shots/{shot.id}/enqueue"
        )
        actions: list[CockpitAction] = []
        retryable = [
            item
            for item in queue_items
            if item.get("status") in {"failed", "cancelled", "awaiting_approval"}
            and isinstance(item.get("id"), str)
        ]
        if retryable:
            latest = max(retryable, key=lambda item: str(item.get("updated_at", "")))
            actions.append(
                CockpitAction(
                    code="RETRY_QUEUE_ITEM",
                    label="Retry failed task",
                    method="POST",
                    target=f"/api/production-queue/items/{latest['id']}/retry",
                )
            )
        if keyframe.present and not keyframe.approved:
            actions.append(
                CockpitAction(
                    code="APPROVE_KEYFRAME",
                    label="Approve keyframe",
                    method="POST",
                    target=f"/api/production-queue/shots/{shot.id}/approve",
                )
            )
        actions.extend(
            [
                CockpitAction(
                    code="GENERATE_KEYFRAME" if not keyframe.present else "REROLL_KEYFRAME",
                    label="Generate keyframe" if not keyframe.present else "Reroll keyframe",
                    method="POST",
                    target=enqueue_target,
                    enabled=bool(capabilities.get("image", False)),
                    body={
                        "kind": "keyframe",
                        "priority": 0,
                        "tts": "auto",
                        "confirm_replace_approved": False,
                    },
                    reason=(
                        None
                        if capabilities.get("image", False)
                        else "Image runtime unavailable."
                    ),
                ),
                CockpitAction(
                    code="IMPORT_KEYFRAME",
                    label="Import keyframe",
                    method="PUT",
                    target=f"/api/assets/{shot.id}/keyframe?filename=keyframe.png",
                ),
                CockpitAction(
                    code="GENERATE_VIDEO" if not video.present else "REROLL_VIDEO",
                    label="Generate video" if not video.present else "Reroll video",
                    method="POST",
                    target=enqueue_target,
                    enabled=bool(capabilities.get("video", False) and keyframe.approved),
                    body={
                        "kind": "video",
                        "priority": 0,
                        "tts": "auto",
                        "confirm_replace_approved": False,
                    },
                    reason=(
                        None
                        if capabilities.get("video", False) and keyframe.approved
                        else "An approved keyframe and video runtime are required."
                    ),
                ),
                CockpitAction(
                    code="IMPORT_VIDEO",
                    label="Import video",
                    method="PUT",
                    target=f"/api/assets/{shot.id}/video?filename=clip.mp4",
                ),
            ]
        )
        if voice.required:
            actions.extend(
                [
                    CockpitAction(
                        code="GENERATE_VOICE" if not voice.present else "REROLL_VOICE",
                        label="Generate voice" if not voice.present else "Reroll voice",
                        method="POST",
                        target=enqueue_target,
                        body={
                            "kind": "voice",
                            "priority": 0,
                            "tts": "auto",
                            "confirm_replace_approved": False,
                        },
                    ),
                    CockpitAction(
                        code="IMPORT_VOICE",
                        label="Import voice",
                        method="PUT",
                        target=f"/api/assets/{shot.id}/audio?filename=voice.wav",
                    ),
                ]
            )
        for run in RunHistory(self.settings_provider().output_dir).list_runs(shot.id):
            run_id = run.get("id")
            if run.get("current") is not True and isinstance(run_id, str):
                actions.append(
                    CockpitAction(
                        code="RESTORE_RUN",
                        label="Restore this version",
                        method="POST",
                        target=f"/api/history/{shot.id}/{run_id}/restore",
                    )
                )
        return actions

    def _keyframe(self, settings: Settings, shot_id: str, stale: bool) -> ArtifactState:
        imported = self._imported(settings, shot_id, "keyframe")
        generated = settings.output_dir / shot_id / "keyframe.png"
        if generated.is_file() and generated.stat().st_size:
            path = generated
            source: Literal["generated", "imported"] = "generated"
            url = f"/api/media/{shot_id}/keyframe.png"
            provenance = self._manifest(settings, shot_id)
        elif imported:
            record, path = imported
            source = "imported"
            url = f"/api/assets/{shot_id}/keyframe/content"
            provenance = record
        else:
            return ArtifactState(
                kind="keyframe", required=False, present=False, approved=False, stale=stale
            )
        digest = self._sha(path)
        approval = self._approval(settings, shot_id)
        approved = bool(
            approval.get("shot_id") == shot_id
            and approval.get("sha256") == digest
            and approval.get("source") == ("model" if source == "generated" else "manual")
        )
        return ArtifactState(
            kind="keyframe",
            required=False,
            present=True,
            approved=approved,
            source=source,
            url=url,
            sha256=digest,
            provenance=provenance,
            stale=stale,
        )

    def _video(
        self, settings: Settings, shot_id: str, keyframe_approved: bool, stale: bool
    ) -> ArtifactState:
        imported = self._imported(settings, shot_id, "video")
        generated = settings.output_dir / shot_id / "clip.mp4"
        if imported:
            record, path = imported
            return ArtifactState(
                kind="video",
                required=True,
                present=True,
                approved=True,
                source="imported",
                url=f"/api/assets/{shot_id}/video/content",
                sha256=self._sha(path),
                provenance=record,
                stale=stale,
            )
        if not generated.is_file() or not generated.stat().st_size:
            return ArtifactState(
                kind="video", required=True, present=False, approved=False, stale=stale
            )
        manifest = self._manifest(settings, shot_id)
        digest = self._sha(generated)
        outputs = manifest.get("outputs")
        verified = bool(
            str(manifest.get("status", "")).upper() == "GENERATED"
            and isinstance(outputs, list)
            and any(
                isinstance(item, dict)
                and Path(str(item.get("path", ""))).name == "clip.mp4"
                and item.get("sha256") == digest
                for item in outputs
            )
        )
        return ArtifactState(
            kind="video",
            required=True,
            present=True,
            approved=keyframe_approved and verified,
            source="generated",
            url=f"/api/media/{shot_id}/clip.mp4",
            sha256=digest,
            provenance=manifest,
            stale=stale,
        )

    def _voice(
        self, settings: Settings, shot_id: str, required: bool, stale: bool
    ) -> ArtifactState:
        imported = self._imported(settings, shot_id, "audio")
        if imported:
            record, path = imported
            return ArtifactState(
                kind="voice",
                required=required,
                present=True,
                approved=True,
                source="imported",
                url=f"/api/assets/{shot_id}/audio/content",
                sha256=self._sha(path),
                provenance=record,
                stale=stale,
            )
        for filename in ("voice.wav", "voice.mp3"):
            path = settings.output_dir / shot_id / filename
            if path.is_file() and path.stat().st_size:
                return ArtifactState(
                    kind="voice",
                    required=required,
                    present=True,
                    approved=True,
                    source="generated",
                    url=f"/api/media/{shot_id}/{filename}",
                    sha256=self._sha(path),
                    stale=stale,
                )
        return ArtifactState(
            kind="voice", required=required, present=False, approved=False, stale=stale
        )

    def _master(self, settings: Settings, episode_id: str) -> dict[str, object]:
        directory = settings.output_dir / episode_id
        manifest = self._read_json(directory / "episode-generation.json")
        video = directory / "episode.mp4"
        status = manifest.get("status")
        return {
            "available": video.is_file() and video.stat().st_size > 0,
            "status": status,
            "release_eligible": status == "FINAL" and video.is_file() and video.stat().st_size > 0,
            "url": f"/api/episode-media/{episode_id}/episode.mp4" if video.is_file() else None,
            "manifest_url": (
                f"/api/episode-media/{episode_id}/episode-generation.json"
                if manifest
                else None
            ),
        }

    def _approved_keyframe(self, settings: Settings, shot_id: str) -> bool:
        return self._keyframe(settings, shot_id, stale=False).approved

    def _imported(
        self, settings: Settings, shot_id: str, slot: str
    ) -> tuple[dict[str, object], Path] | None:
        manifest = self._read_json(settings.output_dir / shot_id / "imports" / "assets.json")
        raw = manifest.get(slot)
        if not isinstance(raw, dict) or not isinstance(raw.get("filename"), str):
            return None
        path = settings.output_dir / shot_id / "imports" / str(raw["filename"])
        return (raw, path) if path.is_file() and path.stat().st_size else None

    def _manifest(self, settings: Settings, shot_id: str) -> dict[str, object]:
        return self._read_json(settings.output_dir / shot_id / "generation.json")

    def _approval(self, settings: Settings, shot_id: str) -> dict[str, object]:
        return self._read_json(settings.output_dir / shot_id / "keyframe-approval.json")

    @staticmethod
    def _read_json(path: Path) -> dict[str, object]:
        try:
            payload = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, ValueError):
            return {}
        return payload if isinstance(payload, dict) else {}

    @staticmethod
    def _sha(path: Path) -> str:
        return hashlib.sha256(path.read_bytes()).hexdigest()

    @staticmethod
    def _blocker(code: str, message: str) -> CockpitBlocker:
        return CockpitBlocker(code=code, message=message)
