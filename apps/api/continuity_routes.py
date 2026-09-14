from __future__ import annotations

from collections.abc import Awaitable, Callable, Mapping
from datetime import UTC, datetime
from typing import Any

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, ConfigDict, Field

from engine.narrative.episode_models import Episode
from engine.narrative.season_plan import SeasonPlan, SeasonPlanRegistry
from engine.narrative.series_state import (
    ContinuityComposition,
    DeltaProposalStatus,
    DeltaProvenance,
    EpisodeDeltaProposal,
    EpisodeEntryState,
    EpisodeStateDelta,
    SeriesState,
    SeriesStateRegistry,
    SeriesStateRevisionConflictError,
    StaleDeltaProposalError,
    episode_state_source_fingerprint,
)
from engine.world.catalog import EpisodeCatalog
from engine.world.impact import ContinuityImpactAnalyzer


class StrictContinuityRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")


class RevisionRequest(StrictContinuityRequest):
    expected_revision: int = Field(ge=0)


class ApproveDeltaRequest(RevisionRequest):
    expected_source_fingerprint: str = Field(pattern=r"^[0-9a-f]{64}$")


class RefuseDeltaRequest(RevisionRequest):
    reason: str = Field(default="Refus utilisateur", max_length=2000)


class ManualDeltaRequest(RevisionRequest):
    delta: EpisodeStateDelta
    source_payload: dict[str, Any] = Field(default_factory=dict)


class ReorderImpactRequest(StrictContinuityRequest):
    expected_plan_revision: int = Field(ge=0)
    item_ids: list[str] = Field(min_length=1, max_length=100)


GeneratedDelta = EpisodeStateDelta | tuple[EpisodeStateDelta, DeltaProvenance]
DeltaGenerator = Callable[[Episode, SeriesState], Awaitable[GeneratedDelta]]


