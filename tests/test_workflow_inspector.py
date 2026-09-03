from engine.generation.comfy.workflow_factory import WorkflowFactory
from engine.generation.comfy.workflow_inspector import WorkflowInspector


def test_inspector_finds_generated_workflow_controls() -> None:
    workflow = WorkflowFactory().build().video

    inspection = WorkflowInspector().inspect(workflow)

    assert "3::text" in inspection.suggestions["prompt"]
    assert inspection.suggestions["reference_image"][0] == "5::image"
    assert "10::noise_seed" in inspection.suggestions["seed"]
