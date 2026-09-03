from __future__ import annotations

import json
from collections import defaultdict
from pathlib import Path
from typing import Any

from engine.generation.comfy.workflow_loader import WorkflowLoader

WORKFLOW_GRAPH_KINDS = frozenset({"keyframe", "keyframe-guide", "video"})


def build_workflow_graph(
    kind: str,
    workflow_path: Path,
    profile_path: Path,
) -> dict[str, Any]:
    workflow = json.loads(workflow_path.read_text(encoding="utf-8"))
    WorkflowLoader.validate_api_format(workflow, workflow_path)
    profile = (
        json.loads(profile_path.read_text(encoding="utf-8"))
        if profile_path.is_file()
        else {}
    )
    bound_inputs = {
        (str(binding["node_id"]), str(binding["input"])): str(binding["source"])
        for binding in profile.get("bindings", [])
    }
    edges: list[dict[str, object]] = []
    parents: dict[str, set[str]] = defaultdict(set)
    nodes: list[dict[str, object]] = []
    for node_id, node in workflow.items():
        parameters: list[dict[str, object]] = []
        bindings: list[dict[str, str]] = []
        for input_name, value in node["inputs"].items():
            if _is_link(value, workflow):
                source = str(value[0])
                parents[str(node_id)].add(source)
                edges.append(
                    {
                        "id": f"{source}:{value[1]}->{node_id}:{input_name}",
                        "source": source,
                        "source_output": int(value[1]),
                        "target": str(node_id),
                        "target_input": str(input_name),
                    }
                )
                continue
            if value is None or isinstance(value, (str, int, float, bool)):
                parameters.append({"name": str(input_name), "value": value})
            source_field = bound_inputs.get((str(node_id), str(input_name)))
            if source_field:
                bindings.append({"input": str(input_name), "source": source_field})
        meta = node.get("_meta", {})
        title = meta.get("title") if isinstance(meta, dict) else None
        nodes.append(
            {
                "id": str(node_id),
                "class_type": str(node["class_type"]),
                "title": str(title or node["class_type"]),
                "parameters": parameters,
                "bindings": bindings,
                "is_output": str(node_id) in profile.get("output_node_ids", []),
            }
        )

    positions, width, height = _layout([node["id"] for node in nodes], parents)
    for node in nodes:
        node["x"], node["y"] = positions[str(node["id"])]
    return {
        "kind": kind,
        "configured": True,
        "profile_id": profile.get("id"),
        "nodes": nodes,
        "edges": edges,
        "width": width,
        "height": height,
    }


def _is_link(value: object, workflow: dict[str, Any]) -> bool:
    return (
        isinstance(value, list)
        and len(value) == 2
        and str(value[0]) in workflow
        and isinstance(value[1], int)
    )


def _layout(
    node_ids: list[object], parents: dict[str, set[str]]
) -> tuple[dict[str, tuple[int, int]], int, int]:
    remaining = {str(node_id) for node_id in node_ids}
    levels: dict[str, int] = {}
    while remaining:
        ready = sorted(
            (
                node_id
                for node_id in remaining
                if not (parents.get(node_id, set()) & remaining)
            ),
            key=_node_sort_key,
        )
        if not ready:
            ready = [min(remaining, key=_node_sort_key)]
        for node_id in ready:
            levels[node_id] = 0 if not parents.get(node_id) else 1 + max(
                (levels.get(parent, 0) for parent in parents[node_id]),
                default=0,
            )
            remaining.remove(node_id)

    columns: dict[int, list[str]] = defaultdict(list)
    for node_id, level in levels.items():
        columns[level].append(node_id)
    positions: dict[str, tuple[int, int]] = {}
    max_rows = 1
    for level, column in columns.items():
        ordered = sorted(column, key=_node_sort_key)
        max_rows = max(max_rows, len(ordered))
        for row, node_id in enumerate(ordered):
            positions[node_id] = (40 + level * 290, 40 + row * 190)
    width = 320 + (max(levels.values(), default=0) * 290)
    height = 80 + max_rows * 190
    return positions, width, height


def _node_sort_key(value: str) -> tuple[int, int | str]:
    return (0, int(value)) if value.isdigit() else (1, value)
