from __future__ import annotations

from pathlib import Path

from engine.runtime.capability_packs import PackComponent
from engine.runtime.installers.base import (
    CancellationToken,
    InstallContext,
    InstallOutcome,
    ProcessRunner,
    successful_process,
)
from engine.runtime.managed_tools import (
    ManagedToolSpec,
    ManagedZipTool,
    resolve_managed_tool,
)

FFMPEG_WINDOWS_X64 = ManagedToolSpec(
    name="ffmpeg",
    version="8.1.2-essentials",
    source=(
        "https://www.gyan.dev/ffmpeg/builds/packages/"
        "ffmpeg-8.1.2-essentials_build.zip"
    ),
    archive_sha256="db580001caa24ac104c8cb856cd113a87b0a443f7bdf47d8c12b1d740584a2ec",
    executable="ffmpeg-8.1.2-essentials_build/bin/ffmpeg.exe",
    required_files=("ffmpeg-8.1.2-essentials_build/bin/ffprobe.exe",),
    license_name="GNU GPL v3",
    license_url="https://www.gyan.dev/ffmpeg/builds/#licensing",
    size_bytes=109_728_040,
)


def resolve_managed_ffmpeg(managed_root: Path) -> tuple[Path, Path] | None:
    ffmpeg = resolve_managed_tool(managed_root, FFMPEG_WINDOWS_X64)
    if ffmpeg is None:
        return None
    ffprobe = ffmpeg.with_name("ffprobe.exe")
    return ffmpeg, ffprobe


class FFmpegInstallerAdapter:
    def __init__(self, runner: ProcessRunner, managed_cli: ManagedZipTool) -> None:
        self.runner = runner
        self.managed_cli = managed_cli

    def supports(self, component: PackComponent) -> bool:
        return component.detection.kind == "ffmpeg"

    async def inspect(
        self, component: PackComponent, context: InstallContext
    ) -> InstallOutcome | None:
        del component
        ffmpeg = self.managed_cli.resolve(context)
        if ffmpeg is None:
            return None
        ffprobe = ffmpeg.with_name("ffprobe.exe")
        cancellation = CancellationToken()
        try:
            version = await self.runner.run(
                [str(ffmpeg), "-version"],
                cwd=ffmpeg.parent,
                cancellation=cancellation,
            )
            if version.returncode:
                return None
            probe_version = await self.runner.run(
                [str(ffprobe), "-version"],
                cwd=ffmpeg.parent,
                cancellation=cancellation,
            )
        except (FileNotFoundError, OSError):
            return None
        if probe_version.returncode:
            return None
        version_output = version.stdout.strip() or version.stderr.strip()
        return InstallOutcome(
            "installed",
            "FFmpeg et FFprobe gérés détectés et exécutables",
            version=version_output.splitlines()[0] if version_output else None,
            path=str(ffmpeg.parent),
            checksum=self.managed_cli.spec.archive_sha256,
        )

    async def install(
        self,
        component: PackComponent,
        context: InstallContext,
        cancellation: CancellationToken,
    ) -> InstallOutcome:
        del component
        ffmpeg = await self.managed_cli.ensure(context, cancellation)
        ffprobe = ffmpeg.with_name("ffprobe.exe")
        version = successful_process(
            await self.runner.run(
                [str(ffmpeg), "-version"], cwd=ffmpeg.parent, cancellation=cancellation
            ),
            "Vérification FFmpeg",
        )
        successful_process(
            await self.runner.run(
                [str(ffprobe), "-version"], cwd=ffmpeg.parent, cancellation=cancellation
            ),
            "Vérification FFprobe",
        )
        return InstallOutcome(
            "installed",
            "FFmpeg et FFprobe préparés dans l’espace géré",
            version=version.stdout.splitlines()[0] if version.stdout else None,
            path=str(ffmpeg.parent),
            checksum=self.managed_cli.spec.archive_sha256,
        )
