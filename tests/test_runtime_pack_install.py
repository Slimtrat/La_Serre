from __future__ import annotations

import asyncio
import hashlib
import io
import json
import zipfile
from pathlib import Path
from typing import Any

import pytest

from engine.runtime.capability_packs import CapabilityPack, PackComponent
from engine.runtime.installers import (
    CancellationToken,
    ComfyCliAdapter,
    DirectDownloadAdapter,
    InstallContext,
    IntegrityError,
    OllamaInstallerAdapter,
    ProcessResult,
    UnsafePathError,
    redact_sensitive,
)
from engine.runtime.managed_tools import ManagedToolSpec, ManagedZipTool
from engine.runtime.pack_job import PackPreparationManager


class FakeDownloader:
    def __init__(self, content: bytes = b"verified model") -> None:
        self.content = content
        self.calls: list[tuple[str, Path]] = []
        self.started = asyncio.Event()
        self.release = asyncio.Event()
        self.release.set()

    def pause_download(self) -> None:
        self.release.clear()

    def continue_download(self) -> None:
        self.release.set()

    async def download(
        self, source: str, destination: Path, cancellation: CancellationToken
    ) -> None:
        self.calls.append((source, destination))
        self.started.set()
        await asyncio.to_thread(destination.write_bytes, self.content[:4])
        released = asyncio.create_task(self.release.wait())
        cancelled = asyncio.create_task(cancellation.wait())
        done, _pending = await asyncio.wait(
            {released, cancelled}, return_when=asyncio.FIRST_COMPLETED
        )
        if cancelled in done:
            released.cancel()
            cancellation.raise_if_cancelled()
        cancelled.cancel()
        await asyncio.to_thread(destination.write_bytes, self.content)


def zip_bytes(entries: dict[str, bytes]) -> bytes:
    stream = io.BytesIO()
    with zipfile.ZipFile(stream, "w") as archive:
        for name, content in entries.items():
            archive.writestr(name, content)
    return stream.getvalue()


class FakeRunner:
    def __init__(self, *, fail_smoke: str | None = None) -> None:
        self.calls: list[tuple[list[str], Path | None]] = []
        self.fail_smoke = fail_smoke

    async def run(
        self,
        arguments: list[str],
        *,
        cwd: Path | None,
        cancellation: CancellationToken,
    ) -> ProcessResult:
        cancellation.raise_if_cancelled()
        self.calls.append((arguments, cwd))
        if arguments[:2] == ["ollama", "--version"]:
            return ProcessResult(0, "ollama 0.12.0")
        if arguments[:2] == ["ollama", "list"]:
            return ProcessResult(0, "NAME ID SIZE\n")
        if self.fail_smoke and self.fail_smoke in arguments:
            return ProcessResult(2, stderr="token=super-secret signed failure")
        if arguments and arguments[0] == "comfy" and "install" in arguments:
            workspace = Path(
                next(item.split("=", 1)[1] for item in arguments if item.startswith("--workspace="))
            )
            (workspace / "ComfyUI").mkdir(parents=True, exist_ok=True)
        return ProcessResult(0, "fake 1.0")


def make_pack(
    *,
    checksum: str | None = None,
    destination: str = "checkpoints/model.bin",
    license_use: str = "allowed",
    with_smoke: bool = True,
) -> CapabilityPack:
    payload: dict[str, Any] = {
        "schema_version": 1,
        "id": "test-pack",
        "version": 1,
        "label": "Test pack",
        "description": "Pack used without network",
        "hardware": {
            "minimum_vram_gb": 1,
            "recommended_vram_gb": 1,
            "minimum_system_ram_gb": 1,
            "workspace_reserve_bytes": 0,
            "supported_gpu_vendor": "fake",
            "preset": "fake",
        },
        "workflow_model_roles": ["test.model"],
        "components": [
            {
                "id": "test-model",
                "role": "Test model",
                "kind": "model",
                "required": True,
                "size_bytes": 14,
                "source": "https://models.invalid/model.bin?token=secret",
                "destination": destination,
                "license": {
                    "id": "review-license",
                    "name": "Review License",
                    "url": "https://licenses.invalid/review",
                    "summary": "Explicit review",
                    "commercial_use": license_use,
                },
                "checksum": {"algorithm": "sha256", "value": checksum},
                "detection": {"kind": "comfy_model", "value": "test.model"},
                "action": "Import the model manually",
            }
        ],
        "smoke_checks": (
            [
                {
                    "id": "model-smoke",
                    "label": "Model smoke",
                    "description": "Fake local check",
                    "required_roles": ["test-model"],
                    "command": "fake-smoke test-model",
                }
            ]
            if with_smoke
            else []
        ),
    }
    if not with_smoke:
        payload["smoke_checks"] = [
            {
                "id": "noop-smoke",
                "label": "No-op smoke",
                "description": "Still required by schema",
                "required_roles": ["test-model"],
                "command": "fake-noop",
            }
        ]
    return CapabilityPack.model_validate(payload)


