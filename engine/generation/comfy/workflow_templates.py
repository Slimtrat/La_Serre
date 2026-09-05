from __future__ import annotations

import json
from copy import deepcopy
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

from engine.generation.comfy.workflow_factory import ModelRequirement, WorkflowFactory
from engine.generation.comfy.workflow_loader import (
    WorkflowBinding,
    WorkflowLoader,
    WorkflowProfile,
)

TemplateStage = Literal[
    "character_master",
    "scene_anchor",
    "pose_continuation",
    "video_triptych",
]


class TemplateModelRequirement(BaseModel):
    model_config = ConfigDict(extra="forbid")

    role: str = Field(min_length=1)
    filename: str = Field(min_length=1)
    folder: str = Field(min_length=1)
    url: str | None = None
    source_note: str | None = None

    @classmethod
    def from_factory(cls, requirement: ModelRequirement) -> TemplateModelRequirement:
        return cls(
            role=requirement.role,
            filename=requirement.filename,
            folder=requirement.folder,
            url=requirement.url,
        )


class WorkflowTemplateSpec(BaseModel):
    model_config = ConfigDict(extra="forbid")

    schema_version: int = 1
    id: str = Field(min_length=1)
    version: int = 1
    label: str = Field(min_length=1)
    description: str = Field(min_length=1)
    stage: TemplateStage
    model_family: str = Field(min_length=1)
    workflow: Path = Path("workflow.api.json")
    profile: Path = Path("profile.json")
    required_nodes: list[str] = Field(min_length=1)
    models: list[TemplateModelRequirement] = Field(min_length=1)
    defaults: dict[str, str | int | float]
    prompt_sections: list[str]
    receives: list[str]
    produces: list[str] = Field(min_length=1)
    next_templates: list[str]
    limitations: list[str]
    provenance: list[str]


@dataclass(frozen=True, slots=True)
class BuiltWorkflowTemplate:
    spec: WorkflowTemplateSpec
    workflow: dict[str, Any]
    profile: WorkflowProfile


