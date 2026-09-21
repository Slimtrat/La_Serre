from __future__ import annotations

import json
from pathlib import Path

from pydantic import BaseModel, ConfigDict, Field, model_validator

from engine.narrative.guided_authoring import GuidedProjectBrief
from engine.templates.catalog import _bundle_root


class ExampleStory(BaseModel):
    """A reusable story seed; never a pre-written episode or a private project."""

    model_config = ConfigDict(extra="forbid")

    id: str = Field(pattern=r"^[a-z0-9][a-z0-9-]*$")
    name: str
    description: str
    language: str = Field(pattern=r"^[a-z]{2}$")
    brief: GuidedProjectBrief
    learning_goals: list[str] = Field(default_factory=list)
    continuity_notes: list[str] = Field(default_factory=list)

    @model_validator(mode="after")
    def brief_matches_language(self) -> ExampleStory:
        if self.brief.language != self.language:
            raise ValueError("Example language and brief language must match")
        return self


class ExampleStoryCatalog:
    """Read-only catalogue of independent, original guided-authoring examples."""

    def __init__(self, root: Path | None = None) -> None:
        bundled = _bundle_root() / "starter_catalog" / "story-examples"
        packaged = Path(__file__).resolve().parent / "story-examples"
        self.root = root if root is not None else (bundled if bundled.is_dir() else packaged)

    def list(self) -> list[ExampleStory]:
        if not self.root.is_dir():
            raise FileNotFoundError(f"Catalogue d’histoires exemples introuvable : {self.root}")
        paths = sorted(self.root.glob("*.json"))
        if not paths:
            raise ValueError(f"Catalogue d’histoires exemples vide : {self.root}")
        examples = [
            ExampleStory.model_validate(json.loads(path.read_text(encoding="utf-8")))
            for path in paths
        ]
        ids = [item.id for item in examples]
        if len(ids) != len(set(ids)):
            raise ValueError("Duplicate example story id")
        return examples