def manager_for(
    tmp_path: Path,
    pack: CapabilityPack,
    downloader: FakeDownloader,
    runner: FakeRunner,
    *,
    disk_free: int = 1_000_000,
) -> PackPreparationManager:
    managed = tmp_path / "managed"
    managed.mkdir(exist_ok=True)
    return PackPreparationManager(
        state_root=tmp_path / "state",
        context=InstallContext(
            managed_root=managed,
            comfy_workspace=managed / "comfy",
            models_root=managed / "comfy" / "ComfyUI" / "models",
            workflow_root=tmp_path / "workflows",
        ),
        adapters=(DirectDownloadAdapter(downloader),),
        process_runner=runner,
        pack=pack,
        disk_free=lambda _path: disk_free,
    )


@pytest.mark.asyncio
async def test_complete_pack_is_idempotent_and_persistent(tmp_path: Path) -> None:
    content = b"verified model"
    pack = make_pack(checksum=hashlib.sha256(content).hexdigest())
    downloader = FakeDownloader(content)
    runner = FakeRunner()
    manager = manager_for(tmp_path, pack, downloader, runner)

    first = await manager.wait(manager.start().id)
    second = await manager.wait(manager.start().id)

    assert first.status == second.status == "completed"
    assert len(downloader.calls) == 1
    assert second.steps[0].attempts == 0
    assert (tmp_path / "state" / f"{first.id}.json").is_file()
    assert second.smoke_checks[0].status == "passed"

    installed = tmp_path / "managed/comfy/ComfyUI/models/checkpoints/model.bin"
    installed.write_bytes(b"corrupt")
    manager.repair(second.id)
    repaired = await manager.wait(second.id)
    assert repaired.status == "completed"
    assert len(downloader.calls) == 2


@pytest.mark.asyncio
async def test_checksum_failure_never_publishes_partial_file(tmp_path: Path) -> None:
    pack = make_pack(checksum="0" * 64)
    manager = manager_for(tmp_path, pack, FakeDownloader(), FakeRunner())

    job = await manager.wait(manager.start().id)

    assert job.status == "failed"
    assert "Checksum" in (job.error or "")
    destination = tmp_path / "managed/comfy/ComfyUI/models/checkpoints/model.bin"
    assert not destination.exists()
    assert not destination.with_suffix(".bin.part").exists()


@pytest.mark.asyncio
async def test_disk_preflight_fails_before_download(tmp_path: Path) -> None:
    pack = make_pack()
    downloader = FakeDownloader()
    manager = manager_for(
        tmp_path, pack, downloader, FakeRunner(), disk_free=pack.components[0].size_bytes - 1
    )

    job = await manager.wait(manager.start().id)

    assert job.status == "failed"
    assert "Espace disque insuffisant" in (job.error or "")
    assert downloader.calls == []


@pytest.mark.asyncio
async def test_license_blocks_before_download_then_repair_resumes(tmp_path: Path) -> None:
    content = b"verified model"
    pack = make_pack(checksum=hashlib.sha256(content).hexdigest(), license_use="review_required")
    downloader = FakeDownloader(content)
    manager = manager_for(tmp_path, pack, downloader, FakeRunner())

    blocked = await manager.wait(manager.start().id)
    assert blocked.status == "awaiting_license"
    assert downloader.calls == []

    manager.repair(blocked.id, accepted_license_ids={"review-license"})
    repaired = await manager.wait(blocked.id)
    assert repaired.status == "completed"
    assert len(downloader.calls) == 1


@pytest.mark.asyncio
async def test_manual_mode_remains_repairable(tmp_path: Path) -> None:
    pack = make_pack()
    manager = manager_for(tmp_path, pack, FakeDownloader(), FakeRunner())

    job = await manager.wait(manager.start(mode="manual").id)

    assert job.status == "awaiting_manual"
    assert job.steps[0].message == "Import the model manually"


