from __future__ import annotations

import pytest

from engine.generation.comfy.errors import WorkflowConfigurationError
from engine.generation.comfy.workflow_loader import WorkflowLoader
from engine.generation.comfy.workflow_mapper import WorkflowMapper


def test_mapper_binds_values_without_mutating_template(workflow_profile: object) -> None:
    loaded = WorkflowLoader().load(workflow_profile)  # type: ignore[arg-type]
    original = loaded.template["6"]["inputs"]["text"]

    mapped = WorkflowMapper().map(
        loaded,
        {"prompt": "Belladone", "seed": 42, "output_prefix": "S01E001-S01"},
    )

    assert mapped["6"]["inputs"]["text"] == "Belladone"
    assert mapped["3"]["inputs"]["seed"] == 42
    assert loaded.template["6"]["inputs"]["text"] == original


def test_mapper_fails_on_missing_required_source(workflow_profile: object) -> None:
    loaded = WorkflowLoader().load(workflow_profile)  # type: ignore[arg-type]

    with pytest.raises(WorkflowConfigurationError, match="missing source 'seed'"):
        WorkflowMapper().map(loaded, {"prompt": "Belladone", "output_prefix": "shot"})
