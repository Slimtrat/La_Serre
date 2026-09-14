from __future__ import annotations

import json
from pathlib import Path
from typing import cast

from engine.narrative.tasks.tentafruit_series_plan import (
    SeriesPlanBudget,
    TentafruitSeriesPlan,
    build_fake_series_plan,
    validate_series_plan,
)
from engine.world.models import ProjectBible

FIXTURE = Path(__file__).parent / "fixtures" / "tentafruit-season-six-episodes.json"


def _fixture() -> dict[str, object]:
    return cast(dict[str, object], json.loads(FIXTURE.read_text(encoding="utf-8")))


def test_tentafruit_six_episode_fixture_is_contract_valid_and_relationally_diverse() -> None:
    fixture = _fixture()
    bible = ProjectBible.model_validate(fixture["bible"])
    plan = TentafruitSeriesPlan.model_validate(fixture["expected_plan"])
    generation = fixture["generation"]
    assert isinstance(generation, dict)
    budget = SeriesPlanBudget(episode_count=int(generation["episode_count"]))

    validation = validate_series_plan(plan, bible, budget)

    assert validation.valid is True
    assert validation.findings == []
    assert len(plan.items) == 6
    assert len({item.relationship_shift for item in plan.items}) == 6
    assert len({item.relationship_id for item in plan.items}) == 3
    assert {item.secret_id for item in plan.items if item.reveals_secret} == {
        "aconit-a-ouvert-la-porte",
        "iris-entend-la-graine",
    }


def test_fake_tentafruit_season_is_reproducible_and_uses_only_bible_ids() -> None:
    fixture = _fixture()
    bible = ProjectBible.model_validate(fixture["bible"])
    budget = SeriesPlanBudget(episode_count=6, duration_seconds_min=30, duration_seconds_max=60)

    left = build_fake_series_plan(bible, budget)
    right = build_fake_series_plan(bible, budget)

    assert left == right
    assert validate_series_plan(left, bible, budget).valid is True
    assert {item.relationship_id for item in left.items} <= {
        relationship.id for relationship in bible.relationships
    }
    assert {location for item in left.items for location in item.location_ids} <= {
        location.id for location in bible.locations
    }
    assert {character for item in left.items for character in item.character_ids} <= {
        character.id for character in bible.characters
    }


def test_tentafruit_validation_reports_unknown_ids_and_repeated_beats_per_candidate() -> None:
    fixture = _fixture()
    bible = ProjectBible.model_validate(fixture["bible"])
    plan = TentafruitSeriesPlan.model_validate(fixture["expected_plan"])
    first, second, *remaining = plan.ordered_items
    broken_first = first.model_copy(update={"location_ids": ["lieu-inconnu"]})
    broken_second = second.model_copy(update={"cliffhanger": first.cliffhanger})
    broken = TentafruitSeriesPlan.model_validate(
        plan.model_copy(update={"items": [broken_first, broken_second, *remaining]}).model_dump()
    )

    validation = validate_series_plan(broken, bible, SeriesPlanBudget(episode_count=6))

    assert validation.valid is False
    findings = {finding.code: finding for finding in validation.findings}
    assert findings["unknown_bible_id"].candidate_ids == ["candidate-pollen"]
    assert findings["repeated_cliffhanger"].candidate_ids == [
        "candidate-pollen",
        "candidate-dette",
    ]
