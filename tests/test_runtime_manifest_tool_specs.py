from __future__ import annotations

from engine.runtime.capability_packs import load_capability_pack
from engine.runtime.installers.ffmpeg import FFMPEG_WINDOWS_X64


def test_ffmpeg_manifest_metadata_matches_managed_installer_spec() -> None:
    pack = load_capability_pack()
    component = pack.component("ffmpeg-engine")
    specification = FFMPEG_WINDOWS_X64

    assert component.source.unicode_string() == specification.source
    assert component.destination == (
        f".la-serre-runtime/tools/{specification.name}/{specification.version}"
    )
    assert component.size_bytes == specification.size_bytes
    assert component.checksum.algorithm == "sha256"
    assert component.checksum.value == specification.archive_sha256
    assert component.license.name == specification.license_name
    assert component.license.url.unicode_string() == specification.license_url
