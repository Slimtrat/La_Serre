from __future__ import annotations

import json
import threading
from datetime import UTC, datetime
from pathlib import Path
from typing import Literal
from uuid import uuid4

from pydantic import BaseModel, ConfigDict, Field

from engine.config import Settings
from engine.generation.comfy.workflow_templates import WorkflowTemplateCatalogue
from engine.narrative.episode_models import Episode, EpisodeStatus, EpisodeStory
from engine.narrative.guided_authoring import GuidedAuthoringRegistry
from engine.narrative.narrative_workflow import OllamaNarrativeAuthor
from engine.narrative.ollama import OllamaClient
from engine.production.artifacts import write_text_atomic
from engine.world.bible import BibleRegistry

AutopilotStageStatus = Literal["pending", "running", "completed", "failed"]
AutopilotRunStatus = Literal["queued", "running", "completed", "failed"]


class _AutopilotModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class GuidedAutopilotStage(_AutopilotModel):
    id: Literal[
        "direction",
        "architecture",
        "episode",
        "storyboard",
        "visual_pipeline",
    ]
    label: str
    status: AutopilotStageStatus = "pending"
    summary: str = ""
    candidate: dict[str, object] | None = None
    error: str | None = None
    started_at: datetime | None = None
    completed_at: datetime | None = None


class GuidedAutopilotRun(_AutopilotModel):
    id: str = Field(pattern=r"^[a-f0-9]{32}$")
    base_revision: int = Field(ge=0)
    status: AutopilotRunStatus = "queued"
    model: str | None = None
    locale: Literal["fr", "en"] = "fr"
    custom_prompt: str = ""
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    stages: list[GuidedAutopilotStage] = Field(default_factory=list)


def _default_stages() -> list[GuidedAutopilotStage]:
    return [
        GuidedAutopilotStage(id="direction", label="Direction éditoriale"),
        GuidedAutopilotStage(id="architecture", label="Architecture de série"),
        GuidedAutopilotStage(id="episode", label="Scénario du premier épisode"),
        GuidedAutopilotStage(id="storyboard", label="Storyboard en plans"),
        GuidedAutopilotStage(id="visual_pipeline", label="Chaîne visuelle"),
    ]


class GuidedAutopilotRegistry:
    _lock = threading.RLock()

    def __init__(self, private_root: Path) -> None:
        self.root = private_root.resolve() / ".guided" / "autopilot-runs"

    def create(
        self,
        *,
        base_revision: int,
        locale: Literal["fr", "en"],
        model: str | None,
        custom_prompt: str,
    ) -> GuidedAutopilotRun:
        run = GuidedAutopilotRun(
            id=uuid4().hex,
            base_revision=base_revision,
            locale=locale,
            model=model,
            custom_prompt=custom_prompt,
            stages=_default_stages(),
        )
        return self.save(run)

    def get(self, run_id: str) -> GuidedAutopilotRun:
        if not run_id or any(value not in "0123456789abcdef" for value in run_id):
            raise KeyError(run_id)
        path = self.root / f"{run_id}.json"
        if not path.is_file():
            raise KeyError(run_id)
        return GuidedAutopilotRun.model_validate_json(path.read_text(encoding="utf-8"))

    def latest(self) -> GuidedAutopilotRun | None:
        if not self.root.is_dir():
            return None
        paths = sorted(self.root.glob("*.json"), key=lambda path: path.stat().st_mtime)
        return self.get(paths[-1].stem) if paths else None

    def save(self, run: GuidedAutopilotRun) -> GuidedAutopilotRun:
        with self._lock:
            updated = run.model_copy(update={"updated_at": datetime.now(UTC)})
            write_text_atomic(
                self.root / f"{updated.id}.json",
                updated.model_dump_json(indent=2) + "\n",
            )
            return updated

    def start_stage(self, run_id: str, stage_id: str) -> GuidedAutopilotRun:
        return self._update_stage(run_id, stage_id, status="running")

    def complete_stage(
        self,
        run_id: str,
        stage_id: str,
        candidate: dict[str, object],
        summary: str,
    ) -> GuidedAutopilotRun:
        return self._update_stage(
            run_id,
            stage_id,
            status="completed",
            candidate=candidate,
            summary=summary,
        )

    def fail_stage(self, run_id: str, stage_id: str, error: str) -> GuidedAutopilotRun:
        return self._update_stage(run_id, stage_id, status="failed", error=error)

    def _update_stage(
        self,
        run_id: str,
        stage_id: str,
        *,
        status: AutopilotStageStatus,
        candidate: dict[str, object] | None = None,
        summary: str = "",
        error: str | None = None,
    ) -> GuidedAutopilotRun:
        with self._lock:
            run = self.get(run_id)
            now = datetime.now(UTC)
            stages = [
                stage.model_copy(
                    update={
                        "status": status,
                        "candidate": candidate if candidate is not None else stage.candidate,
                        "summary": summary or stage.summary,
                        "error": error,
                        "started_at": now if status == "running" else stage.started_at,
                        "completed_at": now if status in {"completed", "failed"} else None,
                    }
                )
                if stage.id == stage_id
                else stage
                for stage in run.stages
            ]
            run_status: AutopilotRunStatus = "running"
            if status == "failed":
                run_status = "failed"
            elif all(stage.status == "completed" for stage in stages):
                run_status = "completed"
            return self.save(run.model_copy(update={"status": run_status, "stages": stages}))


