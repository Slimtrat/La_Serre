from __future__ import annotations

from collections.abc import Callable
from pathlib import Path

from fastapi import APIRouter, HTTPException

from apps.api.project_explorer import build_project_explorer
from engine.world.catalog import EpisodeCatalog


def create_episode_router(
    catalog_provider: Callable[[], EpisodeCatalog],
    output_root_provider: Callable[[], Path],
) -> APIRouter:
    router = APIRouter(prefix="/api/episodes", tags=["episodes"])

    @router.get("")
    def list_episodes() -> dict[str, object]:
        try:
            episodes = catalog_provider().list_episodes()
        except (OSError, ValueError) as exc:
            raise HTTPException(status_code=500, detail=str(exc)) from exc
        return {"episodes": [episode.model_dump(mode="json") for episode in episodes]}

    @router.get("/project-explorer")
    def project_explorer() -> dict[str, object]:
        try:
            return build_project_explorer(catalog_provider(), output_root_provider())
        except (OSError, ValueError) as exc:
            raise HTTPException(status_code=500, detail=str(exc)) from exc

    @router.get("/{episode_id}")
    def get_episode(episode_id: str) -> dict[str, object]:
        try:
            package = catalog_provider().load(episode_id)
        except FileNotFoundError as exc:
            raise HTTPException(status_code=404, detail=f"Episode not found: {episode_id}") from exc
        except ValueError as exc:
            raise HTTPException(status_code=422, detail=str(exc)) from exc
        return package.model_dump(mode="json")

    return router
