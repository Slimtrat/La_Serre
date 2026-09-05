from __future__ import annotations

import os
import sys
from pathlib import Path

import pytest

from apps.desktop.runtime import prepare_runtime_directory


def test_desktop_runtime_installs_missing_workflows_without_overwriting_custom_profiles(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    bundle = tmp_path / "bundle"
    bundle.mkdir()
    runtime = tmp_path / "runtime"
    custom = runtime / "workflows" / "local" / "keyframe.profile.json"
    custom.parent.mkdir(parents=True)
    custom.write_text('{"id":"custom"}', encoding="utf-8")
    monkeypatch.setattr(sys, "_MEIPASS", str(bundle), raising=False)
    original = Path.cwd()

    try:
        prepare_runtime_directory(runtime)
    finally:
        os.chdir(original)

    assert custom.read_text(encoding="utf-8") == '{"id":"custom"}'
    local = runtime / "workflows" / "local"
    expected = {
        "keyframe.api.json",
        "keyframe.profile.json",
        "keyframe-guide.api.json",
        "keyframe-guide.profile.json",
        "video.api.json",
        "video.profile.json",
        "models.required.json",
    }
    assert expected <= {path.name for path in local.iterdir()}
    assert '"generated-ltx-i2v-2b-v1"' in (local / "video.profile.json").read_text(
        encoding="utf-8"
    )


def test_desktop_spec_does_not_bundle_machine_local_workflows() -> None:
    spec = Path("tools/serre_studio.spec").read_text(encoding="utf-8")

    assert '"workflows" / "local", "workflows/local"' not in spec
    assert '"starter_catalog", "starter_catalog"' in spec
    assert 'collect_all("pystray")' in spec
    assert 'collect_all("PIL")' in spec