def create_continuity_router(
    registry_provider: Callable[[], SeriesStateRegistry],
    season_plan_provider: Callable[[], SeasonPlanRegistry],
    catalog_provider: Callable[[], EpisodeCatalog],
    delta_generator: DeltaGenerator | None = None,
) -> APIRouter:
    router = APIRouter(prefix="/api/continuity", tags=["continuity"])

    def context(episode_id: str) -> tuple[Episode, SeasonPlan, EpisodeEntryState]:
        try:
            episode = catalog_provider().get(episode_id)
        except FileNotFoundError as exc:
            raise HTTPException(status_code=404, detail=f"Episode not found: {episode_id}") from exc
        plan = season_plan_provider().load()
        try:
            item = next(item for item in plan.active_items if item.episode_id == episode_id)
        except StopIteration as exc:
            raise HTTPException(
                status_code=409,
                detail={"code": "episode_not_linked_to_season_plan", "episode_id": episode_id},
            ) from exc
        entry = registry_provider().compose(plan).entry_for(item.id)
        return episode, plan, entry

    def source(episode: Episode) -> dict[str, object]:
        return {"episode": episode.model_dump(mode="json")}

    def latest_proposal(episode_id: str, document: object) -> EpisodeDeltaProposal | None:
        proposals = getattr(document, "proposals", [])
        matching = [item for item in proposals if item.episode_id == episode_id]
        return matching[-1] if matching else None

    def snapshot(
        episode_id: str,
        *,
        impact_report: dict[str, object] | None = None,
    ) -> dict[str, object]:
        episode, plan, entry = context(episode_id)
        registry = registry_provider()
        document = registry.load()
        fingerprint = episode_state_source_fingerprint(source(episode), entry.state)
        proposal = latest_proposal(episode_id, document)
        return {
            "episode_id": episode_id,
            "revision": document.revision,
            "source_fingerprint": fingerprint,
            "input_state": {
                "revision": document.revision,
                "before_episode_id": episode_id,
                "entries": _state_entries(entry.state),
            },
            "proposal": _proposal_payload(proposal, entry.state, fingerprint, document.revision),
            "impact_report": impact_report,
            "plan_revision": plan.revision,
        }

    @router.get("/episodes/{episode_id}")
    def get_episode_continuity(episode_id: str) -> dict[str, object]:
        return snapshot(episode_id)

    @router.post("/episodes/{episode_id}/proposal/manual")
    def propose_manual(episode_id: str, payload: ManualDeltaRequest) -> dict[str, object]:
        episode, _plan, entry = context(episode_id)
        # source_payload carries UI notes/evidence only.  The canonical source hash must
        # remain identical to the one recomputed by snapshot() and approve().
        _ = payload.source_payload
        try:
            registry_provider().propose_manual(
                entry.season_plan_item_id,
                payload.delta,
                source=source(episode),
                entry_state=entry.state,
                episode_id=episode_id,
                expected_revision=payload.expected_revision,
            )
        except SeriesStateRevisionConflictError as exc:
            raise _revision_conflict(exc) from exc
        return snapshot(episode_id)

    @router.post("/episodes/{episode_id}/proposal/generate")
    async def generate_proposal(episode_id: str) -> dict[str, object]:
        if delta_generator is None:
            raise HTTPException(
                status_code=503,
                detail={"code": "continuity_delta_generator_unavailable"},
            )
        episode, _plan, entry = context(episode_id)
        registry = registry_provider()
        document = registry.load()
        try:
            generated = await delta_generator(episode, entry.state)
            if isinstance(generated, tuple):
                delta, provenance = generated
            else:
                delta = generated
                provenance = DeltaProvenance(
                    mode="ai",
                    provider="injected",
                    task_id="continuity_delta",
                    task_version=2,
                )
            registry.propose(
                entry.season_plan_item_id,
                delta,
                source_fingerprint=episode_state_source_fingerprint(source(episode), entry.state),
                provenance=provenance,
                episode_id=episode_id,
                expected_revision=document.revision,
            )
        except SeriesStateRevisionConflictError as exc:
            raise _revision_conflict(exc) from exc
        return snapshot(episode_id)

    @router.post("/episodes/{episode_id}/proposals/{proposal_id}/approve")
    def approve_proposal(
        episode_id: str,
        proposal_id: str,
        payload: ApproveDeltaRequest,
    ) -> dict[str, object]:
        episode, plan, entry = context(episode_id)
        registry = registry_provider()
        document = registry.load()
        proposal = _owned_proposal(document.proposals, episode_id, proposal_id)
        current_fingerprint = episode_state_source_fingerprint(source(episode), entry.state)
        if payload.expected_source_fingerprint != current_fingerprint:
            raise _stale_conflict(proposal.source_fingerprint, current_fingerprint)
        before = registry.compose(plan)
        try:
            registry.approve(
                proposal_id,
                current_source_fingerprint=current_fingerprint,
                expected_revision=payload.expected_revision,
            )
        except SeriesStateRevisionConflictError as exc:
            raise _revision_conflict(exc) from exc
        except StaleDeltaProposalError as exc:
            raise _stale_conflict(proposal.source_fingerprint, current_fingerprint) from exc
        after = registry.compose(plan)
        report = _impact_report(
            ContinuityImpactAnalyzer().compare(
                before,
                after,
                cause_type="approved_delta",
                cause_ids=[proposal_id],
            ),
            trigger="delta",
            plan=plan,
        )
        return snapshot(episode_id, impact_report=report)

    @router.post("/episodes/{episode_id}/proposals/{proposal_id}/refuse")
    def refuse_proposal(
        episode_id: str,
        proposal_id: str,
        payload: RefuseDeltaRequest,
    ) -> dict[str, object]:
        document = registry_provider().load()
        _owned_proposal(document.proposals, episode_id, proposal_id)
        try:
            registry_provider().refuse(
                proposal_id,
                reason=payload.reason or "Refus utilisateur",
                expected_revision=payload.expected_revision,
            )
        except SeriesStateRevisionConflictError as exc:
            raise _revision_conflict(exc) from exc
        except ValueError as exc:
            raise HTTPException(status_code=409, detail=str(exc)) from exc
        return snapshot(episode_id)

    @router.get("/impact")
    def get_impact(episode_id: str = Query()) -> dict[str, object]:
        _episode, plan, _entry = context(episode_id)
        registry = registry_provider()
        composition = registry.compose(plan)
        document = registry.load()
        proposal = latest_proposal(episode_id, document)
        if proposal is None or proposal.status is not DeltaProposalStatus.APPROVED:
            return _impact_report(_empty_impact("approved_delta", []), trigger="delta", plan=plan)
        affected = _downstream_impact(composition, proposal.id)
        return _impact_report(affected, trigger="delta", plan=plan)

    @router.post("/impact/reorder")
    def preview_reorder(payload: ReorderImpactRequest) -> dict[str, object]:
        plan = season_plan_provider().load()
        if plan.revision != payload.expected_plan_revision:
            raise HTTPException(
                status_code=409,
                detail={
                    "code": "season_plan_revision_conflict",
                    "expected_revision": payload.expected_plan_revision,
                    "current_revision": plan.revision,
                },
            )
        active_ids = [item.id for item in plan.active_items]
        if len(payload.item_ids) != len(set(payload.item_ids)) or set(payload.item_ids) != set(
            active_ids
        ):
            raise HTTPException(
                status_code=422,
                detail={"code": "invalid_season_plan_order", "expected_item_ids": active_ids},
            )
        positions = {item_id: index for index, item_id in enumerate(payload.item_ids, start=1)}
        candidate = SeasonPlan.model_validate(
            {
                **plan.model_dump(mode="python"),
                "items": [
                    item.model_copy(update={"position": positions[item.id]})
                    if item.id in positions
                    else item
                    for item in plan.items
                ],
            }
        )
        moved = [item.id for item in plan.active_items if item.position != positions.get(item.id)]
        registry = registry_provider()
        report = ContinuityImpactAnalyzer().compare(
            registry.compose(plan),
            registry.compose(candidate),
            cause_type="season_reorder",
            cause_ids=moved,
        )
        return _impact_report(report, trigger="reorder", plan=candidate)

    return router


