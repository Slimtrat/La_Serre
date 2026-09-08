from __future__ import annotations

import hashlib
import json
from collections.abc import Callable
from datetime import datetime
from pathlib import Path
from typing import Literal

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, ConfigDict, Field

from engine.world.bible import BibleRegistry, BibleRevisionConflictError
from engine.world.impact import BibleImpactAnalyzer
from engine.world.models import (
    BibleChange,
    CanonicalEditProvenance,
    ProjectBible,
    RelationshipState,
    Secret,
)


class RelationshipBoardCharacter(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    name: str


class RelationshipBoardSnapshot(BaseModel):
    model_config = ConfigDict(extra="forbid")

    bible_revision: int
    updated_at: datetime
    characters: list[RelationshipBoardCharacter]
    relationships: list[RelationshipState]
    secrets: list[Secret]
    history: list[BibleChange]
    impact: dict[str, object]


class RelationshipMutationRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    expected_revision: int = Field(ge=0)
    confirmed_by_user: Literal[True]
    note: str = Field(default="", max_length=500)
    relationship: RelationshipState


class SecretMutationRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    expected_revision: int = Field(ge=0)
    confirmed_by_user: Literal[True]
    note: str = Field(default="", max_length=500)
    secret: Secret


class SummaryCandidateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    expected_revision: int = Field(ge=0)
    relationship_ids: list[str] = Field(default_factory=list)
    secret_ids: list[str] = Field(default_factory=list)
    locale: Literal["fr", "en"] = "fr"


class SummaryProvenance(BaseModel):
    model_config = ConfigDict(extra="forbid")

    provider: Literal["deterministic"] = "deterministic"
    method: Literal["relationship-board-v1"] = "relationship-board-v1"
    canonical: Literal[False] = False


class RelationshipSummaryCandidate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    base_revision: int
    status: Literal["candidate"] = "candidate"
    summary: str
    relationship_ids: list[str]
    secret_ids: list[str]
    provenance: SummaryProvenance = Field(default_factory=SummaryProvenance)


def create_relationship_board_router(
    registry_provider: Callable[[], BibleRegistry],
    output_root_provider: Callable[[], Path],
) -> APIRouter:
    router = APIRouter(prefix="/api/relationship-board", tags=["relationship-board"])

    def analyzer(registry: BibleRegistry) -> BibleImpactAnalyzer:
        from pathlib import Path

        return BibleImpactAnalyzer(registry, Path(output_root_provider()))

    def snapshot(
        registry: BibleRegistry,
        bible: ProjectBible | None = None,
        *,
        since_revision: int = 0,
    ) -> RelationshipBoardSnapshot:
        current = bible or registry.load()
        relationship_history = [
            change for change in current.changes if change.entity_type in {"relationship", "secret"}
        ]
        return RelationshipBoardSnapshot(
            bible_revision=current.revision,
            updated_at=current.updated_at,
            characters=[
                RelationshipBoardCharacter(id=item.id, name=item.name)
                for item in current.characters
            ],
            relationships=current.relationships,
            secrets=current.secrets,
            history=relationship_history,
            impact=analyzer(registry).analyze(
                current,
                since_revision=since_revision,
            ),
        )

    @router.get("")
    def get_relationship_board() -> RelationshipBoardSnapshot:
        registry = registry_provider()
        return snapshot(registry)

    @router.put("/relationships/{relationship_id}")
    def put_relationship(
        relationship_id: str,
        payload: RelationshipMutationRequest,
    ) -> RelationshipBoardSnapshot:
        if relationship_id != payload.relationship.id:
            raise HTTPException(status_code=409, detail="Path id and relationship id differ")
        registry = registry_provider()
        relationship = payload.relationship.model_copy(
            update={
                "provenance": CanonicalEditProvenance(
                    source="manual",
                    note=payload.note,
                )
            }
        )
        try:
            bible = registry.put_relationship(
                relationship,
                expected_revision=payload.expected_revision,
            )
        except BibleRevisionConflictError as exc:
            raise _revision_conflict(exc) from exc
        except ValueError as exc:
            raise HTTPException(status_code=422, detail=str(exc)) from exc
        return snapshot(
            registry,
            bible,
            since_revision=payload.expected_revision,
        )

    @router.delete("/relationships/{relationship_id}")
    def delete_relationship(
        relationship_id: str,
        expected_revision: int = Query(ge=0),
        confirmed_by_user: Literal[True] = Query(),
    ) -> RelationshipBoardSnapshot:
        del confirmed_by_user
        registry = registry_provider()
        try:
            bible = registry.delete(
                "relationships",
                relationship_id,
                expected_revision=expected_revision,
            )
        except BibleRevisionConflictError as exc:
            raise _revision_conflict(exc) from exc
        except KeyError as exc:
            raise HTTPException(status_code=404, detail="Relationship not found") from exc
        return snapshot(registry, bible, since_revision=expected_revision)

    @router.put("/secrets/{secret_id}")
    def put_secret(
        secret_id: str,
        payload: SecretMutationRequest,
    ) -> RelationshipBoardSnapshot:
        if secret_id != payload.secret.id:
            raise HTTPException(status_code=409, detail="Path id and secret id differ")
        registry = registry_provider()
        secret = payload.secret.model_copy(
            update={
                "provenance": CanonicalEditProvenance(
                    source="manual",
                    note=payload.note,
                )
            }
        )
        try:
            bible = registry.put_secret(
                secret,
                expected_revision=payload.expected_revision,
            )
        except BibleRevisionConflictError as exc:
            raise _revision_conflict(exc) from exc
        except ValueError as exc:
            raise HTTPException(status_code=422, detail=str(exc)) from exc
        return snapshot(
            registry,
            bible,
            since_revision=payload.expected_revision,
        )

    @router.delete("/secrets/{secret_id}")
    def delete_secret(
        secret_id: str,
        expected_revision: int = Query(ge=0),
        confirmed_by_user: Literal[True] = Query(),
    ) -> RelationshipBoardSnapshot:
        del confirmed_by_user
        registry = registry_provider()
        try:
            bible = registry.delete(
                "secrets",
                secret_id,
                expected_revision=expected_revision,
            )
        except BibleRevisionConflictError as exc:
            raise _revision_conflict(exc) from exc
        except KeyError as exc:
            raise HTTPException(status_code=404, detail="Secret not found") from exc
        return snapshot(registry, bible, since_revision=expected_revision)

    @router.post("/summary-candidates")
    def create_summary_candidate(
        payload: SummaryCandidateRequest,
    ) -> RelationshipSummaryCandidate:
        registry = registry_provider()
        bible = registry.load()
        if bible.revision != payload.expected_revision:
            raise _revision_conflict(
                BibleRevisionConflictError(payload.expected_revision, bible.revision)
            )

        relationship_by_id = {item.id: item for item in bible.relationships}
        secret_by_id = {item.id: item for item in bible.secrets}
        unknown_relationships = sorted(set(payload.relationship_ids) - relationship_by_id.keys())
        unknown_secrets = sorted(set(payload.secret_ids) - secret_by_id.keys())
        if unknown_relationships or unknown_secrets:
            raise HTTPException(
                status_code=404,
                detail={
                    "message": "Relationship board entities not found",
                    "relationship_ids": unknown_relationships,
                    "secret_ids": unknown_secrets,
                },
            )
        if not payload.relationship_ids and not payload.secret_ids:
            raise HTTPException(status_code=422, detail="Select a relationship or secret")

        names = {item.id: item.name for item in bible.characters}
        lines = [
            _relationship_line(relationship_by_id[item_id], names, payload.locale)
            for item_id in payload.relationship_ids
        ]
        lines.extend(
            _secret_line(secret_by_id[item_id], names, payload.locale)
            for item_id in payload.secret_ids
        )
        identity = {
            "revision": bible.revision,
            "relationships": payload.relationship_ids,
            "secrets": payload.secret_ids,
            "locale": payload.locale,
        }
        candidate_id = (
            "relationship-summary-"
            + hashlib.sha256(json.dumps(identity, sort_keys=True).encode("utf-8")).hexdigest()[:16]
        )
        return RelationshipSummaryCandidate(
            id=candidate_id,
            base_revision=bible.revision,
            summary="\n".join(lines),
            relationship_ids=payload.relationship_ids,
            secret_ids=payload.secret_ids,
        )

    return router


def _revision_conflict(exc: BibleRevisionConflictError) -> HTTPException:
    return HTTPException(
        status_code=409,
        detail={
            "message": "The Bible changed after this board was loaded",
            "expected_revision": exc.expected,
            "current_revision": exc.current,
        },
    )


def _relationship_line(
    relationship: RelationshipState,
    names: dict[str, str],
    locale: Literal["fr", "en"],
) -> str:
    source = names.get(relationship.source, relationship.source)
    target = names.get(relationship.target, relationship.target)
    if locale == "en":
        return (
            f"{source} → {target}: {relationship.label}. {relationship.summary} "
            f"Jealousy {relationship.jealousy}/100; desire {relationship.desire}; "
            f"trust {relationship.trust}."
        )
    return (
        f"{source} → {target} : {relationship.label}. {relationship.summary} "
        f"Jalousie {relationship.jealousy}/100 ; désir {relationship.desire} ; "
        f"confiance {relationship.trust}."
    )


def _secret_line(
    secret: Secret,
    names: dict[str, str],
    locale: Literal["fr", "en"],
) -> str:
    owners = ", ".join(names.get(item, item) for item in secret.owners)
    hidden = ", ".join(names.get(item, item) for item in secret.hidden_from)
    if locale == "en":
        return f"Secret held by {owners}: {secret.summary} Hidden from: {hidden or 'nobody'}."
    return f"Secret détenu par {owners} : {secret.summary} Caché à : {hidden or 'personne'}."
