from __future__ import annotations

import os
from collections.abc import Callable
from pathlib import Path

from fastapi import APIRouter

import apps.api.main as api_main
import apps.api.runtime_pack_routes as runtime_pack_routes
from engine.config import Settings
from engine.generation.comfy.workflow_factory import WorkflowFactory
from tools.browser_setup_harness import (
    BrowserInstalledManagedTool,
    BrowserSetupHarness,
)


def _required_path(name: str) -> Path:
    value = os.environ.get(name)
    if not value:
        raise RuntimeError(f"Missing browser integration setting: {name}")
    return Path(value).resolve()


private_content_dir = _required_path("SERRE_E2E_PRIVATE_DIR")
output_dir = _required_path("SERRE_E2E_OUTPUT_DIR")
workflow_dir = private_content_dir / "workflows"
WorkflowFactory().write(workflow_dir)
setup_harness = BrowserSetupHarness(output_dir, workflow_dir)


def _override(module: object, name: str, value: object) -> None:
    setattr(module, name, value)


# Keep the HTTP contract, persistent manager and production route handlers real.
# Only replace hardware/service discovery and external download/process boundaries.
_override(runtime_pack_routes, "DEFAULT_CAPABILITY_PACK", setup_harness.pack)
_override(runtime_pack_routes, "CapabilityPackInspector", setup_harness.inspector)
_override(runtime_pack_routes, "inspect_hardware", lambda _root: setup_harness.hardware)
_override(runtime_pack_routes, "_inspect_ollama", setup_harness.inspect_ollama)
_override(runtime_pack_routes, "_inspect_comfyui", setup_harness.inspect_comfyui)
_override(
    runtime_pack_routes,
    "_inspect_managed_ffmpeg",
    setup_harness.inspect_managed_ffmpeg,
)
_override(runtime_pack_routes, "_model_roots", lambda _settings: (setup_harness.models_root,))
_override(runtime_pack_routes, "_workflow_root", lambda _settings: setup_harness.workflow_root)
_override(runtime_pack_routes, "ManagedZipTool", BrowserInstalledManagedTool)

_create_runtime_pack_router = runtime_pack_routes.create_runtime_pack_router


def _create_browser_runtime_pack_router(
    settings_provider: Callable[[], Settings],
) -> APIRouter:
    return _create_runtime_pack_router(
        settings_provider,
        manager_factory=setup_harness.manager,
    )


_override(api_main, "create_runtime_pack_router", _create_browser_runtime_pack_router)

app = api_main.create_app(
    Settings(
        _env_file=None,
        private_content_dir=private_content_dir,
        output_dir=output_dir,
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


@app.get("/__e2e__/setup-state")
def browser_setup_state() -> dict[str, object]:
    return setup_harness.snapshot()
