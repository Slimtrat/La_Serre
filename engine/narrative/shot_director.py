from __future__ import annotations

from dataclasses import dataclass

from pydantic import ValidationError

from engine.director.models import Shot
from engine.narrative.draft_models import CreativeShotDraft
from engine.narrative.ollama import OllamaClient


@dataclass(frozen=True, slots=True)
class ShotDraft:
    shot: Shot
    model: str
    attempts: int


class OllamaShotDirector:
    def __init__(self, client: OllamaClient) -> None:
        self.client = client

    async def draft(
        self,
        source_text: str,
        *,
        shot_id: str,
        duration: float,
        model: str,
    ) -> ShotDraft:
        schema = CreativeShotDraft.ollama_schema()
        messages = [
            {"role": "system", "content": self._system_prompt()},
            {
                "role": "user",
                "content": self._user_prompt(source_text, shot_id, duration),
            },
        ]
        last_error = "réponse invalide"
        for attempt in range(1, 3):
            raw = await self.client.chat_structured(model, messages, schema)
            try:
                creative = CreativeShotDraft.model_validate_json(self._json_object(raw))
                shot = creative.to_shot(
                    shot_id=shot_id,
                    duration=duration,
                    source_text=source_text,
                )
                return ShotDraft(shot=shot, model=model, attempts=attempt)
            except (ValidationError, ValueError) as exc:
                last_error = str(exc)
                messages.extend(
                    (
                        {"role": "assistant", "content": raw},
                        {
                            "role": "user",
                            "content": (
                                "Corrige uniquement le JSON. Respecte exactement le schéma, "
                                f"shot_id={shot_id}, duration={duration}. Erreur : {last_error}"
                            ),
                        },
                    )
                )
        raise ValueError(f"Ollama n'a pas produit de Shot valide après 2 essais : {last_error}")

    @staticmethod
    def _json_object(content: str) -> str:
        start = content.find("{")
        end = content.rfind("}")
        if start < 0 or end <= start:
            raise ValueError("Aucun objet JSON trouvé dans la réponse Ollama")
        return content[start : end + 1]

    @staticmethod
    def _system_prompt() -> str:
        return (
            "Tu es le Director d'un studio de fiction verticale. Transforme une source "
            "narrative en un seul plan filmable de 1 à 12 secondes. La sortie doit être "
            "un objet JSON strict, sans commentaire. Les descriptions visuelles, actions, "
            "émotions, lumière et caméra doivent être en anglais pour les modèles image et "
            "vidéo. Ne mets dans dialogue que les mots réellement prononcés. Assure la "
            "cohérence entre action, personnages visibles et durée. Préserve fidèlement "
            "le lieu, les objets et les événements de la source : ne les remplace jamais "
            "par des synonymes qui en changent le sens. Sans réplique entre guillemets "
            "dans la source, dialogue doit être null."
        )

    @staticmethod
    def _user_prompt(source_text: str, shot_id: str, duration: float) -> str:
        return (
            f"SHOT ID: {shot_id}\nDURATION: {duration}\n\nSOURCE:\n{source_text}\n\n"
            "Propose les éléments créatifs du plan. Ne recopie jamais un schéma. "
            "Utilise exactement le nom d'un personnage visible dans speaker_name."
        )
