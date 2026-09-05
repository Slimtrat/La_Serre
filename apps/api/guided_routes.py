from __future__ import annotations

import json
from collections.abc import Callable
from typing import Literal

import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, ConfigDict, Field

from engine.config import Settings
from engine.narrative.guided_authoring import (
    GuidedAuthoringRegistry,
    GuidedAuthoringState,
    GuidedCharacterDraft,
    GuidedProjectBrief,
    guided_completion,
)
from engine.narrative.ollama import OllamaClient
from engine.world.bible import BibleRegistry
from engine.world.catalog import EpisodeCatalog

_NON_NARRATIVE_MODEL_MARKERS = ("coder", "embedding", "embed")


class StrictGuidedRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")


class GuidedBriefRequest(StrictGuidedRequest):
    expected_revision: int = Field(ge=0)
    brief: GuidedProjectBrief


class GuidedCharacterCreateRequest(StrictGuidedRequest):
    expected_revision: int = Field(ge=0)


class GuidedCharacterRequest(StrictGuidedRequest):
    expected_revision: int = Field(ge=0)
    character: GuidedCharacterDraft


class GuidedEpisodeLinkRequest(StrictGuidedRequest):
    expected_revision: int = Field(ge=0)
    episode_id: str | None = Field(default=None, pattern=r"^S\d{2}E\d{3}$")


class GuidedProposalRequest(StrictGuidedRequest):
    expected_revision: int = Field(ge=0)
    target: str = Field(pattern=r"^(brief|character:[a-z0-9][a-z0-9_-]*)$")
    mode: Literal["improve", "fill_missing", "prepare_next"]
    locale: Literal["fr", "en"] = "fr"
    model: str | None = Field(default=None, max_length=200)


class GuidedProposalAcceptRequest(StrictGuidedRequest):
    expected_revision: int = Field(ge=0)
    edited_after: dict[str, object] | None = None


