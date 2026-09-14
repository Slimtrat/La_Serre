from __future__ import annotations

import re
import textwrap
from pathlib import Path

WORKFLOW = Path(".github/workflows/pr-e2e-mock-sticky-comment.yml")
MARKER = "<!-- serre-studio:e2e-mock-generation -->"
E2E_COMMAND = (
    "python -m pytest -q tests/test_e2e_mock_generation.py "
    "tests/test_production_queue.py tests/test_episode_pipeline.py"
)


def workflow_text() -> str:
    assert WORKFLOW.is_file(), "Le workflow de commentaire E2E doit être versionné"
    return WORKFLOW.read_text(encoding="utf-8")


def test_sticky_comment_uses_a_safe_pull_request_target_contract() -> None:
    source = workflow_text()

    assert re.search(r"(?m)^\s*pull_request_target:\s*$", source)
    permissions = re.search(
        r"(?ms)^permissions:\s*\n(?P<body>(?:^[ \t]+[^\n]+\n?)+)", source
    )
    assert permissions is not None
    grants = {
        line.strip()
        for line in permissions.group("body").splitlines()
        if line.strip()
    }
    assert grants == {"contents: read", "checks: read", "pull-requests: write"}
    assert re.search(r"(?m)^\s*workflow_run:\s*$", source)
    assert 'workflows: ["Windows desktop CI"]' in source

    forbidden_execution = (
        "actions/checkout",
        "github.event.pull_request.head.repo",
        "github.event.pull_request.head.ref",
        "subprocess",
        "os.system",
        "os.popen",
        "Popen(",
        "eval(",
        "exec(",
        "pip install",
        "npm ",
    )
    assert not any(token in source for token in forbidden_execution)
    assert len(re.findall(r"(?m)^\s+run:\s*\|$", source)) == 1
    assert "python - <<'PY'" in source
    assert "/check-runs?per_page=100" in source


def test_sticky_comment_has_one_marker_and_true_patch_or_post_upsert() -> None:
    source = workflow_text()

    assert source.count(MARKER) == 1
    assert 'method="PATCH"' in source
    assert 'method="POST"' in source
    assert re.search(r"if\s+existing\s*:", source)
    assert re.search(r"else\s*:", source)
    assert "comments?per_page=100" in source
    assert 'rel="next"' in source
    assert 'github-actions[bot]' in source


def test_sticky_comment_publishes_the_exact_maintainer_command_as_text_only() -> None:
    source = workflow_text()

    assert source.count(E2E_COMMAND) == 1
    assert f"`{E2E_COMMAND}`" in source
    assert "urllib.request" in source
    assert not re.search(rf"(?m)^\s*{re.escape(E2E_COMMAND)}\s*$", source)


def test_embedded_summary_script_is_valid_python() -> None:
    source = workflow_text()
    match = re.search(r"python - <<'PY'\n(?P<body>.*?)\n\s+PY", source, re.DOTALL)
    assert match is not None
    compile(textwrap.dedent(match.group("body")), "<integration-summary>", "exec")
