from __future__ import annotations

import hashlib
import json
from pathlib import Path
from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from engine.generation.comfy.errors import WorkflowConfigurationError


class WorkflowBinding(BaseModel):
    model_config = ConfigDict(extra="forbid")

    source: str = Field(min_length=1)
    node_id: str = Field(min_length=1)
    input: str = Field(min_length=1)
    required: bool = True


class WorkflowProfile(BaseModel):
    model_config = ConfigDict(extra="forbid")

    schema_version: int = 1
    id: str = Field(min_length=1)
    workflow: Path
    bindings: list[WorkflowBinding] = Field(min_length=1)
    output_node_ids: list[str] = Field(default_factory=list)


class LoadedWorkflow(BaseModel):
    model_config = ConfigDict(arbitrary_types_allowed=True, extra="forbid")

    profile_path: Path
    profile: WorkflowProfile
    workflow_path: Path
    template: dict[str, Any]
    sha256: str


class WorkflowLoader:
    def load(self, profile_path: Path) -> LoadedWorkflow:
        resolved_profile = profile_path.expanduser().resolve()
        raw_profile = self._read_json(resolved_profile)
        profile = WorkflowProfile.model_validate(raw_profile)
        workflow_path = profile.workflow
        if not workflow_path.is_absolute():
            workflow_path = resolved_profile.parent / workflow_path
        workflow_path = workflow_path.resolve()
        template = self._read_json(workflow_path)
        self.validate_api_format(template, workflow_path)
        digest = hashlib.sha256(workflow_path.read_bytes()).hexdigest()
        return LoadedWorkflow(
            profile_path=resolved_profile,
            profile=profile,
            workflow_path=workflow_path,
            template=template,
            sha256=digest,
        )

    @staticmethod
    def _read_json(path: Path) -> dict[str, Any]:
        if not path.is_file():
            raise WorkflowConfigurationError(f"JSON file does not exist: {path}")
        try:
            value = json.loads(path.read_text(encoding="utf-8"))
        except json.JSONDecodeError as exc:
            raise WorkflowConfigurationError(f"Invalid JSON in {path}: {exc}") from exc
        if not isinstance(value, dict):
            raise WorkflowConfigurationError(f"Expected a JSON object in {path}")
        return value

    @staticmethod
    def validate_api_format(workflow: dict[str, Any], path: Path | str = "workflow") -> None:
        if "nodes" in workflow or "links" in workflow:
            raise WorkflowConfigurationError(
                f"{path} is an editor workflow; export it with Save (API Format)"
            )
        if not workflow:
            raise WorkflowConfigurationError(f"Workflow is empty: {path}")
        invalid = [
            node_id
            for node_id, node in workflow.items()
            if not isinstance(node, dict)
            or not isinstance(node.get("class_type"), str)
            or not isinstance(node.get("inputs"), dict)
        ]
        if invalid:
            raise WorkflowConfigurationError(
                f"Workflow {path} has invalid API-format nodes: {', '.join(invalid)}"
            )