class WorkflowTemplateCatalogue:
    """Build versioned ComfyUI templates for the visual continuity chain."""

    chain = (
        "flux-character-master-v1",
        "sdxl-scene-anchor-v1",
        "sdxl-adjacent-pose-v1",
        "ltx-triptych-animation-v1",
    )

    def __init__(self, factory: WorkflowFactory | None = None) -> None:
        self.factory = factory or WorkflowFactory()

    def build(self) -> tuple[BuiltWorkflowTemplate, ...]:
        generated = self.factory.build()
        scene_anchor = self._scene_anchor_workflow(generated.keyframe_guide)
        templates = (
            self._flux_character_master(),
            self._template(
                id="sdxl-scene-anchor-v1",
                label="Plan initial SDXL",
                description=(
                    "Transpose l'image maître dans le décor du plan en conservant "
                    "l'identité approuvée."
                ),
                stage="scene_anchor",
                model_family="SDXL img2img",
                workflow=scene_anchor,
                profile=self.factory._keyframe_guide_profile(),
                models=self._models("sd_xl_base_1.0.safetensors"),
                defaults={
                    "width": 576,
                    "height": 1024,
                    "steps": 34,
                    "cfg": 5.8,
                    "denoise": 0.68,
                },
                prompt_sections=[
                    "identity_lock",
                    "species_geometry",
                    "wardrobe",
                    "scene_action",
                    "camera",
                    "lighting",
                    "style",
                ],
                receives=["approved_character_reference", "shot_direction"],
                produces=["scene_anchor_image"],
                next_templates=["sdxl-adjacent-pose-v1"],
                limitations=[
                    "Le passage de FLUX à SDXL peut modifier légèrement le rendu de matière.",
                    "Un changement de décor extrême peut nécessiter d'ajuster le débruitage.",
                ],
                provenance=["Variante d'ancrage du graphe SDXL img2img de WorkflowFactory."],
            ),
            self._template(
                id="sdxl-adjacent-pose-v1",
                label="Pose adjacente SDXL",
                description=(
                    "Produit la pose suivante en réinjectant l'image précédente "
                    "à faible débruitage."
                ),
                stage="pose_continuation",
                model_family="SDXL img2img",
                workflow=generated.keyframe_guide,
                profile=self.factory._keyframe_guide_profile(),
                models=self._models("sd_xl_base_1.0.safetensors"),
                defaults={
                    "width": 576,
                    "height": 1024,
                    "steps": 34,
                    "cfg": 5.8,
                    "denoise": 0.52,
                },
                prompt_sections=[
                    "identity_lock",
                    "previous_pose_delta",
                    "expression_delta",
                    "camera_lock",
                    "lighting_lock",
                ],
                receives=["previous_pose_image", "next_pose_direction"],
                produces=["adjacent_pose_image"],
                next_templates=[
                    "sdxl-adjacent-pose-v1",
                    "ltx-triptych-animation-v1",
                ],
                limitations=[
                    "Un changement de pose trop important peut déformer le personnage.",
                    "La référence doit venir du plan courant, pas d'un autre décor.",
                ],
                provenance=["Graphe SDXL img2img natif généré par WorkflowFactory."],
            ),
            self._template(
                id="ltx-triptych-animation-v1",
                label="Animation trois poses LTX",
                description=(
                    "Anime un plan vertical en verrouillant les images de début, milieu et fin."
                ),
                stage="video_triptych",
                model_family="LTX-Video 2B",
                workflow=generated.video,
                profile=self.factory._video_profile(),
                models=self._models(
                    "ltx-video-2b-v0.9.5.safetensors",
                    "t5xxl_fp8_e4m3fn_scaled.safetensors",
                ),
                defaults={
                    "width": 576,
                    "height": 1024,
                    "frames": 97,
                    "fps": 24,
                    "guide_frame_1": 48,
                    "guide_frame_2": 96,
                },
                prompt_sections=[
                    "character_motion",
                    "camera_motion",
                    "environment_motion",
                    "continuity_constraints",
                ],
                receives=[
                    "scene_anchor_image",
                    "middle_pose_image",
                    "end_pose_image",
                    "shot_direction",
                ],
                produces=["animated_shot"],
                next_templates=[],
                limitations=[
                    "Les trois images doivent partager cadrage, lumière et identité.",
                    "Le mouvement doit rester plausible sur 97 images.",
                ],
                provenance=["Graphe LTX multi-guide natif généré par WorkflowFactory."],
            ),
        )
        for template in templates:
            WorkflowLoader.validate_api_format(template.workflow, template.spec.id)
        return templates

    def write(self, root: Path = Path("workflows/templates")) -> tuple[Path, ...]:
        templates = self.build()
        root.mkdir(parents=True, exist_ok=True)
        written: list[Path] = []
        for template in templates:
            template_root = root / template.spec.id
            template_root.mkdir(parents=True, exist_ok=True)
            self._write_json(template_root / "workflow.api.json", template.workflow)
            self._write_json(
                template_root / "profile.json",
                template.profile.model_dump(mode="json"),
            )
            manifest = template_root / "template.json"
            self._write_json(manifest, template.spec.model_dump(mode="json"))
            written.append(manifest)
        self._write_json(
            root / "catalogue.json",
            {
                "schema_version": 1,
                "continuity_chain": list(self.chain),
                "templates": [
                    {
                        "id": template.spec.id,
                        "label": template.spec.label,
                        "stage": template.spec.stage,
                        "manifest": f"{template.spec.id}/template.json",
                    }
                    for template in templates
                ],
            },
        )
        return tuple(written)

    def _flux_character_master(self) -> BuiltWorkflowTemplate:
        workflow = self._flux_workflow()
        profile = WorkflowProfile(
            id="template-flux-character-master-v1",
            workflow=Path("workflow.api.json"),
            bindings=[
                WorkflowBinding(source="prompt", node_id="2", input="text"),
                WorkflowBinding(source="seed", node_id="5", input="seed"),
                WorkflowBinding(source="width", node_id="4", input="width"),
                WorkflowBinding(source="height", node_id="4", input="height"),
                WorkflowBinding(
                    source="lora_strength_model",
                    node_id="8",
                    input="strength_model",
                    required=False,
                ),
                WorkflowBinding(
                    source="lora_strength_clip",
                    node_id="8",
                    input="strength_clip",
                    required=False,
                ),
                WorkflowBinding(
                    source="flux_guidance",
                    node_id="9",
                    input="guidance",
                    required=False,
                ),
                WorkflowBinding(source="steps", node_id="5", input="steps", required=False),
                WorkflowBinding(source="output_prefix", node_id="7", input="filename_prefix"),
            ],
            output_node_ids=["7"],
        )
        return self._template(
            id="flux-character-master-v1",
            label="Référence personnage FLUX",
            description=(
                "Crée l'image maître d'un personnage-plante, lisible comme plante et humanisée "
                "sans basculer vers une mascotte enfantine."
            ),
            stage="character_master",
            model_family="FLUX.1-dev FP8 + LoRA 3D cartoon",
            workflow=workflow,
            profile=profile,
            models=(
                TemplateModelRequirement(
                    role="Référence personnage FLUX",
                    filename="flux1-dev-fp8.safetensors",
                    folder="checkpoints",
                    source_note=(
                        "Télécharger un checkpoint FLUX.1-dev FP8 compatible avec "
                        "CheckpointLoaderSimple."
                    ),
                ),
                TemplateModelRequirement(
                    role="Style 3D cartoon",
                    filename="FLUX_3Dcartoon.safetensors",
                    folder="loras",
                    source_note="LoRA utilisée par le workflow de référence fourni.",
                ),
            ),
            defaults={
                "width": 720,
                "height": 1280,
                "steps": 24,
                "cfg": 1.0,
                "flux_guidance": 3.5,
                "lora_strength_model": 0.2,
                "lora_strength_clip": 0.2,
                "denoise": 1.0,
            },
            prompt_sections=[
                "plant_species_geometry",
                "humanized_face_anatomy",
                "adult_body_proportions",
                "surface_material",
                "wardrobe_signature",
                "neutral_reference_pose",
                "camera_and_lighting",
                "premium_cartoon_style",
            ],
            receives=["character_bible", "plant_reference", "style_direction"],
            produces=["approved_character_reference"],
            next_templates=["sdxl-scene-anchor-v1"],
            limitations=[
                "Ce graphe traduit les références en texte : il ne garantit pas seul "
                "l'identité pixel-précise entre deux générations.",
                "Le prompt négatif est volontairement neutralisé à CFG 1.",
                "Le même seed sert à comparer des variantes, pas à garantir la continuité.",
            ],
            provenance=[
                "Topologie et réglages adaptés du workflow COMFYUI.rar fourni par l'utilisateur.",
                "Le prompt privé et le personnage d'origine ne sont pas recopiés.",
                "LoRA réduite à 0.20 pour conserver un visage adulte nuancé.",
            ],
        )

    def _template(
        self,
        *,
        id: str,
        label: str,
        description: str,
        stage: TemplateStage,
        model_family: str,
        workflow: dict[str, Any],
        profile: WorkflowProfile,
        models: tuple[TemplateModelRequirement, ...],
        defaults: dict[str, str | int | float],
        prompt_sections: list[str],
        receives: list[str],
        produces: list[str],
        next_templates: list[str],
        limitations: list[str],
        provenance: list[str],
    ) -> BuiltWorkflowTemplate:
        normalized_profile = profile.model_copy(
            update={"id": f"template-{id}", "workflow": Path("workflow.api.json")}
        )
        spec = WorkflowTemplateSpec(
            id=id,
            label=label,
            description=description,
            stage=stage,
            model_family=model_family,
            required_nodes=self._required_nodes(workflow),
            models=list(models),
            defaults=defaults,
            prompt_sections=prompt_sections,
            receives=receives,
            produces=produces,
            next_templates=next_templates,
            limitations=limitations,
            provenance=provenance,
        )
        return BuiltWorkflowTemplate(spec=spec, workflow=workflow, profile=normalized_profile)

    def _models(self, *filenames: str) -> tuple[TemplateModelRequirement, ...]:
        indexed = {requirement.filename: requirement for requirement in self.factory.requirements}
        return tuple(
            TemplateModelRequirement.from_factory(indexed[filename]) for filename in filenames
        )

    @staticmethod
    def _scene_anchor_workflow(base: dict[str, Any]) -> dict[str, Any]:
        workflow = deepcopy(base)
        workflow["7"]["inputs"]["denoise"] = 0.68
        workflow["9"]["inputs"]["filename_prefix"] = "Serre/templates/scene-anchor"
        return workflow

    @staticmethod
    def _required_nodes(workflow: dict[str, Any]) -> list[str]:
        return sorted({str(node["class_type"]) for node in workflow.values()})

    @staticmethod
    def _flux_workflow() -> dict[str, Any]:
        return {
            "1": {
                "class_type": "CheckpointLoaderSimple",
                "inputs": {"ckpt_name": "flux1-dev-fp8.safetensors"},
            },
            "8": {
                "class_type": "LoraLoader",
                "inputs": {
                    "model": ["1", 0],
                    "clip": ["1", 1],
                    "lora_name": "FLUX_3Dcartoon.safetensors",
                    "strength_model": 0.2,
                    "strength_clip": 0.2,
                },
            },
            "2": {
                "class_type": "CLIPTextEncode",
                "inputs": {"text": "", "clip": ["8", 1]},
                "_meta": {"title": "Character master prompt"},
            },
            "3": {
                "class_type": "ConditioningZeroOut",
                "inputs": {"conditioning": ["2", 0]},
            },
            "4": {
                "class_type": "EmptyLatentImage",
                "inputs": {"width": 720, "height": 1280, "batch_size": 1},
            },
            "9": {
                "class_type": "FluxGuidance",
                "inputs": {"conditioning": ["2", 0], "guidance": 3.5},
            },
            "5": {
                "class_type": "KSampler",
                "inputs": {
                    "model": ["8", 0],
                    "positive": ["9", 0],
                    "negative": ["3", 0],
                    "latent_image": ["4", 0],
                    "seed": 0,
                    "steps": 24,
                    "cfg": 1.0,
                    "sampler_name": "euler",
                    "scheduler": "simple",
                    "denoise": 1.0,
                },
            },
            "6": {
                "class_type": "VAEDecode",
                "inputs": {"samples": ["5", 0], "vae": ["1", 2]},
            },
            "7": {
                "class_type": "SaveImage",
                "inputs": {
                    "images": ["6", 0],
                    "filename_prefix": "Serre/templates/character-master",
                },
            },
        }

    @staticmethod
    def _write_json(path: Path, payload: object) -> None:
        temporary = path.with_suffix(path.suffix + ".tmp")
        temporary.write_text(
            json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )
        temporary.replace(path)
