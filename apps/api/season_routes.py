from __future__ import annotations

from collections.abc import Awaitable, Callable, Mapping
from datetime import datetime
from typing import Any, Literal

import httpx
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, ConfigDict, Field

from engine.config import Settings
from engine.narrative.episode_models import EpisodeStatus, NarrativeProvenance
from engine.narrative.ollama import OllamaClient
from engine.narrative.season_plan import (
    SeasonPlan,
    SeasonPlanItem,
    SeasonPlanLifecycle,
    SeasonPlanRegistry,
    SeasonPlanRevisionConflictError,
)
from engine.narrative.tasks.models import CompiledTask, TaskExecution
from engine.narrative.tasks.provider import OllamaTaskProvider
from engine.narrative.tasks.tentafruit_series_plan import (
    TENTAFRUIT_SERIES_PLAN_TASK,
    SeasonPlanProposalDocument,
    SeasonPlanProposalRegistry,
    SeasonPlanProposalRevisionConflictError,
    SeriesPlanBudget,
    SeriesPlanValidation,
    TentafruitSeriesPlan,
    TentafruitSeriesPlanItem,
    build_series_plan_context,
    series_plan_source_fingerprint,
    validate_series_plan,
)
from engine.narrative.workflow_models import ProposedEpisode
from engine.world.bible import BibleRegistry
from engine.world.catalog import EpisodeCatalog
from engine.world.models import ProjectBible


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


class SeasonProposalGenerateRequest(StrictSeasonRequest):
    episode_count: int = Field(default=6, ge=6, le=20)
    model: str | None = Field(default=None, min_length=1, max_length=200)
    custom_prompt: str = Field(default="", max_length=10_000)


class SeasonProposalItemRequest(StrictSeasonRequest):
    id: str = Field(min_length=1, max_length=200)
    position: int = Field(ge=1, le=20)
    season: int = Field(default=1, ge=1, le=99)
    title: str = Field(min_length=1, max_length=180)
    logline: str = Field(min_length=10, max_length=1000)
    synopsis: str = Field(min_length=20, max_length=20_000)
    hook: str = Field(min_length=1, max_length=1000)
    conflict: str = Field(min_length=1, max_length=2000)
    relationship_shift: str = Field(min_length=1, max_length=1000)
    relationship_ids: list[str] = Field(min_length=1)
    secret_id: str | None = None
    cliffhanger: str = Field(min_length=1, max_length=2000)
    character_ids: list[str] = Field(min_length=1)
    location_ids: list[str] = Field(min_length=1)
    manually_edited_fields: list[str] = Field(default_factory=list)


class SeasonProposalUpdateRequest(StrictSeasonRequest):
    expected_revision: int = Field(ge=0)
    items: list[SeasonProposalItemRequest] = Field(min_length=6, max_length=20)


class SeasonProposalAcceptRequest(RevisionRequest):
    expected_plan_revision: int = Field(ge=0)


SeriesPlanGenerator = Callable[[CompiledTask, str], Awaitable[TaskExecution[TentafruitSeriesPlan]]]


