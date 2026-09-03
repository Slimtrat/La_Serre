from pathlib import Path

from engine.generation.comfy.workflow_factory import WorkflowFactory
from engine.generation.comfy.workflow_loader import WorkflowLoader
from engine.generation.comfy.workflow_mapper import WorkflowMapper


def test_factory_writes_loadable_mapped_workflows(tmp_path: Path) -> None:
    factory = WorkflowFactory()

    generated = factory.write(tmp_path)
    keyframe = WorkflowLoader().load(tmp_path / "keyframe.profile.json")
    video = WorkflowLoader().load(tmp_path / "video.profile.json")
    context = {
        "prompt": "Belladone enters the greenhouse",
        "negative_prompt": "identity drift",
        "seed": 42,
        "width": 576,
        "height": 1024,
        "frames": 97,
        "fps": 24,
        "reference_image": "keyframe.png",
        "output_prefix": "S01E001-S01",
    }

    mapped_keyframe = WorkflowMapper().map(keyframe, context)
    mapped_video = WorkflowMapper().map(video, context)

    assert generated.preset == "rtx-5070-12gb"
    assert mapped_keyframe["5"]["inputs"]["seed"] == 42
    assert mapped_video["5"]["inputs"]["image"] == "keyframe.png"
    assert mapped_video["6"]["inputs"]["length"] == 97
    assert mapped_video["13"]["inputs"]["filename_prefix"] == "S01E001-S01"
    assert (tmp_path / "models.required.json").is_file()


def test_factory_only_uses_declared_core_nodes() -> None:
    factory = WorkflowFactory()
    generated = factory.build()
    used = {
        node["class_type"]
        for workflow in (generated.keyframe, generated.video)
        for node in workflow.values()
    }

    assert used <= factory.required_nodes
    assert len(generated.requirements) == 3
