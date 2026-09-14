from __future__ import annotations

from pathlib import Path

import pytest
from pydantic import ValidationError

from engine.narrative.episode_models import NarrativeProvenance
from engine.narrative.season_plan import SeasonPlan, SeasonPlanItem
from engine.narrative.series_state import (
    DeltaEvidence,
    DeltaProposalStatus,
    EpisodeStateDelta,
    KnowledgeMutation,
    ObjectiveMutation,
    SeriesState,
    SeriesStateRegistry,
    SeriesStateRevisionConflictError,
    StaleDeltaProposalError,
    StateMutation,
    episode_state_source_fingerprint,
)
from engine.narrative.tasks import (
    CONTINUITY_DELTA_TASK,
    DEFAULT_TASK_REGISTRY,
    NarrativeTaskId,
    build_continuity_delta_context,
    build_fake_continuity_delta,
)


def _plan(*item_ids: str) -> SeasonPlan:
    return SeasonPlan(
        revision=4,
        items=[
            SeasonPlanItem(
                id=item_id,
                position=position,
                title=f"Épisode {position}",
                provenance=NarrativeProvenance(stage="screenwriter", mode="manual"),
            )
            for position, item_id in enumerate(item_ids, start=1)
        ],
    )


def _belladone_delta() -> EpisodeStateDelta:
    evidence = DeltaEvidence(
        id="evidence-aveu",
        source="episode",
        reference="S01E001:42",
        excerpt="Belladone avoue vouloir la graine; Aconit entend tout.",
    )
    proof = [evidence.id]
    return EpisodeStateDelta(
        facts=[
            StateMutation(
                key="fact-aveu", value="Belladone veut la graine", evidence_ids=proof
            )
        ],
        knowledge=[
            KnowledgeMutation(
                character_id="aconit", fact_id="fact-aveu", evidence_ids=proof
            )
        ],
        secrets_revealed=[
            StateMutation(
                key="secret-graine", value="Aconit connaît le gardien", evidence_ids=proof
            )
        ],
        relationships=[
            StateMutation(
                key="relation-belladone-aconit", value="dette consentie", evidence_ids=proof
            )
        ],
        objectives=[
            ObjectiveMutation(
                character_id="belladone",
                objective_id="voler-graine",
                description="Obtenir la graine",
                evidence_ids=proof,
            )
        ],
        object_states=[
            StateMutation(key="graine", value="éveillée", evidence_ids=proof)
        ],
        visual_states=[
            StateMutation(key="belladone-main", value="liée par une liane", evidence_ids=proof)
        ],
        threads_opened=[
            StateMutation(
                key="fil-nom-belladone",
                value="Pourquoi la graine connaît son nom ?",
                evidence_ids=proof,
            )
        ],
        evidence=[evidence],
    )


def test_proposed_and_refused_deltas_never_change_canonical_entry_state(tmp_path: Path) -> None:
    plan = _plan("season-item-a1", "season-item-a2")
    registry = SeriesStateRegistry(tmp_path)
    source = {"id": "S01E001", "script": "Belladone avoue."}
    fingerprint = episode_state_source_fingerprint(source, SeriesState())

    proposed = registry.propose_manual(
        "season-item-a1",
        _belladone_delta(),
        source=source,
        entry_state=SeriesState(),
        episode_id="S01E001",
        expected_revision=0,
    )
    proposal = proposed.proposals[0]
    assert proposal.source_fingerprint == fingerprint
    assert registry.compose(plan).entry_for("season-item-a2").state == SeriesState()

    refused = registry.refuse(proposal.id, reason="L’aveu reste ambigu", expected_revision=1)

    assert refused.proposals[0].status is DeltaProposalStatus.REFUSED
    assert registry.compose(plan).final_state == SeriesState()


def test_approval_is_explicit_idempotent_and_rejects_a_stale_source(tmp_path: Path) -> None:
    registry = SeriesStateRegistry(tmp_path)
    entry = SeriesState()
    source = {"id": "S01E001", "script": "Version une"}
    proposed = registry.propose_manual(
        "season-item-a1",
        _belladone_delta(),
        source=source,
        entry_state=entry,
        expected_revision=0,
    )
    proposal = proposed.proposals[0]

    with pytest.raises(StaleDeltaProposalError):
        registry.approve(
            proposal.id,
            current_source_fingerprint=episode_state_source_fingerprint(
                {"id": "S01E001", "script": "Version deux"}, entry
            ),
            expected_revision=1,
        )

    fingerprint = episode_state_source_fingerprint(source, entry)
    approved = registry.approve(
        proposal.id, current_source_fingerprint=fingerprint, expected_revision=1
    )
    retried = registry.approve(
        proposal.id, current_source_fingerprint=fingerprint, expected_revision=1
    )

    assert approved.revision == 2
    assert retried == approved
    with pytest.raises(SeriesStateRevisionConflictError) as conflict:
        registry.propose_manual(
            "season-item-a2",
            EpisodeStateDelta(),
            source={},
            entry_state=entry,
            expected_revision=1,
        )
    assert conflict.value.current == 2


