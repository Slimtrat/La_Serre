import json
from pathlib import Path

from tools.build_desktop import publish_desktop_release


def test_publish_desktop_release_archives_previous_patch(tmp_path: Path) -> None:
    build = tmp_path / "build.exe"
    desktop = tmp_path / "desktop"
    build.write_bytes(b"version-1")
    current = publish_desktop_release(build, desktop, "0.2.0")
    build.write_bytes(b"version-2")

    publish_desktop_release(build, desktop, "0.2.1")

    assert current.read_bytes() == b"version-2"
    assert (desktop / "versions-old").is_dir()
    assert (
        desktop / "versions-old" / "0.2.0" / "SerreStudio-0.2.0.exe"
    ).read_bytes() == b"version-1"
    assert (
        desktop / "versions" / "0.2.1" / "SerreStudio-0.2.1.exe"
    ).read_bytes() == b"version-2"
    manifest = json.loads((desktop / "current-version.json").read_text(encoding="utf-8"))
    assert manifest["version"] == "0.2.1"
    assert len(manifest["sha256"]) == 64
