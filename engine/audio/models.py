from __future__ import annotations

from pathlib import Path
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class StrictAudioModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class VoicePreset(StrictAudioModel):
    backend: Literal["sapi", "edge"] = "sapi"
    voice: str | None = None
    rate: int = Field(default=0, ge=-10, le=10)
    volume: int = Field(default=100, ge=0, le=100)
    pitch_hz: int = Field(default=0, ge=-100, le=100)


class DialogueCue(StrictAudioModel):
    offset_seconds: float = Field(default=0.35, ge=0, le=10)
    gain_db: float = Field(default=0, ge=-60, le=12)


class EpisodeAudioPlan(StrictAudioModel):
    schema_version: int = 1
    voices: dict[str, VoicePreset] = Field(default_factory=dict)
    cues: dict[str, DialogueCue] = Field(default_factory=dict)
    music_gain_db: float = Field(default=-16, ge=-60, le=6)
    ambience_gain_db: float = Field(default=-26, ge=-60, le=6)

    @classmethod
    def load(cls, path: Path | None) -> EpisodeAudioPlan:
        if path is None or not path.is_file():
            return cls()
        return cls.model_validate_json(path.read_text(encoding="utf-8"))

    def voice_for(self, speaker: str) -> VoicePreset:
        return self.voices.get(speaker, VoicePreset())

    def cue_for(self, shot_id: str) -> DialogueCue:
        return self.cues.get(shot_id, DialogueCue())
