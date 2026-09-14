from __future__ import annotations

import hashlib
import threading
import uuid
from collections.abc import Mapping
from datetime import UTC, datetime
from enum import StrEnum
from pathlib import Path

from pydantic import BaseModel, ConfigDict, Field, model_validator

from engine.narrative.episode_models import (
    Episode,
    EpisodeStatus,
    EpisodeStory,
    NarrativeProvenance,
)
from engine.narrative.workflow_models import ProposedEpisode, StageStatus
from engine.production.artifacts import write_text_atomic
from engine.world.bible import BibleRegistry
from engine.world.catalog import EpisodeCatalog


class StrictSeasonPlanModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class SeasonPlanLifecycle(StrEnum):
    DRAFT = "draft"
    VALIDATED = "validated"
    OBSOLETE = "obsolete"


class SeasonPlanItem(StrictSeasonPlanModel):
    id: str = Field(pattern=r"^season-item-[0-9a-f]+$")
    position: int | None = Field(default=None, ge=1)
    season: int = Field(default=1, ge=1, le=99)
    title: str = Field(min_length=1, max_length=180)
    logline: str = Field(default="", max_length=1000)
    synopsis: str = Field(default="", max_length=20_000)
    cliffhanger: str = Field(default="", max_length=2000)
    character_ids: list[str] = Field(default_factory=list)
    location_ids: list[str] = Field(default_factory=list)
    lifecycle: SeasonPlanLifecycle = SeasonPlanLifecycle.DRAFT
    episode_id: str | None = Field(default=None, pattern=r"^S\d{2}E\d{3}$")
    provenance: NarrativeProvenance
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    deleted_at: datetime | None = None

    @model_validator(mode="after")
    def deletion_state_is_coherent(self) -> SeasonPlanItem:
        if self.lifecycle is SeasonPlanLifecycle.OBSOLETE:
            if self.position is not None or self.deleted_at is None:
                raise ValueError("An obsolete season item must be deleted and unpositioned")
        elif self.position is None or self.deleted_at is not None:
            raise ValueError("An active season item must have a position and no deletion date")
        if len(set(self.character_ids)) != len(self.character_ids):
            raise ValueError("Season item character ids must be unique")
        if len(set(self.location_ids)) != len(self.location_ids):
            raise ValueError("Season item location ids must be unique")
        return self


class SeasonPlan(StrictSeasonPlanModel):
    schema_version: int = 1
    revision: int = Field(default=0, ge=0)
    updated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    items: list[SeasonPlanItem] = Field(default_factory=list)

    @model_validator(mode="after")
    def identities_and_positions_are_coherent(self) -> SeasonPlan:
        ids = [item.id for item in self.items]
        if len(ids) != len(set(ids)):
            raise ValueError("Season item ids must be unique")
        episode_ids = [item.episode_id for item in self.items if item.episode_id is not None]
        if len(episode_ids) != len(set(episode_ids)):
            raise ValueError("An episode can belong to only one season item")
        positions = sorted(
            item.position
            for item in self.items
            if item.lifecycle is not SeasonPlanLifecycle.OBSOLETE
            and item.position is not None
        )
        if positions != list(range(1, len(positions) + 1)):
            raise ValueError("Active season item positions must be contiguous")
        return self

    @property
    def active_items(self) -> list[SeasonPlanItem]:
        return sorted(
            (item for item in self.items if item.lifecycle is not SeasonPlanLifecycle.OBSOLETE),
            key=lambda item: item.position or 0,
        )


class SeasonPlanRevisionConflictError(ValueError):
    def __init__(self, expected: int, current: int) -> None:
        self.expected = expected
        self.current = current
        super().__init__(f"Season plan revision conflict: expected {expected}, current {current}")


