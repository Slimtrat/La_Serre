from __future__ import annotations

from copy import deepcopy
from typing import Any

from engine.generation.comfy.errors import WorkflowConfigurationError
from engine.generation.comfy.workflow_loader import LoadedWorkflow, WorkflowBinding


class _Missing:
    pass


MISSING = _Missing()


class WorkflowMapper:
    def map(self, loaded: LoadedWorkflow, context: dict[str, Any]) -> dict[str, Any]:
        workflow = deepcopy(loaded.template)
        for binding in loaded.profile.bindings:
            value = self._resolve(context, binding.source)
            if value is MISSING:
                if binding.required:
                    raise WorkflowConfigurationError(
                        f"Profile {loaded.profile.id} requires missing source '{binding.source}'"
                    )
                continue
            self._apply(workflow, binding, value)
        return workflow

    @staticmethod
    def _resolve(context: object, path: str) -> object:
        value = context
        for part in path.split("."):
            if isinstance(value, dict) and part in value:
                value = value[part]
            elif isinstance(value, list) and part.isdigit() and int(part) < len(value):
                value = value[int(part)]
            else:
                return MISSING
        return value

    @staticmethod
    def _apply(workflow: dict[str, Any], binding: WorkflowBinding, value: object) -> None:
        node = workflow.get(binding.node_id)
        if not isinstance(node, dict):
            raise WorkflowConfigurationError(
                f"Binding target node {binding.node_id} does not exist"
            )
        inputs = node.get("inputs")
        if not isinstance(inputs, dict):
            raise WorkflowConfigurationError(
                f"Binding target node {binding.node_id} has no inputs object"
            )
        if binding.input not in inputs:
            raise WorkflowConfigurationError(
                f"Binding target {binding.node_id}.inputs.{binding.input} does not exist"
            )
        inputs[binding.input] = value
