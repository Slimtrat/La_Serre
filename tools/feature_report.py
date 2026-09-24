from __future__ import annotations

import argparse
import json
import re
import xml.etree.ElementTree as ET
from collections import Counter
from collections.abc import Sequence
from dataclasses import dataclass, field
from pathlib import Path
from typing import Literal

EvidenceKind = Literal["python", "frontend", "browser"]
ResultStatus = Literal["verified", "failed", "not_run", "missing"]
EVIDENCE_KINDS: tuple[EvidenceKind, ...] = ("python", "frontend", "browser")
MATURITIES = {"stable", "beta", "experimental"}
TAG_PATTERN = re.compile(r"^@(?P<key>[a-z][a-z0-9_-]*):(?P<value>\S+)$")
FEATURE_PREFIXES = ("Fonctionnalité:", "Feature:")
SCENARIO_PREFIXES = ("Scénario:", "Scenario:")
GIVEN_PREFIXES = ("Étant donné ", "Etant donné ", "Soit ", "Given ")
WHEN_PREFIXES = ("Quand ", "When ")
THEN_PREFIXES = ("Alors ", "Then ")


def write_text_atomic(path: Path, content: str) -> None:
    """Write reports without importing the application runtime or third-party packages."""

    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(content, encoding="utf-8")
    temporary.replace(path)


@dataclass(frozen=True, slots=True)
class Evidence:
    kind: EvidenceKind
    path: str


@dataclass(slots=True)
class Scenario:
    name: str
    tags: dict[str, list[str]]
    steps: list[str] = field(default_factory=list)

    @property
    def evidence(self) -> list[Evidence]:
        return [
            Evidence(kind=kind, path=path)
            for kind in EVIDENCE_KINDS
            for path in self.tags.get(kind, [])
        ]


@dataclass(frozen=True, slots=True)
class ProductFeature:
    id: str
    title: str
    area: str
    maturity: str
    source_file: Path
    sources: tuple[str, ...]
    documentation: tuple[str, ...]
    scenarios: tuple[Scenario, ...]


@dataclass(frozen=True, slots=True)
class EvidenceResult:
    kind: EvidenceKind
    path: str
    status: ResultStatus
    detail: str


@dataclass(frozen=True, slots=True)
class ScenarioResult:
    name: str
    status: ResultStatus
    evidence: tuple[EvidenceResult, ...]


@dataclass(frozen=True, slots=True)
class FeatureResult:
    feature: ProductFeature
    status: ResultStatus
    scenarios: tuple[ScenarioResult, ...]
    gaps: tuple[str, ...]


def _tag_values(tokens: list[str], *, source: Path, line: int) -> dict[str, list[str]]:
    result: dict[str, list[str]] = {}
    for token in tokens:
        match = TAG_PATTERN.fullmatch(token)
        if match is None:
            raise ValueError(f"Invalid Gherkin tag in {source}:{line}: {token}")
        result.setdefault(match.group("key"), []).append(match.group("value"))
    return result


def _merge_tags(*groups: dict[str, list[str]]) -> dict[str, list[str]]:
    merged: dict[str, list[str]] = {}
    for group in groups:
        for key, values in group.items():
            merged.setdefault(key, []).extend(values)
    return merged


def _one(tags: dict[str, list[str]], key: str, source: Path) -> str:
    values = tags.get(key, [])
    if len(values) != 1:
        raise ValueError(f"{source} must declare exactly one @{key}:... tag")
    return values[0]


