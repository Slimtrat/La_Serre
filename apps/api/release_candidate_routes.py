from __future__ import annotations

from collections.abc import Callable

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

from engine.production.release import (
    ReleaseCandidate,
    ReleaseCandidateCommand,
    ReleaseCandidateCreate,
    ReleaseCandidateEdit,
    ReleaseCandidateService,
    ReleaseRevisionConflictError,
)


def create_release_candidate_router(service: ReleaseCandidateService) -> APIRouter:
    router = APIRouter(
        prefix="/api/episodes/{episode_id}/release-candidate",
        tags=["release-candidate"],
    )

    def invoke(operation: Callable[[], ReleaseCandidate]) -> ReleaseCandidate:
        try:
            return operation()
        except ReleaseRevisionConflictError as exc:
            raise HTTPException(
                status_code=409,
                detail={"code": "RELEASE_REVISION_CONFLICT", "message": str(exc)},
            ) from exc
        except PermissionError as exc:
            raise HTTPException(
                status_code=409,
                detail={"code": "RELEASE_STATE_CONFLICT", "message": str(exc)},
            ) from exc
        except FileNotFoundError as exc:
            raise HTTPException(status_code=404, detail=str(exc)) from exc
        except (OSError, RuntimeError, ValueError) as exc:
            raise HTTPException(status_code=422, detail=str(exc)) from exc

    @router.get("", response_model=ReleaseCandidate)
    def get_candidate(episode_id: str) -> ReleaseCandidate:
        return invoke(lambda: service.get(episode_id))

    @router.post("", response_model=ReleaseCandidate, status_code=201)
    def create_candidate(
        episode_id: str,
        payload: ReleaseCandidateCreate,
    ) -> ReleaseCandidate:
        return invoke(lambda: service.create_or_refresh(episode_id, payload))

    @router.patch("", response_model=ReleaseCandidate)
    def edit_candidate(
        episode_id: str,
        payload: ReleaseCandidateEdit,
    ) -> ReleaseCandidate:
        return invoke(lambda: service.edit(episode_id, payload))

    @router.post("/approve", response_model=ReleaseCandidate)
    def approve_candidate(
        episode_id: str,
        payload: ReleaseCandidateCommand,
    ) -> ReleaseCandidate:
        return invoke(lambda: service.approve(episode_id, payload))

    @router.post("/export", response_model=ReleaseCandidate, status_code=201)
    def export_candidate(
        episode_id: str,
        payload: ReleaseCandidateCommand,
    ) -> ReleaseCandidate:
        return invoke(lambda: service.export(episode_id, payload))

    @router.get("/media/{filename}", response_class=FileResponse)
    def candidate_media(episode_id: str, filename: str) -> FileResponse:
        try:
            path = service.candidate_media(episode_id, filename)
        except FileNotFoundError as exc:
            raise HTTPException(status_code=404, detail="Release media not found") from exc
        return FileResponse(path, filename=path.name)

    @router.get("/exports/{export_id}/{filename}", response_class=FileResponse)
    def export_file(episode_id: str, export_id: str, filename: str) -> FileResponse:
        try:
            path = service.export_file(episode_id, export_id, filename)
        except FileNotFoundError as exc:
            raise HTTPException(status_code=404, detail="Release export not found") from exc
        return FileResponse(path, filename=path.name)

    return router