def _owned_proposal(
    proposals: list[EpisodeDeltaProposal], episode_id: str, proposal_id: str
) -> EpisodeDeltaProposal:
    try:
        proposal = next(item for item in proposals if item.id == proposal_id)
    except StopIteration as exc:
        raise HTTPException(status_code=404, detail="Continuity proposal not found") from exc
    if proposal.episode_id != episode_id:
        raise HTTPException(status_code=409, detail={"code": "proposal_episode_mismatch"})
    return proposal


def _proposal_payload(
    proposal: EpisodeDeltaProposal | None,
    input_state: SeriesState,
    current_fingerprint: str,
    revision: int,
) -> dict[str, object] | None:
    if proposal is None:
        return None
    provenance = proposal.provenance
    return {
        "id": proposal.id,
        "episode_id": proposal.episode_id,
        "revision": revision,
        "source_fingerprint": proposal.source_fingerprint,
        "current_source_fingerprint": current_fingerprint,
        "stale": proposal.is_stale(current_fingerprint),
        "status": proposal.status.value,
        "changes": _delta_changes(proposal, input_state),
        "provenance": {
            "task_id": provenance.task_id or "continuity_delta",
            "task_version": str(provenance.task_version or 1),
            "model": provenance.model or provenance.provider,
            "source_fingerprint": provenance.input_fingerprint or proposal.source_fingerprint,
        },
        "refusal_reason": proposal.refusal_reason,
    }


