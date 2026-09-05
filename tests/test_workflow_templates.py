import json
from pathlib import Path

from engine.generation.comfy.workflow_loader import WorkflowLoader
from engine.generation.comfy.workflow_mapper import WorkflowMapper
from engine.generation.comfy.workflow_templates import WorkflowTemplateCatalogue


def test_catalogue_defines_the_complete_continuity_chain() -> None:
    catalogue = WorkflowTemplateCatalogue()
    templates = catalogue.build()

    assert tuple(template.spec.id for template in templates) == catalogue.chain
    assert [template.spec.stage for template in templates] == [
        "character_master",
        "scene_anchor",
        "pose_continuation",
        "video_triptych",
    ]
    assert templates[0].spec.next_templates == ["sdxl-scene-anchor-v1"]
    anchor = templates[1]
    anchor_sources = {binding.source for binding in anchor.profile.bindings}
    assert "reference_image" in anchor_sources
    assert anchor.workflow["4"]["class_type"] == "LoadImage"
    assert anchor.workflow["7"]["inputs"]["denoise"] == 0.68
    assert anchor.workflow["9"]["inputs"]["filename_prefix"].endswith("scene-anchor")
    assert templates[2].spec.receives == ["previous_pose_image", "next_pose_direction"]
    assert templates[3].spec.receives[:3] == [
        "scene_anchor_image",
        "middle_pose_image",
        "end_pose_image",
    ]


def test_flux_template_preserves_the_validated_portrait_recipe() -> None:
    flux = WorkflowTemplateCatalogue().build()[0]

    assert flux.workflow["1"]["inputs"]["ckpt_name"] == "flux1-dev-fp8.safetensors"
    assert flux.workflow["8"]["inputs"]["lora_name"] == "FLUX_3Dcartoon.safetensors"
    assert flux.workflow["8"]["inputs"]["strength_model"] == 0.2
    assert flux.workflow["8"]["inputs"]["strength_clip"] == 0.2
    assert flux.workflow["9"]["inputs"]["guidance"] == 3.5
    assert flux.workflow["3"]["class_type"] == "ConditioningZeroOut"
    assert flux.workflow["5"]["inputs"]["steps"] == 24
    assert flux.workflow["5"]["inputs"]["cfg"] == 1.0
    assert flux.workflow["5"]["inputs"]["sampler_name"] == "euler"
    assert flux.workflow["5"]["inputs"]["scheduler"] == "simple"
    assert flux.workflow["4"]["inputs"]["width"] == 720
    assert flux.workflow["4"]["inputs"]["height"] == 1280
    assert "negative_prompt" not in {binding.source for binding in flux.profile.bindings}


def test_catalogue_writes_loadable_profiles_and_manifest(tmp_path: Path) -> None:
    catalogue = WorkflowTemplateCatalogue()

    manifests = catalogue.write(tmp_path)
    root_manifest = json.loads((tmp_path / "catalogue.json").read_text(encoding="utf-8"))

    assert len(manifests) == 4
    assert root_manifest["continuity_chain"] == list(catalogue.chain)
    for manifest in manifests:
        loaded_manifest = json.loads(manifest.read_text(encoding="utf-8"))
        template_root = manifest.parent
        loaded = WorkflowLoader().load(template_root / loaded_manifest["profile"])
        assert loaded.profile.id == f"template-{loaded_manifest['id']}"
        assert loaded.workflow_path == (template_root / "workflow.api.json").resolve()


def test_flux_profile_maps_dynamic_generation_settings(tmp_path: Path) -> None:
    catalogue = WorkflowTemplateCatalogue()
    catalogue.write(tmp_path)
    loaded = WorkflowLoader().load(tmp_path / catalogue.chain[0] / "profile.json")

    mapped = WorkflowMapper().map(
        loaded,
        {
            "prompt": "An adult belladonna plant character with a humanized face",
            "seed": 731,
            "width": 720,
            "height": 1280,
            "lora_strength_model": 0.18,
            "lora_strength_clip": 0.18,
            "flux_guidance": 3.2,
            "steps": 28,
            "output_prefix": "Serre/Belladone/master",
        },
    )

    assert mapped["2"]["inputs"]["text"].startswith("An adult belladonna")
    assert mapped["5"]["inputs"]["seed"] == 731
    assert mapped["5"]["inputs"]["steps"] == 28
    assert mapped["8"]["inputs"]["strength_model"] == 0.18
    assert mapped["9"]["inputs"]["guidance"] == 3.2
    assert mapped["7"]["inputs"]["filename_prefix"] == "Serre/Belladone/master"


def test_optional_flux_models_do_not_pollute_the_default_readiness_check() -> None:
    catalogue = WorkflowTemplateCatalogue()
    default_models = {item.filename for item in catalogue.factory.requirements}
    flux_models = {item.filename for item in catalogue.build()[0].spec.models}

    assert "flux1-dev-fp8.safetensors" not in default_models
    assert "FLUX_3Dcartoon.safetensors" not in default_models
    assert flux_models == {
        "flux1-dev-fp8.safetensors",
        "FLUX_3Dcartoon.safetensors",
    }
