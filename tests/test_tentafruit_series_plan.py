from __future__ import annotations

import json
from pathlib import Path

import pytest
from pydantic import ValidationError

from engine.narrative.tasks import DEFAULT_TASK_REGISTRY, NarrativeTaskId
from engine.narrative.tasks.tentafruit_series_plan import (
    TENTAFRUIT_SERIES_PLAN_TASK,
    SeasonPlanProposalRegistry,
    SeasonPlanProposalRevisionConflictError,
    SeriesPlanBudget,
    TentafruitSeriesPlan,
    build_fake_series_plan,
    build_series_plan_context,
    series_plan_source_fingerprint,
    validate_series_plan,
)
from engine.world.models import ProjectBible

ROOT = Path(__file__).parents[1]


def bible() -> ProjectBible:
    return ProjectBible.model_validate_json(
        (ROOT / "starter_catalog" / "world" / "bible.json").read_text(encoding="utf-8")
    )


def template() -> dict[str, object]:
    return json.loads(
        (ROOT / "starter_catalog" / "project-templates" / "tentafruit-dark-romance-v1.json")
        .read_text(encoding="utf-8-sig")
    )


def test_v2_task_contract_is_strict_and_keeps_v1_addressable() -> None:
    current = DEFAULT_TASK_REGISTRY.get(NarrativeTaskId.SEASON_PLAN)

    assert current is TENTAFRUIT_SERIES_PLAN_TASK
    assert current.version == 2
    assert DEFAULT_TASK_REGISTRY.get(NarrativeTaskId.SEASON_PLAN, 1).version == 1
    assert current.contract is TentafruitSeriesPlan
    assert set(current.required_context) == {
        "source",
        "custom_prompt",
        "bible",
        "template",
        "budget",
    }
    with pytest.raises(ValidationError, match="at least 6 items"):
        TentafruitSeriesPlan.model_validate(
            {"series_arc": "Une progression suffisamment longue pour le contrat.", "items": []}
        )


def test_context_and_source_fingerprints_are_deterministic_and_data_driven() -> None:
    canonical = bible()
    left = build_series_plan_context(
        canonical, template(), source="Brief approuvé", episode_count=6
    )
    right = build_series_plan_context(
        canonical.model_copy(deep=True),
        dict(reversed(list(template().items()))),
        source="Brief approuvé",
        episode_count=6,
    )

    assert left.fingerprint == right.fingerprint
    assert left.normalized()["budget"] == {
        "duration_seconds_max": 60,
        "duration_seconds_min": 30,
        "episode_count": 6,
    }
    original = series_plan_source_fingerprint(canonical)
    changed = canonical.model_copy(deep=True)
    changed.relationships[0].trust += 1
    assert series_plan_source_fingerprint(changed) != original


def test_fake_plan_is_reproducible_and_passes_deterministic_validation() -> None:
    canonical = bible()
    budget = SeriesPlanBudget(episode_count=6, duration_seconds_min=30, duration_seconds_max=60)

    left = build_fake_series_plan(canonical, budget)
    right = build_fake_series_plan(canonical, budget)
    report = validate_series_plan(left, canonical, budget)

    assert left == right
    assert len(left.items) == 6
    assert len({item.relationship_shift for item in left.items}) == 6
    assert report.valid
    assert report.findings == []


def test_validator_blocks_unknown_ids_budget_cliffhanger_and_repeated_beats() -> None:
    canonical = bible()
    budget = SeriesPlanBudget(episode_count=6, duration_seconds_min=30, duration_seconds_max=60)
    valid = build_fake_series_plan(canonical, budget)
    first = valid.items[0].model_copy(
        update={
            "character_ids": ["unknown"],
            "location_ids": ["unknown-place"],
            "relationship_id": "unknown-relation",
            "duration_seconds": 10,
        }
    )
    second = valid.items[1].model_copy(
        update={
            "hook": first.hook,
            "conflict": first.conflict,
            "relationship_shift": first.relationship_shift,
            "cliffhanger": first.cliffhanger,
        }
    )
    invalid = TentafruitSeriesPlan(
        season=valid.season,
        series_arc=valid.series_arc,
        items=[first, second, *valid.items[2:]],
    )

    report = validate_series_plan(invalid, canonical, budget)
    codes = {finding.code for finding in report.findings}

    assert not report.valid
    assert {
        "unknown_bible_id",
        "duration_budget",
        "repeated_hook",
        "repeated_conflict",
        "repeated_relationship_shift",
        "repeated_cliffhanger",
    } <= codes


def test_proposal_registry_preserves_provenance_manual_edits_and_detects_stale(
    tmp_path: Path,
) -> None:
    canonical = bible()
    context = build_series_plan_context(
        canonical, template(), source="Brief approuvé", episode_count=6
    )
    compiled = TENTAFRUIT_SERIES_PLAN_TASK.compile(context)
    plan = build_fake_series_plan(canonical)
    registry = SeasonPlanProposalRegistry(tmp_path)

    created = registry.create(
        plan,
        compiled,
        model="fake:ci",
        bible=canonical,
        base_plan_revision=7,
        expected_revision=0,
    )
    assert created.revision == 1
    assert created.proposal is not None
    assert created.proposal.provenance.task_version == 2
    assert created.proposal.provenance.model == "fake:ci"
    assert created.proposal.provenance.input_fingerprint == context.fingerprint
    assert created.proposal.base_plan_revision == 7
    assert "budget.episode_count" in created.proposal.provenance.compiled_messages[0].content

    edited_items = created.proposal.plan.ordered_items
    edited_items[0] = edited_items[0].model_copy(
        update={
            "title": "Titre humain conservé",
            "logline": "Une logline réécrite à la main et conservée sans régénération.",
            "synopsis": "Un synopsis humain remplace explicitement la suggestion du modèle.",
        }
    )
    edited = registry.update(edited_items, expected_revision=1)

    assert edited.revision == 2
    assert edited.proposal is not None
    assert edited.proposal.plan.items[0].title == "Titre humain conservé"
    assert edited.proposal.plan.items[0].logline.startswith("Une logline réécrite")
    assert edited.proposal.plan.items[0].synopsis.startswith("Un synopsis humain")
    assert edited.proposal.provenance == created.proposal.provenance
    assert SeasonPlanProposalRegistry(tmp_path).load() == edited
    assert not edited.is_stale(canonical)

    changed = canonical.model_copy(deep=True)
    changed.characters[0].role = "Rôle changé"
    assert edited.is_stale(changed)
    with pytest.raises(SeasonPlanProposalRevisionConflictError) as conflict:
        registry.update(edited_items, expected_revision=1)
    assert conflict.value.current == 2


def test_candidate_contract_rejects_missing_cliffhanger_and_non_contiguous_order() -> None:
    plan = build_fake_series_plan(bible())
    payload = plan.model_dump(mode="json")
    payload["items"][0]["cliffhanger"] = ""
    with pytest.raises(ValidationError, match="at least 1 character"):
        TentafruitSeriesPlan.model_validate(payload)

    payload = plan.model_dump(mode="json")
    payload["items"][0]["position"] = 2
    with pytest.raises(ValidationError, match="positions must be contiguous"):
        TentafruitSeriesPlan.model_validate(payload)
