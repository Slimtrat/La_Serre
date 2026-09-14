from __future__ import annotations

import hashlib
import json
import threading
from collections.abc import Mapping, Sequence
from datetime import UTC, datetime
from pathlib import Path
from typing import Any, Literal, cast

from pydantic import BaseModel, ConfigDict, Field, model_validator

from engine.narrative.tasks.models import CompiledTask, TaskContext, TaskKind, TaskSpec
from engine.narrative.workflow_models import StrictWorkflowModel
from engine.production.artifacts import write_text_atomic
from engine.world.models import ProjectBible

TASK_ID = "tentafruit.season-plan"
TASK_VERSION = 2


class TentafruitSeriesPlanItem(StrictWorkflowModel):
    """Editable candidate. Its identity survives reordering and manual changes."""

    candidate_id: str = Field(pattern=r"^candidate-[a-z0-9_-]+$")
    season: int = Field(default=1, ge=1, le=99)
    position: int = Field(ge=1, le=20)
    title: str = Field(min_length=1, max_length=180)
    logline: str = Field(default="", max_length=1000)
    synopsis: str = Field(default="", max_length=20_000)
    hook: str = Field(min_length=1, max_length=1000)
    conflict: str = Field(min_length=1, max_length=2000)
    turning_point: str = Field(min_length=1, max_length=2000)
    relationship_id: str = Field(min_length=1)
    relationship_shift: str = Field(min_length=1, max_length=1000)
    secret_id: str | None = None
    reveals_secret: bool = False
    cliffhanger: str = Field(min_length=1, max_length=2000)
    character_ids: list[str] = Field(min_length=1)
    location_ids: list[str] = Field(min_length=1)
    duration_seconds: int = Field(ge=1, le=600)

    @model_validator(mode="after")
    def references_are_unique_and_secret_is_coherent(self) -> TentafruitSeriesPlanItem:
        if len(self.character_ids) != len(set(self.character_ids)):
            raise ValueError("Candidate character ids must be unique")
        if len(self.location_ids) != len(set(self.location_ids)):
            raise ValueError("Candidate location ids must be unique")
        if self.reveals_secret and self.secret_id is None:
            raise ValueError("A secret reveal requires a secret_id")
        return self


class TentafruitSeriesPlan(StrictWorkflowModel):
    season: int = Field(default=1, ge=1, le=99)
    series_arc: str = Field(min_length=20, max_length=20_000)
    items: list[TentafruitSeriesPlanItem] = Field(min_length=6, max_length=20)

    @model_validator(mode="after")
    def identities_and_positions_are_stable(self) -> TentafruitSeriesPlan:
        identities = [item.candidate_id for item in self.items]
        if len(identities) != len(set(identities)):
            raise ValueError("Candidate ids must be unique")
        positions = sorted(item.position for item in self.items)
        if positions != list(range(1, len(self.items) + 1)):
            raise ValueError("Candidate positions must be contiguous")
        if any(item.season != self.season for item in self.items):
            raise ValueError("Every candidate must belong to the proposed season")
        return self

    @property
    def ordered_items(self) -> list[TentafruitSeriesPlanItem]:
        return sorted(self.items, key=lambda item: item.position)


class SeriesPlanBudget(BaseModel):
    model_config = ConfigDict(extra="forbid")

    episode_count: int = Field(default=6, ge=6, le=20)
    duration_seconds_min: int = Field(default=30, ge=1, le=600)
    duration_seconds_max: int = Field(default=60, ge=1, le=600)

    @model_validator(mode="after")
    def duration_range_is_valid(self) -> SeriesPlanBudget:
        if self.duration_seconds_min > self.duration_seconds_max:
            raise ValueError("Minimum duration cannot exceed maximum duration")
        return self


class SeriesPlanFinding(BaseModel):
    model_config = ConfigDict(extra="forbid")

    code: str
    severity: Literal["blocker", "warning"]
    message: str
    candidate_ids: list[str] = Field(default_factory=list)


class SeriesPlanValidation(BaseModel):
    model_config = ConfigDict(extra="forbid")

    valid: bool
    findings: list[SeriesPlanFinding] = Field(default_factory=list)


class CompiledPromptMessage(BaseModel):
    model_config = ConfigDict(extra="forbid")

    role: Literal["system", "user"]
    content: str


