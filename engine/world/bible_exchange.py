from __future__ import annotations

from typing import Any, Final, Literal

from pydantic import Field, model_validator

from engine.world.models import (
    ArtDirection,
    CanonicalPrompt,
    CanonicalReference,
    CharacterProfile,
    LocationProfile,
    NarrativeArc,
    ProjectBible,
    RelationshipState,
    Secret,
    StrictWorldModel,
    ToneProfile,
    WorldRule,
)

BIBLE_EXCHANGE_FORMAT: Final[Literal["serre.project-bible"]] = "serre.project-bible"
BIBLE_EXCHANGE_VERSION: Final[Literal[1]] = 1
BIBLE_SCHEMA_ID = "urn:serre-des-venins:schema:project-bible-exchange:1"
JSON_SCHEMA_DIALECT = "https://json-schema.org/draft/2020-12/schema"


class PortableProjectBible(StrictWorldModel):
    """Canonical bible content without local revision and audit metadata."""

    schema_version: Literal[1] = 1
    title: str = Field(default="Titre du projet", min_length=1)
    characters: list[CharacterProfile] = Field(default_factory=list)
    locations: list[LocationProfile] = Field(default_factory=list)
    relationships: list[RelationshipState] = Field(default_factory=list)
    art_direction: ArtDirection = Field(default_factory=ArtDirection)
    tone: ToneProfile = Field(default_factory=ToneProfile)
    world_rules: list[WorldRule] = Field(default_factory=list)
    narrative_arcs: list[NarrativeArc] = Field(default_factory=list)
    secrets: list[Secret] = Field(default_factory=list)
    references: list[CanonicalReference] = Field(default_factory=list)
    prompts: list[CanonicalPrompt] = Field(default_factory=list)

    @model_validator(mode="after")
    def canonical_graph_is_coherent(self) -> PortableProjectBible:
        self.to_project_bible()
        return self

    @classmethod
    def from_project_bible(cls, bible: ProjectBible) -> PortableProjectBible:
        payload = bible.model_dump(mode="json", exclude={"revision", "updated_at", "changes"})
        return cls.model_validate(payload)

    def to_project_bible(self) -> ProjectBible:
        return ProjectBible.model_validate(self.model_dump(mode="json"))


class BibleExchangeDocument(StrictWorldModel):
    """Stable document accepted by export, AI handoff and import."""

    format: Literal["serre.project-bible"]
    format_version: Literal[1]
    bible: PortableProjectBible

    @classmethod
    def from_project_bible(cls, bible: ProjectBible) -> BibleExchangeDocument:
        return cls(
            format=BIBLE_EXCHANGE_FORMAT,
            format_version=BIBLE_EXCHANGE_VERSION,
            bible=PortableProjectBible.from_project_bible(bible),
        )


class BibleAiKit(StrictWorldModel):
    format: Literal["serre.project-bible.ai-kit"] = "serre.project-bible.ai-kit"
    format_version: Literal[1] = BIBLE_EXCHANGE_VERSION
    task: str
    instructions: list[str]
    schema_document: dict[str, Any]
    empty_template: BibleExchangeDocument


def bible_exchange_schema() -> dict[str, Any]:
    schema = BibleExchangeDocument.model_json_schema(mode="validation")
    return {
        "$schema": JSON_SCHEMA_DIALECT,
        "$id": BIBLE_SCHEMA_ID,
        **schema,
    }


def empty_bible_exchange() -> BibleExchangeDocument:
    return BibleExchangeDocument(
        format=BIBLE_EXCHANGE_FORMAT,
        format_version=BIBLE_EXCHANGE_VERSION,
        bible=PortableProjectBible(),
    )


def bible_ai_kit() -> BibleAiKit:
    return BibleAiKit(
        task=(
            "Analyse la conversation jointe et transpose uniquement les éléments canoniques "
            "dans un document serre.project-bible valide."
        ),
        instructions=[
            "Retourne uniquement le document JSON final, sans Markdown ni commentaire.",
            "Respecte exactement schema_document et conserve format et format_version.",
            "Sépare les faits canoniques des hypothèses ; n'invente pas pour remplir une liste.",
            "Utilise des identifiants stables en minuscules, chiffres, tirets ou underscores.",
            "Toute relation, arc, référence, secret ou prompt doit viser un identifiant existant.",
            "Écris les descriptions visuelles comme des invariants réutilisables entre les plans.",
            "Normalise les traits de personnalité entre 0 et 1 et les relations entre -100 et 100.",
            "Laisse les collections vides lorsque la conversation ne contient aucune information.",
        ],
        schema_document=bible_exchange_schema(),
        empty_template=empty_bible_exchange(),
    )
