"""Run the real Hiva guided narrative pipeline in an isolated local project.

The five AI stages remain review-only. This script never approves or publishes
canonical story content, and visual recipes are not mistaken for rendered media.
"""

from __future__ import annotations

import argparse
import asyncio
import json
from pathlib import Path

from engine.config import Settings
from engine.narrative.guided_authoring import GuidedAuthoringRegistry, GuidedProjectBrief
from engine.narrative.guided_autopilot import (
    GuidedAutopilotRegistry,
    execute_guided_autopilot,
)
from tools.run_local_narrative_smoke import ROOT, _seed_bible


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--root",
        type=Path,
        default=ROOT / "artifacts" / "hiva-full-pipeline",
    )
    parser.add_argument("--model", default="qwen3:4b")
    args = parser.parse_args()
    root = args.root.resolve()
    if root.exists() and any(root.iterdir()):
        raise SystemExit(f"Le dossier de sortie existe déjà : {root}")
    example = json.loads(
        (ROOT / "starter_catalog/story-examples/hiva-forest-magic.json").read_text(encoding="utf-8")
    )
    settings = Settings(
        _env_file=None,
        private_content_dir=root / "private",
        output_dir=root / "output",
        downloads_dir=root / "downloads",
        ollama_model=args.model,
        ollama_url="http://127.0.0.1:11434",
    )
    _seed_bible(example["id"], settings.private_content_dir)
    guided = GuidedAuthoringRegistry(settings.private_content_dir)
    brief = GuidedProjectBrief.model_validate(
        {
            **example["brief"],
            "source_example_id": example["id"],
            "learning_goals": example["learning_goals"],
            "continuity_notes": example["continuity_notes"],
        }
    )
    state = guided.load()
    state = guided.save(
        state.model_copy(update={"brief": brief}),
        expected_revision=state.revision,
    )
    registry = GuidedAutopilotRegistry(settings.private_content_dir)
    run = registry.create(
        base_revision=state.revision,
        locale="fr",
        model=args.model,
        custom_prompt=(
            "Un seul premier épisode pour ce test. Hiva garde ses ailes noires. "
            "Miran est un homme et un magicien aux pouvoirs limités. "
            "Respecte les IDs canoniques hiva, miran et forest_house. "
            "Aucun contenu d'une autre franchise."
        ),
    )
    asyncio.run(execute_guided_autopilot(run.id, settings))
    final = registry.get(run.id)
    print(f"Parcours : {final.status}; dossier : {root}")
    for stage in final.stages:
        print(f"- {stage.id}: {stage.status}; {stage.summary or stage.error or ''}")
    if final.status != "completed":
        raise SystemExit(1)


if __name__ == "__main__":
    main()
