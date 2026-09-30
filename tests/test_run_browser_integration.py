from __future__ import annotations

import json
import re
import subprocess
from collections.abc import Iterator
from pathlib import Path
from typing import Any

import pytest

from tools import run_browser_integration as runner

SCENARIOS = (
    "tests/browser/guided_casting_integration.mjs",
    "tests/browser/season_board_smoke.mjs",
)


def test_default_scenarios_cover_every_browser_feature_evidence() -> None:
    catalog_paths = {
        path
        for feature in Path("features").rglob("*.feature")
        for path in re.findall(r"@browser:([^\s]+)", feature.read_text(encoding="utf-8"))
    }

    assert catalog_paths <= {path.as_posix() for path in runner.DEFAULT_SCENARIOS}


def test_local_playwright_module_uses_override_or_frontend_install(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setenv("PLAYWRIGHT_MODULE", "D:/shared/playwright.js")
    assert runner._playwright_module(tmp_path) == "D:/shared/playwright.js"

    monkeypatch.delenv("PLAYWRIGHT_MODULE")
    local_entry = tmp_path / "frontend" / "node_modules" / "playwright" / "index.js"
    local_entry.parent.mkdir(parents=True)
    local_entry.write_text("module.exports = {};", encoding="utf-8")
    assert runner._playwright_module(tmp_path) == str(local_entry.resolve())


def _run(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
    outcomes: Iterator[subprocess.CompletedProcess[str] | subprocess.TimeoutExpired],
) -> tuple[int, dict[str, Any], Path]:
    artifacts = tmp_path / "browser-evidence"
    monkeypatch.setattr(runner.subprocess, "Popen", lambda *args, **kwargs: object())
    monkeypatch.setattr(runner, "_wait_until_ready", lambda *args, **kwargs: None)
    monkeypatch.setattr(runner, "_stop", lambda process: None)

    def execute(*args: object, **kwargs: object) -> subprocess.CompletedProcess[str]:
        outcome = next(outcomes)
        if isinstance(outcome, subprocess.TimeoutExpired):
            raise outcome
        return outcome

    monkeypatch.setattr(runner.subprocess, "run", execute)
    arguments = ["--artifacts", str(artifacts), "--port", "9876", "--timeout", "2"]
    for scenario in SCENARIOS:
        arguments.extend(("--scenario", scenario))
    return_code = runner.main(arguments)
    payload = json.loads((artifacts / "browser-results.json").read_text(encoding="utf-8"))
    return return_code, payload, artifacts


def test_runner_writes_passed_machine_readable_results(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    outcomes = iter(
        (
            subprocess.CompletedProcess(["node"], 0, "first passed", ""),
            subprocess.CompletedProcess(["node"], 0, "second passed", ""),
        )
    )

    return_code, payload, artifacts = _run(tmp_path, monkeypatch, outcomes)

    assert return_code == 0
    assert payload["schema_version"] == 1
    assert payload["status"] == "passed"
    assert [item["path"] for item in payload["scenarios"]] == list(SCENARIOS)
    assert [item["status"] for item in payload["scenarios"]] == ["passed", "passed"]
    assert [item["return_code"] for item in payload["scenarios"]] == [0, 0]
    assert all(item["duration_seconds"] >= 0 for item in payload["scenarios"])
    assert "first passed" in (artifacts / "playwright.log").read_text(encoding="utf-8")


def test_runner_collects_remaining_scenarios_after_a_failure(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    outcomes = iter(
        (
            subprocess.CompletedProcess(["node"], 7, "", "first failed"),
            subprocess.CompletedProcess(["node"], 0, "second passed", ""),
        )
    )

    return_code, payload, artifacts = _run(tmp_path, monkeypatch, outcomes)

    assert return_code == 7
    assert payload["status"] == "failed"
    assert [item["status"] for item in payload["scenarios"]] == ["failed", "passed"]
    assert [item["return_code"] for item in payload["scenarios"]] == [7, 0]
    log = (artifacts / "playwright.log").read_text(encoding="utf-8")
    assert "first failed" in log
    assert "second passed" in log


def test_runner_records_timeout_and_preserves_timeout_exit_code(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    outcomes = iter(
        (
            subprocess.TimeoutExpired(["node"], 2, output="partial", stderr="timed out"),
            subprocess.CompletedProcess(["node"], 0, "second passed", ""),
        )
    )

    return_code, payload, artifacts = _run(tmp_path, monkeypatch, outcomes)

    assert return_code == 124
    assert payload["status"] == "timeout"
    assert [item["status"] for item in payload["scenarios"]] == ["timeout", "passed"]
    assert [item["return_code"] for item in payload["scenarios"]] == [124, 0]
    assert "TIMEOUT after 2 seconds" in (artifacts / "playwright.log").read_text(
        encoding="utf-8"
    )


def test_runner_leaves_complete_failure_evidence_when_server_startup_fails(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    artifacts = tmp_path / "browser-evidence"
    monkeypatch.setattr(runner.subprocess, "Popen", lambda *args, **kwargs: object())
    monkeypatch.setattr(
        runner,
        "_wait_until_ready",
        lambda *args, **kwargs: (_ for _ in ()).throw(RuntimeError("server failed")),
    )
    monkeypatch.setattr(runner, "_stop", lambda process: None)
    arguments = ["--artifacts", str(artifacts), "--port", "9876"]
    for scenario in SCENARIOS:
        arguments.extend(("--scenario", scenario))

    with pytest.raises(RuntimeError, match="server failed"):
        runner.main(arguments)

    payload = json.loads((artifacts / "browser-results.json").read_text(encoding="utf-8"))
    assert payload["status"] == "failed"
    assert [item["path"] for item in payload["scenarios"]] == list(SCENARIOS)
    assert [item["status"] for item in payload["scenarios"]] == ["failed", "failed"]
    assert [item["return_code"] for item in payload["scenarios"]] == [1, 1]
