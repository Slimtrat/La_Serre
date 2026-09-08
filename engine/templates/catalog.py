from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any

from engine.templates.models import OutputCriteria, ProjectTemplate, SeriesFormatProfile

TENTAFRUIT_TEMPLATE_ID = "tentafruit-dark-romance-v1"
FORMAT_PROFILE_FILENAME = "series-format.json"

CUSTOM_FORMAT_PROFILE = SeriesFormatProfile(
    id="custom",
    version=1,
    name="Format personnalisé",
    language="fr",
    output=OutputCriteria(
        aspect_ratio="9:16",
        width=1080,
        height=1920,
        duration_seconds_min=1,
        duration_seconds_max=3600,
        shot_count_min=1,
        shot_count_max=999,
    ),
    required_beats=("structure libre", "validation humaine", "provenance", "sortie explicite"),
    narrative_constraints=("Aucune règle narrative imposée par un template.",),
    relationship_axes=(
        {
            "id": "custom",
            "label": "Axe personnalisé",
            "description": "Défini librement dans la Bible du projet.",
        },
    ),
    acceptance_criteria=("Le contenu respecte les contrats techniques du Studio.",),
)


class ProjectTemplateCatalog:
    def __init__(self, root: Path | None = None) -> None:
        self.root = (root or _bundle_root() / "starter_catalog" / "project-templates").resolve()

    def get(self, template_id: str) -> ProjectTemplate:
        if template_id == "custom":
            return ProjectTemplate(
                id="custom",
                version=1,
                name="Projet personnalisé",
                description="Projet libre conservant uniquement les contrats techniques du Studio.",
                format_profile=CUSTOM_FORMAT_PROFILE,
                originality_notice=(
                    "Le contenu et les références restent sous la responsabilité de son auteur."
                ),
            )
        path = self.root / f"{template_id}.json"
        if not path.is_file() or path.parent != self.root:
            raise KeyError(template_id)
        raw: Any = json.loads(path.read_text(encoding="utf-8"))
        return ProjectTemplate.model_validate(raw)

    def list(self) -> tuple[ProjectTemplate, ...]:
        templates = [self.get("custom")]
        templates.extend(
            ProjectTemplate.model_validate_json(path.read_text(encoding="utf-8"))
            for path in sorted(self.root.glob("*.json"))
        )
        return tuple(templates)


def load_format_profile(
    project_root: Path,
    *,
    fallback_template_id: str,
    catalog: ProjectTemplateCatalog | None = None,
) -> SeriesFormatProfile:
    path = project_root / FORMAT_PROFILE_FILENAME
    if path.is_file():
        return SeriesFormatProfile.model_validate_json(path.read_text(encoding="utf-8"))
    return (catalog or ProjectTemplateCatalog()).get(fallback_template_id).format_profile


def _bundle_root() -> Path:
    return Path(str(getattr(sys, "_MEIPASS", Path(__file__).parents[2])))
