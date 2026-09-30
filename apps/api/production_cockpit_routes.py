from __future__ import annotations

from fastapi import APIRouter, HTTPException

from apps.api.production_cockpit import (
    CockpitEnqueueRequest,
    EpisodeCockpitSnapshot,
    ProductionCockpitService,
)
from apps.api.schemas import EpisodeGenerationRequest


def create_production_cockpit_router(service: ProductionCockpitService) -> APIRouter:
    router = APIRouter(
        prefix="/api/episodes/{episode_id}/production-cockpit",
        tags=["production-cockpit"],
    )

    @router.get("", response_model=EpisodeCockpitSnapshot)
    def snapshot(episode_id: str) -> EpisodeCockpitSnapshot:
        try:
            return service.build(episode_id)
        except FileNotFoundError as exc:
            raise HTTPException(status_code=404, detail="Episode not found") from exc
        except ValueError as exc:
            raise HTTPException(status_code=422, detail=str(exc)) from exc

    @router.post("/shots/{shot_id}/enqueue", status_code=202)
    async def enqueue(
        episode_id: str,
        shot_id: str,
        payload: CockpitEnqueueRequest,
    ) -> dict[str, object]:
        try:
            return await service.enqueue_shot(episode_id, shot_id, payload)
        except KeyError as exc:
            raise HTTPException(status_code=404, detail="Shot not found in episode") from exc
        except PermissionError as exc:
            raise HTTPException(
                status_code=409,
                detail={
                    "code": "APPROVED_VARIANT_REPLACEMENT_REQUIRES_CONFIRMATION",
                    "message": str(exc),
                },
            ) from exc
        except ValueError as exc:
            raise HTTPException(status_code=422, detail=str(exc)) from exc

    @router.post("/assemble", status_code=202)
    async def assemble(
        episode_id: str,
        payload: EpisodeGenerationRequest,
    ) -> dict[str, object]:
        try:
            return await service.assemble(episode_id, payload)
        except FileNotFoundError as exc:
            raise HTTPException(status_code=404, detail="Episode not found") from exc
        except PermissionError as exc:
            raise HTTPException(
                status_code=409,
                detail={"code": "PRODUCTION_INCOMPLETE", "message": str(exc)},
            ) from exc
        except (OSError, RuntimeError, ValueError) as exc:
            raise HTTPException(status_code=422, detail=str(exc)) from exc

    return router
