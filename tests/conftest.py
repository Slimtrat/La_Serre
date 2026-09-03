from __future__ import annotations

import json
from pathlib import Path

import pytest


@pytest.fixture
def api_workflow() -> dict[str, object]:
    return {
        "3": {"class_type": "KSampler", "inputs": {"seed": 1}},
        "6": {"class_type": "CLIPTextEncode", "inputs": {"text": "old"}},
        "9": {"class_type": "SaveImage", "inputs": {"filename_prefix": "old"}},
    }


@pytest.fixture
def workflow_profile(tmp_path: Path, api_workflow: dict[str, object]) -> Path:
    workflow_path = tmp_path / "workflow.api.json"
    workflow_path.write_text(json.dumps(api_workflow), encoding="utf-8")
    profile = {
        "schema_version": 1,
        "id": "test-workflow",
        "workflow": workflow_path.name,
        "bindings": [
            {"source": "prompt", "node_id": "6", "input": "text"},
            {"source": "seed", "node_id": "3", "input": "seed"},
            {"source": "output_prefix", "node_id": "9", "input": "filename_prefix"},
        ],
        "output_node_ids": ["9"],
    }
    profile_path = tmp_path / "workflow.profile.json"
    profile_path.write_text(json.dumps(profile), encoding="utf-8")
    return profile_path
