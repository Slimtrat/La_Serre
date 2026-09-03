from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from apps.api.schemas import WorkflowKind
from engine.generation.comfy.errors import WorkflowConfigurationError
from engine.generation.comfy.workflow_inspector import (
    SEMANTIC_FIELDS,
    WorkflowInspection,
    WorkflowInspector,
)
from engine.generation.comfy.workflow_loader import WorkflowBinding, WorkflowProfile

REQUIRED_FIELDS: dict[WorkflowKind, set[str]] = {
    "keyframe": {"prompt", "seed", "output_prefix"},
    "video": {"prompt", "seed", "frames", "fps", "reference_image", "output_prefix"},
}


class WorkflowSetup:
    def __init__(self, root: Path = Path("workflows/local")) -> None:
        self.root = root
        self.inspector = WorkflowInspector()

    def import_workflow(self, kind: WorkflowKind, workflow: dict[str, Any]) -> dict[str, Any]:
        inspection = self.inspector.inspect(workflow)
        self.root.mkdir(parents=True, exist_ok=True)
        self._write_json(self.workflow_path(kind), workflow)
        return self._response(kind, inspection)

    def inspect_saved(self, kind: WorkflowKind) -> dict[str, Any]:
        path = self.workflow_path(kind)
        if not path.is_file():
            return {
                "kind": kind,
                "configured": False,
                "required_fields": sorted(REQUIRED_FIELDS[kind]),
                "fields": list(SEMANTIC_FIELDS),
                "targets": [],
                "suggestions": {},
                "bindings": {},
            }
        workflow = json.loads(path.read_text(encoding="utf-8"))
        inspection = self.inspector.inspect(workflow)
        return self._response(kind, inspection)

    def save_profile(self, kind: WorkflowKind, selected: dict[str, str | None]) -> dict[str, Any]:
        unknown = set(selected) - set(SEMANTIC_FIELDS)
        if unknown:
            raise WorkflowConfigurationError(f"Unknown semantic fields: {sorted(unknown)}")
        inspection = self.inspector.inspect(
            json.loads(self.workflow_path(kind).read_text(encoding="utf-8"))
        )
        valid_targets = {target.key for target in inspection.targets}
        missing = [field for field in REQUIRED_FIELDS[kind] if not selected.get(field)]
        if missing:
            raise WorkflowConfigurationError(
                f"Required mappings are missing for {kind}: {', '.join(sorted(missing))}"
            )

        bindings: list[WorkflowBinding] = []
        for source in SEMANTIC_FIELDS:
            target = selected.get(source)
            if not target:
                continue
            if target not in valid_targets:
                raise WorkflowConfigurationError(f"Unknown workflow target: {target}")
            node_id, _, input_name = target.partition("::")
            bindings.append(
                WorkflowBinding(
                    source=source,
                    node_id=node_id,
                    input=input_name,
                    required=source in REQUIRED_FIELDS[kind],
                )
            )
        profile = WorkflowProfile(
            id=f"local-{kind}-v1",
            workflow=Path(f"{kind}.api.json"),
            bindings=bindings,
            output_node_ids=[],
        )
        self._write_json(self.profile_path(kind), profile.model_dump(mode="json"))
        return self.inspect_saved(kind)

    def workflow_path(self, kind: WorkflowKind) -> Path:
        return self.root / f"{kind}.api.json"

    def profile_path(self, kind: WorkflowKind) -> Path:
        return self.root / f"{kind}.profile.json"

    def _response(self, kind: WorkflowKind, inspection: WorkflowInspection) -> dict[str, Any]:
        bindings: dict[str, str] = {}
        profile_path = self.profile_path(kind)
        if profile_path.is_file():
            raw = json.loads(profile_path.read_text(encoding="utf-8"))
            for binding in raw.get("bindings", []):
                bindings[binding["source"]] = f"{binding['node_id']}::{binding['input']}"
        return {
            "kind": kind,
            "configured": profile_path.is_file(),
            "required_fields": sorted(REQUIRED_FIELDS[kind]),
            "fields": list(SEMANTIC_FIELDS),
            "targets": [
                {
                    "key": target.key,
                    "label": target.label,
                    "current_value": target.current_value,
                }
                for target in inspection.targets
            ],
            "suggestions": inspection.suggestions,
            "bindings": bindings,
        }

    @staticmethod
    def _write_json(path: Path, payload: object) -> None:
        temporary = path.with_suffix(path.suffix + ".tmp")
        temporary.write_text(
            json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )
        temporary.replace(path)
