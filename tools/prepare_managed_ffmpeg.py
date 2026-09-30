from __future__ import annotations

import argparse
import asyncio
from collections.abc import Sequence
from pathlib import Path

from engine.runtime.installers.base import CancellationToken, InstallContext
from engine.runtime.installers.direct import HttpxDownloader
from engine.runtime.installers.ffmpeg import FFMPEG_WINDOWS_X64
from engine.runtime.managed_tools import ArchiveDownloader, ManagedToolSpec, ManagedZipTool


def parser() -> argparse.ArgumentParser:
    result = argparse.ArgumentParser(
        description="Install and verify La Serre's checksum-pinned managed FFmpeg runtime."
    )
    result.add_argument("--root", type=Path, default=Path(".la-serre-runtime"))
    return result


async def prepare_managed_ffmpeg(
    managed_root: Path,
    *,
    downloader: ArchiveDownloader | None = None,
    spec: ManagedToolSpec | None = None,
) -> tuple[Path, Path]:
    root = await asyncio.to_thread(managed_root.resolve)
    selected = spec or FFMPEG_WINDOWS_X64
    context = InstallContext(
        managed_root=root,
        comfy_workspace=root / "comfyui",
        models_root=root / "models",
        workflow_root=root / "workflows",
    )
    ffmpeg = await ManagedZipTool(
        selected,
        downloader or HttpxDownloader(),
    ).ensure(context, CancellationToken())
    ffprobe = ffmpeg.with_name("ffprobe.exe")
    if not ffprobe.is_file():
        raise RuntimeError("The verified managed FFmpeg runtime does not contain ffprobe.exe")
    return ffmpeg.resolve(), ffprobe.resolve()


def main(argv: Sequence[str] | None = None) -> int:
    args = parser().parse_args(argv)
    ffmpeg, ffprobe = asyncio.run(prepare_managed_ffmpeg(args.root))
    print(f"FFmpeg: {ffmpeg}")
    print(f"FFprobe: {ffprobe}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
