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
    bundled_workflows = bundle / "workflows" / "local"
    bundled_workflows.mkdir(parents=True)
    (bundled_workflows / "keyframe.profile.json").write_text(
        '{"id":"bundled"}',
        encoding="utf-8",
    )
    (bundled_workflows / "video.profile.json").write_text(
        '{"id":"bundled-video"}',
        encoding="utf-8",
    )
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
    assert (runtime / "workflows" / "local" / "video.profile.json").read_text(
        encoding="utf-8"
    ) == '{"id":"bundled-video"}'


def test_desktop_spec_bundles_ready_to_run_local_workflows() -> None:
    spec = Path("tools/serre_studio.spec").read_text(encoding="utf-8")

    assert '"workflows" / "local", "workflows/local"' in spec