class SeasonPlanRegistry:
    """Atomic ordered season plan, independent from production episode identifiers."""

    _lock = threading.RLock()

    def __init__(self, private_root: Path) -> None:
        self.private_root = private_root.resolve()
        self.path = self.private_root / "world" / "season-plan.json"

    def load(self) -> SeasonPlan:
        with self._lock:
            if self.path.is_file():
                return SeasonPlan.model_validate_json(self.path.read_text(encoding="utf-8"))
            plan = self._migrate_legacy()
            self._save(plan)
            return plan

    def create(
        self,
        proposal: ProposedEpisode,
        provenance: NarrativeProvenance,
        *,
        expected_revision: int,
        lifecycle: SeasonPlanLifecycle = SeasonPlanLifecycle.DRAFT,
    ) -> SeasonPlan:
        if lifecycle is SeasonPlanLifecycle.OBSOLETE:
            raise ValueError("A new season item cannot be obsolete")
        with self._lock:
            current = self.load()
            self._check_revision(current, expected_revision)
            item = self._from_proposal(
                proposal,
                item_id=f"season-item-{uuid.uuid4().hex}",
                position=len(current.active_items) + 1,
                provenance=provenance,
                lifecycle=lifecycle,
            )
            return self._commit(current, [*current.items, item])

    def update(
        self,
        item_id: str,
        changes: Mapping[str, object],
        *,
        expected_revision: int,
    ) -> SeasonPlan:
        allowed = {
            "season",
            "title",
            "logline",
            "synopsis",
            "cliffhanger",
            "character_ids",
            "location_ids",
            "lifecycle",
            "provenance",
        }
        unknown = set(changes) - allowed
        if unknown:
            raise ValueError("Unsupported season item fields: " + ", ".join(sorted(unknown)))
        if changes.get("lifecycle") == SeasonPlanLifecycle.OBSOLETE or changes.get(
            "lifecycle"
        ) == SeasonPlanLifecycle.OBSOLETE.value:
            raise ValueError("Use delete() to obsolete a season item")
        with self._lock:
            current = self.load()
            self._check_revision(current, expected_revision)
            item = self._item(current, item_id)
            if item.lifecycle is SeasonPlanLifecycle.OBSOLETE:
                raise ValueError("Restore the season item before editing it")
            updated = SeasonPlanItem.model_validate(
                {
                    **item.model_dump(mode="python"),
                    **changes,
                    "updated_at": datetime.now(UTC),
                }
            )
            return self._commit(current, self._replace(current.items, updated))

    def duplicate(self, item_id: str, *, expected_revision: int) -> SeasonPlan:
        with self._lock:
            current = self.load()
            self._check_revision(current, expected_revision)
            source = self._item(current, item_id)
            if source.lifecycle is SeasonPlanLifecycle.OBSOLETE:
                raise ValueError("An obsolete season item cannot be duplicated")
            now = datetime.now(UTC)
            duplicate = source.model_copy(
                update={
                    "id": f"season-item-{uuid.uuid4().hex}",
                    "position": len(current.active_items) + 1,
                    "episode_id": None,
                    "lifecycle": SeasonPlanLifecycle.DRAFT,
                    "created_at": now,
                    "updated_at": now,
                }
            )
            return self._commit(current, [*current.items, duplicate])

    def reorder(self, item_ids: list[str], *, expected_revision: int) -> SeasonPlan:
        with self._lock:
            current = self.load()
            self._check_revision(current, expected_revision)
            active = current.active_items
            if len(item_ids) != len(set(item_ids)) or set(item_ids) != {
                item.id for item in active
            }:
                raise ValueError("Reorder must contain every active season item exactly once")
            positions = {item_id: index for index, item_id in enumerate(item_ids, start=1)}
            now = datetime.now(UTC)
            items = [
                item.model_copy(
                    update={"position": positions[item.id], "updated_at": now}
                )
                if item.id in positions
                else item
                for item in current.items
            ]
            return self._commit(current, items)

    def delete(self, item_id: str, *, expected_revision: int) -> SeasonPlan:
        with self._lock:
            current = self.load()
            self._check_revision(current, expected_revision)
            item = self._item(current, item_id)
            if item.lifecycle is SeasonPlanLifecycle.OBSOLETE:
                return current
            now = datetime.now(UTC)
            deleted = item.model_copy(
                update={
                    "position": None,
                    "lifecycle": SeasonPlanLifecycle.OBSOLETE,
                    "deleted_at": now,
                    "updated_at": now,
                }
            )
            items = self._normalize_active(self._replace(current.items, deleted), now)
            return self._commit(current, items)

    def restore(
        self,
        item_id: str,
        *,
        expected_revision: int,
        position: int | None = None,
    ) -> SeasonPlan:
        with self._lock:
            current = self.load()
            self._check_revision(current, expected_revision)
            item = self._item(current, item_id)
            if item.lifecycle is not SeasonPlanLifecycle.OBSOLETE:
                return current
            active = current.active_items
            destination = position if position is not None else len(active) + 1
            if destination < 1 or destination > len(active) + 1:
                raise ValueError("Restore position is outside the active season plan")
            now = datetime.now(UTC)
            shifted = [
                current_item.model_copy(update={"position": (current_item.position or 0) + 1})
                if current_item.position is not None and current_item.position >= destination
                else current_item
                for current_item in current.items
            ]
            restored = item.model_copy(
                update={
                    "position": destination,
                    "lifecycle": SeasonPlanLifecycle.DRAFT,
                    "deleted_at": None,
                    "updated_at": now,
                }
            )
            return self._commit(current, self._replace(shifted, restored))

    def materialize(
        self,
        item_id: str,
        catalog: EpisodeCatalog,
        *,
        expected_revision: int,
        duration_target: float = 45,
    ) -> SeasonPlan:
        with self._lock:
            current = self.load()
            self._check_revision(current, expected_revision)
            item = self._item(current, item_id)
            if item.lifecycle is SeasonPlanLifecycle.OBSOLETE:
                raise ValueError("An obsolete season item cannot be materialized")
            if item.lifecycle is not SeasonPlanLifecycle.VALIDATED:
                raise ValueError("Validate the season item before materializing it")
            if item.episode_id is not None:
                return current

            recovered_id = self._find_materialized_episode(catalog, item.id)
            if recovered_id is not None:
                return self._link_episode(current, item, recovered_id)

            bible = BibleRegistry(catalog.root).load()
            unknown = (set(item.character_ids) - {entry.id for entry in bible.characters}) | (
                set(item.location_ids) - {entry.id for entry in bible.locations}
            )
            if unknown:
                raise ValueError(
                    "Season item references entities absent from the Bible: "
                    + ", ".join(sorted(unknown))
                )
            number = catalog.next_episode_number(item.season)
            episode_id = f"S{item.season:02d}E{number:03d}"
            episode = Episode.model_validate(
                {
                    "id": episode_id,
                    "season": item.season,
                    "episode": number,
                    "title": item.title,
                    "logline": item.logline,
                    "duration_target": duration_target,
                    "status": EpisodeStatus.WRITING,
                    "characters": item.character_ids,
                    "locations": item.location_ids,
                    "story": EpisodeStory(
                        hook=item.logline,
                        setup=item.synopsis,
                        cliffhanger=item.cliffhanger,
                    ).model_dump(mode="json"),
                    "narrative_source": item.synopsis,
                    "provenance": [item.provenance.model_dump(mode="json")],
                    "season_plan_item_id": item.id,
                }
            )
            catalog.create(episode)
            return self._link_episode(current, item, episode_id)

    def _migrate_legacy(self) -> SeasonPlan:
        # Local import prevents a cycle when the legacy registry adopts SeasonPlan later.
        from engine.narrative.narrative_workflow import NarrativeWorkflowRegistry

        workflow = NarrativeWorkflowRegistry(self.private_root).load()
        content = workflow.screenwriter.content
        if content is None:
            return SeasonPlan()
        lifecycle = (
            SeasonPlanLifecycle.VALIDATED
            if workflow.screenwriter.status is StageStatus.APPROVED
            else SeasonPlanLifecycle.DRAFT
        )
        provenance = workflow.screenwriter.provenance or NarrativeProvenance(
            stage="screenwriter",
            mode="import",
            source_label="Migration du workflow narratif 0.2.13",
        )
        catalog = EpisodeCatalog(self.private_root)
        items = []
        for position, proposal in enumerate(content.episodes, start=1):
            legacy_episode_id = f"S{proposal.season:02d}E{proposal.episode:03d}"
            episode_id = None
            if legacy_episode_id in workflow.published_episode_ids:
                try:
                    catalog.get(legacy_episode_id)
                except FileNotFoundError:
                    pass
                else:
                    episode_id = legacy_episode_id
            identity = hashlib.sha256(f"legacy:{legacy_episode_id}".encode()).hexdigest()[:24]
            items.append(
                self._from_proposal(
                    proposal,
                    item_id=f"season-item-{identity}",
                    position=position,
                    provenance=provenance,
                    lifecycle=lifecycle,
                    episode_id=episode_id,
                )
            )
        return SeasonPlan(items=items)

    @staticmethod
    def _from_proposal(
        proposal: ProposedEpisode,
        *,
        item_id: str,
        position: int,
        provenance: NarrativeProvenance,
        lifecycle: SeasonPlanLifecycle,
        episode_id: str | None = None,
    ) -> SeasonPlanItem:
        return SeasonPlanItem(
            id=item_id,
            position=position,
            season=proposal.season,
            title=proposal.title,
            logline=proposal.logline,
            synopsis=proposal.synopsis,
            cliffhanger=proposal.cliffhanger,
            character_ids=proposal.character_ids,
            location_ids=proposal.location_ids,
            lifecycle=lifecycle,
            episode_id=episode_id,
            provenance=provenance,
        )

    @staticmethod
    def _find_materialized_episode(catalog: EpisodeCatalog, item_id: str) -> str | None:
        for summary in catalog.list_episodes():
            episode = catalog.get(summary.id)
            if getattr(episode, "season_plan_item_id", None) == item_id:
                return episode.id
        return None

    def _link_episode(
        self,
        current: SeasonPlan,
        item: SeasonPlanItem,
        episode_id: str,
    ) -> SeasonPlan:
        linked = item.model_copy(
            update={"episode_id": episode_id, "updated_at": datetime.now(UTC)}
        )
        return self._commit(current, self._replace(current.items, linked))

    def _commit(self, current: SeasonPlan, items: list[SeasonPlanItem]) -> SeasonPlan:
        updated = SeasonPlan(
            schema_version=current.schema_version,
            revision=current.revision + 1,
            updated_at=datetime.now(UTC),
            items=items,
        )
        self._save(updated)
        return updated

    def _save(self, plan: SeasonPlan) -> None:
        write_text_atomic(self.path, plan.model_dump_json(indent=2) + "\n")

    @staticmethod
    def _item(plan: SeasonPlan, item_id: str) -> SeasonPlanItem:
        try:
            return next(item for item in plan.items if item.id == item_id)
        except StopIteration as exc:
            raise KeyError(item_id) from exc

    @staticmethod
    def _replace(items: list[SeasonPlanItem], replacement: SeasonPlanItem) -> list[SeasonPlanItem]:
        return [replacement if item.id == replacement.id else item for item in items]

    @staticmethod
    def _normalize_active(
        items: list[SeasonPlanItem], now: datetime
    ) -> list[SeasonPlanItem]:
        active = sorted(
            (item for item in items if item.lifecycle is not SeasonPlanLifecycle.OBSOLETE),
            key=lambda item: item.position or 0,
        )
        positions = {item.id: index for index, item in enumerate(active, start=1)}
        return [
            item.model_copy(update={"position": positions[item.id], "updated_at": now})
            if item.id in positions
            else item
            for item in items
        ]

    @staticmethod
    def _check_revision(plan: SeasonPlan, expected_revision: int) -> None:
        if plan.revision != expected_revision:
            raise SeasonPlanRevisionConflictError(expected_revision, plan.revision)