def parse_feature(path: Path) -> ProductFeature:
    pending: dict[str, list[str]] = {}
    feature_tags: dict[str, list[str]] | None = None
    title: str | None = None
    scenarios: list[Scenario] = []
    active: Scenario | None = None

    for number, raw in enumerate(path.read_text(encoding="utf-8-sig").splitlines(), start=1):
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        if line.startswith("@"):
            pending = _merge_tags(
                pending,
                _tag_values(line.split(), source=path, line=number),
            )
            continue
        feature_prefix = next(
            (prefix for prefix in FEATURE_PREFIXES if line.startswith(prefix)), None
        )
        if feature_prefix is not None:
            if title is not None:
                raise ValueError(f"Only one feature is allowed per file: {path}")
            title = line.removeprefix(feature_prefix).strip()
            feature_tags = pending
            pending = {}
            continue
        scenario_prefix = next(
            (prefix for prefix in SCENARIO_PREFIXES if line.startswith(prefix)), None
        )
        if scenario_prefix is not None:
            if feature_tags is None:
                raise ValueError(f"Scenario declared before Feature in {path}:{number}")
            active = Scenario(
                name=line.removeprefix(scenario_prefix).strip(),
                tags=_merge_tags(feature_tags, pending),
            )
            scenarios.append(active)
            pending = {}
            continue
        if active is not None and line.startswith(
            (*GIVEN_PREFIXES, *WHEN_PREFIXES, *THEN_PREFIXES, "Et ", "And ", "Mais ", "But ")
        ):
            active.steps.append(line)

    if title is None or feature_tags is None:
        raise ValueError(f"Missing Gherkin Feature: {path}")
    if pending:
        raise ValueError(f"Tags are not attached to a Feature or Scenario in {path}")
    if not scenarios:
        raise ValueError(f"No Scenario declared in {path}")
    identifier = _one(feature_tags, "id", path)
    area = _one(feature_tags, "area", path)
    maturity = _one(feature_tags, "maturity", path)
    if not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", identifier):
        raise ValueError(f"Invalid feature identifier in {path}: {identifier}")
    if maturity not in MATURITIES:
        raise ValueError(f"Invalid maturity in {path}: {maturity}")
    for scenario in scenarios:
        if not scenario.evidence:
            raise ValueError(f"Scenario '{scenario.name}' has no automated evidence")
        if not any(step.startswith(GIVEN_PREFIXES) for step in scenario.steps):
            raise ValueError(f"Scenario '{scenario.name}' has no Given step")
        if not any(step.startswith(WHEN_PREFIXES) for step in scenario.steps):
            raise ValueError(f"Scenario '{scenario.name}' has no When step")
        if not any(step.startswith(THEN_PREFIXES) for step in scenario.steps):
            raise ValueError(f"Scenario '{scenario.name}' has no Then step")
    return ProductFeature(
        id=identifier,
        title=title,
        area=area,
        maturity=maturity,
        source_file=path,
        sources=tuple(feature_tags.get("source", [])),
        documentation=tuple(feature_tags.get("doc", [])),
        scenarios=tuple(scenarios),
    )


def load_features(directory: Path) -> list[ProductFeature]:
    paths = sorted(directory.rglob("*.feature"))
    if not paths:
        raise ValueError(f"No .feature file found in {directory}")
    features = [parse_feature(path) for path in paths]
    identifiers = [feature.id for feature in features]
    duplicates = sorted(item for item, count in Counter(identifiers).items() if count > 1)
    if duplicates:
        raise ValueError("Duplicate feature identifiers: " + ", ".join(duplicates))
    return features


def _normalized(value: str) -> str:
    return value.casefold().replace("\\", "/")


class JUnitIndex:
    def __init__(self, reports: Sequence[Path]) -> None:
        self.cases: list[tuple[str, str]] = []
        for report in reports:
            if not report.is_file():
                continue
            root = ET.parse(report).getroot()
            for case in root.iter("testcase"):
                context = " ".join(str(value) for value in case.attrib.values())
                status = (
                    "failed"
                    if case.find("failure") is not None or case.find("error") is not None
                    else "skipped"
                    if case.find("skipped") is not None
                    else "passed"
                )
                self.cases.append((_normalized(context), status))

    def result(self, path: str) -> tuple[ResultStatus, str]:
        normalized = _normalized(path)
        without_frontend = normalized.removeprefix("frontend/")
        module = normalized.removesuffix(".py").replace("/", ".")
        candidates = (normalized, without_frontend, module)
        matches = [
            status
            for context, status in self.cases
            if any(item in context for item in candidates)
        ]
        if not matches:
            return "not_run", "no matching test in the JUnit report"
        if "failed" in matches:
            return "failed", f"{matches.count('failed')} failing test(s)"
        passed = matches.count("passed")
        if passed:
            return "verified", f"{passed} passing test(s)"
        return "not_run", "matching tests were skipped"


