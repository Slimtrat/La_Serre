from __future__ import annotations

from collections.abc import Awaitable, Callable
from dataclasses import dataclass
from pathlib import Path

from fastapi import APIRouter, HTTPException, Query, Request
from fastapi.responses import FileResponse
from pydantic import BaseModel, ConfigDict, Field

from engine.world.bible import BibleRegistry
from engine.world.visual_identity import (
    VisualIdentityBoard,
    VisualIdentityConflict,
    VisualIdentityError,
    VisualIdentityRegistry,
    VisualProvenance,
    VisualVariantKind,
    VisualVariantSource,
)


class CastingGeneratorUnavailable(RuntimeError):
    pass


class StrictRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")


class CastingGateRequest(StrictRequest):
    expected_revision: int = Field(ge=0)


class CastingGenerateRequest(StrictRequest):
    expected_revision: int = Field(ge=0)
    kind: VisualVariantKind
    permanent_identity: str = Field(min_length=10, max_length=4000)
    outfit: str = Field(default="", max_length=2000)
    transient_state: str = Field(default="", max_length=2000)
    prompt: str = Field(min_length=10, max_length=8000)
    model: str = Field(min_length=1, max_length=200)
    workflow: str = Field(min_length=1, max_length=200)
    seed: int = Field(ge=0, le=2**63 - 1)
    license: str = Field(min_length=1, max_length=200)
    revision: str | None = Field(default=None, max_length=200)


@dataclass(frozen=True, slots=True)
class GeneratedIdentityImage:
    content: bytes
    media_type: str
    source_label: str
    model: str | None = None
    workflow: str | None = None
    revision: str | None = None


VisualIdentityGenerator = Callable[[str, CastingGenerateRequest], Awaitable[GeneratedIdentityImage]]


