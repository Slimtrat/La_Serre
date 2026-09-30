from __future__ import annotations

from pathlib import Path
from typing import cast

import pytest

from engine.runtime.capability_packs import PackComponent, load_capability_pack
from engine.runtime.installers.base import (
    CancellationToken,
    InstallContext,
    ProcessResult,
)
from engine.runtime.installers.ffmpeg import FFmpegInstallerAdapter
from engine.runtime.managed_tools import ManagedToolSpec, ManagedZipTool


class ResolvedManagedFFmpeg:
    def __init__(self, executable: Path) -> None:
        self.executable = executable
        self.spec = ManagedToolSpec(
            name="ffmpeg",
            version="test",
            source="https://downloads.invalid/ffmpeg.zip",
            archive_sha256="a" * 64,
            executable="bin/ffmpeg.exe",
            required_files=("bin/ffprobe.exe",),
            license_name="GPL-3.0",
            license_url="https://licenses.invalid/gpl-3.0",
            size_bytes=1,
        )

    def resolve(self, context: InstallContext) -> Path:
        del context
        return self.executable


class ExecutableTruthRunner:
    def __init__(
        self,
        *,
        failing_executable: str | None = None,
        launch_error: bool = False,
    ) -> None:
        self.failing_executable = failing_executable
        self.launch_error = launch_error
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
        self.calls.append(arguments)
        executable = Path(arguments[0]).name
        if executable == self.failing_executable:
            if self.launch_error:
                raise OSError("not executable")
            return ProcessResult(1, stderr="binary failed")
        return ProcessResult(0, stdout=f"{executable} version test\n")


def ffmpeg_component() -> PackComponent:
    return next(
        component
        for component in load_capability_pack().components
        if component.detection.kind == "ffmpeg"
    )


def context(tmp_path: Path) -> InstallContext:
    managed = tmp_path / "managed"
    return InstallContext(
        managed_root=managed,
        comfy_workspace=managed / "comfy",
        models_root=managed / "models",
        workflow_root=tmp_path / "workflows",
    )


def adapter(runner: ExecutableTruthRunner, tmp_path: Path) -> FFmpegInstallerAdapter:
    executable = tmp_path / "managed/tools/ffmpeg/test/bin/ffmpeg.exe"
    managed_cli = cast(ManagedZipTool, ResolvedManagedFFmpeg(executable))
    return FFmpegInstallerAdapter(runner, managed_cli)


@pytest.mark.asyncio
async def test_inspect_reports_installed_only_after_both_executables_run(
    tmp_path: Path,
) -> None:
    runner = ExecutableTruthRunner()

    outcome = await adapter(runner, tmp_path).inspect(
        ffmpeg_component(), context(tmp_path)
    )

    assert outcome is not None
    assert outcome.state == "installed"
    assert outcome.version == "ffmpeg.exe version test"
    assert [Path(call[0]).name for call in runner.calls] == [
        "ffmpeg.exe",
        "ffprobe.exe",
    ]
    assert all(call[1:] == ["-version"] for call in runner.calls)


@pytest.mark.asyncio
@pytest.mark.parametrize(
    ("failing_executable", "launch_error"),
    [("ffmpeg.exe", False), ("ffprobe.exe", False), ("ffprobe.exe", True)],
)
async def test_inspect_does_not_report_a_non_executable_managed_pair_as_installed(
    tmp_path: Path,
    failing_executable: str,
    launch_error: bool,
) -> None:
    runner = ExecutableTruthRunner(
        failing_executable=failing_executable,
        launch_error=launch_error,
    )

    outcome = await adapter(runner, tmp_path).inspect(
        ffmpeg_component(), context(tmp_path)
    )

    assert outcome is None
    called = [Path(call[0]).name for call in runner.calls]
    assert failing_executable in called
    if failing_executable == "ffmpeg.exe":
        assert called == ["ffmpeg.exe"]
    else:
        assert called == ["ffmpeg.exe", "ffprobe.exe"]
