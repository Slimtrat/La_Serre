from __future__ import annotations

import re
from pathlib import Path

WORKFLOW = Path(".github/workflows/windows-desktop.yml")


def workflow_text() -> str:
    assert WORKFLOW.is_file(), "Le workflow Windows doit être versionné"
    return WORKFLOW.read_text(encoding="utf-8")


def test_quality_gate_runs_for_pull_requests_and_develop_pushes() -> None:
    source = workflow_text()

    assert re.search(r"(?m)^  pull_request:\s*$", source)
    assert source.count("branches: [main, develop]") == 2
    assert '"tests/**"' in source
    assert '"workflows/**"' in source
    assert "cancel-in-progress:" in source


def test_quality_gate_runs_the_complete_automated_contract() -> None:
    source = workflow_text()

    assert "ruff check ." in source
    assert "mypy engine apps tools" in source
    assert "node --check $source.FullName" in source
    assert "python -m pytest --junitxml=artifacts/test-results.xml" in source
    assert "--cov-report=xml:artifacts/coverage.xml" in source
    assert "actions/upload-artifact@v4" in source


def test_packaging_waits_for_quality_and_skips_pull_requests() -> None:
    source = workflow_text()

    build = source.split("\n  build:\n", maxsplit=1)[1]
    assert "needs: quality" in build
    assert "github.event_name == 'pull_request'" not in build
    assert "github.ref == 'refs/heads/main'" in build
    assert "python -m tools.build_desktop" in build
