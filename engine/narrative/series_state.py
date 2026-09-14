from __future__ import annotations

import hashlib
import json
import threading
import uuid
from collections.abc import Mapping
from datetime import UTC, datetime
from enum import StrEnum
from pathlib import Path
from typing import Any, Literal, cast

from pydantic import BaseModel, ConfigDict, Field, model_validator

from engine.narrative.season_plan import SeasonPlan
from engine.production.artifacts import write_text_atomic


class StrictStateModel(BaseModel):
    model_config = ConfigDict(extra="forbid")

    @classmethod
    def ollama_schema(cls) -> dict[str, Any]:
        schema = cls.model_json_schema()
        definitions = schema.pop("$defs", {})
        return cast(dict[str, Any], _inline_schema(schema, definitions))


class DeltaEvidence(StrictStateModel):
    id: str = Field(pattern=r"^evidence-[a-z0-9_-]+$")
    source: Literal["episode", "bible", "manual"]
    reference: str = Field(min_length=1, max_length=500)
    excerpt: str = Field(default="", max_length=2000)


class StateMutation(StrictStateModel):
    key: str = Field(min_length=1, max_length=200)
    value: str = Field(min_length=1, max_length=2000)
    evidence_ids: list[str] = Field(default_factory=list)


class KnowledgeMutation(StrictStateModel):
    character_id: str = Field(min_length=1, max_length=200)
    fact_id: str = Field(min_length=1, max_length=200)
    evidence_ids: list[str] = Field(default_factory=list)


class ObjectiveMutation(StrictStateModel):
    character_id: str = Field(min_length=1, max_length=200)
    objective_id: str = Field(min_length=1, max_length=200)
    description: str = Field(min_length=1, max_length=2000)
    status: Literal["active", "resolved", "abandoned"] = "active"
    evidence_ids: list[str] = Field(default_factory=list)


class EpisodeStateDelta(StrictStateModel):
    facts: list[StateMutation] = Field(default_factory=list)
    knowledge: list[KnowledgeMutation] = Field(default_factory=list)
    secrets_revealed: list[StateMutation] = Field(default_factory=list)
    relationships: list[StateMutation] = Field(default_factory=list)
    objectives: list[ObjectiveMutation] = Field(default_factory=list)
    object_states: list[StateMutation] = Field(default_factory=list)
    visual_states: list[StateMutation] = Field(default_factory=list)
    threads_opened: list[StateMutation] = Field(default_factory=list)
    threads_resolved: list[StateMutation] = Field(default_factory=list)
    evidence: list[DeltaEvidence] = Field(default_factory=list)

    @model_validator(mode="after")
    def evidence_and_mutations_are_coherent(self) -> EpisodeStateDelta:
        evidence_ids = [item.id for item in self.evidence]
        if len(evidence_ids) != len(set(evidence_ids)):
            raise ValueError("Delta evidence ids must be unique")
        known = set(evidence_ids)
        mutations: list[StateMutation | KnowledgeMutation | ObjectiveMutation] = [
            *self.facts,
            *self.knowledge,
            *self.secrets_revealed,
            *self.relationships,
            *self.objectives,
            *self.object_states,
            *self.visual_states,
            *self.threads_opened,
            *self.threads_resolved,
        ]
        unknown = {item for mutation in mutations for item in mutation.evidence_ids} - known
        if unknown:
            raise ValueError("Delta references unknown evidence: " + ", ".join(sorted(unknown)))
        for name in (
            "facts",
            "secrets_revealed",
            "relationships",
            "object_states",
            "visual_states",
            "threads_opened",
            "threads_resolved",
        ):
            keys = [item.key for item in getattr(self, name)]
            if len(keys) != len(set(keys)):
                raise ValueError(f"Delta {name} keys must be unique")
        return self


class DeltaProvenance(StrictStateModel):
    mode: Literal["manual", "ai"]
    provider: str = "human"
    model: str | None = None
    task_id: str | None = None
    task_version: int | None = Field(default=None, ge=1)
    input_fingerprint: str | None = Field(default=None, pattern=r"^[0-9a-f]{64}$")
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class DeltaProposalStatus(StrEnum):
    PROPOSED = "proposed"
    APPROVED = "approved"
    REFUSED = "refused"
    SUPERSEDED = "superseded"


