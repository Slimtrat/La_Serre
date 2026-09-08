from __future__ import annotations

import hashlib
import json
from collections.abc import Callable, Iterable, Mapping
from enum import StrEnum
from pathlib import Path
from typing import Literal, cast

from pydantic import BaseModel, ConfigDict, Field

from engine.narrative.episode_models import Episode
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


class StudioJourneySnapshot(SnapshotModel):
    schema_version: int = 1
    project_id: str
    active_episode_id: str | None
    revision: str
    counts: JourneyCounts
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
        episode = catalog.get(active_id) if active_id else None
        shot_ids = episode.shot_order if episode else []

        impact = BibleImpactAnalyzer(bible_registry, self.output_root).analyze(bible)
        raw_stale = impact["artifacts"]
        stale = (
            [cast(dict[str, object], item) for item in raw_stale if isinstance(item, dict)]
            if isinstance(raw_stale, list)
            else []
        )
        queue_items = self._items(self.queue_provider().get("items"))
        jobs = list(self.jobs_provider())
        statuses = [str(item.get("status", "")).lower() for item in [*queue_items, *jobs]]
        active_jobs = sum(status in {"queued", "running", "generating"} for status in statuses)
        approvals = sum(
            status in {"awaiting_approval", "awaiting_keyframe_approval"} for status in statuses
        )
        failures = sum(status == "failed" for status in statuses)
        generated_media = self._generated_media(shot_ids, active_id)
        runtime_ready = self._runtime_ready(self.runtime_provider())

        counts = JourneyCounts(
            episodes=len(episodes),
            shots=len(shot_ids),
            generated_media=generated_media,
            stale_artifacts=len(stale),
            active_jobs=active_jobs,
            awaiting_approval=approvals,
            failed_jobs=failures,
        )
        stages = self._stages(
            completion=completion,
            guided=guided,
            bible=bible,
            workflow=workflow,
            episode=episode,
            counts=counts,
            runtime_ready=runtime_ready,
            stale=stale,
        )
        payload = {
            "schema_version": 1,
            "project_id": self.project_id,
            "active_episode_id": active_id,
            "counts": counts.model_dump(mode="json"),
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
    def _runtime_ready(runtime: Mapping[str, object]) -> bool:
        services = runtime.get("services")
        if not isinstance(services, list):
            return False
        return any(
            isinstance(service, Mapping)
            and (
                str(service.get("state", service.get("status", ""))).lower() in {"ready", "running"}
                or service.get("reachable") is True
            )
            for service in services
        )

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
        runtime_ready: bool,
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
        if character_rows:
            casting_status = (
                JourneyStatus.APPROVED
                if all(row.get("promoted") for row in character_rows)
                else JourneyStatus.READY
                if all(row.get("ready") for row in character_rows)
                else JourneyStatus.DRAFT
            )
        elif bible.characters:
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
        elif counts.shots and not runtime_ready:
            production_status = JourneyStatus.BLOCKED
            production_blockers.append(
                blocker(
                    "RUNTIME_UNAVAILABLE",
                    "Aucun moteur local n’est disponible. L’import manuel reste possible.",
                    action("CONFIGURE_RUNTIME", "Configurer les moteurs", "#/settings", "settings"),
                )
            )
        elif counts.generated_media:
            production_status = JourneyStatus.COMPLETED
        elif counts.shots:
            production_status = JourneyStatus.READY
        else:
            production_status = JourneyStatus.EMPTY

        release_file = (
            episode is not None and (self.output_root / episode.id / "episode.mp4").is_file()
        )
        release_stale = any(item.get("kind") == "episode" for item in stale)
        release_status = (
            JourneyStatus.STALE
            if release_stale
            else JourneyStatus.COMPLETED
            if release_file
            else JourneyStatus.READY
            if production_status is JourneyStatus.COMPLETED
            else JourneyStatus.BLOCKED
            if episode is not None
            else JourneyStatus.EMPTY
        )

        release_blockers = (
            [
                blocker(
                    "PRODUCTION_INCOMPLETE",
                    "La production doit être terminée avant la release.",
                    action("OPEN_PRODUCTION", "Ouvrir la production", "#/produce"),
                )
            ]
            if release_status is JourneyStatus.BLOCKED
            else []
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