async def execute_guided_autopilot(run_id: str, settings: Settings) -> None:
    registry = GuidedAutopilotRegistry(settings.private_content_dir)
    run = registry.get(run_id)
    guided = GuidedAuthoringRegistry(settings.private_content_dir).load()
    if guided.revision != run.base_revision:
        registry.fail_stage(run_id, "direction", "Le projet a changé depuis le lancement.")
        return
    source = guided.brief.idea.strip()
    if len(source) < 10:
        registry.fail_stage(
            run_id,
            "direction",
            "Décris d’abord ton idée en au moins dix caractères.",
        )
        return
    bible = BibleRegistry(settings.private_content_dir).load()
    try:
        async with OllamaClient(str(settings.ollama_url)) as client:
            models = await client.list_models()
            installed = {item.name for item in models}
            selected = run.model or (
                settings.ollama_model if settings.ollama_model in installed else None
            )
            if selected is None:
                selected = next(
                    (
                        name
                        for name in sorted(installed)
                        if not any(marker in name.casefold() for marker in ("coder", "embed"))
                    ),
                    None,
                )
            if selected is None or selected not in installed:
                raise ValueError("Aucun modèle narratif Ollama n’est installé.")
            run = registry.save(run.model_copy(update={"status": "running", "model": selected}))
            author = OllamaNarrativeAuthor(client)

            registry.start_stage(run_id, "direction")
            direction = await author.director(
                _guided_source(guided.model_dump(mode="json")),
                bible=bible,
                model=selected,
                custom_prompt=run.custom_prompt,
            )
            registry.complete_stage(
                run_id,
                "direction",
                direction.model_dump(mode="json"),
                f"{direction.genre} · {direction.tone}",
            )

            registry.start_stage(run_id, "architecture")
            architecture = await author.screenwriter(
                direction,
                bible=bible,
                model=selected,
                custom_prompt=run.custom_prompt,
            )
            registry.complete_stage(
                run_id,
                "architecture",
                architecture.model_dump(mode="json"),
                f"{len(architecture.episodes)} épisode(s) proposé(s)",
            )

            proposal = architecture.episodes[0]
            episode = Episode(
                id=f"S{proposal.season:02d}E{proposal.episode:03d}",
                season=proposal.season,
                episode=proposal.episode,
                title=proposal.title,
                logline=proposal.logline,
                duration_target=direction.target_episode_duration,
                status=EpisodeStatus.WRITING,
                characters=proposal.character_ids,
                locations=proposal.location_ids,
                story=EpisodeStory(
                    hook=proposal.logline,
                    setup=proposal.synopsis,
                    cliffhanger=proposal.cliffhanger,
                ),
                narrative_source=proposal.synopsis,
            )
            registry.start_stage(run_id, "episode")
            episode_draft = await author.episode_draft(
                episode,
                bible=bible,
                model=selected,
                custom_prompt=run.custom_prompt,
            )
            registry.complete_stage(
                run_id,
                "episode",
                episode_draft.model_dump(mode="json"),
                episode_draft.logline,
            )

            episode = episode.model_copy(
                update={
                    "title": episode_draft.title,
                    "logline": episode_draft.logline,
                    "story": episode_draft.story,
                    "narrative_source": episode_draft.narrative_source,
                    "characters": episode_draft.character_ids,
                    "locations": episode_draft.location_ids,
                }
            )
            registry.start_stage(run_id, "storyboard")
            storyboard = await author.breakdown(
                episode,
                bible=bible,
                model=selected,
                custom_prompt=run.custom_prompt,
            )
            registry.complete_stage(
                run_id,
                "storyboard",
                storyboard.model_dump(mode="json"),
                f"{len(storyboard.shots)} plan(s) proposé(s)",
            )

            registry.start_stage(run_id, "visual_pipeline")
            templates = WorkflowTemplateCatalogue().build()
            registry.complete_stage(
                run_id,
                "visual_pipeline",
                {
                    "continuity_chain": [template.spec.id for template in templates],
                    "recipes": [
                        {
                            "label": template.spec.label,
                            "receives": template.spec.receives,
                            "produces": template.spec.produces,
                        }
                        for template in templates
                    ],
                },
                f"{len(templates)} recettes visuelles préparées",
            )
    except Exception as exc:  # noqa: BLE001 - persisted boundary for background work
        current = registry.get(run_id)
        active = next(
            (stage for stage in current.stages if stage.status == "running"),
            next((stage for stage in current.stages if stage.status == "pending"), None),
        )
        if active is not None:
            registry.fail_stage(run_id, active.id, str(exc))


def _guided_source(payload: dict[str, object]) -> str:
    return json.dumps(payload, ensure_ascii=False, indent=2, default=str)
