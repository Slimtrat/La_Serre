from __future__ import annotations

import asyncio
import hashlib
import io
import zipfile
from pathlib import Path

import pytest

from engine.runtime.installers.base import CancellationToken
from engine.runtime.managed_tools import ManagedToolSpec
from tools import prepare_managed_ffmpeg as command


class FakeDownloader:
    def __init__(self, payload: bytes) -> None:
        self.payload = payload
        self.calls = 0

    async def download(
        self,
        source: str,
        destination: Path,
        cancellation: CancellationToken,
    ) -> None:
        del source
        cancellation.raise_if_cancelled()
        self.calls += 1
        await asyncio.to_thread(destination.write_bytes, self.payload)


def _archive() -> bytes:
    stream = io.BytesIO()
    with zipfile.ZipFile(stream, "w") as bundle:
        bundle.writestr("ffmpeg-build/bin/ffmpeg.exe", b"trusted ffmpeg")
        bundle.writestr("ffmpeg-build/bin/ffprobe.exe", b"trusted ffprobe")
    return stream.getvalue()


def _spec(archive: bytes) -> ManagedToolSpec:
    return ManagedToolSpec(
        name="ffmpeg",
        version="test-pinned",
        source="https://downloads.invalid/ffmpeg.zip",
        archive_sha256=hashlib.sha256(archive).hexdigest(),
        executable="ffmpeg-build/bin/ffmpeg.exe",
        required_files=("ffmpeg-build/bin/ffprobe.exe",),
        license_name="test license",
        license_url="https://downloads.invalid/license",
        size_bytes=len(archive),
    )


@pytest.mark.asyncio
async def test_prepare_installs_verified_pair_and_reuses_managed_receipt(
    tmp_path: Path,
) -> None:
    archive = _archive()
    downloader = FakeDownloader(archive)
    spec = _spec(archive)

    first = await command.prepare_managed_ffmpeg(
        tmp_path,
        downloader=downloader,
        spec=spec,
    )
    second = await command.prepare_managed_ffmpeg(
        tmp_path,
        downloader=downloader,
        spec=spec,
    )

    assert first == second
    assert first[0].read_bytes() == b"trusted ffmpeg"
    assert first[1].read_bytes() == b"trusted ffprobe"
    assert downloader.calls == 1


def test_command_prints_cached_verified_paths_without_network(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
) -> None:
    archive = _archive()
    spec = _spec(archive)
    downloader = FakeDownloader(archive)
    expected = asyncio.run(
        command.prepare_managed_ffmpeg(tmp_path, downloader=downloader, spec=spec)
    )
    monkeypatch.setattr(command, "FFMPEG_WINDOWS_X64", spec)

    assert command.main(["--root", str(tmp_path)]) == 0

    output = capsys.readouterr().out
    assert f"FFmpeg: {expected[0]}" in output
    assert f"FFprobe: {expected[1]}" in output
    assert downloader.calls == 1
