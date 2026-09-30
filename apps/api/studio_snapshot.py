from __future__ import annotations

import hashlib
import json
from collections.abc import Callable, Iterable, Mapping
from enum import StrEnum
from pathlib import Path
from typing import Literal, cast

from pydantic import BaseModel, ConfigDict, Field

from engine.director.models import Shot
from engine.narrative.episode_models import Episode, EpisodeStatus
from engine.narrative.guided_authoring import (
    GuidedAuthoringRegistry,
    GuidedAuthoringState,
    guided_completion,
)
from engine.narrative.narrative_workflow import NarrativeWorkflowRegistry
from engine.narrative.workflow_models import SeriesNarrativeWorkflow, StageStatus
from engine.world.bible import BibleRegistry
from engine.world.catalog import EpisodeCatalog
from engine.world.impact import BibleImpactAnalyzer
from engine.world.models import ProjectBible
from engine.world.visual_identity import VisualIdentityRegistry


class SnapshotModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class JourneyStatus(StrEnum):
    EMPTY = "empty"
    DRAFT = "draft"
    READY = "ready"
    APPROVED = "approved"
    RUNNING = "running"
    BLOCKED = "blocked"
    FAILED = "failed"
    STALE = "stale"
    COMPLETED = "completed"


JourneyStageId = Literal[
    "idea", "casting", "relationships", "season", "episode", "storyboard", "production", "release"
]


class PrimaryAction(SnapshotModel):
    code: str
    label: str
    target: str
    mode: Literal["manual", "review", "generate", "settings"] = "manual"


class Blocker(SnapshotModel):
    code: str
    message: str
    resolution: PrimaryAction


class JourneyStageSnapshot(SnapshotModel):
    id: JourneyStageId
    status: JourneyStatus
    count: int = Field(default=0, ge=0)
    blockers: list[Blocker] = Field(default_factory=list)
    primary_action: PrimaryAction


class JourneyCounts(SnapshotModel):
    episodes: int = 0
    shots: int = 0
    generated_media: int = 0
    stale_artifacts: int = 0
    active_jobs: int = 0
    awaiting_approval: int = 0
    failed_jobs: int = 0
    required_media: int = 0
    approved_media: int = 0
    complete_shots: int = 0
    incomplete_shots: int = 0


class RuntimeCapabilities(SnapshotModel):
    narrative: bool = False
    image: bool = False
    video: bool = False
    manual_import: bool = True


class ProductionReadiness(SnapshotModel):
    required_media: int = 0
    present_media: int = 0
    approved_media: int = 0
    complete_shots: int = 0
    total_shots: int = 0
    assemblable: bool = False
    master_available: bool = False


class StudioJourneySnapshot(SnapshotModel):
    schema_version: int = 1
    project_id: str
    active_episode_id: str | None
    revision: str
    counts: JourneyCounts
    capabilities: RuntimeCapabilities = Field(default_factory=RuntimeCapabilities)
    production: ProductionReadiness = Field(default_factory=ProductionReadiness)
    stale_artifacts: list[dict[str, object]]
    stages: list[JourneyStageSnapshot]


ActionMode = Literal["manual", "review", "generate", "settings"]


def action(
    code: str,
    label: str,
    target: str,
    mode: ActionMode = "manual",
) -> PrimaryAction:
    return PrimaryAction(code=code, label=label, target=target, mode=mode)


def blocker(code: str, message: str, resolution: PrimaryAction) -> Blocker:
    return Blocker(code=code, message=message, resolution=resolution)


