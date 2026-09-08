from __future__ import annotations

import argparse
import asyncio
import json
from pathlib import Path
from typing import Any

from engine.narrative.tasks import DEFAULT_TASK_REGISTRY, TaskContext
from engine.narrative.tasks.provider import FakeTaskProvider

DEFAULT_FIXTURE = (
    Path(__file__).parents[1]
    / "tests"
    / "fixtures"
    / "narrative_tasks"
    / "belladone_aconit_v1.json"
)


def evaluate_fixture(path: Path) -> list[dict[str, object]]:
    fixture = json.loads(path.read_text(encoding="utf-8-sig"))
    return asyncio.run(_evaluate_fixture(fixture))


async def _evaluate_fixture(fixture: dict[str, Any]) -> list[dict[str, object]]:
    shared = fixture.get("shared_context", {})
    cases = fixture.get("cases", [])
    outputs = {f"{case['task_id']}@{case.get('task_version', 1)}": case["output"] for case in cases}
    provider = FakeTaskProvider(outputs)
    report: list[dict[str, object]] = []
    for case in cases:
        task_id = str(case["task_id"])
        version = int(case.get("task_version", 1))
        spec = DEFAULT_TASK_REGISTRY.get(task_id, version)
        context: dict[str, Any] = {**shared, **case.get("context", {})}
        execution = await provider.execute(
            spec.compile(TaskContext(context)),
            model="fake:ci",
            contract=spec.contract,
        )
        report.append({**execution.metadata(), "contract": spec.contract.__name__, "valid": True})
    return report


def main() -> int:
    parser = argparse.ArgumentParser(description="Evaluate versioned narrative TaskSpecs")
    parser.add_argument("--provider", choices=("fake",), default="fake")
    parser.add_argument("--fixture", type=Path, default=DEFAULT_FIXTURE)
    args = parser.parse_args()
    report = evaluate_fixture(args.fixture)
    print(json.dumps({"cases": report, "passed": len(report)}, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
