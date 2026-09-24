from pathlib import Path

from engine.generation.comfy.workflow_factory import WorkflowFactory
from engine.generation.comfy.workflow_loader import WorkflowLoader
from engine.generation.comfy.workflow_mapper import WorkflowMapper


def test_factory_writes_loadable_mapped_workflows(tmp_path: Path) -> None:
    factory = WorkflowFactory()

    generated = factory.write(tmp_path)
    keyframe = WorkflowLoader().load(tmp_path / "keyframe.profile.json")
    keyframe_reference = WorkflowLoader().load(
        tmp_path / "keyframe-reference.profile.json"
    )
    keyframe_guide = WorkflowLoader().load(tmp_path / "keyframe-guide.profile.json")
    keyframe_reference_guide = WorkflowLoader().load(
        tmp_path / "keyframe-reference-guide.profile.json"
    )
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
        "character_reference_image_1": "belladone.png",
        "character_reference_image_2": "aconit.png",
        "character_reference_image_3": "graine-noire.png",
        "character_reference_weight_1": 0.72,
        "character_reference_weight_2": 0.68,
        "character_reference_weight_3": 0.58,
        "character_reference_mask_width_1": 320,
        "character_reference_mask_width_2": 320,
        "character_reference_mask_width_3": 1,
        "character_reference_mask_x_1": 0,
        "character_reference_mask_x_2": 256,
        "character_reference_mask_x_3": 0,
        "character_reference_prompt_1": "Belladone in the left region",
        "character_reference_prompt_2": "Aconit in the right region",
        "character_reference_prompt_3": "Graine Noire in the rear region",
        "character_reference_prompt_strength_1": 1.35,
        "character_reference_prompt_strength_2": 1.35,
        "character_reference_prompt_strength_3": 1.35,
        "reference_image_guide_1": "keyframe-guide-1.png",
        "reference_image_guide_2": "keyframe-guide-2.png",
        "guide_frame_1": 48,
        "guide_frame_2": 96,
        "output_prefix": "S01E001-S01",
    }

    mapped_keyframe = WorkflowMapper().map(keyframe, context)
    mapped_keyframe_reference = WorkflowMapper().map(keyframe_reference, context)
    mapped_keyframe_guide = WorkflowMapper().map(keyframe_guide, context)
    mapped_keyframe_reference_guide = WorkflowMapper().map(
        keyframe_reference_guide, context
    )
    mapped_video = WorkflowMapper().map(video, context)

    assert generated.preset == "rtx-5070-12gb"
    assert mapped_keyframe["5"]["inputs"]["seed"] == 42
    assert mapped_keyframe_reference["8"]["inputs"]["image"] == "belladone.png"
    assert mapped_keyframe_reference["11"]["inputs"]["image"] == "aconit.png"
    assert mapped_keyframe_reference["13"]["inputs"]["image"] == "graine-noire.png"
    assert mapped_keyframe_reference["5"]["inputs"]["model"] == ["14", 0]
    assert mapped_keyframe_reference["10"]["inputs"]["weight"] == 0.72
    assert mapped_keyframe_reference["12"]["inputs"]["weight"] == 0.68
    assert mapped_keyframe_reference["14"]["inputs"]["weight"] == 0.58
    assert mapped_keyframe_reference["10"]["inputs"]["attn_mask"] == ["22", 0]
    assert mapped_keyframe_reference["21"]["inputs"]["width"] == 320
    assert mapped_keyframe_reference["24"]["inputs"]["x"] == 256
    assert mapped_keyframe_reference["30"]["inputs"]["text"] == (
        "Belladone in the left region"
    )
    assert mapped_keyframe_reference["33"]["inputs"]["strength"] == 1.35
    assert mapped_keyframe_reference["5"]["inputs"]["positive"] == ["38", 0]
    assert mapped_keyframe_reference_guide["4"]["inputs"]["image"] == "keyframe.png"
    assert mapped_keyframe_reference_guide["7"]["inputs"]["model"] == ["16", 0]
    assert mapped_keyframe_reference_guide["10"]["inputs"]["image"] == "belladone.png"
    assert mapped_keyframe_guide["4"]["inputs"]["image"] == "keyframe.png"
    assert mapped_keyframe_guide["5"]["inputs"]["height"] == 1024
    assert mapped_keyframe_guide["7"]["inputs"]["seed"] == 42
    assert mapped_video["5"]["inputs"]["image"] == "keyframe.png"
    assert mapped_video["6"]["inputs"]["length"] == 97
    assert mapped_video["14"]["inputs"]["image"] == "keyframe-guide-1.png"
    assert mapped_video["15"]["inputs"]["frame_idx"] == 48
    assert mapped_video["16"]["inputs"]["image"] == "keyframe-guide-2.png"
    assert mapped_video["17"]["inputs"]["frame_idx"] == 96
    assert mapped_video["10"]["inputs"]["model"] == ["18", 0]
    assert mapped_video["13"]["inputs"]["filename_prefix"] == "S01E001-S01"
    assert (tmp_path / "models.required.json").is_file()


def test_factory_only_uses_declared_core_nodes() -> None:
    factory = WorkflowFactory()
    generated = factory.build()
    used = {
        node["class_type"]
        for workflow in (generated.keyframe, generated.keyframe_guide, generated.video)
        for node in workflow.values()
    }

    assert used <= factory.required_nodes
    assert len(generated.requirements) == 3
