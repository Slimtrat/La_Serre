from __future__ import annotations

import asyncio
import hashlib
from pathlib import Path
from typing import Any

from engine.runtime.capability_packs import (
    CapabilityPack,
    CapabilityPackInspector,
    ChecksumSpec,
    ComponentDetection,
    HardwareRequirement,
    HardwareSnapshot,
    LicenseNotice,
    PackComponent,
    SmokeCheck,
)
from engine.runtime.installers import (
    CancellationToken,
    DirectDownloadAdapter,
    InstallContext,
    ProcessResult,
)
from engine.runtime.pack_job import PackPreparationManager

_MODEL_CONTENT = b"la-serre-browser-setup-fixture-v1\n"


def browser_setup_pack() -> CapabilityPack:
    fixture_license = LicenseNotice(
        id="browser-fixture-license",
        name="Browser fixture license",
        url="https://browser.invalid/license",
        summary="Deterministic test payload; explicit acceptance is required.",
        commercial_use="review_required",
    )
    component = PackComponent(
        id="keyframe-sdxl",
        role="Image model browser fixture",
        kind="model",
        size_bytes=len(_MODEL_CONTENT),
        source="https://browser.invalid/keyframe-fixture.safetensors",
        destination="checkpoints/browser-setup-fixture.safetensors",
        license=fixture_license,
        checksum=ChecksumSpec(
            algorithm="sha256",
            value=hashlib.sha256(_MODEL_CONTENT).hexdigest(),
        ),
        detection=ComponentDetection(kind="comfy_model", value="keyframe"),
        action="Install the deterministic browser fixture.",
    )
    return CapabilityPack(
        id="tentafruit-local-12gb-v1",
        version=1,
        label="Browser integration setup pack",
        description="Hermetic setup pack for the real FastAPI browser journey.",
        hardware=HardwareRequirement(
            minimum_vram_gb=1,
            recommended_vram_gb=1,
            minimum_system_ram_gb=1,
            workspace_reserve_bytes=0,
            supported_gpu_vendor="browser-fixture",
            preset="browser-integration",
        ),
        workflow_model_roles=["keyframe"],
        components=[
            component,
            # The real Studio capability projection looks these IDs up even when
            # the setup test only installs its tiny keyframe fixture. Keep them
            # optional so the shared browser server remains valid for every
            # scenario without downloading or pretending to install media models.
            PackComponent(
                id="video-ltx-2b",
                role="Optional browser video compatibility slot",
                kind="model",
                required=False,
                size_bytes=0,
                source="https://browser.invalid/video-fixture.safetensors",
                destination="checkpoints/browser-video-fixture.safetensors",
                license=fixture_license,
                checksum=ChecksumSpec(algorithm="source-declared", value=None),
                detection=ComponentDetection(kind="comfy_model", value="video.fixture"),
                action="Not installed by the browser setup fixture.",
            ),
            PackComponent(
                id="text-encoder-t5-fp8",
                role="Optional browser text-encoder compatibility slot",
                kind="model",
                required=False,
                size_bytes=0,
                source="https://browser.invalid/text-fixture.safetensors",
                destination="text_encoders/browser-text-fixture.safetensors",
                license=fixture_license,
                checksum=ChecksumSpec(algorithm="source-declared", value=None),
                detection=ComponentDetection(kind="comfy_model", value="text.fixture"),
                action="Not installed by the browser setup fixture.",
            ),
        ],
        smoke_checks=[
            SmokeCheck(
                id="image",
                label="Image fixture",
                description=(
                    "Verify the installed browser fixture through the fake process boundary."
                ),
                required_roles=[component.id],
                command="browser-smoke keyframe-sdxl",
            )
        ],
    )


class BrowserSetupDownloader:
    """Filesystem-producing replacement for the external HTTP download boundary."""

    def __init__(self) -> None:
        self.calls: list[str] = []

    async def download(
        self,
        source: str,
        destination: Path,
        cancellation: CancellationToken,
    ) -> None:
        cancellation.raise_if_cancelled()
        self.calls.append(source)
        await asyncio.to_thread(_write_model, destination)


class BrowserSetupProcessRunner:
    """Records smoke commands without starting an operating-system process."""

    def __init__(self) -> None:
        self.calls: list[list[str]] = []

    async def run(
        self,
        arguments: list[str],
        *,
        cwd: Path | None,
        cancellation: CancellationToken,
    ) -> ProcessResult:
        del cwd
        cancellation.raise_if_cancelled()
        self.calls.append(list(arguments))
        return ProcessResult(0, "browser setup smoke passed", "")


class BrowserInstalledManagedTool:
    """Makes bundled tool prerequisites deterministic without fetching archives."""

    def __init__(self, *_args: object, **_kwargs: object) -> None:
        pass

    def resolve(self, context: InstallContext) -> Path:
        return context.managed_root / "tools" / "browser-fixture" / "installed.exe"


class BrowserSetupHarness:
    def __init__(self, output_root: Path, workflow_root: Path) -> None:
        self.output_root = output_root.resolve()
        self.managed_root = (self.output_root.parent / ".la-serre-runtime").resolve()
        self.workflow_root = workflow_root.resolve()
        self.models_root = self.managed_root / "comfyui" / "ComfyUI" / "models"
        self.pack = browser_setup_pack()
        self.hardware = HardwareSnapshot(
            gpu_name="Browser Fixture GPU",
            vram_gb=12,
            system_ram_gb=32,
            disk_free_bytes=100 * 1024**3,
            disk_path="browser-integration",
            source="browser-fixture",
        )
        self.downloader = BrowserSetupDownloader()
        self.process_runner = BrowserSetupProcessRunner()
        self._managers: dict[bool, PackPreparationManager] = {}

    def manager(self, personal: bool = False) -> PackPreparationManager:
        existing = self._managers.get(personal)
        if existing is not None:
            return existing
        suffix = "runtime-pack-jobs-personal" if personal else "runtime-pack-jobs"
        created = PackPreparationManager(
            state_root=self.output_root / ".studio" / suffix,
            context=InstallContext(
                managed_root=self.managed_root,
                comfy_workspace=self.managed_root / "comfyui",
                models_root=self.models_root,
                workflow_root=self.workflow_root,
            ),
            adapters=(DirectDownloadAdapter(self.downloader),),
            process_runner=self.process_runner,
            pack=self.pack,
            disk_free=lambda _path: self.hardware.disk_free_bytes,
            development_smoke_checks=True,
        )
        self._managers[personal] = created
        return created

    def inspector(self) -> CapabilityPackInspector:
        return CapabilityPackInspector(self.pack)

    async def inspect_ollama(self, _settings: object) -> tuple[bool, set[str]]:
        return False, set()

    async def inspect_comfyui(self, _settings: object) -> tuple[bool, set[str] | None]:
        return False, None

    async def inspect_managed_ffmpeg(
        self,
        _managed_root: Path,
        _workflow_root: Path,
    ) -> bool:
        return True

    def snapshot(self) -> dict[str, Any]:
        state_roots = (
            self.output_root / ".studio" / "runtime-pack-jobs",
            self.output_root / ".studio" / "runtime-pack-jobs-personal",
        )
        return {
            "download_calls": list(self.downloader.calls),
            "process_calls": list(self.process_runner.calls),
            "state_files": sorted(
                str(path.relative_to(self.output_root))
                for root in state_roots
                for path in root.glob("*.json")
            ),
            "model_installed": (
                self.models_root / "checkpoints" / "browser-setup-fixture.safetensors"
            ).is_file(),
        }


def _write_model(destination: Path) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_bytes(_MODEL_CONTENT)
