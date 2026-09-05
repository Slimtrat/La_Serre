from __future__ import annotations

from typing import Literal

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, ConfigDict, Field

from apps.api.production_queue import ProductionQueueManager, QueueKind


class QueueRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    shot: dict[str, object]
    kind: QueueKind
    priority: int = Field(default=0, ge=-100, le=100)
    force: bool = False
    tts: Literal["auto", "edge", "sapi", "none"] = "auto"


class BatchQueueRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    episode_id: str = Field(pattern=r"^S\d{2}E\d{3}$")
    priority: int = Field(default=0, ge=-100, le=100)
    tts: Literal["auto", "edge", "sapi", "none"] = "auto"


class PriorityRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    priority: int = Field(ge=-100, le=100)


class ReorderRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    item_ids: list[str]


def create_production_queue_router(manager: ProductionQueueManager) -> APIRouter:
    router = APIRouter(prefix="/api/production-queue", tags=["production-queue"])

    @router.get("")
    def listing() -> dict[str, object]:
        return manager.listing()

    @router.post("/items", status_code=202)
    async def enqueue(payload: QueueRequest) -> dict[str, object]:
        try:
            return await manager.enqueue(
                payload.shot,
                payload.kind,
                priority=payload.priority,
                force=payload.force,
                tts=payload.tts,
            )
        except ValueError as exc:
            raise HTTPException(status_code=422, detail=str(exc)) from exc

    @router.post("/batch/missing", status_code=202)
    async def enqueue_missing(payload: BatchQueueRequest) -> dict[str, object]:
        try:
            result, queue = await manager.enqueue_missing(
                payload.episode_id,
                priority=payload.priority,
                tts=payload.tts,
            )
        except (FileNotFoundError, ValueError) as exc:
            raise HTTPException(status_code=422, detail=str(exc)) from exc
        return {"batch": result.public(), "queue": queue}

    @router.post("/batch/approved", status_code=202)
    async def enqueue_approved(payload: BatchQueueRequest) -> dict[str, object]:
        try:
            result, queue = await manager.enqueue_approved(
                payload.episode_id,
                priority=payload.priority,
                tts=payload.tts,
            )
        except (FileNotFoundError, ValueError) as exc:
            raise HTTPException(status_code=422, detail=str(exc)) from exc
        return {"batch": result.public(), "queue": queue}

    @router.post("/pause")
    async def pause() -> dict[str, object]:
        return await manager.pause()

    @router.post("/resume")
    async def resume() -> dict[str, object]:
        return await manager.resume()

    @router.post("/items/{item_id}/cancel")
    async def cancel(item_id: str) -> dict[str, object]:
        try:
            return await manager.cancel(item_id)
        except KeyError as exc:
            raise HTTPException(status_code=404, detail="Tâche introuvable") from exc
        except ValueError as exc:
            raise HTTPException(status_code=409, detail=str(exc)) from exc

    @router.post("/items/{item_id}/retry", status_code=202)
    async def retry(item_id: str) -> dict[str, object]:
        try:
            return await manager.retry(item_id)
        except KeyError as exc:
            raise HTTPException(status_code=404, detail="Tâche introuvable") from exc
        except ValueError as exc:
            raise HTTPException(status_code=409, detail=str(exc)) from exc

    @router.patch("/items/{item_id}/priority")
    def set_priority(item_id: str, payload: PriorityRequest) -> dict[str, object]:
        try:
            return manager.set_priority(item_id, payload.priority)
        except KeyError as exc:
            raise HTTPException(status_code=404, detail="Tâche introuvable") from exc
        except ValueError as exc:
            raise HTTPException(status_code=409, detail=str(exc)) from exc

    @router.put("/order")
    def reorder(payload: ReorderRequest) -> dict[str, object]:
        try:
            return manager.reorder(payload.item_ids)
        except ValueError as exc:
            raise HTTPException(status_code=409, detail=str(exc)) from exc

    @router.delete("/finished")
    def clear_finished() -> dict[str, object]:
        return manager.clear_finished()

    @router.post("/shots/{shot_id}/approve")
    def approve_keyframe(shot_id: str) -> dict[str, object]:
        try:
            return manager.approve_keyframe(shot_id)
        except ValueError as exc:
            raise HTTPException(status_code=422, detail=str(exc)) from exc

    return router