class SeasonPlanProposalProvenance(BaseModel):
    model_config = ConfigDict(extra="forbid")

    task_id: str = TASK_ID
    task_version: int = Field(ge=1)
    model: str = Field(min_length=1)
    input_fingerprint: str = Field(pattern=r"^[0-9a-f]{64}$")
    compiled_messages: list[CompiledPromptMessage] = Field(min_length=2)
    generated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class SeasonPlanProposal(BaseModel):
    model_config = ConfigDict(extra="forbid")

    plan: TentafruitSeriesPlan
    provenance: SeasonPlanProposalProvenance
    base_plan_revision: int = Field(ge=0)
    source_bible_revision: int = Field(ge=0)
    source_bible_fingerprint: str = Field(pattern=r"^[0-9a-f]{64}$")

    def is_stale(self, bible: ProjectBible) -> bool:
        return self.source_bible_fingerprint != series_plan_source_fingerprint(bible)


class SeasonPlanProposalDocument(BaseModel):
    model_config = ConfigDict(extra="forbid")

    schema_version: int = 1
    revision: int = Field(default=0, ge=0)
    updated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    proposal: SeasonPlanProposal | None = None

    def is_stale(self, bible: ProjectBible) -> bool:
        return self.proposal is not None and self.proposal.is_stale(bible)


class SeasonPlanProposalRevisionConflictError(ValueError):
    def __init__(self, expected: int, current: int) -> None:
        self.expected = expected
        self.current = current
        super().__init__(
            f"Season plan proposal revision conflict: expected {expected}, current {current}"
        )


class SeasonPlanProposalRegistry:
    """Atomic storage for the single, explicitly editable season proposal."""

    _lock = threading.RLock()

    def __init__(self, private_root: Path) -> None:
        self.path = private_root.resolve() / "world" / "season-plan-proposal.json"

    def load(self) -> SeasonPlanProposalDocument:
        with self._lock:
            if not self.path.is_file():
                return SeasonPlanProposalDocument()
            return SeasonPlanProposalDocument.model_validate_json(
                self.path.read_text(encoding="utf-8")
            )

    def create(
        self,
        plan: TentafruitSeriesPlan,
        compiled: CompiledTask,
        *,
        model: str,
        bible: ProjectBible,
        base_plan_revision: int,
        expected_revision: int,
    ) -> SeasonPlanProposalDocument:
        if compiled.task_id != TASK_ID or compiled.task_version != TASK_VERSION:
            raise ValueError(f"Expected compiled task {TASK_ID}@{TASK_VERSION}")
        with self._lock:
            current = self.load()
            self._check_revision(current, expected_revision)
            proposal = SeasonPlanProposal(
                plan=plan,
                provenance=SeasonPlanProposalProvenance(
                    task_id=compiled.task_id,
                    task_version=compiled.task_version,
                    model=model,
                    input_fingerprint=compiled.input_fingerprint,
                    compiled_messages=[
                        CompiledPromptMessage.model_validate(message)
                        for message in compiled.messages
                    ],
                ),
                base_plan_revision=base_plan_revision,
                source_bible_revision=bible.revision,
                source_bible_fingerprint=series_plan_source_fingerprint(bible),
            )
            return self._commit(current, proposal)

    def update(
        self,
        items: Sequence[TentafruitSeriesPlanItem | Mapping[str, Any]],
        *,
        expected_revision: int,
    ) -> SeasonPlanProposalDocument:
        with self._lock:
            current = self.load()
            self._check_revision(current, expected_revision)
            if current.proposal is None:
                raise ValueError("No season plan proposal exists")
            validated_items = [
                item
                if isinstance(item, TentafruitSeriesPlanItem)
                else TentafruitSeriesPlanItem.model_validate(item)
                for item in items
            ]
            edited_plan = current.proposal.plan.model_copy(update={"items": validated_items})
            # model_copy deliberately skips validation, so round-trip through the strict model.
            edited_plan = TentafruitSeriesPlan.model_validate(edited_plan.model_dump())
            proposal = current.proposal.model_copy(update={"plan": edited_plan})
            return self._commit(current, proposal)

    def save(
        self,
        proposal: SeasonPlanProposal,
        *,
        expected_revision: int,
    ) -> SeasonPlanProposalDocument:
        with self._lock:
            current = self.load()
            self._check_revision(current, expected_revision)
            return self._commit(current, proposal)

    def clear(self, *, expected_revision: int) -> SeasonPlanProposalDocument:
        """Remove the accepted proposal without resetting its optimistic revision."""

        with self._lock:
            current = self.load()
            self._check_revision(current, expected_revision)
            return self._commit(current, None)

    def _commit(
        self,
        current: SeasonPlanProposalDocument,
        proposal: SeasonPlanProposal | None,
    ) -> SeasonPlanProposalDocument:
        document = SeasonPlanProposalDocument(
            schema_version=current.schema_version,
            revision=current.revision + 1,
            updated_at=datetime.now(UTC),
            proposal=proposal,
        )
        write_text_atomic(self.path, document.model_dump_json(indent=2) + "\n")
        return document

    @staticmethod
    def _check_revision(
        document: SeasonPlanProposalDocument, expected_revision: int
    ) -> None:
        if document.revision != expected_revision:
            raise SeasonPlanProposalRevisionConflictError(
                expected_revision, document.revision
            )


