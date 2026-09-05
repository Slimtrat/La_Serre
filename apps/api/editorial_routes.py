from __future__ import annotations

import json
from collections.abc import Callable
from datetime import UTC, datetime
from typing import Literal

from fastapi import APIRouter, HTTPException

from apps.api.editorial_history import EditorialHistory
from apps.api.schemas import EditorialExplanationRequest, EditorialVersionRequest
from engine.config import Settings
from engine.narrative.ollama import OllamaClient


def create_editorial_router(
    settings_provider: Callable[[], Settings],
) -> APIRouter:
    router = APIRouter(prefix="/api/editorial-history", tags=["editorial-history"])

    def service() -> EditorialHistory:
        settings = settings_provider()
        return EditorialHistory(settings.private_content_dir, settings.output_dir)

    @router.get("/{episode_id}")
    def listing(
        episode_id: str,
        scope: Literal["episode", "shot"] = "episode",
        shot_id: str | None = None,
    ) -> dict[str, object]:
        try:
            return service().listing(episode_id, scope, shot_id)
        except FileNotFoundError as exc:
            raise HTTPException(status_code=404, detail="Objet éditorial introuvable") from exc
        except (OSError, ValueError) as exc:
            raise HTTPException(status_code=422, detail=str(exc)) from exc

    @router.post("/{episode_id}", status_code=201)
    def create_version(
        episode_id: str, payload: EditorialVersionRequest
    ) -> dict[str, object]:
        try:
            return service().create(
                episode_id,
                **payload.model_dump(mode="python"),
            )
        except FileNotFoundError as exc:
            raise HTTPException(status_code=404, detail="Objet éditorial introuvable") from exc
        except (OSError, ValueError) as exc:
            raise HTTPException(status_code=422, detail=str(exc)) from exc

    @router.get("/{episode_id}/compare")
    def compare(
        episode_id: str,
        scope: Literal["episode", "shot"],
        left: str,
        right: str,
        shot_id: str | None = None,
    ) -> dict[str, object]:
        try:
            return service().compare(episode_id, scope, left, right, shot_id)
        except FileNotFoundError as exc:
            raise HTTPException(status_code=404, detail="Version introuvable") from exc
        except (OSError, ValueError) as exc:
            raise HTTPException(status_code=422, detail=str(exc)) from exc

    @router.post("/{episode_id}/compare/explain")
    async def explain(
        episode_id: str, payload: EditorialExplanationRequest
    ) -> dict[str, object]:
        try:
            comparison = service().compare(
                episode_id,
                payload.scope,
                payload.left,
                payload.right,
                payload.shot_id,
            )
        except FileNotFoundError as exc:
            raise HTTPException(status_code=404, detail="Version introuvable") from exc
        except (OSError, ValueError) as exc:
            raise HTTPException(status_code=422, detail=str(exc)) from exc
        return await _explain_comparison(settings_provider(), comparison)

    @router.post("/{episode_id}/{version_id}/promote")
    def promote(
        episode_id: str,
        version_id: str,
        scope: Literal["episode", "shot"],
        shot_id: str | None = None,
    ) -> dict[str, object]:
        try:
            return service().promote(episode_id, version_id, scope, shot_id)
        except FileNotFoundError as exc:
            raise HTTPException(status_code=404, detail="Version introuvable") from exc
        except (OSError, ValueError) as exc:
            raise HTTPException(status_code=422, detail=str(exc)) from exc

    return router


async def _explain_comparison(
    settings: Settings, comparison: dict[str, object]
) -> dict[str, object]:
    fallback = _deterministic_explanation(comparison)
    provenance: dict[str, object] = {
        "provider": "deterministic",
        "model": None,
        "generated_at": datetime.now(UTC).isoformat(),
        "fallback": True,
    }
    changes = comparison.get("changes", [])
    if not changes:
        return {**fallback, "provenance": provenance}

    try:
        async with OllamaClient(str(settings.ollama_url), timeout_seconds=45) as client:
            models = await client.list_models()
            available = {model.name for model in models}
            model = (
                settings.ollama_model
                if settings.ollama_model in available
                else models[0].name if models else None
            )
            if not model:
                raise ValueError("Aucun modèle Ollama installé")
            content = await client.chat_structured(
                model,
                [
                    {
                        "role": "system",
                        "content": (
                            "Tu compares deux versions d'un scénario. Réponds en français, "
                            "sans inventer de faits, avec une recommandation éditoriale concise."
                        ),
                    },
                    {
                        "role": "user",
                        "content": json.dumps(
                            {
                                "version_gauche": comparison["left"],
                                "version_droite": comparison["right"],
                                "changements": changes,
                            },
                            ensure_ascii=False,
                        ),
                    },
                ],
                {
                    "type": "object",
                    "properties": {
                        "summary": {"type": "string"},
                        "recommendation": {
                            "type": "string",
                            "enum": ["left", "right", "either"],
                        },
                        "reason": {"type": "string"},
                        "risks": {"type": "array", "items": {"type": "string"}},
                    },
                    "required": ["summary", "recommendation", "reason", "risks"],
                },
            )
            result = json.loads(content)
            if not isinstance(result, dict):
                raise ValueError("Réponse IA invalide")
            return {
                "summary": str(result["summary"]),
                "recommendation": str(result["recommendation"]),
                "reason": str(result["reason"]),
                "risks": [str(item) for item in result["risks"]],
                "provenance": {
                    "provider": "ollama",
                    "model": model,
                    "generated_at": datetime.now(UTC).isoformat(),
                    "fallback": False,
                },
            }
    except Exception as exc:
        provenance["error"] = str(exc)[:300]
        return {**fallback, "provenance": provenance}


def _deterministic_explanation(comparison: dict[str, object]) -> dict[str, object]:
    changes = comparison.get("changes", [])
    if not isinstance(changes, list) or not changes:
        return {
            "summary": "Les deux versions sont identiques.",
            "recommendation": "either",
            "reason": "Aucun champ narratif ou technique ne change.",
            "risks": [],
        }
    fields = [
        str(item.get("field"))
        for item in changes[:5]
        if isinstance(item, dict) and item.get("field")
    ]
    return {
        "summary": (
            f"{len(changes)} différence(s) : " + ", ".join(fields)
            + ("…" if len(changes) > 5 else "")
        ),
        "recommendation": "either",
        "reason": (
            "Le contrôle déterministe décrit les écarts mais laisse le choix créatif "
            "à l'utilisateur."
        ),
        "risks": [
            "Vérifier la continuité des personnages, du dialogue et des médias dépendants."
        ],
    }