@pytest.mark.asyncio
async def test_cancel_removes_partial_download(tmp_path: Path) -> None:
    pack = make_pack()
    downloader = FakeDownloader()
    downloader.pause_download()
    manager = manager_for(tmp_path, pack, downloader, FakeRunner())
    job = manager.start()
    await downloader.started.wait()

    manager.cancel(job.id)
    cancelled = await manager.wait(job.id)

    assert cancelled.status == "cancelled"
    partial = tmp_path / "managed/comfy/ComfyUI/models/checkpoints/model.bin.part"
    assert not partial.exists()


@pytest.mark.asyncio
async def test_pause_finishes_atomic_step_then_resumes_without_redownload(tmp_path: Path) -> None:
    pack = make_pack()
    downloader = FakeDownloader()
    downloader.pause_download()
    manager = manager_for(tmp_path, pack, downloader, FakeRunner())
    job = manager.start()
    await downloader.started.wait()

    manager.pause(job.id)
    downloader.continue_download()
    paused = await manager.wait(job.id)
    assert paused.status == "paused"
    assert paused.steps[0].status == "installed"

    manager.resume(job.id)
    completed = await manager.wait(job.id)
    assert completed.status == "completed"
    assert len(downloader.calls) == 1


@pytest.mark.asyncio
async def test_restart_recovers_running_job_as_paused(tmp_path: Path) -> None:
    pack = make_pack()
    downloader = FakeDownloader()
    manager = manager_for(tmp_path, pack, downloader, FakeRunner())
    created = manager.start(mode="manual")
    await manager.wait(created.id)
    state_path = tmp_path / "state" / f"{created.id}.json"
    payload = json.loads(state_path.read_text(encoding="utf-8"))
    payload["status"] = "running"
    payload["steps"][0]["status"] = "running"
    state_path.write_text(json.dumps(payload), encoding="utf-8")

    restored = manager_for(tmp_path, pack, downloader, FakeRunner()).get(created.id)

    assert restored.status == "paused"
    assert restored.recovered is True
    assert restored.steps[0].status == "pending"


@pytest.mark.asyncio
async def test_smoke_failure_names_exact_components_and_redacts_logs(tmp_path: Path) -> None:
    pack = make_pack()
    runner = FakeRunner(fail_smoke="test-model")
    manager = manager_for(tmp_path, pack, FakeDownloader(), runner)

    job = await manager.wait(manager.start().id)

    assert job.status == "failed"
    assert "test-model" in (job.error or "")
    assert job.smoke_checks[0].required_components == ["test-model"]
    serialized_logs = json.dumps(manager.logs(job.id))
    assert "super-secret" not in serialized_logs


def test_path_and_log_safety_helpers(tmp_path: Path) -> None:
    pack = make_pack(destination="../escape.bin")
    adapter = DirectDownloadAdapter(FakeDownloader())
    context = InstallContext(tmp_path, tmp_path / "comfy", tmp_path / "models", tmp_path)

    with pytest.raises(UnsafePathError):
        asyncio.run(adapter.inspect(pack.components[0], context))
    redacted = redact_sensitive(
        "Bearer abc.def token=hello https://host/file?X-Amz-Signature=private&expires=2"
    )
    assert "abc.def" not in redacted
    assert "hello" not in redacted
    assert "private" not in redacted


@pytest.mark.asyncio
async def test_adapters_use_argument_lists_and_managed_workspace(tmp_path: Path) -> None:
    runner = FakeRunner()
    managed = tmp_path / "managed"
    managed.mkdir(exist_ok=True)
    context = InstallContext(managed, managed / "comfy", managed / "models", tmp_path / "workflows")
    base = make_pack().components[0].model_dump(mode="json")
    ollama_component = PackComponent.model_validate(
        {
            **base,
            "id": "ollama-model",
            "destination": "ollama://qwen3:4b",
            "detection": {"kind": "ollama_model", "value": "qwen3:4b"},
        }
    )
    await OllamaInstallerAdapter(runner).install(ollama_component, context, CancellationToken())

    comfy_component = PackComponent.model_validate(
        {
            **base,
            "id": "comfy-engine",
            "kind": "engine",
            "destination": "managed",
            "detection": {"kind": "comfyui", "value": "comfyui"},
        }
    )
    await ComfyCliAdapter(runner).install(comfy_component, context, CancellationToken())

    assert (["ollama", "pull", "qwen3:4b"], None) in runner.calls
    assert runner.calls[-1][0][:3] == [
        "comfy",
        f"--workspace={context.comfy_workspace}",
        "--skip-prompt",
    ]


