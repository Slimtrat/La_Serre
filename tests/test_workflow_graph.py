from pathlib import Path

from apps.api.workflow_graph import build_workflow_graph
from engine.generation.comfy.workflow_factory import WorkflowFactory


def test_workflow_graph_exposes_real_nodes_edges_and_bindings(tmp_path: Path) -> None:
    WorkflowFactory().write(tmp_path)

    graph = build_workflow_graph(
        "keyframe-guide",
        tmp_path / "keyframe-guide.api.json",
        tmp_path / "keyframe-guide.profile.json",
    )

    assert graph["profile_id"] == "generated-sdxl-continuity-guide-v2"
    nodes = {node["id"]: node for node in graph["nodes"]}
    assert nodes["4"]["class_type"] == "LoadImage"
    assert {"input": "image", "source": "reference_image"} in nodes["4"]["bindings"]
    assert any(
        edge["source"] == "4" and edge["target"] == "5"
        for edge in graph["edges"]
    )
    assert graph["width"] > 0
    assert graph["height"] > 0
