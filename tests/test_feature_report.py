from __future__ import annotations

import json
from pathlib import Path

import pytest

from tools.feature_report import (
    BrowserIndex,
    JUnitIndex,
    evaluate,
    load_features,
    markdown_report,
    parse_feature,
    report_payload,
)

ROOT = Path(__file__).parents[1]


def write_feature(root: Path) -> Path:
    feature = root / "features/capability.feature"
    feature.parent.mkdir(parents=True)
    feature.write_text(
        """@id:capability @area:studio @maturity:stable
@source:engine/capability.py @doc:docs/capability.md
Feature: Evidence-backed capability

  @python:tests/test_capability.py
  Scenario: The backend contract is enforced
    Given a persisted capability
    When the backend validates it
    Then invalid state is rejected

  @frontend:frontend/tests/capability.test.tsx
  Scenario: The user can see its state
    Given the capability is loaded
    When the workspace is rendered
    Then its state is visible

  @browser:tests/browser/capability.mjs
  Scenario: The complete journey works
    Given the real local API is running
    When the browser completes the journey
    Then the result survives a reload
""",
        encoding="utf-8",
    )
    for relative in (
        "engine/capability.py",
        "docs/capability.md",
        "tests/test_capability.py",
        "frontend/tests/capability.test.tsx",
        "tests/browser/capability.mjs",
    ):
        path = root / relative
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text("evidence", encoding="utf-8")
    return feature


def write_junit(path: Path, classname: str, *, failed: bool = False) -> None:
    failure = '<failure message="boom" />' if failed else ""
    path.write_text(
        (
            '<testsuite tests="1">'
            f'<testcase classname="{classname}" name="contract">{failure}</testcase>'
            "</testsuite>"
        ),
        encoding="utf-8",
    )


def test_gherkin_feature_is_the_executable_product_inventory(tmp_path: Path) -> None:
    path = write_feature(tmp_path)

    feature = parse_feature(path)

    assert feature.id == "capability"
    assert feature.maturity == "stable"
    assert [scenario.name for scenario in feature.scenarios] == [
        "The backend contract is enforced",
        "The user can see its state",
        "The complete journey works",
    ]


def test_report_combines_python_frontend_and_browser_evidence(tmp_path: Path) -> None:
    write_feature(tmp_path)
    python_junit = tmp_path / "python.xml"
    frontend_junit = tmp_path / "frontend.xml"
    browser_results = tmp_path / "browser.json"
    write_junit(python_junit, "tests.test_capability")
    write_junit(frontend_junit, "tests/capability.test.tsx")
    browser_results.write_text(
        json.dumps(
            {
                "schema_version": 1,
                "scenarios": [
                    {"path": "tests/browser/capability.mjs", "status": "passed"}
                ],
            }
        ),
        encoding="utf-8",
    )

    results = evaluate(
        load_features(tmp_path / "features"),
        root=tmp_path,
        python=JUnitIndex([python_junit]),
        frontend=JUnitIndex([frontend_junit]),
        browser=BrowserIndex(browser_results),
        gates={"python": "success", "frontend": "success", "browser": "success"},
    )

    assert results[0].status == "verified"
    assert report_payload(results)["summary"] == {
        "total": 1,
        "verified": 1,
        "failed": 0,
        "not_run": 0,
        "missing": 0,
    }
    assert "1/1 features verified" in markdown_report(results)


def test_failed_test_is_visible_in_feature_status(tmp_path: Path) -> None:
    write_feature(tmp_path)
    python_junit = tmp_path / "python.xml"
    write_junit(python_junit, "tests.test_capability", failed=True)

    results = evaluate(
        load_features(tmp_path / "features"),
        root=tmp_path,
        python=JUnitIndex([python_junit]),
        frontend=JUnitIndex([]),
        browser=BrowserIndex(None),
        gates={},
    )

    assert results[0].status == "failed"
    assert "failing test" in markdown_report(results)


def test_scenario_requires_given_when_then_and_automated_evidence(tmp_path: Path) -> None:
    feature = tmp_path / "invalid.feature"
    feature.write_text(
        """@id:invalid @area:ci @maturity:stable
Feature: Invalid feature
  Scenario: No evidence or complete grammar
    Given a contract
    Then it fails
""",
        encoding="utf-8",
    )

    with pytest.raises(ValueError, match="automated evidence"):
        parse_feature(feature)


def test_repository_catalog_references_versioned_product_evidence() -> None:
    features = load_features(ROOT / "features")

    assert len(features) >= 20
    assert sum(len(feature.scenarios) for feature in features) >= 40
    for feature in features:
        assert feature.sources
        assert feature.documentation
        for relative in (*feature.sources, *feature.documentation):
            assert (ROOT / relative).is_file(), f"Missing catalog reference: {relative}"
        for scenario in feature.scenarios:
            for evidence in scenario.evidence:
                assert (ROOT / evidence.path).is_file(), (
                    f"Missing scenario evidence: {evidence.path}"
                )