def create_casting_router(
    private_root_provider: Callable[[], Path],
    output_root_provider: Callable[[], Path],
    generator: VisualIdentityGenerator | None = None,
) -> APIRouter:
    router = APIRouter(prefix="/api/casting", tags=["casting"])

    def registry() -> VisualIdentityRegistry:
        return VisualIdentityRegistry(private_root_provider(), output_root_provider())

    def ensure_character(character_id: str) -> None:
        bible = BibleRegistry(private_root_provider()).load()
        if character_id not in {item.id for item in bible.characters}:
            raise HTTPException(status_code=404, detail="Character not found in the project Bible")

    def response(board: VisualIdentityBoard) -> dict[str, object]:
        payload = board.model_dump(mode="json")
        for identity in payload["characters"]:
            for variant in identity["variants"]:
                variant["media_url"] = (
                    f"/api/casting/{identity['character_id']}/variants/{variant['id']}/content"
                )
        return payload

    def translate_error(exc: Exception) -> HTTPException:
        if isinstance(exc, VisualIdentityConflict):
            return HTTPException(status_code=409, detail=str(exc))
        return HTTPException(status_code=422, detail=str(exc))

    @router.get("")
    def list_casting() -> dict[str, object]:
        return response(registry().load())

    @router.get("/{character_id}")
    def get_character(character_id: str) -> dict[str, object]:
        ensure_character(character_id)
        board = registry().load()
        identity = registry().list_for_character(character_id)
        scoped = board.model_copy(update={"characters": [identity]})
        return response(scoped)

    @router.post("/{character_id}/variants/import", status_code=201)
    async def import_variant(
        character_id: str,
        request: Request,
        expected_revision: int = Query(ge=0),
        kind: VisualVariantKind = Query(),  # noqa: B008
        permanent_identity: str = Query(min_length=10, max_length=4000),
        license: str = Query(min_length=1, max_length=200),
        source_label: str = Query(min_length=1, max_length=200),
        outfit: str = Query(default="", max_length=2000),
        transient_state: str = Query(default="", max_length=2000),
        revision: str | None = Query(default=None, max_length=200),
    ) -> dict[str, object]:
        ensure_character(character_id)
        media_type = request.headers.get("content-type", "").split(";", 1)[0].lower()
        content = await request.body()
        try:
            board, variant = registry().add_image(
                character_id=character_id,
                kind=kind,
                content=content,
                media_type=media_type,
                permanent_identity=permanent_identity,
                outfit=outfit,
                transient_state=transient_state,
                provenance=VisualProvenance(
                    source=VisualVariantSource.IMPORTED,
                    source_label=source_label,
                    license=license,
                    revision=revision,
                ),
                expected_revision=expected_revision,
            )
        except VisualIdentityError as exc:
            raise translate_error(exc) from exc
        return {"board": response(board), "variant": variant.model_dump(mode="json")}

    @router.post("/{character_id}/variants/generate", status_code=201)
    async def generate_variant(
        character_id: str,
        payload: CastingGenerateRequest,
    ) -> dict[str, object]:
        ensure_character(character_id)
        if generator is None:
            raise HTTPException(
                status_code=503,
                detail="No visual identity generator is configured; import remains available",
            )
        try:
            generated = await generator(character_id, payload)
            board, variant = registry().add_image(
                character_id=character_id,
                kind=payload.kind,
                content=generated.content,
                media_type=generated.media_type,
                permanent_identity=payload.permanent_identity,
                outfit=payload.outfit,
                transient_state=payload.transient_state,
                provenance=VisualProvenance(
                    source=VisualVariantSource.GENERATED,
                    source_label=generated.source_label,
                    model=generated.model or payload.model,
                    workflow=generated.workflow or payload.workflow,
                    seed=payload.seed,
                    license=payload.license,
                    revision=generated.revision or payload.revision,
                ),
                expected_revision=payload.expected_revision,
            )
        except CastingGeneratorUnavailable as exc:
            raise HTTPException(status_code=503, detail=str(exc)) from exc
        except VisualIdentityError as exc:
            raise translate_error(exc) from exc
        return {"board": response(board), "variant": variant.model_dump(mode="json")}

    @router.get("/{character_id}/variants/{variant_id}/content")
    def variant_content(character_id: str, variant_id: str) -> FileResponse:
        ensure_character(character_id)
        try:
            path, media_type = registry().media_path(character_id, variant_id)
        except (VisualIdentityError, FileNotFoundError) as exc:
            raise HTTPException(status_code=404, detail="Visual variant not found") from exc
        return FileResponse(path, media_type=media_type)

    def gate(
        character_id: str, variant_id: str, payload: CastingGateRequest, action: str
    ) -> dict[str, object]:
        ensure_character(character_id)
        try:
            store = registry()
            if action == "reject":
                return {
                    "board": response(
                        store.reject(
                            character_id, variant_id, expected_revision=payload.expected_revision
                        )
                    )
                }
            method = store.restore if action == "restore" else store.approve
            board, affected = method(
                character_id, variant_id, expected_revision=payload.expected_revision
            )
            return {
                "board": response(board),
                "affected": affected.model_dump(mode="json"),
                "regeneration_started": False,
            }
        except VisualIdentityError as exc:
            raise translate_error(exc) from exc

    @router.post("/{character_id}/variants/{variant_id}/approve")
    def approve_variant(
        character_id: str, variant_id: str, payload: CastingGateRequest
    ) -> dict[str, object]:
        return gate(character_id, variant_id, payload, "approve")

    @router.post("/{character_id}/variants/{variant_id}/reject")
    def reject_variant(
        character_id: str, variant_id: str, payload: CastingGateRequest
    ) -> dict[str, object]:
        return gate(character_id, variant_id, payload, "reject")

    @router.post("/{character_id}/variants/{variant_id}/restore")
    def restore_variant(
        character_id: str, variant_id: str, payload: CastingGateRequest
    ) -> dict[str, object]:
        return gate(character_id, variant_id, payload, "restore")

    return router