class BrowserIndex:
    def __init__(self, report: Path | None) -> None:
        self.results: dict[str, str] = {}
        if report is None or not report.is_file():
            return
        payload = json.loads(report.read_text(encoding="utf-8"))
        scenarios = payload.get("scenarios") if isinstance(payload, dict) else None
        if not isinstance(scenarios, list):
            return
        for item in scenarios:
            if not isinstance(item, dict):
                continue
            path = item.get("path")
            status = item.get("status")
            if isinstance(path, str) and isinstance(status, str):
                self.results[_normalized(path)] = status

    def result(self, path: str) -> tuple[ResultStatus, str]:
        status = self.results.get(_normalized(path))
        if status == "passed":
            return "verified", "browser scenario passed"
        if status in {"failed", "timeout"}:
            return "failed", f"browser scenario {status}"
        return "not_run", "scenario missing from the browser report"


def _combine(statuses: Sequence[ResultStatus]) -> ResultStatus:
    for status in ("missing", "failed", "not_run"):
        if status in statuses:
            return status
    return "verified"


def evaluate(
    features: Sequence[ProductFeature],
    *,
    root: Path,
    python: JUnitIndex,
    frontend: JUnitIndex,
    browser: BrowserIndex,
    gates: dict[str, str],
) -> list[FeatureResult]:
    results: list[FeatureResult] = []
    indexes = {"python": python, "frontend": frontend}
    for feature in features:
        gaps = [
            f"missing file: {path}"
            for path in (*feature.sources, *feature.documentation)
            if not (root / path).is_file()
        ]
        scenario_results: list[ScenarioResult] = []
        for scenario in feature.scenarios:
            evidence_results: list[EvidenceResult] = []
            for evidence in scenario.evidence:
                if not (root / evidence.path).is_file():
                    status: ResultStatus = "missing"
                    detail = "evidence file is missing"
                elif gates.get(evidence.kind) not in {None, "success"}:
                    gate = gates[evidence.kind]
                    status = "failed" if gate == "failure" else "not_run"
                    detail = f"CI gate {evidence.kind}={gate}"
                elif evidence.kind == "browser":
                    status, detail = browser.result(evidence.path)
                else:
                    status, detail = indexes[evidence.kind].result(evidence.path)
                evidence_results.append(
                    EvidenceResult(
                        kind=evidence.kind,
                        path=evidence.path,
                        status=status,
                        detail=detail,
                    )
                )
            scenario_results.append(
                ScenarioResult(
                    name=scenario.name,
                    status=_combine([item.status for item in evidence_results]),
                    evidence=tuple(evidence_results),
                )
            )
        feature_statuses = [item.status for item in scenario_results]
        if gaps:
            feature_statuses.append("missing")
        results.append(
            FeatureResult(
                feature=feature,
                status=_combine(feature_statuses),
                scenarios=tuple(scenario_results),
                gaps=tuple(gaps),
            )
        )
    return results


def report_payload(results: Sequence[FeatureResult]) -> dict[str, object]:
    counts = Counter(item.status for item in results)

    def source_label(path: Path) -> str:
        try:
            return path.resolve().relative_to(Path.cwd().resolve()).as_posix()
        except ValueError:
            return path.name

    return {
        "schema_version": 1,
        "summary": {
            "total": len(results),
            "verified": counts["verified"],
            "failed": counts["failed"],
            "not_run": counts["not_run"],
            "missing": counts["missing"],
        },
        "features": [
            {
                "id": item.feature.id,
                "title": item.feature.title,
                "area": item.feature.area,
                "maturity": item.feature.maturity,
                "status": item.status,
                "source_file": source_label(item.feature.source_file),
                "gaps": list(item.gaps),
                "scenarios": [
                    {
                        "name": scenario.name,
                        "status": scenario.status,
                        "evidence": [
                            {
                                "kind": evidence.kind,
                                "path": evidence.path,
                                "status": evidence.status,
                                "detail": evidence.detail,
                            }
                            for evidence in scenario.evidence
                        ],
                    }
                    for scenario in item.scenarios
                ],
            }
            for item in results
        ],
    }


