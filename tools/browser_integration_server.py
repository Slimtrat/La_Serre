from __future__ import annotations

import os
from pathlib import Path

from apps.api.main import create_app
from engine.config import Settings
from engine.generation.comfy.workflow_factory import WorkflowFactory


def _required_path(name: str) -> Path:
    value = os.environ.get(name)
    if not value:
        raise RuntimeError(f"Missing browser integration setting: {name}")
    return Path(value).resolve()


private_content_dir = _required_path("SERRE_E2E_PRIVATE_DIR")
workflow_dir = private_content_dir / "workflows"
WorkflowFactory().write(workflow_dir)

app = create_app(
    Settings(
        _env_file=None,
        private_content_dir=private_content_dir,
        output_dir=_required_path("SERRE_E2E_OUTPUT_DIR"),
        downloads_dir=_required_path("SERRE_E2E_DOWNLOADS_DIR"),
        ollama_url="http://127.0.0.1:9",
        comfyui_url="http://127.0.0.1:9",
        keyframe_workflow_profile=workflow_dir / "keyframe.profile.json",
        keyframe_reference_workflow_profile=(
            workflow_dir / "keyframe-reference.profile.json"
        ),
        keyframe_guide_workflow_profile=workflow_dir / "keyframe-guide.profile.json",
        keyframe_reference_guide_workflow_profile=(
            workflow_dir / "keyframe-reference-guide.profile.json"
        ),
        video_workflow_profile=workflow_dir / "video.profile.json",
    )
)
