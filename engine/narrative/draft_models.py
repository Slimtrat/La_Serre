from __future__ import annotations

import hashlib
import re
import unicodedata
from typing import Any, cast

from pydantic import BaseModel, ConfigDict, Field

from engine.director.models import (
    Camera,
    Dialogue,
    DialogueMode,
    RenderSpec,
    Shot,
    ShotCharacter,
)


class StrictDraft(BaseModel):
    model_config = ConfigDict(extra="forbid")


class DraftCharacter(StrictDraft):
    name: str = Field(min_length=1)
    emotion: str = Field(min_length=1)
    position: str = Field(min_length=1)
    visual_description: str = Field(min_length=1)
    wardrobe: str = Field(min_length=1)
    signature_details: list[str] = Field(default_factory=list)


class DraftCamera(StrictDraft):
    shot_type: str = Field(min_length=1)
    movement: str = Field(min_length=1)
    lens: str = Field(min_length=1)


class DraftDialogue(StrictDraft):
    speaker_name: str = Field(min_length=1)
    text: str = Field(min_length=1)
    mode: DialogueMode = DialogueMode.ON_SCREEN


class CreativeShotDraft(StrictDraft):
    location: str = Field(min_length=1)
    location_description: str = Field(min_length=1)
    characters: list[DraftCharacter] = Field(default_factory=list, max_length=3)
    camera: DraftCamera
    action: str = Field(min_length=1)
    dialogue: DraftDialogue | None = None
    lighting: str = Field(min_length=1)
    mood: str = Field(min_length=1)
    style: list[str] = Field(min_length=1)

    @classmethod
    def ollama_schema(cls) -> dict[str, Any]:
        schema = cls.model_json_schema()
        definitions = schema.pop("$defs", {})
        return cast(dict[str, Any], _inline_schema(schema, definitions))

    def to_shot(self, *, shot_id: str, duration: float, source_text: str) -> Shot:
        identifiers = _unique_character_ids([character.name for character in self.characters])
        characters = [
            ShotCharacter(
                id=identifier,
                name=draft.name,
                emotion=draft.emotion,
                position=draft.position,
                visual_description=draft.visual_description,
                wardrobe=draft.wardrobe,
                signature_details=draft.signature_details,
                reference_images=[],
            )
            for identifier, draft in zip(identifiers, self.characters, strict=True)
        ]
        dialogue = None
        if self.dialogue and (
            _has_quoted_dialogue(source_text)
            or self.dialogue.mode is not DialogueMode.ON_SCREEN
        ):
            dialogue = self._dialogue(identifiers)
        seed_bytes = hashlib.blake2b(
            f"{shot_id}\n{source_text}".encode(),
            digest_size=8,
        ).digest()
        seed = int.from_bytes(seed_bytes, "big") & (2**63 - 1)
        return Shot(
            id=shot_id,
            duration=duration,
            location=self.location,
            location_description=self.location_description,
            characters=characters,
            camera=Camera(**self.camera.model_dump()),
            action=self.action,
            dialogue=dialogue,
            lighting=self.lighting,
            mood=self.mood,
            style=self.style,
            render=RenderSpec(seed=seed, width=576, height=1024, fps=24),
        )

    def _dialogue(self, identifiers: list[str]) -> Dialogue | None:
        if not self.dialogue:
            return None
        names = {
            _normalized(character.name): identifier
            for character, identifier in zip(self.characters, identifiers, strict=True)
        }
        speaker = names.get(_normalized(self.dialogue.speaker_name))
        if not speaker and self.dialogue.mode is DialogueMode.ON_SCREEN:
            raise ValueError("Le locuteur du dialogue doit être un personnage visible")
        speaker = speaker or _unique_character_ids([self.dialogue.speaker_name])[0]
        return Dialogue(speaker=speaker, text=self.dialogue.text, mode=self.dialogue.mode)


def _inline_schema(value: Any, definitions: dict[str, Any]) -> Any:
    if isinstance(value, list):
        return [_inline_schema(item, definitions) for item in value]
    if not isinstance(value, dict):
        return value
    reference = value.get("$ref")
    if isinstance(reference, str):
        name = reference.rsplit("/", 1)[-1]
        return _inline_schema(definitions[name], definitions)
    return {
        key: _inline_schema(item, definitions)
        for key, item in value.items()
        if key not in {"title", "default"}
    }


def _unique_character_ids(names: list[str]) -> list[str]:
    used: set[str] = set()
    result: list[str] = []
    for name in names:
        base = re.sub(r"[^a-z0-9]+", "_", _ascii(name).lower()).strip("_") or "character"
        candidate = base
        suffix = 2
        while candidate in used:
            candidate = f"{base}_{suffix}"
            suffix += 1
        used.add(candidate)
        result.append(candidate)
    return result


def _ascii(value: str) -> str:
    return unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode()


def _normalized(value: str) -> str:
    return re.sub(r"\W+", "", _ascii(value).casefold())


def _has_quoted_dialogue(source_text: str) -> bool:
    return bool(re.search(r'["“”«»][^"“”«»]{1,500}["“”«»]', source_text))