TENTAFRUIT_SERIES_PLAN_TASK = TaskSpec(
    task_id=TASK_ID,
    version=TASK_VERSION,
    kind=TaskKind.CREATIVE,
    objective=(
        "Tu proposes une saison courte éditable pilotée par la Bible et le profil de format."
    ),
    contract=TentafruitSeriesPlan,
    required_context=("source", "custom_prompt", "bible", "template", "budget"),
    rules=(
        "Produis exactement budget.episode_count épisodes entre 6 et 20.",
        "Utilise exclusivement les identifiants de la Bible fournie.",
        (
            "Chaque épisode a un hook, un conflit, une bascule relationnelle distincte "
            "et un cliffhanger."
        ),
        "Respecte le budget de durée du template pour chaque épisode.",
        "Ne révèle un secret qu'à partir de son épisode de création.",
        "Retourne une proposition modifiable; elle n'est jamais appliquée implicitement.",
    ),
    inference_options={"temperature": 0.45},
)


def build_series_plan_context(
    bible: ProjectBible,
    template: Mapping[str, Any],
    *,
    source: str,
    custom_prompt: str = "",
    episode_count: int = 6,
) -> TaskContext:
    format_profile = template.get("format_profile", template)
    output = format_profile.get("output", {}) if isinstance(format_profile, Mapping) else {}
    budget = SeriesPlanBudget(
        episode_count=episode_count,
        duration_seconds_min=int(output.get("duration_seconds_min", 30)),
        duration_seconds_max=int(output.get("duration_seconds_max", 60)),
    )
    return TaskContext(
        {
            "source": source,
            "custom_prompt": custom_prompt,
            "bible": _series_plan_bible_payload(bible),
            "template": _json_mapping(template),
            "budget": budget,
        }
    )


def validate_series_plan(
    plan: TentafruitSeriesPlan,
    bible: ProjectBible,
    budget: SeriesPlanBudget,
) -> SeriesPlanValidation:
    findings: list[SeriesPlanFinding] = []
    characters = {item.id for item in bible.characters}
    locations = {item.id for item in bible.locations}
    relationships = {item.id: item for item in bible.relationships}
    secrets = {item.id: item for item in bible.secrets}

    if len(plan.items) != budget.episode_count:
        findings.append(
            _finding(
                "episode_budget",
                f"Expected {budget.episode_count} episodes, received {len(plan.items)}.",
            )
        )

    repeated_fields: dict[str, dict[str, list[str]]] = {
        "hook": {},
        "conflict": {},
        "relationship_shift": {},
        "cliffhanger": {},
    }
    for item in plan.ordered_items:
        unknown = (set(item.character_ids) - characters) | (
            set(item.location_ids) - locations
        )
        if item.relationship_id not in relationships:
            unknown.add(item.relationship_id)
        if item.secret_id is not None and item.secret_id not in secrets:
            unknown.add(item.secret_id)
        if unknown:
            findings.append(
                _finding(
                    "unknown_bible_id",
                    "Unknown Bible ids: " + ", ".join(sorted(unknown)),
                    [item.candidate_id],
                )
            )

        relationship = relationships.get(item.relationship_id)
        if relationship is not None and not {
            relationship.source,
            relationship.target,
        }.issubset(item.character_ids):
            findings.append(
                _finding(
                    "relationship_cast",
                    "The relationship endpoints must be present in the episode cast.",
                    [item.candidate_id],
                )
            )
        if not budget.duration_seconds_min <= item.duration_seconds <= budget.duration_seconds_max:
            findings.append(
                _finding(
                    "duration_budget",
                    (
                        f"Duration {item.duration_seconds}s is outside "
                        f"{budget.duration_seconds_min}-{budget.duration_seconds_max}s."
                    ),
                    [item.candidate_id],
                )
            )
        secret = secrets.get(item.secret_id or "")
        if item.reveals_secret and secret is not None and item.position < secret.created_episode:
            findings.append(
                _finding(
                    "premature_secret",
                    (
                        f"Secret {secret.id} cannot be revealed before episode "
                        f"{secret.created_episode}."
                    ),
                    [item.candidate_id],
                )
            )
        for field_name in repeated_fields:
            normalized = _normalize_text(str(getattr(item, field_name)))
            repeated_fields[field_name].setdefault(normalized, []).append(item.candidate_id)

    for field_name, values in repeated_fields.items():
        for candidate_ids in values.values():
            if len(candidate_ids) > 1:
                findings.append(
                    _finding(
                        f"repeated_{field_name}",
                        f"The {field_name.replace('_', ' ')} must be distinct across episodes.",
                        candidate_ids,
                    )
                )

    used_relationships = {item.relationship_id for item in plan.items}
    expected_diversity = min(2, len(relationships))
    if len(used_relationships & relationships.keys()) < expected_diversity:
        findings.append(
            _finding(
                "relationship_diversity",
                f"The season must exercise at least {expected_diversity} canonical relationships.",
                severity="warning",
            )
        )
    return SeriesPlanValidation(
        valid=not any(finding.severity == "blocker" for finding in findings),
        findings=findings,
    )