class EpisodeDeltaProposal(StrictStateModel):
    id: str = Field(pattern=r"^delta-[0-9a-f]+$")
    season_plan_item_id: str = Field(pattern=r"^season-item-[0-9a-f]+$")
    episode_id: str | None = Field(default=None, pattern=r"^S\d{2}E\d{3}$")
    delta: EpisodeStateDelta
    source_fingerprint: str = Field(pattern=r"^[0-9a-f]{64}$")
    provenance: DeltaProvenance
    status: DeltaProposalStatus = DeltaProposalStatus.PROPOSED
    proposed_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    decided_at: datetime | None = None
    refusal_reason: str | None = Field(default=None, max_length=2000)

    def is_stale(self, current_source_fingerprint: str) -> bool:
        return self.source_fingerprint != current_source_fingerprint


class StateCause(StrictStateModel):
    delta_id: str
    season_plan_item_id: str
    episode_id: str | None = None
    category: str
    key: str
    evidence_ids: list[str] = Field(default_factory=list)


class SeriesState(StrictStateModel):
    facts: dict[str, str] = Field(default_factory=dict)
    knowledge: dict[str, list[str]] = Field(default_factory=dict)
    revealed_secrets: dict[str, str] = Field(default_factory=dict)
    relationships: dict[str, str] = Field(default_factory=dict)
    objectives: dict[str, dict[str, str]] = Field(default_factory=dict)
    object_states: dict[str, str] = Field(default_factory=dict)
    visual_states: dict[str, str] = Field(default_factory=dict)
    open_threads: dict[str, str] = Field(default_factory=dict)
    resolved_threads: dict[str, str] = Field(default_factory=dict)
    causes: list[StateCause] = Field(default_factory=list)


class EpisodeEntryState(StrictStateModel):
    season_plan_item_id: str
    episode_id: str | None = None
    state: SeriesState
    applied_delta_ids: list[str] = Field(default_factory=list)


class ContinuityComposition(StrictStateModel):
    plan_revision: int = Field(ge=0)
    document_revision: int = Field(ge=0)
    entries: list[EpisodeEntryState] = Field(default_factory=list)
    final_state: SeriesState

    def entry_for(self, season_plan_item_id: str) -> EpisodeEntryState:
        try:
            return next(
                entry
                for entry in self.entries
                if entry.season_plan_item_id == season_plan_item_id
            )
        except StopIteration as exc:
            raise KeyError(season_plan_item_id) from exc


class SeriesStateDocument(StrictStateModel):
    schema_version: int = 1
    revision: int = Field(default=0, ge=0)
    updated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    base_state: SeriesState = Field(default_factory=SeriesState)
    proposals: list[EpisodeDeltaProposal] = Field(default_factory=list)

    @model_validator(mode="after")
    def proposal_identities_are_unique(self) -> SeriesStateDocument:
        identities = [proposal.id for proposal in self.proposals]
        if len(identities) != len(set(identities)):
            raise ValueError("Delta proposal ids must be unique")
        approved_items = [
            proposal.season_plan_item_id
            for proposal in self.proposals
            if proposal.status is DeltaProposalStatus.APPROVED
        ]
        if len(approved_items) != len(set(approved_items)):
            raise ValueError("Only one approved delta is allowed per season item")
        return self


class SeriesStateRevisionConflictError(ValueError):
    def __init__(self, expected: int, current: int) -> None:
        self.expected = expected
        self.current = current
        super().__init__(f"Series state revision conflict: expected {expected}, current {current}")


class StaleDeltaProposalError(ValueError):
    pass