def create_guided_router(settings_provider: Callable[[], Settings]) -> APIRouter:
    router = APIRouter(prefix="/api/guided", tags=["guided-authoring"])

    def registry() -> GuidedAuthoringRegistry:
        return GuidedAuthoringRegistry(settings_provider().private_content_dir)

    def response(state: GuidedAuthoringState) -> dict[str, object]:
        store = registry()
        return {
            "state": state.model_dump(mode="json"),
            "completion": guided_completion(state),
            "proposals": [
                item.model_dump(mode="json") for item in store.list_proposals()
            ],
        }

    @router.get("")
    def get_guided() -> dict[str, object]:
        return response(registry().load())

    @router.put("/brief")
    def put_brief(payload: GuidedBriefRequest) -> dict[str, object]:
        store = registry()
        current = store.load()
        return _save_response(
            store,
            current.model_copy(update={"brief": payload.brief}),
            payload.expected_revision,
        )

    @router.post("/characters", status_code=201)
    def create_character(payload: GuidedCharacterCreateRequest) -> dict[str, object]:
        try:
            return response(
                registry().create_character(expected_revision=payload.expected_revision)
            )
        except ValueError as exc:
            raise HTTPException(status_code=409, detail=str(exc)) from exc

    @router.put("/characters/{character_id}")
    def put_character(
        character_id: str,
        payload: GuidedCharacterRequest,
    ) -> dict[str, object]:
        try:
            return response(
                registry().put_character(
                    character_id,
                    payload.character,
                    expected_revision=payload.expected_revision,
                )
            )
        except KeyError as exc:
            raise HTTPException(status_code=404, detail="Personnage brouillon introuvable") from exc
        except ValueError as exc:
            raise HTTPException(status_code=409, detail=str(exc)) from exc

    @router.delete("/characters/{character_id}")
    def delete_character(character_id: str, expected_revision: int) -> dict[str, object]:
        try:
            return response(
                registry().delete_character(
                    character_id,
                    expected_revision=expected_revision,
                )
            )
        except KeyError as exc:
            raise HTTPException(status_code=404, detail="Personnage brouillon introuvable") from exc
        except ValueError as exc:
            raise HTTPException(status_code=409, detail=str(exc)) from exc

    @router.post("/characters/{character_id}/promote")
    def promote_character(
        character_id: str,
        payload: GuidedCharacterCreateRequest,
    ) -> dict[str, object]:
        try:
            state, character = registry().promote_character(
                character_id,
                expected_revision=payload.expected_revision,
            )
            result = response(state)
            result["character"] = character.model_dump(mode="json")
            return result
        except KeyError as exc:
            raise HTTPException(status_code=404, detail="Personnage brouillon introuvable") from exc
        except ValueError as exc:
            raise HTTPException(status_code=422, detail=str(exc)) from exc

    @router.put("/episode-link")
    def put_episode_link(payload: GuidedEpisodeLinkRequest) -> dict[str, object]:
        store = registry()
        current = store.load()
        return _save_response(
            store,
            current.model_copy(update={"active_episode_id": payload.episode_id}),
            payload.expected_revision,
        )

    @router.post("/proposals", status_code=201)
    async def generate_proposal(payload: GuidedProposalRequest) -> dict[str, object]:
        store = registry()
        current = store.load()
        if current.revision != payload.expected_revision:
            raise HTTPException(status_code=409, detail="Le brouillon a changé. Recharge la vue.")
        if payload.target == "brief":
            before_model: BaseModel = current.brief
            candidate_type: type[BaseModel] = GuidedProjectBrief
        else:
            character_id = payload.target.partition(":")[2]
            character = next(
                (item for item in current.characters if item.id == character_id),
                None,
            )
            if character is None:
                raise HTTPException(status_code=404, detail="Personnage brouillon introuvable")
            before_model = character
            candidate_type = GuidedCharacterDraft
        before = before_model.model_dump(mode="json")
        settings = settings_provider()
        try:
            async with OllamaClient(str(settings.ollama_url)) as client:
                models = await client.list_models()
                installed = {item.name for item in models}
                selected = payload.model or (
                    settings.ollama_model if settings.ollama_model in installed else None
                )
                if selected is None:
                    selected = next(
                        (
                            name
                            for name in sorted(installed)
                            if not any(
                                marker in name.casefold()
                                for marker in _NON_NARRATIVE_MODEL_MARKERS
                            )
                        ),
                        None,
                    )
                if selected is None or selected not in installed:
                    raise ValueError("Installe ou sélectionne un modèle narratif Ollama")
                language = "français" if payload.locale == "fr" else "English"
                raw = await client.chat_structured(
                    selected,
                    [
                        {
                            "role": "system",
                            "content": (
                                "Tu es un co-auteur de fiction. Réponds uniquement avec l’objet "
                                f"JSON demandé, en {language}. Les champs verrouillés doivent "
                                "rester "
                                "strictement identiques. Aucun commentaire hors JSON."
                            ),
                        },
                        {
                            "role": "user",
                            "content": _proposal_prompt(
                                payload.target,
                                payload.mode,
                                before,
                                current,
                                _context_payload(current, settings),
                            ),
                        },
                    ],
                    candidate_type.model_json_schema(),
                )
                candidate = candidate_type.model_validate_json(raw)
        except httpx.HTTPStatusError as exc:
            raise HTTPException(status_code=502, detail="Ollama a refusé la génération") from exc
        except httpx.RequestError as exc:
            raise HTTPException(status_code=503, detail="Ollama est inaccessible") from exc
        except ValueError as exc:
            raise HTTPException(status_code=422, detail=str(exc)) from exc
        after = _protect_candidate(before, candidate.model_dump(mode="json"), payload.mode)
        try:
            proposal = store.create_proposal(
                target=payload.target,
                mode=payload.mode,
                base_revision=current.revision,
                before=before,
                after=after,
                model=selected,
            )
        except ValueError as exc:
            raise HTTPException(status_code=409, detail=str(exc)) from exc
        return {"proposal": proposal.model_dump(mode="json"), "canonical": False}

    @router.post("/proposals/{proposal_id}/accept")
    def accept_proposal(
        proposal_id: str,
        payload: GuidedProposalAcceptRequest,
    ) -> dict[str, object]:
        try:
            state, proposal = registry().accept_proposal(
                proposal_id,
                expected_revision=payload.expected_revision,
                edited_after=payload.edited_after,
            )
            result = response(state)
            result["proposal"] = proposal.model_dump(mode="json")
            return result
        except KeyError as exc:
            raise HTTPException(status_code=404, detail="Proposition introuvable") from exc
        except ValueError as exc:
            raise HTTPException(status_code=409, detail=str(exc)) from exc

    @router.post("/proposals/{proposal_id}/reject")
    def reject_proposal(proposal_id: str) -> dict[str, object]:
        try:
            proposal = registry().reject_proposal(proposal_id)
            return {"proposal": proposal.model_dump(mode="json")}
        except KeyError as exc:
            raise HTTPException(status_code=404, detail="Proposition introuvable") from exc
        except ValueError as exc:
            raise HTTPException(status_code=409, detail=str(exc)) from exc

    return router


