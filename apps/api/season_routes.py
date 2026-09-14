from __future__ import annotations

from collections.abc import Callable
from datetime import datetime
from typing import Literal

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, ConfigDict, Field

from engine.narrative.episode_models import EpisodeStatus, NarrativeProvenance
from engine.narrative.season_plan import (
    SeasonPlan,
    SeasonPlanItem,
    SeasonPlanLifecycle,
    SeasonPlanRegistry,
    SeasonPlanRevisionConflictError,
)
from engine.narrative.workflow_models import ProposedEpisode
from engine.world.catalog import EpisodeCatalog


class StrictSeasonRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")


class SeasonItemCreateRequest(StrictSeasonRequest):
    expected_revision: int = Field(ge=0)
    season: int = Field(default=1, ge=1, le=99)
    title: str = Field(min_length=1, max_length=180)
    logline: str = Field(min_length=10, max_length=1000)
    synopsis: str = Field(min_length=20, max_length=20_000)
    cliffhanger: str = Field(default="", max_length=2000)
    character_ids: list[str] = Field(default_factory=list)
    location_ids: list[str] = Field(default_factory=list)


class SeasonItemUpdateRequest(StrictSeasonRequest):
    expected_revision: int = Field(ge=0)
    season: int | None = Field(default=None, ge=1, le=99)
    title: str | None = Field(default=None, min_length=1, max_length=180)
    logline: str | None = Field(default=None, max_length=1000)
    synopsis: str | None = Field(default=None, max_length=20_000)
    cliffhanger: str | None = Field(default=None, max_length=2000)
    character_ids: list[str] | None = None
    location_ids: list[str] | None = None
    lifecycle: SeasonPlanLifecycle | None = None


class RevisionRequest(StrictSeasonRequest):
    expected_revision: int = Field(ge=0)


class ReorderRequest(RevisionRequest):
    item_ids: list[str] = Field(min_length=1, max_length=100)


class MaterializeRequest(RevisionRequest):
    duration_target: float = Field(default=45, gt=0, le=600)


class SeasonPlanBoardItem(SeasonPlanItem):
    production_state: Literal["unmaterialized", "materialized", "produced"]


class SeasonPlanSnapshot(StrictSeasonRequest):
    schema_version: int
    revision: int
    updated_at: datetime
    items: list[SeasonPlanBoardItem]