def test_approved_delta_composes_all_dimensions_in_season_order_and_reloads(
    tmp_path: Path,
) -> None:
    first_id = "season-item-a1"
    second_id = "season-item-a2"
    plan = _plan(first_id, second_id)
    registry = SeriesStateRegistry(tmp_path)
    source = {"id": "S01E001", "script": "Belladone avoue."}
    proposed = registry.propose_manual(
        first_id,
        _belladone_delta(),
        source=source,
        entry_state=SeriesState(),
        episode_id="S01E001",
        expected_revision=0,
    )
    fingerprint = proposed.proposals[0].source_fingerprint
    approved = registry.approve(
        proposed.proposals[0].id,
        current_source_fingerprint=fingerprint,
        expected_revision=1,
    )

    composition = SeriesStateRegistry(tmp_path).compose(plan)
    before_first = composition.entry_for(first_id)
    before_second = composition.entry_for(second_id)

    assert before_first.state == SeriesState()
    assert before_second.applied_delta_ids == [approved.proposals[0].id]
    assert before_second.state.facts["fact-aveu"] == "Belladone veut la graine"
    assert before_second.state.knowledge["aconit"] == ["fact-aveu"]
    assert "secret-graine" in before_second.state.revealed_secrets
    assert before_second.state.relationships["relation-belladone-aconit"] == "dette consentie"
    assert before_second.state.objectives["belladone"]["voler-graine"].startswith("active:")
    assert before_second.state.object_states["graine"] == "éveillée"
    assert before_second.state.visual_states["belladone-main"] == "liée par une liane"
    assert "fil-nom-belladone" in before_second.state.open_threads
    assert {cause.category for cause in before_second.state.causes} >= {
        "fact",
        "knowledge",
        "secret",
        "relationship",
    }
    assert all(cause.delta_id == approved.proposals[0].id for cause in before_second.state.causes)

    reordered = _plan(second_id, first_id)
    after_reorder = SeriesStateRegistry(tmp_path).compose(reordered)
    assert after_reorder.entry_for(second_id).state == SeriesState()
    assert after_reorder.entry_for(first_id).state == SeriesState()
    assert after_reorder.final_state.facts["fact-aveu"] == "Belladone veut la graine"


def test_resolving_a_thread_removes_it_from_open_threads(tmp_path: Path) -> None:
    registry = SeriesStateRegistry(tmp_path)
    first = _belladone_delta()
    second = EpisodeStateDelta(
        threads_resolved=[
            StateMutation(key="fil-nom-belladone", value="La graine reconnaît sa créatrice")
        ]
    )
    plan = _plan("season-item-a1", "season-item-a2")
    revision = 0
    entry = SeriesState()
    for item_id, delta in (("season-item-a1", first), ("season-item-a2", second)):
        source = {"item": item_id}
        proposed = registry.propose_manual(
            item_id,
            delta,
            source=source,
            entry_state=entry,
            expected_revision=revision,
        )
        revision = proposed.revision
        approved = registry.approve(
            proposed.proposals[-1].id,
            current_source_fingerprint=proposed.proposals[-1].source_fingerprint,
            expected_revision=revision,
        )
        revision = approved.revision
        entry = registry.compose(plan).final_state

    final = registry.compose(plan).final_state
    assert "fil-nom-belladone" not in final.open_threads
    assert final.resolved_threads["fil-nom-belladone"] == "La graine reconnaît sa créatrice"


def test_delta_contract_rejects_unknown_evidence() -> None:
    with pytest.raises(ValidationError, match="unknown evidence"):
        EpisodeStateDelta(
            facts=[StateMutation(key="fact", value="valeur", evidence_ids=["missing"])]
        )


def test_v2_task_is_non_mutating_strict_and_fake_is_reproducible() -> None:
    current = DEFAULT_TASK_REGISTRY.get(NarrativeTaskId.CONTINUITY_DELTA)
    context = build_continuity_delta_context(
        SeriesState(), {"id": "S01E001", "narrative_source": "Un aveu."}, {"revision": 1}
    )

    assert current is CONTINUITY_DELTA_TASK
    assert current.version == 2
    assert DEFAULT_TASK_REGISTRY.get(NarrativeTaskId.CONTINUITY_DELTA, 1).version == 1
    assert not current.allows_mutation
    assert set(current.required_context) == {"entry_state", "episode", "bible"}
    assert current.compile(context).input_fingerprint == context.fingerprint
    assert build_fake_continuity_delta(
        SeriesState(), {"id": "S01E001", "narrative_source": "Un aveu."}, {"revision": 1}
    ) == build_fake_continuity_delta(
        SeriesState(), {"id": "S01E001", "narrative_source": "Un aveu."}, {"revision": 1}
    )
