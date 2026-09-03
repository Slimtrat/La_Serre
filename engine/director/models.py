from __future__ import annotations

from pathlib import Path

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class Camera(StrictModel):
    shot_type: str = Field(min_length=1)
    movement: str = Field(min_length=1)
    lens: str = Field(min_length=1)


class Dialogue(StrictModel):
    speaker: str = Field(min_length=1)
    text: str = Field(min_length=1)


class ShotCharacter(StrictModel):
    id: str = Field(pattern=r"^[a-z0-9][a-z0-9_-]*$")
    name: str = Field(min_length=1)
    emotion: str = Field(min_length=1)
    position: str = Field(min_length=1)
    visual_description: str = Field(min_length=1)
    wardrobe: str = Field(min_length=1)
    signature_details: list[str] = Field(default_factory=list)
    reference_images: list[Path] = Field(default_factory=list)


class RenderSpec(StrictModel):
    seed: int = Field(ge=0, le=2**63 - 1)
    width: int = Field(default=576, ge=256, le=2160, multiple_of=8)
    height: int = Field(default=1024, ge=256, le=3840, multiple_of=8)
    fps: int = Field(default=24, ge=1, le=120)
    frames: int | None = Field(default=None, ge=9, le=721)
    negative_prompt: str = ""

    @field_validator("frames")
    @classmethod
    def frames_follow_ltx_constraint(cls, value: int | None) -> int | None:
        if value is not None and (value - 1) % 8 != 0:
            raise ValueError("LTX frame count must be 1 + a multiple of 8")
        return value


class Shot(StrictModel):
    id: str = Field(pattern=r"^S\d{2}E\d{3}-S\d{2}$")
    duration: float = Field(gt=0, le=12)
    location: str = Field(min_length=1)
    location_description: str = Field(min_length=1)
    characters: list[ShotCharacter] = Field(min_length=1, max_length=3)
    camera: Camera
    action: str = Field(min_length=1)
    dialogue: Dialogue | None = None
    lighting: str = Field(min_length=1)
    mood: str = Field(min_length=1)
    style: list[str] = Field(min_length=1)
    render: RenderSpec

    @model_validator(mode="after")
    def derive_frames_and_validate_dialogue(self) -> Shot:
        character_ids = {character.id for character in self.characters}
        if len(character_ids) != len(self.characters):
            raise ValueError("character ids must be unique within a shot")
        if self.dialogue and self.dialogue.speaker not in character_ids:
            raise ValueError("dialogue speaker must be visible in the shot")
        if self.render.frames is None:
            target = max(9, round(self.duration * self.render.fps))
            self.render.frames = max(9, 1 + 8 * round((target - 1) / 8))
        return self
