from __future__ import annotations

import json
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any

from engine.generation.comfy.workflow_loader import (
    WorkflowBinding,
    WorkflowLoader,
    WorkflowProfile,
)


@dataclass(frozen=True, slots=True)
class ModelRequirement:
    role: str
    filename: str
    folder: str
    url: str


@dataclass(frozen=True, slots=True)
class GeneratedWorkflows:
    preset: str
    keyframe: dict[str, Any]
    video: dict[str, Any]
    requirements: tuple[ModelRequirement, ...]


class WorkflowFactory:
    """Creates small API-format workflows from stable ComfyUI core nodes."""

    preset = "rtx-5070-12gb"
    requirements = (
        ModelRequirement(
            role="Keyframes SDXL",
            filename="sd_xl_base_1.0.safetensors",
            folder="checkpoints",
            url=(
                "https://huggingface.co/stabilityai/stable-diffusion-xl-base-1.0/"
                "resolve/main/sd_xl_base_1.0.safetensors?download=true"
            ),
        ),
        ModelRequirement(
            role="Animation LTX 2B",
            filename="ltx-video-2b-v0.9.5.safetensors",
            folder="checkpoints",
            url=(
                "https://huggingface.co/Lightricks/LTX-Video/resolve/main/"
                "ltx-video-2b-v0.9.5.safetensors"
            ),
        ),
        ModelRequirement(
            role="Encodeur texte T5 FP8",
            filename="t5xxl_fp8_e4m3fn_scaled.safetensors",
            folder="text_encoders",
            url=(
                "https://huggingface.co/comfyanonymous/flux_text_encoders/resolve/main/"
                "t5xxl_fp8_e4m3fn_scaled.safetensors"
            ),
        ),
    )
    required_nodes = frozenset(
        {
            "CheckpointLoaderSimple",
            "CLIPLoader",
            "CLIPTextEncode",
            "EmptyLatentImage",
            "KSampler",
            "VAEDecode",
            "SaveImage",
            "LoadImage",
            "LTXVImgToVideo",
            "LTXVAddGuide",
            "LTXVConditioning",
            "LTXVScheduler",
            "KSamplerSelect",
            "SamplerCustom",
            "CreateVideo",
            "SaveVideo",
        }
    )

    def build(self) -> GeneratedWorkflows:
        result = GeneratedWorkflows(
            preset=self.preset,
            keyframe=self._keyframe_workflow(),
            video=self._video_workflow(),
            requirements=self.requirements,
        )
        WorkflowLoader.validate_api_format(result.keyframe, "generated keyframe")
        WorkflowLoader.validate_api_format(result.video, "generated video")
        return result

    def write(self, root: Path = Path("workflows/local")) -> GeneratedWorkflows:
        generated = self.build()
        root.mkdir(parents=True, exist_ok=True)
        self._write_json(root / "keyframe.api.json", generated.keyframe)
        self._write_json(root / "video.api.json", generated.video)
        self._write_json(
            root / "keyframe.profile.json",
            self._keyframe_profile().model_dump(mode="json"),
        )
        self._write_json(
            root / "video.profile.json",
            self._video_profile().model_dump(mode="json"),
        )
        self._write_json(
            root / "models.required.json",
            {
                "preset": generated.preset,
                "models": [asdict(requirement) for requirement in generated.requirements],
            },
        )
        return generated

    @staticmethod
    def _keyframe_workflow() -> dict[str, Any]:
        return {
            "1": {
                "class_type": "CheckpointLoaderSimple",
                "inputs": {"ckpt_name": "sd_xl_base_1.0.safetensors"},
            },
            "2": {
                "class_type": "CLIPTextEncode",
                "inputs": {"text": "", "clip": ["1", 1]},
                "_meta": {"title": "Positive prompt"},
            },
            "3": {
                "class_type": "CLIPTextEncode",
                "inputs": {"text": "", "clip": ["1", 1]},
                "_meta": {"title": "Negative prompt"},
            },
            "4": {
                "class_type": "EmptyLatentImage",
                "inputs": {"width": 576, "height": 1024, "batch_size": 1},
            },
            "5": {
                "class_type": "KSampler",
                "inputs": {
                    "model": ["1", 0],
                    "seed": 0,
                    "steps": 28,
                    "cfg": 6.5,
                    "sampler_name": "dpmpp_2m_sde",
                    "scheduler": "karras",
                    "positive": ["2", 0],
                    "negative": ["3", 0],
                    "latent_image": ["4", 0],
                    "denoise": 1.0,
                },
            },
            "6": {
                "class_type": "VAEDecode",
                "inputs": {"samples": ["5", 0], "vae": ["1", 2]},
            },
            "7": {
                "class_type": "SaveImage",
                "inputs": {"images": ["6", 0], "filename_prefix": "Serre/keyframe"},
            },
        }

    @staticmethod
    def _video_workflow() -> dict[str, Any]:
        return {
            "1": {
                "class_type": "CheckpointLoaderSimple",
                "inputs": {"ckpt_name": "ltx-video-2b-v0.9.5.safetensors"},
            },
            "2": {
                "class_type": "CLIPLoader",
                "inputs": {
                    "clip_name": "t5xxl_fp8_e4m3fn_scaled.safetensors",
                    "type": "ltxv",
                    "device": "default",
                },
            },
            "3": {
                "class_type": "CLIPTextEncode",
                "inputs": {"text": "", "clip": ["2", 0]},
                "_meta": {"title": "Positive prompt"},
            },
            "4": {
                "class_type": "CLIPTextEncode",
                "inputs": {"text": "", "clip": ["2", 0]},
                "_meta": {"title": "Negative prompt"},
            },
            "5": {"class_type": "LoadImage", "inputs": {"image": "keyframe.png"}},
            "6": {
                "class_type": "LTXVImgToVideo",
                "inputs": {
                    "positive": ["3", 0],
                    "negative": ["4", 0],
                    "vae": ["1", 2],
                    "image": ["5", 0],
                    "width": 576,
                    "height": 1024,
                    "length": 97,
                    "batch_size": 1,
                    "strength": 0.9,
                },
            },
            "14": {"class_type": "LoadImage", "inputs": {"image": "keyframe-guide-1.png"}},
            "15": {
                "class_type": "LTXVAddGuide",
                "inputs": {
                    "positive": ["6", 0],
                    "negative": ["6", 1],
                    "vae": ["1", 2],
                    "latent": ["6", 2],
                    "image": ["14", 0],
                    "frame_idx": 48,
                    "strength": 0.75,
                },
            },
            "16": {"class_type": "LoadImage", "inputs": {"image": "keyframe-guide-2.png"}},
            "17": {
                "class_type": "LTXVAddGuide",
                "inputs": {
                    "positive": ["15", 0],
                    "negative": ["15", 1],
                    "vae": ["1", 2],
                    "latent": ["15", 2],
                    "image": ["16", 0],
                    "frame_idx": 96,
                    "strength": 0.85,
                },
            },
            "7": {
                "class_type": "LTXVConditioning",
                "inputs": {
                    "positive": ["17", 0],
                    "negative": ["17", 1],
                    "frame_rate": 24.0,
                },
            },
            "8": {
                "class_type": "LTXVScheduler",
                "inputs": {
                    "steps": 30,
                    "max_shift": 2.05,
                    "base_shift": 0.95,
                    "stretch": True,
                    "terminal": 0.1,
                    "latent": ["17", 2],
                },
            },
            "9": {"class_type": "KSamplerSelect", "inputs": {"sampler_name": "euler"}},
            "10": {
                "class_type": "SamplerCustom",
                "inputs": {
                    "model": ["1", 0],
                    "add_noise": True,
                    "noise_seed": 0,
                    "cfg": 3.0,
                    "positive": ["7", 0],
                    "negative": ["7", 1],
                    "sampler": ["9", 0],
                    "sigmas": ["8", 0],
                    "latent_image": ["17", 2],
                },
            },
            "11": {
                "class_type": "VAEDecode",
                "inputs": {"samples": ["10", 0], "vae": ["1", 2]},
            },
            "12": {"class_type": "CreateVideo", "inputs": {"images": ["11", 0], "fps": 24.0}},
            "13": {
                "class_type": "SaveVideo",
                "inputs": {
                    "video": ["12", 0],
                    "filename_prefix": "Serre/clip",
                    "format": "auto",
                    "codec": "auto",
                },
            },
        }

    @staticmethod
    def _keyframe_profile() -> WorkflowProfile:
        return WorkflowProfile(
            id="generated-sdxl-keyframe-v1",
            workflow=Path("keyframe.api.json"),
            bindings=[
                WorkflowBinding(source="prompt", node_id="2", input="text"),
                WorkflowBinding(source="negative_prompt", node_id="3", input="text"),
                WorkflowBinding(source="seed", node_id="5", input="seed"),
                WorkflowBinding(source="width", node_id="4", input="width"),
                WorkflowBinding(source="height", node_id="4", input="height"),
                WorkflowBinding(source="output_prefix", node_id="7", input="filename_prefix"),
            ],
            output_node_ids=["7"],
        )

    @staticmethod
    def _video_profile() -> WorkflowProfile:
        return WorkflowProfile(
            id="generated-ltx-i2v-2b-v1",
            workflow=Path("video.api.json"),
            bindings=[
                WorkflowBinding(source="prompt", node_id="3", input="text"),
                WorkflowBinding(source="negative_prompt", node_id="4", input="text"),
                WorkflowBinding(source="seed", node_id="10", input="noise_seed"),
                WorkflowBinding(source="width", node_id="6", input="width"),
                WorkflowBinding(source="height", node_id="6", input="height"),
                WorkflowBinding(source="frames", node_id="6", input="length"),
                WorkflowBinding(source="fps", node_id="7", input="frame_rate"),
                WorkflowBinding(source="fps", node_id="12", input="fps"),
                WorkflowBinding(source="reference_image", node_id="5", input="image"),
                WorkflowBinding(
                    source="reference_image_guide_1", node_id="14", input="image"
                ),
                WorkflowBinding(source="guide_frame_1", node_id="15", input="frame_idx"),
                WorkflowBinding(
                    source="reference_image_guide_2", node_id="16", input="image"
                ),
                WorkflowBinding(source="guide_frame_2", node_id="17", input="frame_idx"),
                WorkflowBinding(source="output_prefix", node_id="13", input="filename_prefix"),
            ],
            output_node_ids=["13"],
        )

    @staticmethod
    def _write_json(path: Path, payload: object) -> None:
        temporary = path.with_suffix(path.suffix + ".tmp")
        temporary.write_text(
            json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )
        temporary.replace(path)
