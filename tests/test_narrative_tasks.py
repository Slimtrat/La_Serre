from __future__ import annotations

from pathlib import Path

import pytest

from engine.narrative.episode_models import NarrativeProvenance
from engine.narrative.tasks import (
    DEFAULT_TASK_REGISTRY,
    NarrativeTaskId,
    TaskContext,
    TaskKind,
    TaskRegistry,
    TaskSpec,
)
from engine.narrative.tasks.provider import FakeTaskProvider
from engine.narrative.workflow_models import DirectorBrief
from tools.evaluate_narrative_tasks import evaluate_fixture

FIXTURE = Path(__file__).parent / "fixtures" / "narrative_tasks" / "belladone_aconit_v1.json"


def _director_output() -> dict[str, object]:
    return {
        "concept": "Une serre transforme chaque désir en poison amoureux.",
        "genre": "Dark romance comique",
        "tone": "Tendre et vénéneux",
        "visual_direction": "Verre noir et pollen violet",
    }


def test_context_compilation_is_deterministic_and_inlines_contract_schema() -> None:
    spec = DEFAULT_TASK_REGISTRY.get(NarrativeTaskId.DIRECTOR, 1)
    left = spec.compile(TaskContext({"bible": {}, "custom_prompt": "sec", "source": "A"}))
    right = spec.compile(TaskContext({"source": "A", "custom_prompt": "sec", "bible": {}}))

    assert left.input_fingerprint == right.input_fingerprint
    assert left.task_id == "narrative.director"
    assert left.task_version == 1
    assert "$defs" not in left.schema
    assert "custom_prompt" in left.messages[1]["content"]


def test_context_compilation_rejects_missing_required_values() -> None:
    spec = DEFAULT_TASK_REGISTRY.get(NarrativeTaskId.SHORT_EPISODE)

    with pytest.raises(ValueError, match="custom_prompt, bible"):
        spec.compile(TaskContext({"source": "épisode"}))


def test_registry_keeps_old_prompt_versions_addressable() -> None:
    first = TaskSpec(
        task_id="test.director",
        version=1,
        kind=TaskKind.CREATIVE,
        objective="Version un",
        contract=DirectorBrief,
        required_context=(),
        rules=(),
        inference_options={},
    )
    second = TaskSpec(
        task_id="test.director",
        version=2,
        kind=TaskKind.CREATIVE,
        objective="Version deux",
        contract=DirectorBrief,
        required_context=(),
        rules=(),
        inference_options={},
    )
    registry = TaskRegistry((first, second))

    assert registry.get("test.director").version == 2
    assert registry.get("test.director", 1).objective == "Version un"
    with pytest.raises(ValueError, match="already registered"):
        registry.register(first)


async def test_fake_provider_exposes_provenance_and_blocks_validation_mutation() -> None:
    spec = DEFAULT_TASK_REGISTRY.get(NarrativeTaskId.AUDIT)
    compiled = spec.compile(TaskContext({"source": {}, "custom_prompt": "", "bible": {}}))
    provider = FakeTaskProvider(
        {"tentafruit.audit@1": {"verdict": "pass", "summary": "Tout est cohérent."}}
    )

    execution = await provider.execute(compiled, model="fake:ci", contract=spec.contract)

    assert execution.metadata() == {
        "task_id": "tentafruit.audit",
        "task_version": 1,
        "model": "fake:ci",
        "input_fingerprint": compiled.input_fingerprint,
        "allows_mutation": False,
    }
    with pytest.raises(PermissionError, match="validation-only"):
        execution.require_mutation_permission()


def test_golden_belladone_aconit_fixture_conforms_to_all_task_contracts() -> None:
    report = evaluate_fixture(FIXTURE)

    assert len(report) == 6
    assert all(item["valid"] for item in report)
    assert {item["task_id"] for item in report} == {task_id.value for task_id in NarrativeTaskId}


def test_legacy_provenance_loads_and_new_task_identity_round_trips() -> None:
    legacy = NarrativeProvenance.model_validate(
        {"stage": "episode", "mode": "ai", "provider": "ollama", "model": "qwen"}
    )
    current = NarrativeProvenance(
        stage="episode",
        mode="ai",
        provider="ollama",
        model="qwen",
        task_id="tentafruit.short-episode",
        task_version=1,
        input_fingerprint="a" * 64,
    )

    assert legacy.task_id is None
    assert NarrativeProvenance.model_validate(current.model_dump()).task_version == 1
