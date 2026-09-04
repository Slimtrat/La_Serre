from __future__ import annotations

import json
import re
import shutil
import threading
import unicodedata
from dataclasses import asdict, dataclass
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from engine.config import Settings
from engine.production.artifacts import write_text_atomic

PROJECT_ID = re.compile(r"^[a-z0-9][a-z0-9-]{0,63}$")


@dataclass(frozen=True, slots=True)
class StudioProject:
    id: str
    name: str
    private_content_dir: str
    output_dir: str
    created_at: str

    @classmethod
    def from_payload(cls, payload: dict[str, Any]) -> StudioProject:
        project = cls(
            id=str(payload["id"]),
            name=str(payload["name"]),
            private_content_dir=str(payload["private_content_dir"]),
            output_dir=str(payload["output_dir"]),
            created_at=str(payload["created_at"]),
        )
        if not PROJECT_ID.fullmatch(project.id):
            raise ValueError(f"Identifiant de projet invalide : {project.id}")
        return project

    def public(self, *, active: bool) -> dict[str, object]:
        return {**asdict(self), "active": active}


class ProjectRegistry:
    """Persistent project namespaces for narrative sources and generated outputs."""

    def __init__(
        self,
        base_settings: Settings,
        *,
        config_path: Path,
        projects_root: Path,
    ) -> None:
        self._lock = threading.RLock()
        self.config_path = config_path.resolve()
        self.projects_root = projects_root.resolve()
        fallback = StudioProject(
            id="default",
            name="Découverte — L’Héritage interdit",
            private_content_dir=str(base_settings.private_content_dir.resolve()),
            output_dir=str(base_settings.output_dir.resolve()),
            created_at=datetime.now(UTC).isoformat(),
        )
        self.projects: dict[str, StudioProject] = {fallback.id: fallback}
        self.active_id = fallback.id
        self._load()

    @property
    def active(self) -> StudioProject:
        with self._lock:
            return self.projects[self.active_id]

    def settings(self, base: Settings) -> Settings:
        project = self.active
        return base.model_copy(
            update={
                "private_content_dir": Path(project.private_content_dir),
                "output_dir": Path(project.output_dir),
            }
        )

    def listing(self) -> dict[str, object]:
        with self._lock:
            return {
                "active_id": self.active_id,
                "projects": [
                    project.public(active=project.id == self.active_id)
                    for project in self.projects.values()
                ],
            }

    def create(self, name: str, *, clone_content: bool = True) -> StudioProject:
        clean_name = " ".join(name.split()).strip()
        if not clean_name:
            raise ValueError("Le nom du projet est vide")
        with self._lock:
            base_id = self._slug(clean_name)
            project_id = base_id
            suffix = 2
            while project_id in self.projects:
                project_id = f"{base_id[: max(1, 62 - len(str(suffix)))]}-{suffix}"
                suffix += 1
            root = (self.projects_root / project_id).resolve()
            if root.parent != self.projects_root:
                raise ValueError("Chemin de projet invalide")
            private_root = root / "private"
            output_root = root / "output"
            if clone_content and Path(self.active.private_content_dir).is_dir():
                shutil.copytree(self.active.private_content_dir, private_root)
            else:
                (private_root / "episodes").mkdir(parents=True, exist_ok=True)
            output_root.mkdir(parents=True, exist_ok=True)
            project = StudioProject(
                id=project_id,
                name=clean_name,
                private_content_dir=str(private_root),
                output_dir=str(output_root),
                created_at=datetime.now(UTC).isoformat(),
            )
            self.projects[project.id] = project
            self.active_id = project.id
            self._save()
            return project

    def activate(self, project_id: str) -> StudioProject:
        with self._lock:
            if not PROJECT_ID.fullmatch(project_id) or project_id not in self.projects:
                raise KeyError(project_id)
            self.active_id = project_id
            Path(self.active.output_dir).mkdir(parents=True, exist_ok=True)
            self._save()
            return self.active

    def _load(self) -> None:
        if not self.config_path.is_file():
            return
        raw: Any = json.loads(self.config_path.read_text(encoding="utf-8"))
        if not isinstance(raw, dict) or not isinstance(raw.get("projects"), list):
            raise ValueError(f"Registre de projets invalide : {self.config_path}")
        loaded = {
            project.id: project
            for item in raw["projects"]
            if isinstance(item, dict)
            for project in (StudioProject.from_payload(item),)
        }
        if loaded:
            self.projects = loaded
        active_id = str(raw.get("active_id", ""))
        self.active_id = active_id if active_id in self.projects else next(iter(self.projects))

    def _save(self) -> None:
        payload = {
            "version": 1,
            "active_id": self.active_id,
            "projects": [asdict(project) for project in self.projects.values()],
        }
        write_text_atomic(
            self.config_path,
            json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
        )

    @staticmethod
    def _slug(value: str) -> str:
        normalized = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode()
        slug = re.sub(r"[^a-z0-9]+", "-", normalized.lower()).strip("-")[:64]
        return slug or "projet"