def create_season_plan_router(
    registry_provider: Callable[[], SeasonPlanRegistry],
    catalog_provider: Callable[[], EpisodeCatalog],
    settings_provider: Callable[[], Settings] | None = None,
    format_profile_provider: Callable[[], Mapping[str, Any]] | None = None,
    series_plan_generator: SeriesPlanGenerator | None = None,
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

    def proposal_registry() -> SeasonPlanProposalRegistry:
        return SeasonPlanProposalRegistry(catalog_provider().root)

    def bible() -> ProjectBible:
        return BibleRegistry(catalog_provider().root).load()

    def format_profile() -> Mapping[str, Any]:
        if format_profile_provider is not None:
            return format_profile_provider()
        return {
            "output": {
                "duration_seconds_min": 30,
                "duration_seconds_max": 60,
            }
        }

    def proposal_snapshot(
        document: SeasonPlanProposalDocument,
        *,
        requested_count: int | None = None,
    ) -> dict[str, object]:
        if document.proposal is None:
            raise HTTPException(status_code=404, detail="Season proposal not found")
        current_bible = bible()
        proposal = document.proposal
        plan = proposal.plan
        budget = _series_budget(
            format_profile(),
            requested_count if requested_count is not None else len(plan.items),
        )
        validation = validate_series_plan(plan, current_bible, budget)
        return _proposal_payload(
            document,
            validation,
            current_source_fingerprint=series_plan_source_fingerprint(current_bible),
            current_plan_revision=registry_provider().load().revision,
        )

    async def execute_series_plan(
        compiled: CompiledTask,
        requested_model: str | None,
    ) -> TaskExecution[TentafruitSeriesPlan]:
        if series_plan_generator is not None:
            return await series_plan_generator(compiled, requested_model or "fake:ci")
        if settings_provider is None:
            raise HTTPException(status_code=503, detail="Season AI generator is unavailable")
        settings = settings_provider()
        try:
            async with OllamaClient(str(settings.ollama_url)) as client:
                models = await client.list_models()
                available = [
                    item.name
                    for item in models
                    if not any(
                        marker in item.name.casefold() for marker in ("coder", "embedding", "embed")
                    )
                ]
                selected = (
                    requested_model
                    or settings.ollama_model
                    or (available[0] if available else None)
                )
                if selected is None or selected not in available:
                    raise HTTPException(
                        status_code=422,
                        detail="Installe ou sélectionne un modèle narratif Ollama",
                    )
                return await OllamaTaskProvider(client).execute(
                    compiled,
                    model=selected,
                    contract=TentafruitSeriesPlan,
                )
        except HTTPException:
            raise
        except httpx.RequestError as exc:
            raise HTTPException(status_code=503, detail="Ollama est inaccessible") from exc
        except httpx.HTTPStatusError as exc:
            raise HTTPException(
                status_code=502,
                detail="Ollama a refusé la proposition de saison",
            ) from exc

    @router.get("")
    def get_season_plan() -> SeasonPlanSnapshot:
        return snapshot(registry_provider().load())

    @router.get("/proposal")
    def get_season_proposal() -> dict[str, object]:
        return proposal_snapshot(proposal_registry().load())

    @router.post("/proposal/generate")
    async def generate_season_proposal(
        payload: SeasonProposalGenerateRequest,
    ) -> dict[str, object]:
        current_bible = bible()
        template = format_profile()
        context = build_series_plan_context(
            current_bible,
            template,
            source=f"Plan de saison pour {current_bible.title}",
            custom_prompt=payload.custom_prompt,
            episode_count=payload.episode_count,
        )
        compiled = TENTAFRUIT_SERIES_PLAN_TASK.compile(context)
        execution = await execute_series_plan(compiled, payload.model)
        store = proposal_registry()
        current = store.load()
        current_plan = registry_provider().load()
        try:
            document = store.create(
                execution.result,
                compiled,
                model=execution.model,
                bible=current_bible,
                base_plan_revision=current_plan.revision,
                expected_revision=current.revision,
            )
        except SeasonPlanProposalRevisionConflictError as exc:
            raise _proposal_conflict(exc) from exc
        return proposal_snapshot(document, requested_count=payload.episode_count)

    @router.put("/proposal")
    def update_season_proposal(
        payload: SeasonProposalUpdateRequest,
    ) -> dict[str, object]:
        store = proposal_registry()
        current = store.load()
        if current.proposal is None:
            raise HTTPException(status_code=404, detail="Season proposal not found")
        source_by_id = {item.candidate_id: item for item in current.proposal.plan.items}
        edited = [_merge_proposal_item(item, source_by_id.get(item.id)) for item in payload.items]
        try:
            document = store.update(edited, expected_revision=payload.expected_revision)
        except SeasonPlanProposalRevisionConflictError as exc:
            raise _proposal_conflict(exc) from exc
        except ValueError as exc:
            raise HTTPException(status_code=422, detail=str(exc)) from exc
        return proposal_snapshot(document)

    @router.post("/proposal/accept")
    def accept_season_proposal(
        payload: SeasonProposalAcceptRequest,
    ) -> SeasonPlanSnapshot:
        store = proposal_registry()
        document = store.load()
        if document.revision != payload.expected_revision:
            raise _proposal_conflict(
                SeasonPlanProposalRevisionConflictError(
                    payload.expected_revision, document.revision
                )
            )
        if document.proposal is None:
            raise HTTPException(status_code=404, detail="Season proposal not found")
        current_bible = bible()
        proposal = document.proposal
        if proposal.is_stale(current_bible):
            raise HTTPException(
                status_code=409,
                detail={"code": "season_proposal_stale"},
            )
        if proposal.base_plan_revision != payload.expected_plan_revision:
            raise HTTPException(
                status_code=409,
                detail={
                    "code": "season_plan_revision_conflict",
                    "expected_revision": proposal.base_plan_revision,
                    "current_revision": payload.expected_plan_revision,
                },
            )
        validation = validate_series_plan(
            proposal.plan,
            current_bible,
            _series_budget(format_profile(), len(proposal.plan.items)),
        )
        if not validation.valid:
            raise HTTPException(
                status_code=422,
                detail={
                    "code": "season_proposal_invalid",
                    "findings": [
                        finding.model_dump(mode="json") for finding in validation.findings
                    ],
                },
            )
        provenance = proposal.provenance
        prompt = "\n\n".join(
            f"{message.role}: {message.content}" for message in provenance.compiled_messages
        )
        proposed_episodes = [
            ProposedEpisode(
                season=item.season,
                episode=item.position,
                title=item.title,
                logline=_candidate_logline(item),
                synopsis=_candidate_synopsis(item),
                cliffhanger=item.cliffhanger,
                character_ids=item.character_ids,
                location_ids=item.location_ids,
            )
            for item in proposal.plan.ordered_items
        ]
        item_provenance = [
            NarrativeProvenance(
                stage="screenwriter",
                mode="ai",
                provider="ollama",
                model=provenance.model,
                prompt=prompt,
                source_label=f"Proposition de saison · {item.candidate_id}",
                task_id=provenance.task_id,
                task_version=provenance.task_version,
                input_fingerprint=provenance.input_fingerprint,
            )
            for item in proposal.plan.ordered_items
        ]
        plan = _mutate(
            lambda: registry_provider().create_many(
                proposed_episodes,
                item_provenance,
                expected_revision=payload.expected_plan_revision,
            ),
            snapshot,
        )
        store.clear(expected_revision=document.revision)
        return plan

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
    def duplicate_season_plan_item(item_id: str, payload: RevisionRequest) -> SeasonPlanSnapshot:
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
    def restore_season_plan_item(item_id: str, payload: RevisionRequest) -> SeasonPlanSnapshot:
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


def _proposal_conflict(
    exc: SeasonPlanProposalRevisionConflictError,
) -> HTTPException:
    return HTTPException(
        status_code=409,
        detail={
            "code": "proposal_revision_conflict",
            "expected_revision": exc.expected,
            "current_revision": exc.current,
        },
    )


def _series_budget(
    template: Mapping[str, Any],
    episode_count: int,
) -> SeriesPlanBudget:
    output_source = template.get("output", {})
    output = output_source if isinstance(output_source, Mapping) else {}
    return SeriesPlanBudget(
        episode_count=episode_count,
        duration_seconds_min=int(output.get("duration_seconds_min", 30)),
        duration_seconds_max=int(output.get("duration_seconds_max", 60)),
    )


def _merge_proposal_item(
    item: SeasonProposalItemRequest,
    source: TentafruitSeriesPlanItem | None,
) -> TentafruitSeriesPlanItem:
    relationship_id = item.relationship_ids[0]
    candidate_id = (
        item.id if item.id.startswith("candidate-") else f"candidate-{item.id.casefold()}"
    )
    return TentafruitSeriesPlanItem(
        candidate_id=candidate_id,
        season=item.season,
        position=item.position,
        title=item.title,
        logline=item.logline,
        synopsis=item.synopsis,
        hook=item.hook,
        conflict=item.conflict,
        turning_point=source.turning_point if source else item.relationship_shift,
        relationship_id=relationship_id,
        relationship_shift=item.relationship_shift,
        secret_id=item.secret_id,
        reveals_secret=item.secret_id is not None,
        cliffhanger=item.cliffhanger,
        character_ids=item.character_ids,
        location_ids=item.location_ids,
        duration_seconds=source.duration_seconds if source else 45,
    )


def _proposal_payload(
    document: SeasonPlanProposalDocument,
    validation: SeriesPlanValidation,
    *,
    current_source_fingerprint: str,
    current_plan_revision: int,
) -> dict[str, object]:
    proposal = document.proposal
    if proposal is None:
        raise ValueError("A proposal payload requires a proposal")
    return {
        "id": "current",
        "revision": document.revision,
        "base_plan_revision": proposal.base_plan_revision,
        "source_fingerprint": proposal.source_bible_fingerprint,
        "current_source_fingerprint": current_source_fingerprint,
        "stale": proposal.source_bible_fingerprint != current_source_fingerprint
        or proposal.base_plan_revision != current_plan_revision,
        "provenance": proposal.provenance.model_dump(mode="json"),
        "validation": {
            "valid": validation.valid,
            "issues": [
                {
                    "code": finding.code,
                    "item_id": finding.candidate_ids[0] if finding.candidate_ids else None,
                    "field": None,
                    "message": finding.message,
                }
                for finding in validation.findings
            ],
        },
        "items": [
            {
                "id": item.candidate_id,
                "position": item.position,
                "season": item.season,
                "title": item.title,
                "logline": _candidate_logline(item),
                "synopsis": _candidate_synopsis(item),
                "hook": item.hook,
                "conflict": item.conflict,
                "relationship_shift": item.relationship_shift,
                "relationship_ids": [item.relationship_id],
                "secret_id": item.secret_id,
                "cliffhanger": item.cliffhanger,
                "character_ids": item.character_ids,
                "location_ids": item.location_ids,
                "manually_edited_fields": [],
            }
            for item in proposal.plan.ordered_items
        ],
    }


def _candidate_logline(item: TentafruitSeriesPlanItem) -> str:
    return item.logline or item.hook


def _candidate_synopsis(item: TentafruitSeriesPlanItem) -> str:
    return item.synopsis or " ".join((item.conflict, item.turning_point, item.relationship_shift))
