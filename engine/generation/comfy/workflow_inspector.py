from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from engine.generation.comfy.workflow_loader import WorkflowLoader

SEMANTIC_FIELDS = (
    "prompt",
    "negative_prompt",
    "seed",
    "width",
    "height",
    "frames",
    "fps",
    "reference_image",
    "output_prefix",
)


@dataclass(frozen=True, slots=True)
class WorkflowTarget:
    node_id: str
    input_name: str
    class_type: str
    title: str
    current_value: str | int | float | bool | None

    @property
    def key(self) -> str:
        return f"{self.node_id}::{self.input_name}"

    @property
    def label(self) -> str:
        title = self.title or self.class_type
        return f"{self.node_id} · {title} · {self.input_name}"


@dataclass(frozen=True, slots=True)
class WorkflowInspection:
    targets: list[WorkflowTarget]
    suggestions: dict[str, list[str]]


class WorkflowInspector:
    """Discovers editable primitive inputs without depending on custom node packages."""

    def inspect(self, workflow: dict[str, Any]) -> WorkflowInspection:
        WorkflowLoader.validate_api_format(workflow)
        targets = self._targets(workflow)
        suggestions = {
            field: [target.key for target in self._rank(field, targets)]
            for field in SEMANTIC_FIELDS
        }
        return WorkflowInspection(targets=targets, suggestions=suggestions)

    @staticmethod
    def _targets(workflow: dict[str, Any]) -> list[WorkflowTarget]:
        targets: list[WorkflowTarget] = []
        for node_id, node in workflow.items():
            inputs = node["inputs"]
            meta = node.get("_meta", {})
            title = str(meta.get("title", "")) if isinstance(meta, dict) else ""
            for input_name, value in inputs.items():
                if value is None or isinstance(value, (str, int, float, bool)):
                    targets.append(
                        WorkflowTarget(
                            node_id=str(node_id),
                            input_name=str(input_name),
                            class_type=str(node["class_type"]),
                            title=title,
                            current_value=value,
                        )
                    )
        return sorted(targets, key=lambda target: (target.node_id, target.input_name))

    def _rank(self, field: str, targets: list[WorkflowTarget]) -> list[WorkflowTarget]:
        scored = [(self._score(field, target), target) for target in targets]
        ranked = sorted(
            scored,
            key=lambda item: (
                -item[0],
                int(item[1].node_id) if item[1].node_id.isdigit() else 2**31,
                item[1].node_id,
                item[1].input_name,
            ),
        )
        return [target for score, target in ranked if score > 0]

    @staticmethod
    def _score(field: str, target: WorkflowTarget) -> int:
        input_name = target.input_name.lower()
        context = f"{target.class_type} {target.title}".lower()
        aliases = {
            "prompt": {"text", "prompt", "positive_prompt", "positive"},
            "negative_prompt": {"text", "negative_prompt", "negative"},
            "seed": {"seed", "noise_seed", "random_seed"},
            "width": {"width"},
            "height": {"height"},
            "frames": {"frames", "length", "num_frames", "frame_count"},
            "fps": {"fps", "frame_rate", "framerate"},
            "reference_image": {"image", "image_path", "filename"},
            "output_prefix": {"filename_prefix", "output_prefix", "prefix"},
        }
        if input_name not in aliases[field]:
            return 0
        score = 10
        if field == "negative_prompt":
            return score + (20 if "negative" in context else 0)
        if field == "prompt":
            if "negative" in context:
                return 1
            return score + (10 if "positive" in context or "prompt" in context else 0)
        if field == "reference_image":
            return score + (20 if "loadimage" in context or "load image" in context else 0)
        if field == "output_prefix":
            return score + (20 if "save" in context or "combine" in context else 0)
        return score