def _state_entries(state: SeriesState) -> list[dict[str, object]]:
    entries: list[dict[str, object]] = []
    categories: tuple[tuple[str, Mapping[str, Any]], ...] = (
        ("fact", state.facts),
        ("secret", state.revealed_secrets),
        ("relationship", state.relationships),
        ("visual", state.visual_states),
        ("thread", state.open_threads),
        ("thread", state.resolved_threads),
    )
    causes = {(item.category, item.key): item for item in state.causes}
    for category, values in categories:
        for key, value in sorted(values.items()):
            cause = causes.get((category, key))
            entries.append(_state_entry(category, key, key, str(value), cause))
    for character_id, facts in sorted(state.knowledge.items()):
        for fact_id in facts:
            key = f"{character_id}:{fact_id}"
            entries.append(
                _state_entry(
                    "knowledge", key, character_id, fact_id, causes.get(("knowledge", key))
                )
            )
    for character_id, objectives in sorted(state.objectives.items()):
        for objective_id, value in sorted(objectives.items()):
            key = f"{character_id}:{objective_id}"
            entries.append(
                _state_entry("objective", key, character_id, value, causes.get(("objective", key)))
            )
    return entries


def _state_entry(
    category: str, key: str, subject: str, value: str, cause: Any
) -> dict[str, object]:
    evidence = [] if cause is None else [_cause_evidence(cause)]
    return {
        "id": f"{category}:{key}",
        "category": category,
        "subject_id": subject,
        "label": key,
        "value": value,
        "evidence": evidence,
    }


def _delta_changes(proposal: EpisodeDeltaProposal, state: SeriesState) -> list[dict[str, object]]:
    delta = proposal.delta
    evidence = {item.id: item for item in delta.evidence}
    changes: list[dict[str, object]] = []
    simple = (
        ("fact", delta.facts, state.facts),
        ("secret", delta.secrets_revealed, state.revealed_secrets),
        ("relationship", delta.relationships, state.relationships),
        ("visual", delta.visual_states, state.visual_states),
        ("thread", delta.threads_opened, state.open_threads),
        ("thread", delta.threads_resolved, state.open_threads),
    )
    for category, mutations, values in simple:
        for mutation in mutations:
            before = values.get(mutation.key)
            operation = (
                "resolve"
                if mutation in delta.threads_resolved
                else ("update" if before is not None else "add")
            )
            changes.append(
                _change(
                    proposal.id,
                    category,
                    mutation.key,
                    mutation.key,
                    before,
                    mutation.value,
                    operation,
                    mutation.evidence_ids,
                    evidence,
                )
            )
    for knowledge_mutation in delta.knowledge:
        before = (
            knowledge_mutation.fact_id
            if knowledge_mutation.fact_id
            in state.knowledge.get(knowledge_mutation.character_id, [])
            else None
        )
        changes.append(
            _change(
                proposal.id,
                "knowledge",
                f"{knowledge_mutation.character_id}:{knowledge_mutation.fact_id}",
                knowledge_mutation.character_id,
                before,
                knowledge_mutation.fact_id,
                "update" if before else "add",
                knowledge_mutation.evidence_ids,
                evidence,
            )
        )
    for objective_mutation in delta.objectives:
        before = state.objectives.get(objective_mutation.character_id, {}).get(
            objective_mutation.objective_id
        )
        after = f"{objective_mutation.status}:{objective_mutation.description}"
        changes.append(
            _change(
                proposal.id,
                "objective",
                f"{objective_mutation.character_id}:{objective_mutation.objective_id}",
                objective_mutation.character_id,
                before,
                after,
                "update" if before else "add",
                objective_mutation.evidence_ids,
                evidence,
            )
        )
    return changes


def _change(
    delta_id: str,
    category: str,
    key: str,
    subject: str,
    before: str | None,
    after: str | None,
    operation: str,
    evidence_ids: list[str],
    evidence: Mapping[str, Any],
) -> dict[str, object]:
    return {
        "id": f"{delta_id}:{category}:{key}",
        "category": category,
        "operation": operation,
        "subject_id": subject,
        "label": key,
        "before": before,
        "after": after,
        "evidence": [_delta_evidence(evidence[item]) for item in evidence_ids if item in evidence],
    }