class SeriesStateRegistry:
    """Versioned human gate for continuity proposals; proposals never mutate canon."""

    _lock = threading.RLock()

    def __init__(self, private_root: Path) -> None:
        self.path = private_root.resolve() / "world" / "series-state.json"

    def load(self) -> SeriesStateDocument:
        with self._lock:
            if not self.path.is_file():
                return SeriesStateDocument()
            return SeriesStateDocument.model_validate_json(self.path.read_text(encoding="utf-8"))

    def propose(
        self,
        season_plan_item_id: str,
        delta: EpisodeStateDelta,
        *,
        source_fingerprint: str,
        provenance: DeltaProvenance,
        expected_revision: int,
        episode_id: str | None = None,
    ) -> SeriesStateDocument:
        with self._lock:
            current = self.load()
            self._check_revision(current, expected_revision)
            proposal = EpisodeDeltaProposal(
                id=f"delta-{uuid.uuid4().hex}",
                season_plan_item_id=season_plan_item_id,
                episode_id=episode_id,
                delta=delta,
                source_fingerprint=source_fingerprint,
                provenance=provenance,
            )
            return self._commit(current, [*current.proposals, proposal])

    def propose_manual(
        self,
        season_plan_item_id: str,
        delta: EpisodeStateDelta,
        *,
        source: object,
        entry_state: SeriesState,
        expected_revision: int,
        episode_id: str | None = None,
    ) -> SeriesStateDocument:
        return self.propose(
            season_plan_item_id,
            delta,
            source_fingerprint=episode_state_source_fingerprint(source, entry_state),
            provenance=DeltaProvenance(mode="manual"),
            expected_revision=expected_revision,
            episode_id=episode_id,
        )

    def approve(
        self,
        proposal_id: str,
        *,
        current_source_fingerprint: str,
        expected_revision: int,
    ) -> SeriesStateDocument:
        with self._lock:
            current = self.load()
            proposal = self._proposal(current, proposal_id)
            if proposal.status is DeltaProposalStatus.APPROVED:
                return current
            self._check_revision(current, expected_revision)
            if proposal.status is not DeltaProposalStatus.PROPOSED:
                raise ValueError("Only a proposed delta can be approved")
            if proposal.is_stale(current_source_fingerprint):
                raise StaleDeltaProposalError("Delta proposal source has changed")
            now = datetime.now(UTC)
            proposals = [
                item.model_copy(
                    update={"status": DeltaProposalStatus.SUPERSEDED, "decided_at": now}
                )
                if item.status is DeltaProposalStatus.APPROVED
                and item.season_plan_item_id == proposal.season_plan_item_id
                else item
                for item in current.proposals
            ]
            approved = proposal.model_copy(
                update={"status": DeltaProposalStatus.APPROVED, "decided_at": now}
            )
            return self._commit(current, self._replace(proposals, approved))

    def refuse(
        self,
        proposal_id: str,
        *,
        reason: str,
        expected_revision: int,
    ) -> SeriesStateDocument:
        if not reason.strip():
            raise ValueError("A refusal reason is required")
        with self._lock:
            current = self.load()
            proposal = self._proposal(current, proposal_id)
            if proposal.status is DeltaProposalStatus.REFUSED:
                return current
            self._check_revision(current, expected_revision)
            if proposal.status is not DeltaProposalStatus.PROPOSED:
                raise ValueError("Only a proposed delta can be refused")
            refused = proposal.model_copy(
                update={
                    "status": DeltaProposalStatus.REFUSED,
                    "decided_at": datetime.now(UTC),
                    "refusal_reason": reason.strip(),
                }
            )
            return self._commit(current, self._replace(current.proposals, refused))

    def compose(self, season_plan: SeasonPlan) -> ContinuityComposition:
        document = self.load()
        approved = {
            proposal.season_plan_item_id: proposal
            for proposal in document.proposals
            if proposal.status is DeltaProposalStatus.APPROVED
        }
        state = document.base_state.model_copy(deep=True)
        applied: list[str] = []
        entries: list[EpisodeEntryState] = []
        for item in season_plan.active_items:
            entries.append(
                EpisodeEntryState(
                    season_plan_item_id=item.id,
                    episode_id=item.episode_id,
                    state=state.model_copy(deep=True),
                    applied_delta_ids=list(applied),
                )
            )
            proposal = approved.get(item.id)
            if proposal is not None:
                state = apply_episode_delta(state, proposal)
                applied.append(proposal.id)
        return ContinuityComposition(
            plan_revision=season_plan.revision,
            document_revision=document.revision,
            entries=entries,
            final_state=state,
        )

    def _commit(
        self, current: SeriesStateDocument, proposals: list[EpisodeDeltaProposal]
    ) -> SeriesStateDocument:
        updated = SeriesStateDocument(
            schema_version=current.schema_version,
            revision=current.revision + 1,
            updated_at=datetime.now(UTC),
            base_state=current.base_state,
            proposals=proposals,
        )
        write_text_atomic(self.path, updated.model_dump_json(indent=2) + "\n")
        return updated

    @staticmethod
    def _proposal(document: SeriesStateDocument, proposal_id: str) -> EpisodeDeltaProposal:
        try:
            return next(item for item in document.proposals if item.id == proposal_id)
        except StopIteration as exc:
            raise KeyError(proposal_id) from exc

    @staticmethod
    def _replace(
        proposals: list[EpisodeDeltaProposal], replacement: EpisodeDeltaProposal
    ) -> list[EpisodeDeltaProposal]:
        return [replacement if item.id == replacement.id else item for item in proposals]

    @staticmethod
    def _check_revision(document: SeriesStateDocument, expected_revision: int) -> None:
        if document.revision != expected_revision:
            raise SeriesStateRevisionConflictError(expected_revision, document.revision)