def create_season_plan_router(
    registry_provider: Callable[[], SeasonPlanRegistry],
    catalog_provider: Callable[[], EpisodeCatalog],
) -> APIRouter:
    router = APIRouter(prefix="/api/season-plan", tags=["season-plan"])

    def snapshot(plan: SeasonPlan) -> SeasonPlanSnapshot:
        catalog = catalog_provider()
        items: list[SeasonPlanBoardItem] = []
        ordered_items = sorted(
            plan.items,
            key=lambda item: (item.position is None, item.position or 0, item.created_at),
        )
        for item in ordered_items:
            production_state: Literal["unmaterialized", "materialized", "produced"] = (
                "unmaterialized"
            )
            if item.episode_id:
                production_state = "materialized"
                try:
                    episode = catalog.get(item.episode_id)
                except FileNotFoundError:
                    pass
                else:
                    if episode.status in {EpisodeStatus.PRODUCTION, EpisodeStatus.FINAL}:
                        production_state = "produced"
            items.append(
                SeasonPlanBoardItem.model_validate(
                    {**item.model_dump(mode="python"), "production_state": production_state}
                )
            )
        return SeasonPlanSnapshot(
            schema_version=plan.schema_version,
            revision=plan.revision,
            updated_at=plan.updated_at,
            items=items,
        )

    @router.get("")
    def get_season_plan() -> SeasonPlanSnapshot:
        return snapshot(registry_provider().load())

    @router.post("/items")
    def create_season_plan_item(payload: SeasonItemCreateRequest) -> SeasonPlanSnapshot:
        proposal = ProposedEpisode(
            season=payload.season,
            episode=1,
            title=payload.title,
            logline=payload.logline,
            synopsis=payload.synopsis,
            cliffhanger=payload.cliffhanger,
            character_ids=payload.character_ids,
            location_ids=payload.location_ids,
        )
        return _mutate(
            lambda: registry_provider().create(
                proposal,
                NarrativeProvenance(
                    stage="screenwriter", mode="manual", source_label="SeasonPlan board"
                ),
                expected_revision=payload.expected_revision,
            ),
            snapshot,
        )

    @router.put("/items/{item_id}")
    def update_season_plan_item(
        item_id: str, payload: SeasonItemUpdateRequest
    ) -> SeasonPlanSnapshot:
        changes = payload.model_dump(exclude={"expected_revision"}, exclude_none=True)
        return _mutate(
            lambda: registry_provider().update(
                item_id, changes, expected_revision=payload.expected_revision
            ),
            snapshot,
        )

    @router.post("/items/{item_id}/duplicate")
    def duplicate_season_plan_item(
        item_id: str, payload: RevisionRequest
    ) -> SeasonPlanSnapshot:
        return _mutate(
            lambda: registry_provider().duplicate(
                item_id, expected_revision=payload.expected_revision
            ),
            snapshot,
        )

    @router.delete("/items/{item_id}")
    def delete_season_plan_item(
        item_id: str,
        expected_revision: int = Query(ge=0),
        keep_produced_episode: bool = Query(default=False),
    ) -> SeasonPlanSnapshot:
        registry = registry_provider()
        plan = registry.load()
        item = next((entry for entry in plan.items if entry.id == item_id), None)
        if item is None:
            raise HTTPException(status_code=404, detail="Season plan item not found")
        if item.episode_id:
            try:
                episode = catalog_provider().get(item.episode_id)
            except FileNotFoundError:
                episode = None
            if (
                episode
                and episode.status in {EpisodeStatus.PRODUCTION, EpisodeStatus.FINAL}
                and not keep_produced_episode
            ):
                raise HTTPException(
                    status_code=409,
                    detail={
                        "code": "produced_episode_decision_required",
                        "episode_id": item.episode_id,
                    },
                )
        return _mutate(
            lambda: registry.delete(item_id, expected_revision=expected_revision), snapshot
        )

    @router.post("/items/{item_id}/restore")
    def restore_season_plan_item(
        item_id: str, payload: RevisionRequest
    ) -> SeasonPlanSnapshot:
        return _mutate(
            lambda: registry_provider().restore(
                item_id, expected_revision=payload.expected_revision
            ),
            snapshot,
        )

    @router.put("/order")
    def reorder_season_plan(payload: ReorderRequest) -> SeasonPlanSnapshot:
        return _mutate(
            lambda: registry_provider().reorder(
                payload.item_ids, expected_revision=payload.expected_revision
            ),
            snapshot,
        )

    @router.post("/items/{item_id}/materialize")
    def materialize_season_plan_item(
        item_id: str, payload: MaterializeRequest
    ) -> SeasonPlanSnapshot:
        return _mutate(
            lambda: registry_provider().materialize(
                item_id,
                catalog_provider(),
                expected_revision=payload.expected_revision,
                duration_target=payload.duration_target,
            ),
            snapshot,
        )

    return router


def _mutate(
    operation: Callable[[], SeasonPlan],
    snapshot: Callable[[SeasonPlan], SeasonPlanSnapshot],
) -> SeasonPlanSnapshot:
    try:
        return snapshot(operation())
    except SeasonPlanRevisionConflictError as exc:
        raise HTTPException(
            status_code=409,
            detail={
                "code": "season_plan_revision_conflict",
                "expected_revision": exc.expected,
                "current_revision": exc.current,
            },
        ) from exc
    except KeyError as exc:
        raise HTTPException(status_code=404, detail="Season plan item not found") from exc
    except (FileExistsError, ValueError) as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