class StudioJourneyService:
    """Build a deterministic read model from the active project's persisted truth."""

    def __init__(
        self,
        *,
        project_id: str,
        private_root: Path,
        output_root: Path,
        runtime_provider: Callable[[], Mapping[str, object]],
        queue_provider: Callable[[], Mapping[str, object]],
        jobs_provider: Callable[[], Iterable[Mapping[str, object]]] = tuple,
    ) -> None:
        self.project_id = project_id
        self.private_root = private_root
        self.output_root = output_root
        self.runtime_provider = runtime_provider
        self.queue_provider = queue_provider
        self.jobs_provider = jobs_provider

    def build(self) -> StudioJourneySnapshot:
        guided = GuidedAuthoringRegistry(self.private_root).load()
        completion = guided_completion(guided)
        bible_registry = BibleRegistry(self.private_root)
        bible = bible_registry.load()
        workflow = NarrativeWorkflowRegistry(self.private_root).load()
        catalog = EpisodeCatalog(self.private_root)
        episodes = catalog.list_episodes()
        active_id = guided.active_episode_id
        if active_id not in {item.id for item in episodes}:
            active_id = episodes[0].id if episodes else None
        package = catalog.load(active_id) if active_id else None
        episode = package.episode if package else None
        shots = package.shots if package else []
        shot_ids = [shot.id for shot in shots]

        impact = BibleImpactAnalyzer(bible_registry, self.output_root).analyze(bible)
        raw_stale = impact["artifacts"]
        all_stale = (
            [cast(dict[str, object], item) for item in raw_stale if isinstance(item, dict)]
            if isinstance(raw_stale, list)
            else []
        )
        stale = self._relevant_stale(all_stale, active_id)
        stale_keys = {(item.get("kind"), item.get("id")) for item in stale}
        stale.extend(
            item
            for item in self._visual_stale(shots)
            if (item.get("kind"), item.get("id")) not in stale_keys
        )
        queue_items = self._relevant_items(
            self._items(self.queue_provider().get("items")), active_id
        )
        jobs = self._relevant_items(list(self.jobs_provider()), active_id)
        statuses = [str(item.get("status", "")).lower() for item in [*queue_items, *jobs]]
        active_jobs = sum(status in {"queued", "running", "generating"} for status in statuses)
        approvals = sum(
            status in {"awaiting_approval", "awaiting_keyframe_approval"} for status in statuses
        )
        failures = sum(status == "failed" for status in statuses)
        production = self._production_readiness(shots, active_id)
        generated_media = self._generated_media(shot_ids, active_id)
        capabilities = self._runtime_capabilities(self.runtime_provider())

        counts = JourneyCounts(
            episodes=len(episodes),
            shots=len(shot_ids),
            generated_media=generated_media,
            stale_artifacts=len(stale),
            active_jobs=active_jobs,
            awaiting_approval=approvals,
            failed_jobs=failures,
            required_media=production.required_media,
            approved_media=production.approved_media,
            complete_shots=production.complete_shots,
            incomplete_shots=max(production.total_shots - production.complete_shots, 0),
        )
        stages = self._stages(
            completion=completion,
            guided=guided,
            bible=bible,
            workflow=workflow,
            episode=episode,
            counts=counts,
            capabilities=capabilities,
            production=production,
            stale=stale,
        )
        payload = {
            "schema_version": 1,
            "project_id": self.project_id,
            "active_episode_id": active_id,
            "counts": counts.model_dump(mode="json"),
            "capabilities": capabilities.model_dump(mode="json"),
            "production": production.model_dump(mode="json"),
            "stale_artifacts": stale,
            "stages": [stage.model_dump(mode="json") for stage in stages],
        }
        revision = hashlib.sha256(
            json.dumps(payload, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode()
        ).hexdigest()
        return StudioJourneySnapshot(**payload, revision=revision)

    @staticmethod
    def _items(value: object) -> list[Mapping[str, object]]:
        return (
            [item for item in value if isinstance(item, Mapping)] if isinstance(value, list) else []
        )

    @staticmethod
    def _runtime_capabilities(runtime: Mapping[str, object]) -> RuntimeCapabilities:
        services = runtime.get("services")
        if not isinstance(services, list):
            return RuntimeCapabilities()

        def ready(name: str) -> bool:
            return any(
                isinstance(service, Mapping)
                and str(service.get("name", "")).lower() == name
                and (
                    str(service.get("state", service.get("status", ""))).lower()
                    in {"ready", "running"}
                    or service.get("reachable") is True
                )
                for service in services
            )

        declared = runtime.get("capabilities")
        capability_evidence = declared if isinstance(declared, Mapping) else {}
        comfyui = ready("comfyui")
        return RuntimeCapabilities(
            narrative=ready("ollama") and capability_evidence.get("narrative") is True,
            image=comfyui and capability_evidence.get("image") is True,
            video=comfyui and capability_evidence.get("video") is True,
        )

    @staticmethod
    def _relevant_items(
        items: Iterable[Mapping[str, object]], episode_id: str | None
    ) -> list[Mapping[str, object]]:
        if episode_id is None:
            return []
        relevant = []
        for item in items:
            item_episode = item.get("episode_id")
            shot_id = item.get("shot_id")
            if item_episode is None and shot_id is None:
                relevant.append(item)
            elif item_episode == episode_id or (
                isinstance(shot_id, str) and shot_id.startswith(f"{episode_id}-S")
            ):
                relevant.append(item)
        return relevant

    @staticmethod
    def _relevant_stale(
        items: list[dict[str, object]], episode_id: str | None
    ) -> list[dict[str, object]]:
        if episode_id is None:
            return []
        return [
            item
            for item in items
            if item.get("id") == episode_id
            or (isinstance(item.get("id"), str) and str(item["id"]).startswith(f"{episode_id}-S"))
        ]

    def _visual_stale(self, shots: Iterable[Shot]) -> list[dict[str, object]]:
        active = VisualIdentityRegistry(self.private_root).active_references()
        stale: list[dict[str, object]] = []
        for shot in shots:
            if not self._has_shot_artifact(shot.id):
                continue
            mismatched = []
            for character in shot.characters:
                master = active.get(character.id)
                references = {Path(path).resolve() for path in character.reference_images}
                if master is not None and master.resolve() not in references:
                    mismatched.append(character.id)
            if mismatched:
                stale.append(
                    {
                        "kind": "shot",
                        "id": shot.id,
                        "status": "stale",
                        "built_revision": 0,
                        "impacted_by": [],
                        "reason": "visual_identity_changed",
                        "character_ids": sorted(mismatched),
                    }
                )
        return stale

    def _has_shot_artifact(self, shot_id: str) -> bool:
        directory = self.output_root / shot_id
        return any(
            path.is_file()
            for path in (
                directory / "keyframe.png",
                directory / "clip.mp4",
                directory / "generation.json",
                directory / "imports" / "assets.json",
            )
        )

    def _production_readiness(
        self, shots: Iterable[Shot], episode_id: str | None
    ) -> ProductionReadiness:
        rows = list(shots)
        required = present = approved = complete = 0
        for shot in rows:
            visual_present, visual_approved = self._visual_media_state(shot.id)
            required += 1
            present += int(visual_present)
            approved += int(visual_approved)
            shot_complete = visual_present and visual_approved
            if shot.dialogue is not None:
                required += 1
                voice_present = self._voice_present(shot.id)
                present += int(voice_present)
                approved += int(voice_present)
                shot_complete = shot_complete and voice_present
            complete += int(shot_complete)
        master_path = self.output_root / episode_id / "episode.mp4" if episode_id else None
        master = bool(
            master_path is not None
            and master_path.is_file()
            and master_path.stat().st_size > 0
            and self._master_status(episode_id) == "FINAL"
        )
        return ProductionReadiness(
            required_media=required,
            present_media=present,
            approved_media=approved,
            complete_shots=complete,
            total_shots=len(rows),
            assemblable=bool(rows) and complete == len(rows),
            master_available=master,
        )

    def _visual_media_state(self, shot_id: str) -> tuple[bool, bool]:
        directory = self.output_root / shot_id
        imported_video = self._imported_asset_path(shot_id, "video")
        clip = directory / "clip.mp4"
        if imported_video is not None:
            return True, True
        if clip.is_file() and clip.stat().st_size > 0:
            return True, (
                self._approved_keyframe(shot_id)
                and self._generated_clip_verified(shot_id, clip)
            )
        return False, False

    def _generated_clip_verified(self, shot_id: str, clip: Path) -> bool:
        manifest_path = self.output_root / shot_id / "generation.json"
        try:
            payload = json.loads(manifest_path.read_text(encoding="utf-8"))
        except (OSError, ValueError):
            return False
        if not isinstance(payload, dict) or str(payload.get("status", "")).upper() != "GENERATED":
            return False
        outputs = payload.get("outputs")
        if not isinstance(outputs, list):
            return False
        digest = hashlib.sha256(clip.read_bytes()).hexdigest()
        return any(
            isinstance(item, dict)
            and Path(str(item.get("path", ""))).name == clip.name
            and item.get("sha256") == digest
            for item in outputs
        )

    def _master_status(self, episode_id: str | None) -> str | None:
        if episode_id is None:
            return None
        manifest = self.output_root / episode_id / "episode-generation.json"
        try:
            payload = json.loads(manifest.read_text(encoding="utf-8"))
        except (OSError, ValueError):
            return None
        return str(payload.get("status")) if isinstance(payload, dict) else None

    def _voice_present(self, shot_id: str) -> bool:
        directory = self.output_root / shot_id
        return bool(
            self._imported_asset_path(shot_id, "audio")
            or any(path.is_file() and path.stat().st_size > 0 for path in directory.glob("voice.*"))
        )

    def _imported_asset_path(self, shot_id: str, slot: str) -> Path | None:
        manifest_path = self.output_root / shot_id / "imports" / "assets.json"
        try:
            payload = json.loads(manifest_path.read_text(encoding="utf-8"))
            record = payload.get(slot) if isinstance(payload, dict) else None
            filename = record.get("filename") if isinstance(record, dict) else None
        except (OSError, ValueError):
            return None
        if not isinstance(filename, str):
            return None
        path = manifest_path.parent / filename
        return path if path.is_file() and path.stat().st_size > 0 else None

    def _keyframe_path(self, shot_id: str) -> tuple[str, Path] | None:
        generated = self.output_root / shot_id / "keyframe.png"
        if generated.is_file() and generated.stat().st_size > 0:
            return "model", generated
        imported = self._imported_asset_path(shot_id, "keyframe")
        return ("manual", imported) if imported is not None else None

    def _approved_keyframe(self, shot_id: str) -> bool:
        source_and_path = self._keyframe_path(shot_id)
        if source_and_path is None:
            return False
        source, keyframe = source_and_path
        directory = self.output_root / shot_id
        try:
            approval = json.loads(
                (directory / "keyframe-approval.json").read_text(encoding="utf-8")
            )
        except (OSError, ValueError):
            approval = {}
        if isinstance(approval, dict) and approval.get("shot_id") == shot_id:
            digest = hashlib.sha256(keyframe.read_bytes()).hexdigest()
            if approval.get("sha256") == digest and approval.get("source") == source:
                return True
        if source != "model":
            return False
        try:
            manifest = json.loads((directory / "generation.json").read_text(encoding="utf-8"))
        except (OSError, ValueError):
            return False
        return isinstance(manifest, dict) and str(manifest.get("status", "")).upper() == "APPROVED"

    def _generated_media(self, shot_ids: list[str], episode_id: str | None) -> int:
        filenames = ("keyframe.png", "clip.mp4", "voice.wav", "voice.mp3")
        count = sum(
            (self.output_root / shot / name).is_file() for shot in shot_ids for name in filenames
        )
        if episode_id and (self.output_root / episode_id / "episode.mp4").is_file():
            count += 1
        return count

    def _stages(
        self,
        *,
        completion: dict[str, object],
        guided: GuidedAuthoringState,
        bible: ProjectBible,
        workflow: SeriesNarrativeWorkflow,
        episode: Episode | None,
        counts: JourneyCounts,
        capabilities: RuntimeCapabilities,
        production: ProductionReadiness,
        stale: list[dict[str, object]],
    ) -> list[JourneyStageSnapshot]:

        brief = completion["brief"]
        idea_ready = isinstance(brief, dict) and brief.get("ready") is True
        idea_status = (
            JourneyStatus.READY
            if idea_ready
            else (JourneyStatus.DRAFT if guided.revision else JourneyStatus.EMPTY)
        )
        characters = completion["characters"]
        character_rows = characters if isinstance(characters, list) else []
        casting_status = JourneyStatus.EMPTY
        casting_blockers: list[Blocker] = []
        if character_rows:
            casting_status = (
                JourneyStatus.READY
                if all(row.get("promoted") for row in character_rows)
                else JourneyStatus.DRAFT
            )
        elif bible.characters:
            casting_status = JourneyStatus.READY
        canonical_ids = {item.id for item in bible.characters}
        visual_board = VisualIdentityRegistry(self.private_root).load()
        mastered_ids = {
            item.character_id
            for item in visual_board.characters
            if item.active_master_id is not None
        }
        narrative_approved = bool(canonical_ids) and (
            not character_rows or all(row.get("promoted") for row in character_rows)
        )
        missing_masters = canonical_ids - mastered_ids
        if canonical_ids and missing_masters:
            casting_status = JourneyStatus.READY
            casting_blockers.append(
                blocker(
                    "VISUAL_MASTER_REQUIRED",
                    (
                        f"{len(missing_masters)} personnage(s) canonique(s) "
                        "attendent une identité visuelle maître."
                    ),
                    action(
                        "OPEN_CASTING",
                        "Définir les apparences",
                        "#/create?stage=casting",
                        "review",
                    ),
                )
            )
        elif narrative_approved:
            casting_status = JourneyStatus.APPROVED
        character_count = max(len(character_rows), len(bible.characters))
        relationships = bible.relationships
        relationship_status = JourneyStatus.READY if relationships else JourneyStatus.EMPTY
        narrative = [
            workflow.director.status,
            workflow.screenwriter.status,
            workflow.validator.status,
        ]
        season_status = (
            JourneyStatus.APPROVED
            if all(item is StageStatus.APPROVED for item in narrative)
            else JourneyStatus.DRAFT
            if any(item is not StageStatus.EMPTY for item in narrative)
            else JourneyStatus.EMPTY
        )
        episode_status = JourneyStatus.EMPTY
        if episode is not None:
            raw = episode.status.value
            episode_status = (
                JourneyStatus.APPROVED
                if raw == "approved"
                else JourneyStatus.COMPLETED
                if raw in {"breakdown", "production", "final"}
                else JourneyStatus.DRAFT
            )
        storyboard_status = (
            JourneyStatus.BLOCKED
            if episode is None
            else JourneyStatus.APPROVED
            if counts.shots
            else JourneyStatus.EMPTY
        )
        storyboard_blockers = (
            [
                blocker(
                    "EPISODE_REQUIRED",
                    "Crée ou sélectionne un épisode avant de le découper.",
                    action("EDIT_EPISODE", "Écrire l’épisode", "#/produce"),
                )
            ]
            if episode is None
            else []
        )

        production_blockers: list[Blocker] = []
        if counts.failed_jobs:
            production_status = JourneyStatus.FAILED
        elif stale:
            production_status = JourneyStatus.STALE
        elif counts.awaiting_approval:
            production_status = JourneyStatus.BLOCKED
            production_blockers.append(
                blocker(
                    "HUMAN_APPROVAL_REQUIRED",
                    "Une proposition attend une décision humaine.",
                    action("REVIEW_MEDIA", "Relire les médias", "#/produce", "review"),
                )
            )
        elif counts.active_jobs:
            production_status = JourneyStatus.RUNNING
        elif production.assemblable:
            production_status = JourneyStatus.COMPLETED
        elif production.present_media > production.approved_media:
            production_status = JourneyStatus.BLOCKED
            production_blockers.append(
                blocker(
                    "HUMAN_APPROVAL_REQUIRED",
                    "Un média présent attend une validation humaine explicite.",
                    action("REVIEW_MEDIA", "Relire les médias", "#/produce", "review"),
                )
            )
        elif counts.shots and not (capabilities.image and capabilities.video):
            production_status = JourneyStatus.BLOCKED
            production_blockers.append(
                blocker(
                    "IMAGE_VIDEO_RUNTIME_UNAVAILABLE",
                    "La capacité image/vidéo locale manque. L’import manuel reste possible.",
                    action("CONFIGURE_RUNTIME", "Configurer les moteurs", "#/settings", "settings"),
                )
            )
        elif counts.shots:
            production_status = JourneyStatus.READY
        else:
            production_status = JourneyStatus.EMPTY

        release_stale = bool(stale)
        episode_approved = bool(
            episode is not None
            and episode.status
            in {
                EpisodeStatus.APPROVED,
                EpisodeStatus.BREAKDOWN,
                EpisodeStatus.PRODUCTION,
                EpisodeStatus.FINAL,
            }
        )
        release_status = (
            JourneyStatus.STALE
            if release_stale
            else JourneyStatus.READY
            if production.master_available and production.assemblable and episode_approved
            else JourneyStatus.BLOCKED
            if episode is not None
            else JourneyStatus.EMPTY
        )

        release_blockers: list[Blocker] = []
        if release_status is JourneyStatus.BLOCKED:
            if not episode_approved:
                release_code = "EPISODE_APPROVAL_REQUIRED"
                release_message = "L’épisode narratif doit être approuvé avant toute release."
            elif production.assemblable:
                release_code = "MASTER_REQUIRED"
                release_message = (
                    "Un master FINAL assemblé et vérifiable est requis avant la release."
                )
            else:
                release_code = "PRODUCTION_INCOMPLETE"
                release_message = (
                    "Tous les clips requis doivent être présents et validés avant l’assemblage."
                )
            release_blockers.append(
                blocker(
                    release_code,
                    release_message,
                    action("OPEN_PRODUCTION", "Ouvrir la production", "#/produce"),
                )
            )

        return [
            JourneyStageSnapshot(
                id="idea",
                status=idea_status,
                primary_action=action("EDIT_IDEA", "Définir l’idée", "#/create?stage=idea"),
            ),
            JourneyStageSnapshot(
                id="casting",
                status=casting_status,
                count=character_count,
                blockers=casting_blockers,
                primary_action=action("EDIT_CAST", "Définir le casting", "#/create?stage=casting"),
            ),
            JourneyStageSnapshot(
                id="relationships",
                status=relationship_status,
                count=len(relationships),
                primary_action=action("EDIT_RELATIONSHIPS", "Définir les relations", "#/bible"),
            ),
            JourneyStageSnapshot(
                id="season",
                status=season_status,
                primary_action=action(
                    "EDIT_SEASON", "Construire la saison", "#/create?stage=season"
                ),
            ),
            JourneyStageSnapshot(
                id="episode",
                status=episode_status,
                count=counts.episodes,
                primary_action=action("EDIT_EPISODE", "Écrire l’épisode", "#/produce"),
            ),
            JourneyStageSnapshot(
                id="storyboard",
                status=storyboard_status,
                count=counts.shots,
                blockers=storyboard_blockers,
                primary_action=action("EDIT_STORYBOARD", "Découper en plans", "#/produce"),
            ),
            JourneyStageSnapshot(
                id="production",
                status=production_status,
                count=counts.generated_media,
                blockers=production_blockers,
                primary_action=action(
                    "IMPORT_OR_GENERATE_MEDIA", "Produire ou importer", "#/produce", "generate"
                ),
            ),
            JourneyStageSnapshot(
                id="release",
                status=release_status,
                blockers=release_blockers,
                primary_action=action(
                    "REVIEW_RELEASE", "Vérifier la sortie", "#/results", "review"
                ),
            ),
        ]
