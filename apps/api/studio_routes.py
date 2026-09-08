from __future__ import annotations

from collections.abc import Callable

from fastapi import APIRouter, HTTPException

from apps.api.studio_snapshot import StudioJourneySnapshot


def create_studio_router(
    snapshot_provider: Callable[[], StudioJourneySnapshot],
) -> APIRouter:
    router = APIRouter(prefix="/api/studio", tags=["studio"])

    @router.get("/journey", response_model=StudioJourneySnapshot)
    def journey() -> StudioJourneySnapshot:
        try:
            return snapshot_provider()
        except (OSError, ValueError) as exc:
            raise HTTPException(
                status_code=500,
                detail={
                    "code": "STUDIO_JOURNEY_UNAVAILABLE",
                    "message": str(exc),
                },
            ) from exc

    return router
