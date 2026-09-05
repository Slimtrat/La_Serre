from __future__ import annotations

import asyncio
from collections.abc import Callable
from typing import Literal

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, ConfigDict, Field

from engine.config import Settings
from engine.narrative.guided_authoring import GuidedAuthoringRegistry
from engine.narrative.guided_autopilot import (
    GuidedAutopilotRegistry,
    execute_guided_autopilot,
)


class GuidedAutopilotRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    expected_revision: int = Field(ge=0)
    locale: Literal["fr", "en"] = "fr"
    model: str | None = Field(default=None, max_length=200)
    prompt: str = Field(default="", max_length=4000)


def create_guided_autopilot_router(
    settings_provider: Callable[[], Settings],
) -> APIRouter:
    router = APIRouter(prefix="/api/guided/autopilot-jobs", tags=["guided-autopilot"])
    tasks: set[asyncio.Task[None]] = set()
    active_run_ids: set[str] = set()

    def registry() -> GuidedAutopilotRegistry:
        return GuidedAutopilotRegistry(settings_provider().private_content_dir)

    @router.get("/latest")
    def latest() -> dict[str, object]:
        run = registry().latest()
        return {"run": run.model_dump(mode="json") if run else None}

    @router.get("/{run_id}")
    def get_run(run_id: str) -> dict[str, object]:
        try:
            run = registry().get(run_id)
        except KeyError as exc:
            raise HTTPException(status_code=404, detail="Parcours IA introuvable") from exc
        return {"run": run.model_dump(mode="json")}

    @router.post("", status_code=202)
    async def start(payload: GuidedAutopilotRequest) -> dict[str, object]:
        settings = settings_provider()
        guided = GuidedAuthoringRegistry(settings.private_content_dir).load()
        if guided.revision != payload.expected_revision:
            raise HTTPException(status_code=409, detail="Le projet a changé. Recharge la vue.")
        active = registry().latest()
        if active and active.status in {"queued", "running"}:
            if active.id in active_run_ids:
                raise HTTPException(status_code=409, detail="Un parcours IA est déjà en cours.")
            running_stage = next(
                (
                    stage.id
                    for stage in active.stages
                    if stage.status in {"queued", "running"}
                ),
                active.stages[0].id,
            )
            registry().fail_stage(
                active.id,
                running_stage,
                "Parcours interrompu par le redémarrage du Studio.",
            )
        run = registry().create(
            base_revision=guided.revision,
            locale=payload.locale,
            model=payload.model,
            custom_prompt=payload.prompt.strip(),
        )
        task = asyncio.create_task(execute_guided_autopilot(run.id, settings))
        tasks.add(task)
        active_run_ids.add(run.id)

        def cleanup(completed: asyncio.Task[None]) -> None:
            tasks.discard(completed)
            active_run_ids.discard(run.id)

        task.add_done_callback(cleanup)
        return {"run": run.model_dump(mode="json")}

    return router
