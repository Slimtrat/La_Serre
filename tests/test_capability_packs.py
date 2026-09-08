from __future__ import annotations

from pathlib import Path

import httpx
import pytest

from apps.api.main import create_app
from engine.config import Settings
from engine.generation.comfy.workflow_factory import WorkflowFactory
from engine.runtime.capability_packs import (
    DEFAULT_CAPABILITY_PACK,
    CapabilityPack,
    CapabilityPackInspector,
    HardwareSnapshot,
)


def _hardware(vram_gb: float, disk_free_bytes: int = 100_000_000_000) -> HardwareSnapshot:
    return HardwareSnapshot(
        vram_gb=vram_gb,
        system_ram_gb=32,
        disk_free_bytes=disk_free_bytes,
        disk_path="D:/models",
        gpu_name=f"Fake NVIDIA {vram_gb:g}GB",
        source="test",
    )


def _installed_pack(tmp_path: Path, vram_gb: float):
    models = tmp_path / "models"
    workflows = tmp_path / "workflows"
    for requirement in WorkflowFactory.requirements:
        path = models / requirement.folder / requirement.filename
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(b"installed")
    workflows.mkdir()
    for filename in (
        "keyframe.profile.json",
        "keyframe-guide.profile.json",
        "video.profile.json",
    ):
        (workflows / filename).write_text("{}", encoding="utf-8")
    return CapabilityPackInspector().inspect(
        hardware=_hardware(vram_gb),
        model_roots=(models,),
        workflow_root=workflows,
        installed_ollama_models={"qwen3:4b"},
        ollama_reachable=True,
        comfyui_reachable=True,
        available_nodes=set(WorkflowFactory.required_nodes),
    )


def test_manifest_is_versioned_complete_and_projects_legacy_requirements() -> None:
    pack = DEFAULT_CAPABILITY_PACK

    assert pack.id == "tentafruit-local-12gb-v1"
    assert pack.hardware.minimum_vram_gb == 12
    assert pack.recommended_narrative_model == "qwen3:4b"
    assert {item.capability_role for item in pack.comfy_model_requirements()} == {
        "keyframe.sdxl",
        "video.ltx-2b",
        "text-encoder.t5-fp8",
    }
    assert all(component.license.name for component in pack.components)
    assert all(component.checksum.algorithm for component in pack.components)


def test_manifest_rejects_duplicate_components() -> None:
    payload = DEFAULT_CAPABILITY_PACK.model_dump(mode="json")
    payload["components"].append(payload["components"][0])

    with pytest.raises(ValueError, match="component ids must be unique"):
        CapabilityPack.model_validate(payload)


@pytest.mark.parametrize("vram_gb", [12, 24])
def test_supported_hardware_is_ready_when_required_components_exist(
    tmp_path: Path, vram_gb: float
) -> None:
    diagnosis = _installed_pack(tmp_path, vram_gb)

    assert diagnosis.status == "ready"
    assert diagnosis.required_download_bytes == 0
    assert not diagnosis.reasons


def test_eight_gb_hardware_is_explained_as_incompatible(tmp_path: Path) -> None:
    diagnosis = _installed_pack(tmp_path, 8)

    assert diagnosis.status == "incompatible"
    assert any("VRAM 8 Go < minimum 12 Go" in reason for reason in diagnosis.reasons)
    assert any("12 Go ou plus" in action for action in diagnosis.actions)


def test_insufficient_disk_reports_required_space(tmp_path: Path) -> None:
    diagnosis = CapabilityPackInspector().inspect(
        hardware=_hardware(12, disk_free_bytes=1),
        model_roots=(tmp_path / "models",),
        workflow_root=tmp_path / "workflows",
    )

    assert diagnosis.status == "incompatible"
    assert diagnosis.required_download_bytes > 0
    assert any("Disque libre insuffisant" in reason for reason in diagnosis.reasons)


def test_installed_component_is_detected_in_any_supported_root(tmp_path: Path) -> None:
    empty_root = tmp_path / "shared"
    install_root = tmp_path / "install"
    requirement = WorkflowFactory.requirements[0]
    installed = install_root / requirement.folder / requirement.filename
    installed.parent.mkdir(parents=True)
    installed.write_bytes(b"model")

    diagnosis = CapabilityPackInspector().inspect(
        hardware=_hardware(12),
        model_roots=(empty_root, install_root),
        workflow_root=tmp_path / "workflows",
    )
    component = next(item for item in diagnosis.components if item.id == requirement.component_id)

    assert component.state == "installed"
    assert component.detected_path == str(installed)


def test_workflow_factory_keeps_legacy_contract_from_pack() -> None:
    generated = WorkflowFactory().build()

    assert generated.preset == "rtx-5070-12gb"
    assert [item.filename for item in generated.requirements] == [
        "sd_xl_base_1.0.safetensors",
        "ltx-video-2b-v0.9.5.safetensors",
        "t5xxl_fp8_e4m3fn_scaled.safetensors",
    ]


def test_desktop_bundle_includes_versioned_pack_manifest() -> None:
    spec = Path("tools/serre_studio.spec").read_text(encoding="utf-8")

    assert '(project_root / "packs", "packs")' in spec


async def test_read_only_api_returns_diagnostic_when_comfyui_is_offline(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    import apps.api.runtime_pack_routes as routes

    async def offline_ollama(_settings: Settings) -> tuple[bool, set[str]]:
        return False, set()

    async def offline_comfyui(_settings: Settings) -> tuple[bool, set[str] | None]:
        return False, None

    monkeypatch.setattr(routes, "_inspect_ollama", offline_ollama)
    monkeypatch.setattr(routes, "_inspect_comfyui", offline_comfyui)
    monkeypatch.setattr(routes, "inspect_hardware", lambda _path: _hardware(12))
    settings = Settings(
        _env_file=None,
        output_dir=tmp_path / "output",
        private_content_dir=tmp_path / "private",
        comfyui_models_dir=tmp_path / "models",
    )
    app = create_app(settings)
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app), base_url="http://test"
    ) as client:
        response = await client.get("/api/runtime-packs/current")

    assert response.status_code == 200
    payload = response.json()
    assert payload["pack_id"] == "tentafruit-local-12gb-v1"
    assert payload["status"] == "incomplete"
    comfy = next(item for item in payload["components"] if item["id"] == "comfyui-engine")
    assert comfy["state"] == "unavailable"
    assert "diagnostic reste disponible" in comfy["reason"]


def test_invalid_installed_checksum_is_reported(tmp_path: Path) -> None:
    payload = DEFAULT_CAPABILITY_PACK.model_dump(mode="json")
    component = next(item for item in payload["components"] if item["id"] == "keyframe-sdxl")
    component["checksum"] = {"algorithm": "sha256", "value": "0" * 64}
    pack = CapabilityPack.model_validate(payload)
    requirement = pack.comfy_model_requirements()[0]
    installed = tmp_path / "models" / requirement.folder / requirement.filename
    installed.parent.mkdir(parents=True)
    installed.write_bytes(b"not-the-declared-model")

    diagnosis = CapabilityPackInspector(pack).inspect(
        hardware=_hardware(12),
        model_roots=(tmp_path / "models",),
        workflow_root=tmp_path / "workflows",
    )
    inspected = next(item for item in diagnosis.components if item.id == "keyframe-sdxl")

    assert inspected.state == "invalid"
    assert "checksum" in inspected.reason