def _save_response(
    registry: GuidedAuthoringRegistry,
    state: GuidedAuthoringState,
    expected_revision: int,
) -> dict[str, object]:
    try:
        saved = registry.save(state, expected_revision=expected_revision)
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    return {
        "state": saved.model_dump(mode="json"),
        "completion": guided_completion(saved),
        "proposals": [item.model_dump(mode="json") for item in registry.list_proposals()],
    }


def _proposal_prompt(
    target: str,
    mode: str,
    before: dict[str, object],
    state: GuidedAuthoringState,
    context: dict[str, object] | None = None,
) -> str:
    instructions = {
        "improve": "Renforce la singularité, la clarté et la cohérence sans changer l’intention.",
        "fill_missing": (
            "Complète uniquement les champs vides; conserve tous les champs déjà remplis."
        ),
        "prepare_next": (
            "Prépare l’étape suivante. Pour un brief, renseigne surtout episode_title et "
            "episode_concept. Pour un personnage, complète ce qui manque pour le rendre publiable."
        ),
    }
    return (
        f"Cible: {target}\nMode: {mode}\nMission: {instructions[mode]}\n"
        f"Contexte projet: "
        f"{json.dumps(state.brief.model_dump(mode='json'), ensure_ascii=False)}\n"
        f"Bible, épisode et casting: {json.dumps(context or {}, ensure_ascii=False)}\n"
        f"Objet actuel: {json.dumps(before, ensure_ascii=False)}"
    )


def _context_payload(
    state: GuidedAuthoringState,
    settings: Settings,
) -> dict[str, object]:
    bible = BibleRegistry(settings.private_content_dir).load()
    episode: dict[str, object] | None = None
    if state.active_episode_id:
        try:
            episode = EpisodeCatalog(settings.private_content_dir).get(
                state.active_episode_id
            ).model_dump(mode="json")
        except (FileNotFoundError, ValueError):
            episode = None
    return {
        "draft_characters": [
            item.model_dump(mode="json") for item in state.characters
        ],
        "canonical_characters": [
            {
                "id": item.id,
                "name": item.name,
                "role": item.role,
                "personality": item.personality,
                "wants": item.wants,
                "fears": item.fears,
            }
            for item in bible.characters
        ],
        "canonical_locations": [
            {
                "id": item.id,
                "name": item.name,
                "visual_description": item.visual_description,
            }
            for item in bible.locations
        ],
        "tone": bible.tone.model_dump(mode="json"),
        "art_direction": bible.art_direction.model_dump(mode="json"),
        "active_episode": episode,
    }


def _protect_candidate(
    before: dict[str, object],
    after: dict[str, object],
    mode: str,
) -> dict[str, object]:
    raw_locked = before.get("locked_fields", [])
    protected = {str(item) for item in raw_locked} if isinstance(raw_locked, list) else set()
    for field in protected:
        if field in before:
            after[field] = before[field]
    if mode == "fill_missing":
        for field, value in before.items():
            if field == "locked_fields" or value not in (None, "", [], {}):
                after[field] = value
    return after