@pytest.mark.asyncio
async def test_managed_zip_tool_is_verified_atomic_and_idempotent(tmp_path: Path) -> None:
    content = zip_bytes({"uv.exe": b"trusted executable"})
    downloader = FakeDownloader(content)
    spec = ManagedToolSpec(
        name="uv",
        version="1.2.3",
        source="https://downloads.invalid/uv.zip",
        archive_sha256=hashlib.sha256(content).hexdigest(),
        executable="uv.exe",
        license_name="MIT",
        license_url="https://licenses.invalid/mit",
        size_bytes=len(content),
    )
    managed = tmp_path / "managed"
    managed.mkdir()
    context = InstallContext(managed, managed / "comfy", managed / "models", tmp_path)
    tool = ManagedZipTool(spec, downloader)

    first = await tool.ensure(context, CancellationToken())
    second = await tool.ensure(context, CancellationToken())

    assert first == second == managed / "tools" / "uv" / "1.2.3" / "uv.exe"
    assert first.read_bytes() == b"trusted executable"
    assert len(downloader.calls) == 1
    receipt = json.loads(first.with_name(".la-serre-tool.json").read_text(encoding="utf-8"))
    assert receipt["archive_sha256"] == spec.archive_sha256
    assert receipt["license"]["name"] == "MIT"


@pytest.mark.asyncio
async def test_managed_zip_tool_rejects_bad_digest_and_unsafe_members(tmp_path: Path) -> None:
    managed = tmp_path / "managed"
    managed.mkdir()
    context = InstallContext(managed, managed / "comfy", managed / "models", tmp_path)
    bad_digest = zip_bytes({"uv.exe": b"binary"})
    spec = ManagedToolSpec(
        "uv",
        "1",
        "https://downloads.invalid/uv.zip",
        "0" * 64,
        "uv.exe",
        "MIT",
        "https://licenses.invalid/mit",
        len(bad_digest),
    )
    with pytest.raises(IntegrityError):
        await ManagedZipTool(spec, FakeDownloader(bad_digest)).ensure(
            context, CancellationToken()
        )
    assert not (managed / "tools" / "uv").exists()

    unsafe = zip_bytes({"../escape.exe": b"nope", "uv.exe": b"binary"})
    unsafe_spec = ManagedToolSpec(
        "uv",
        "1",
        "https://downloads.invalid/uv.zip",
        hashlib.sha256(unsafe).hexdigest(),
        "uv.exe",
        "MIT",
        "https://licenses.invalid/mit",
        len(unsafe),
    )
    with pytest.raises(IntegrityError, match="chemin non sûr"):
        await ManagedZipTool(unsafe_spec, FakeDownloader(unsafe)).ensure(
            context, CancellationToken()
        )
    assert not (tmp_path / "escape.exe").exists()


@pytest.mark.asyncio
async def test_comfy_uses_pinned_cli_through_managed_uv(tmp_path: Path) -> None:
    class FakeManagedCli:
        async def ensure(
            self, context: InstallContext, cancellation: CancellationToken
        ) -> Path:
            cancellation.raise_if_cancelled()
            return context.managed_root / "tools" / "uv" / "uv.exe"

    runner = FakeRunner()
    managed = tmp_path / "managed"
    managed.mkdir()
    context = InstallContext(managed, managed / "comfy", managed / "models", tmp_path)
    base = make_pack().components[0].model_dump(mode="json")
    component = PackComponent.model_validate(
        {
            **base,
            "id": "comfy-engine",
            "kind": "engine",
            "destination": "managed",
            "detection": {"kind": "comfyui", "value": "comfyui"},
        }
    )

    await ComfyCliAdapter(runner, managed_cli=FakeManagedCli()).install(
        component, context, CancellationToken()
    )

    assert runner.calls[-1][0][:6] == [
        str(managed / "tools" / "uv" / "uv.exe"),
        "tool",
        "run",
        "--from",
        "comfy-cli==1.20.0",
        "comfy",
    ]
