from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field, field_validator


class StrictWorldModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class CharacterProfile(StrictWorldModel):
    id: str = Field(pattern=r"^[a-z0-9][a-z0-9_-]*$")
    name: str = Field(min_length=1)
    role: str = Field(min_length=1)
    visual_description: str = Field(min_length=20)
    wardrobe: str = Field(min_length=20)
    signature_details: list[str] = Field(min_length=1)
    palette: list[str] = Field(min_length=3, max_length=8)
    personality: dict[str, float] = Field(min_length=3)
    wants: list[str] = Field(min_length=1)
    fears: list[str] = Field(min_length=1)
    voice_description: str = Field(min_length=10)
    generation_negative_prompt: str = Field(min_length=1)

    @field_validator("personality")
    @classmethod
    def personality_values_are_normalized(
        cls,
        value: dict[str, float],
    ) -> dict[str, float]:
        invalid = {name: score for name, score in value.items() if not 0 <= score <= 1}
        if invalid:
            raise ValueError(f"Personality values must be between 0 and 1: {invalid}")
        return value


class LocationProfile(StrictWorldModel):
    id: str = Field(pattern=r"^[a-z0-9][a-z0-9_-]*$")
    name: str = Field(min_length=1)
    visual_description: str = Field(min_length=20)
    signature_details: list[str] = Field(min_length=1)
    palette: list[str] = Field(min_length=3, max_length=8)
    generation_negative_prompt: str = Field(min_length=1)


class RelationshipState(StrictWorldModel):
    source: str = Field(pattern=r"^[a-z0-9][a-z0-9_-]*$")
    target: str = Field(pattern=r"^[a-z0-9][a-z0-9_-]*$")
    desire: int = Field(ge=-100, le=100)
    trust: int = Field(ge=-100, le=100)
    anger: int = Field(ge=-100, le=100)
    fear: int = Field(ge=-100, le=100)
    attachment: int = Field(ge=-100, le=100)


class Secret(StrictWorldModel):
    id: str = Field(pattern=r"^[a-z0-9][a-z0-9_-]*$")
    owners: list[str] = Field(min_length=1)
    known_by: list[str] = Field(default_factory=list)
    hidden_from: list[str] = Field(default_factory=list)
    summary: str = Field(min_length=10)
    severity: float = Field(ge=0, le=1)
    created_episode: int = Field(ge=1)
    revealed: bool = False


class TimelineEvent(StrictWorldModel):
    episode: int = Field(ge=1)
    type: str = Field(min_length=1)
    characters: list[str] = Field(min_length=1)
    description: str = Field(min_length=10)