def episode_state_source_fingerprint(source: object, entry_state: SeriesState) -> str:
    payload = {"source": _json_value(source), "entry_state": entry_state.model_dump(mode="json")}
    encoded = json.dumps(payload, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(encoded.encode("utf-8")).hexdigest()


def apply_episode_delta(state: SeriesState, proposal: EpisodeDeltaProposal) -> SeriesState:
    result = state.model_copy(deep=True)
    delta = proposal.delta
    categories = (
        ("fact", delta.facts, result.facts),
        ("secret", delta.secrets_revealed, result.revealed_secrets),
        ("relationship", delta.relationships, result.relationships),
        ("object", delta.object_states, result.object_states),
        ("visual_state", delta.visual_states, result.visual_states),
        ("thread_opened", delta.threads_opened, result.open_threads),
    )
    for category, mutations, target in categories:
        for mutation in mutations:
            target[mutation.key] = mutation.value
            result.causes.append(_cause(proposal, category, mutation.key, mutation.evidence_ids))
    for knowledge_change in delta.knowledge:
        known = result.knowledge.setdefault(knowledge_change.character_id, [])
        if knowledge_change.fact_id not in known:
            known.append(knowledge_change.fact_id)
        result.causes.append(
            _cause(
                proposal,
                "knowledge",
                f"{knowledge_change.character_id}:{knowledge_change.fact_id}",
                knowledge_change.evidence_ids,
            )
        )
    for objective_change in delta.objectives:
        objectives = result.objectives.setdefault(objective_change.character_id, {})
        objectives[objective_change.objective_id] = (
            f"{objective_change.status}:{objective_change.description}"
        )
        result.causes.append(
            _cause(
                proposal,
                "objective",
                f"{objective_change.character_id}:{objective_change.objective_id}",
                objective_change.evidence_ids,
            )
        )
    for thread_change in delta.threads_resolved:
        result.open_threads.pop(thread_change.key, None)
        result.resolved_threads[thread_change.key] = thread_change.value
        result.causes.append(
            _cause(
                proposal,
                "thread_resolved",
                thread_change.key,
                thread_change.evidence_ids,
            )
        )
    return result


def _cause(
    proposal: EpisodeDeltaProposal, category: str, key: str, evidence_ids: list[str]
) -> StateCause:
    return StateCause(
        delta_id=proposal.id,
        season_plan_item_id=proposal.season_plan_item_id,
        episode_id=proposal.episode_id,
        category=category,
        key=key,
        evidence_ids=evidence_ids,
    )


def _json_value(value: object) -> object:
    if isinstance(value, BaseModel):
        return value.model_dump(mode="json")
    if isinstance(value, Mapping):
        return {str(key): _json_value(item) for key, item in value.items()}
    if isinstance(value, (list, tuple)):
        return [_json_value(item) for item in value]
    return value


def _inline_schema(value: Any, definitions: dict[str, Any]) -> Any:
    if isinstance(value, list):
        return [_inline_schema(item, definitions) for item in value]
    if not isinstance(value, dict):
        return value
    reference = value.get("$ref")
    if isinstance(reference, str):
        return _inline_schema(definitions[reference.rsplit("/", 1)[-1]], definitions)
    return {
        key: _inline_schema(item, definitions)
        for key, item in value.items()
        if key not in {"title", "default"}
    }