def markdown_report(results: Sequence[FeatureResult]) -> str:
    icons = {
        "verified": "✅",
        "failed": "❌",
        "not_run": "⏳",
        "missing": "🧩",
    }
    counts = Counter(item.status for item in results)
    lines = [
        "# 🌿 Product feature readiness",
        "",
        (
            f"**{counts['verified']}/{len(results)} features verified** · "
            f"{counts['failed']} failed · {counts['not_run']} not run · "
            f"{counts['missing']} missing evidence"
        ),
        "",
        "| Area | Feature | Maturity | Scenarios | Status |",
        "| --- | --- | --- | ---: | --- |",
    ]
    for item in sorted(results, key=lambda row: (row.feature.area, row.feature.title)):
        verified = sum(scenario.status == "verified" for scenario in item.scenarios)
        lines.append(
            f"| {item.feature.area} | {item.feature.title} | `{item.feature.maturity}` | "
            f"{verified}/{len(item.scenarios)} | {icons[item.status]} `{item.status}` |"
        )
    incomplete = [item for item in results if item.status != "verified"]
    if incomplete:
        lines.extend(("", "## Needs attention", ""))
        for item in incomplete:
            details = list(item.gaps)
            details.extend(
                f"{scenario.name}: "
                + "; ".join(
                    f"{evidence.path} ({evidence.detail})"
                    for evidence in scenario.evidence
                    if evidence.status != "verified"
                )
                for scenario in item.scenarios
                if scenario.status != "verified"
            )
            lines.append(f"- **{item.feature.title}** — " + " · ".join(details))
    lines.extend(
        (
            "",
            "> Generated from `features/**/*.feature` Gherkin contracts and the JUnit/browser "
            "evidence produced for this revision.",
            "",
        )
    )
    return "\n".join(lines)


def parser() -> argparse.ArgumentParser:
    result = argparse.ArgumentParser(description="Build the CI product feature readiness report.")
    result.add_argument("--features", type=Path, default=Path("features"))
    result.add_argument("--python-junit", action="append", type=Path, default=[])
    result.add_argument("--frontend-junit", action="append", type=Path, default=[])
    result.add_argument("--browser-results", type=Path)
    result.add_argument("--gate", action="append", default=[])
    result.add_argument("--markdown", type=Path, required=True)
    result.add_argument("--json", type=Path, required=True)
    result.add_argument("--strict", action="store_true")
    return result


def main(argv: Sequence[str] | None = None) -> int:
    args = parser().parse_args(argv)
    root = Path.cwd().resolve()
    features_dir = (root / args.features).resolve()
    features = load_features(features_dir)
    gates: dict[str, str] = {}
    for raw in args.gate:
        key, separator, value = raw.partition("=")
        if not separator or key not in {"python", "frontend", "browser"}:
            raise ValueError(f"Invalid gate: {raw}")
        gates[key] = value
    results = evaluate(
        features,
        root=root,
        python=JUnitIndex(args.python_junit),
        frontend=JUnitIndex(args.frontend_junit),
        browser=BrowserIndex(args.browser_results),
        gates=gates,
    )
    payload = report_payload(results)
    write_text_atomic(args.json, json.dumps(payload, ensure_ascii=False, indent=2) + "\n")
    write_text_atomic(args.markdown, markdown_report(results))
    summary = payload["summary"]
    assert isinstance(summary, dict)
    print(
        f"Feature readiness: {summary['verified']}/{summary['total']} verified; "
        f"report={args.markdown}"
    )
    return int(args.strict and any(item.status != "verified" for item in results))


if __name__ == "__main__":
    raise SystemExit(main())
