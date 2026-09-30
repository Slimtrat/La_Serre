from __future__ import annotations

from pathlib import Path

import pytest

from tools.browser_setup_harness import BrowserSetupHarness


@pytest.mark.asyncio
async def test_browser_setup_harness_uses_real_persistent_manager_without_external_io(
    tmp_path: Path,
) -> None:
    harness = BrowserSetupHarness(tmp_path / "output", tmp_path / "workflows")
    manager = harness.manager()

    blocked = await manager.wait(manager.start().id)

    assert blocked.status == "awaiting_license"
    assert harness.downloader.calls == []
    assert harness.process_runner.calls == []

    resumed = manager.resume(
        blocked.id,
        accepted_license_ids={"browser-fixture-license"},
    )
    completed = await manager.wait(resumed.id)

    assert completed.status == "completed"
    assert completed.accepted_license_ids == ["browser-fixture-license"]
    assert len(harness.downloader.calls) == 1
    assert harness.process_runner.calls == [["browser-smoke", "keyframe-sdxl"]]
    assert harness.snapshot()["model_installed"] is True
    assert len(harness.snapshot()["state_files"]) == 1

    restarted = BrowserSetupHarness(tmp_path / "output", tmp_path / "workflows")
    restored = restarted.manager().get(completed.id)
    report = restarted.manager().validation_report(
        restored.id,
        application_version="browser-test",
        hardware=restarted.hardware,
    )

    assert restored.status == "completed"
    assert report.result == "passed"
    assert report.initial_prerequisites[0].state == "missing"
    assert restarted.downloader.calls == []
    assert restarted.process_runner.calls == []

