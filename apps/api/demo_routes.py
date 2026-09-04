from __future__ import annotations

from collections.abc import Callable
from pathlib import Path
from typing import Literal

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel, ConfigDict, Field

from apps.api.demo_pipeline import MEDIA_TYPES, DemoPipeline, DemoStage
from apps.api.notifications import StudioNotificationLog


class DemoImagineRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    instruction: str = Field(default="", max_length=2_000)
    locale: Literal["fr", "en"] = "fr"


class DemoDecisionRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    feedback: str = Field(default="", max_length=500)
    locale: Literal["fr", "en"] = "fr"


def create_demo_router(
    output_provider: Callable[[], Path],
    notifications_provider: Callable[[], StudioNotificationLog],
) -> APIRouter:
    router = APIRouter(prefix="/api/demo", tags=["demo"])
    pipeline = DemoPipeline(output_provider)

    @router.get("")
    def listing(locale: Literal["fr", "en"] = "fr") -> dict[str, object]:
        return pipeline.listing(locale=locale)

    @router.post("/reset")
    def reset(payload: DemoDecisionRequest) -> dict[str, object]:
        result = pipeline.reset(locale=payload.locale)
        notifications_provider().publish(
            "info",
            "Démo express réinitialisée",
            "Le parcours 0 GPU est prêt à recommencer.",
            source="demo",
        )
        return result

    @router.post("/{stage}/imagine")
    def imagine(stage: DemoStage, payload: DemoImagineRequest) -> dict[str, object]:
        try:
            result = pipeline.imagine(
                stage,
                instruction=payload.instruction,
                locale=payload.locale,
            )
        except (OSError, RuntimeError, ValueError) as exc:
            notifications_provider().publish(
                "error",
                "Démo express interrompue",
                str(exc),
                source="demo",
                context={"stage": stage},
            )
            raise HTTPException(status_code=422, detail=str(exc)) from exc
        notifications_provider().publish(
            "success",
            "Proposition de démo prête",
            f"{stage} attend maintenant ta validation.",
            source="demo",
            context={"stage": stage},
        )
        return result

    @router.post("/{stage}/approve")
    def approve(stage: DemoStage, payload: DemoDecisionRequest) -> dict[str, object]:
        try:
            result = pipeline.approve(stage, locale=payload.locale)
        except ValueError as exc:
            raise HTTPException(status_code=409, detail=str(exc)) from exc
        notifications_provider().publish(
            "success",
            "Maillon validé",
            f"{stage} est approuvé ; la chaîne peut continuer.",
            source="demo",
            context={"stage": stage},
        )
        return result

    @router.post("/{stage}/reject")
    def reject(stage: DemoStage, payload: DemoDecisionRequest) -> dict[str, object]:
        try:
            result = pipeline.reject(
                stage,
                feedback=payload.feedback,
                locale=payload.locale,
            )
        except ValueError as exc:
            raise HTTPException(status_code=409, detail=str(exc)) from exc
        notifications_provider().publish(
            "warning",
            "Proposition refusée",
            f"{stage} peut être réimaginé ; ses dépendances ont été invalidées.",
            source="demo",
            context={"stage": stage},
        )
        return result

    @router.get("/media/{filename}")
    def media(filename: str) -> FileResponse:
        try:
            path = pipeline.media_path(filename)
        except FileNotFoundError as exc:
            raise HTTPException(status_code=404, detail="Demo media not found") from exc
        if not path.is_file():
            raise HTTPException(status_code=404, detail="Demo media not found")
        return FileResponse(path, media_type=MEDIA_TYPES[filename], filename=filename)

    return router
