from __future__ import annotations

from collections.abc import Callable
from pathlib import Path

from fastapi import APIRouter, HTTPException

from apps.api.projects import ProjectRegistry
from apps.api.schemas import (
    ProjectFolderRequest,
    ProjectRemovalRequest,
    ProjectStorageRequest,
)


def create_project_storage_router(
    registry: ProjectRegistry,
    *,
    has_active_work: Callable[[], bool],
) -> APIRouter:
    """Project storage lifecycle routes kept separate from the main API assembly."""
    router = APIRouter()

    def require_idle(action: str) -> None:
        if has_active_work():
            raise HTTPException(
                status_code=409,
                detail=f"Attends la fin des générations avant de {action}.",
            )

    @router.get("/api/projects/storage")
    def project_storage() -> dict[str, object]:
        return registry.storage_listing()

    @router.put("/api/projects/storage")
    def configure_project_storage(
        payload: ProjectStorageRequest,
    ) -> dict[str, object]:
        require_idle("modifier les dossiers du Studio")
        try:
            storage = registry.configure_storage(
                Path(payload.work_root),
                Path(payload.output_root),
            )
        except (OSError, ValueError) as exc:
            raise HTTPException(status_code=422, detail=str(exc)) from exc
        return {"storage": storage, **registry.listing()}

    @router.post("/api/projects/{project_id}/open-folder")
    def open_project_folder(
        project_id: str,
        payload: ProjectFolderRequest,
    ) -> dict[str, str]:
        try:
            path = registry.open_folder(project_id, payload.role)
        except KeyError as exc:
            raise HTTPException(status_code=404, detail="Projet introuvable") from exc
        except (OSError, ValueError) as exc:
            raise HTTPException(status_code=422, detail=str(exc)) from exc
        return {"status": "opened", "path": str(path), "role": payload.role}

    @router.delete("/api/projects/{project_id}/remove")
    def remove_project(
        project_id: str,
        payload: ProjectRemovalRequest,
    ) -> dict[str, object]:
        require_idle("supprimer un projet")
        try:
            removed = registry.remove(
                project_id,
                delete_files=payload.mode == "delete_files",
                confirmation=payload.confirmation,
            )
        except KeyError as exc:
            raise HTTPException(status_code=404, detail="Projet introuvable") from exc
        except (OSError, ValueError) as exc:
            raise HTTPException(status_code=422, detail=str(exc)) from exc
        return {
            **registry.listing(),
            "removed": {
                "id": removed.id,
                "name": removed.name,
                "files_deleted": payload.mode == "delete_files",
            },
        }

    return router
