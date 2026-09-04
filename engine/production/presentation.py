from __future__ import annotations

from pathlib import Path
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator


class EpisodePresentationPlan(BaseModel):
    """Reusable visual grammar applied during final assembly."""

    model_config = ConfigDict(extra="forbid")

    schema_version: int = 1
    frame_asset: Path | None = None
    framed_shots: list[str] = Field(default_factory=list)
    captions: dict[str, str] = Field(default_factory=dict)
    caption_positions: dict[str, Literal["top", "center", "bottom"]] = Field(
        default_factory=dict
    )

    @field_validator("framed_shots")
    @classmethod
    def validate_shot_ids(cls, values: list[str]) -> list[str]:
        invalid = [value for value in values if not value.startswith("S") or "-S" not in value]
        if invalid:
            raise ValueError(f"Identifiants de plans invalides : {', '.join(invalid)}")
        return values

    @classmethod
    def load(cls, path: Path | None) -> EpisodePresentationPlan:
        if path is None or not path.is_file():
            return cls()
        plan = cls.model_validate_json(path.read_text(encoding="utf-8"))
        if plan.frame_asset is not None and not plan.frame_asset.is_absolute():
            plan.frame_asset = (path.parent / plan.frame_asset).resolve()
        return plan

    def frame_for(self, shot_id: str) -> Path | None:
        if shot_id not in self.framed_shots:
            return None
        if self.frame_asset is None or not self.frame_asset.is_file():
            raise FileNotFoundError(f"Cadre fantasy introuvable : {self.frame_asset}")
        return self.frame_asset

    def caption_for(self, shot_id: str) -> tuple[str | None, str]:
        return self.captions.get(shot_id), self.caption_positions.get(shot_id, "center")
