from __future__ import annotations

from pathlib import Path

import httpx
import pytest
from fastapi import FastAPI

import apps.api.runtime_pack_routes as routes
from engine.config import Settings
from engine.runtime.capability_packs import HardwareSnapshot
from engine.runtime.installers.ffmpeg import FFMPEG_WINDOWS_X64
from engine.runtime.managed_tools import ManagedZipTool


def _component(payload: dict[str, object], component_id: str) -> dict[str, object]:
    components = payload["components"]
    assert isinstance(components, list)
    return next(
        component
        for component in components
        if isinstance(component, dict) and component.get("id") == component_id
    )


def _prerequisite(payload: dict[str, object], prerequisite_id: str) -> dict[str, object]:
    prerequisites = payload["managed_prerequisites"]
    assert isinstance(prerequisites, list)
    return next(
        prerequisite
        for prerequisite in prerequisites
        if isinstance(prerequisite, dict) and prerequisite.get("id") == prerequisite_id
    )


@pytest.mark.asyncio
@pytest.mark.parametrize("executable_pair_works", [True, False])
async def test_diagnosis_uses_executable_ffmpeg_inspection_for_both_states(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
    executable_pair_works: bool,
) -> None:
    output = tmp_path / "data" / "output"
    output.mkdir(parents=True)
    workflow_root = tmp_path / "workflows"
    workflow_root.mkdir()
    observed: list[tuple[Path, Path]] = []

    async def inspect_ffmpeg(managed_root: Path, selected_workflow_root: Path) -> bool:
        observed.append((managed_root, selected_workflow_root))
        return executable_pair_works

    async def inspect_ollama(_settings: Settings) -> tuple[bool, set[str]]:
        return False, set()

    async def inspect_comfyui(_settings: Settings) -> tuple[bool, set[str] | None]:
        return False, None

    monkeypatch.setattr(routes, "_inspect_managed_ffmpeg", inspect_ffmpeg)
    monkeypatch.setattr(routes, "_inspect_ollama", inspect_ollama)
    monkeypatch.setattr(routes, "_inspect_comfyui", inspect_comfyui)
    monkeypatch.setattr(routes, "_model_roots", lambda _settings: (tmp_path / "models",))
    monkeypatch.setattr(routes, "_workflow_root", lambda _settings: workflow_root)
    monkeypatch.setattr(
        routes,
        "inspect_hardware",
        lambda _path: HardwareSnapshot(
            vram_gb=12,
            system_ram_gb=32,
            disk_free_bytes=100_000_000_000,
            disk_path=str(tmp_path),
            gpu_name="Fake NVIDIA GPU",
            source="test",
        ),
    )
    monkeypatch.setattr(
        ManagedZipTool,
        "resolve",
        lambda self, _context: tmp_path / self.spec.name / self.spec.executable,
    )

    app = FastAPI()
    app.include_router(
        routes.create_runtime_pack_router(
            lambda: Settings(_env_file=None, output_dir=output),
        )
    )
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app),
        base_url="http://test",
    ) as client:
        response = await client.get("/api/runtime-packs/current")

    assert response.status_code == 200
    payload = response.json()
    expected_state = "installed" if executable_pair_works else "missing"
    assert _component(payload, "ffmpeg-engine")["state"] == expected_state
    assert _prerequisite(payload, FFMPEG_WINDOWS_X64.name)["state"] == expected_state
    assert observed == [
        (
            (output.resolve().parent / ".la-serre-runtime").resolve(),
            workflow_root,
        )
    ]