def build_fake_series_plan(
    bible: ProjectBible,
    budget: SeriesPlanBudget | None = None,
    *,
    season: int = 1,
) -> TentafruitSeriesPlan:
    """Create deterministic, contract-valid CI output without contacting a model."""

    budget = budget or SeriesPlanBudget()
    if not bible.relationships:
        raise ValueError("A fake series plan requires at least one canonical relationship")
    if not bible.locations:
        raise ValueError("A fake series plan requires at least one canonical location")
    relationship_ids = sorted(item.id for item in bible.relationships)
    relationship_by_id = {item.id: item for item in bible.relationships}
    location_ids = sorted(item.id for item in bible.locations)
    items: list[TentafruitSeriesPlanItem] = []
    for position in range(1, budget.episode_count + 1):
        relationship_id = relationship_ids[(position - 1) % len(relationship_ids)]
        relationship = relationship_by_id[relationship_id]
        items.append(
            TentafruitSeriesPlanItem(
                candidate_id=f"candidate-{position:02d}",
                season=season,
                position=position,
                title=f"Bascule {position:02d}",
                logline=f"L'épreuve {position} force la relation à choisir son prochain seuil.",
                synopsis=(
                    f"Un obstacle {position} met le pacte à l'épreuve; le choix qui suit "
                    "transforme concrètement le rapport de force."
                ),
                hook=f"Le pacte impose l'épreuve {position} avant quiconque puisse reculer.",
                conflict=f"Le conflit {position} oppose deux décisions incompatibles.",
                turning_point=f"Le choix {position} inverse le rapport de force.",
                relationship_id=relationship_id,
                relationship_shift=f"La relation {relationship_id} franchit le seuil {position}.",
                cliffhanger=f"Une conséquence inconnue {position} apparaît derrière eux.",
                character_ids=sorted({relationship.source, relationship.target}),
                location_ids=[location_ids[(position - 1) % len(location_ids)]],
                duration_seconds=budget.duration_seconds_min,
            )
        )
    return TentafruitSeriesPlan(
        season=season,
        series_arc=(
            "Une succession d'épreuves transforme les relations canoniques sans appliquer "
            "silencieusement aucun changement à la Bible."
        ),
        items=items,
    )


def series_plan_source_fingerprint(bible: ProjectBible) -> str:
    payload = json.dumps(
        _series_plan_bible_payload(bible),
        ensure_ascii=False,
        sort_keys=True,
        separators=(",", ":"),
    )
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def _series_plan_bible_payload(bible: ProjectBible) -> dict[str, Any]:
    return {
        "characters": [item.model_dump(mode="json") for item in bible.characters],
        "locations": [item.model_dump(mode="json") for item in bible.locations],
        "relationships": [item.model_dump(mode="json") for item in bible.relationships],
        "secrets": [item.model_dump(mode="json") for item in bible.secrets],
        "tone": bible.tone.model_dump(mode="json"),
        "world_rules": [item.model_dump(mode="json") for item in bible.world_rules],
        "narrative_arcs": [item.model_dump(mode="json") for item in bible.narrative_arcs],
    }


def _json_mapping(value: Mapping[str, Any]) -> dict[str, Any]:
    return cast(
        dict[str, Any],
        json.loads(json.dumps(dict(value), ensure_ascii=False, default=str)),
    )


def _normalize_text(value: str) -> str:
    return " ".join(value.casefold().split()).strip(" .!?;:,\"")


def _finding(
    code: str,
    message: str,
    candidate_ids: list[str] | None = None,
    *,
    severity: Literal["blocker", "warning"] = "blocker",
) -> SeriesPlanFinding:
    return SeriesPlanFinding(
        code=code,
        severity=severity,
        message=message,
        candidate_ids=candidate_ids or [],
    )