def _delta_evidence(item: Any) -> dict[str, object]:
    return {
        "source_id": item.id,
        "source_type": item.source,
        "label": item.reference,
        "excerpt": item.excerpt,
    }


def _cause_evidence(cause: Any) -> dict[str, object]:
    return {
        "source_id": cause.delta_id,
        "source_type": "delta",
        "label": f"{cause.category}:{cause.key}",
        "excerpt": ", ".join(cause.evidence_ids),
    }


def _impact_report(
    report: dict[str, object], *, trigger: str, plan: SeasonPlan
) -> dict[str, object]:
    titles = {item.id: item.title for item in plan.items}
    items = []
    raw_affected_items = report.get("affected_items", [])
    affected_items = raw_affected_items if isinstance(raw_affected_items, list) else []
    for affected in affected_items:
        if not isinstance(affected, dict):
            continue
        item_id = str(affected.get("season_plan_item_id", ""))
        raw_causes = affected.get("causes", [])
        causes = raw_causes if isinstance(raw_causes, list) else []
        raw_changed_fields = affected.get("changed_fields", [])
        changed_fields = (
            [item for item in raw_changed_fields if isinstance(item, str)]
            if isinstance(raw_changed_fields, list)
            else []
        )
        items.append(
            {
                "season_item_id": item_id,
                "episode_id": affected.get("episode_id"),
                "title": titles.get(item_id, item_id),
                "severity": "warning",
                "reasons": [
                    f"{item.get('type')}: {item.get('id')}"
                    for item in causes
                    if isinstance(item, dict)
                ],
                "evidence": [
                    {
                        "source_id": str(item.get("id", "")),
                        "source_type": "season_plan"
                        if item.get("type") == "season_reorder"
                        else "delta",
                        "label": str(item.get("type", "cause")),
                        "excerpt": ", ".join(changed_fields),
                    }
                    for item in causes
                    if isinstance(item, dict)
                ],
            }
        )
    return {
        "trigger": trigger,
        "generated_at": datetime.now(UTC).isoformat(),
        "affected_items": items,
        "regeneration_scheduled": False,
    }


def _empty_impact(cause_type: str, cause_ids: list[str]) -> dict[str, object]:
    return {
        "cause": {"type": cause_type, "ids": cause_ids},
        "affected_items": [],
        "affected_episode_ids": [],
        "affected_count": 0,
        "regeneration_scheduled": False,
    }


def _downstream_impact(composition: ContinuityComposition, delta_id: str) -> dict[str, object]:
    affected = [
        {
            "season_plan_item_id": entry.season_plan_item_id,
            "episode_id": entry.episode_id,
            "changed_fields": [],
            "causes": [{"type": "approved_delta", "id": delta_id}],
        }
        for entry in composition.entries
        if delta_id in entry.applied_delta_ids
    ]
    return {
        "cause": {"type": "approved_delta", "ids": [delta_id]},
        "affected_items": affected,
        "affected_episode_ids": sorted(
            entry["episode_id"] for entry in affected if isinstance(entry["episode_id"], str)
        ),
        "affected_count": len(affected),
        "regeneration_scheduled": False,
    }


def _revision_conflict(exc: SeriesStateRevisionConflictError) -> HTTPException:
    return HTTPException(
        status_code=409,
        detail={
            "code": "series_state_revision_conflict",
            "expected_revision": exc.expected,
            "current_revision": exc.current,
        },
    )


def _stale_conflict(expected: str, current: str) -> HTTPException:
    return HTTPException(
        status_code=409,
        detail={
            "code": "continuity_proposal_stale",
            "expected_source_fingerprint": expected,
            "current_source_fingerprint": current,
        },
    )
