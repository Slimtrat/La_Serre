from __future__ import annotations

import json
import os
import re
import shutil
import threading
import unicodedata
from dataclasses import asdict, dataclass
from datetime import UTC, datetime
from pathlib import Path
from typing import Any, Literal, cast

from engine.config import Settings
from engine.production.artifacts import write_text_atomic

PROJECT_ID = re.compile(r"^[a-z0-9][a-z0-9-]{0,63}$")
ProjectKind = Literal["discovery", "user"]
StorageLayout = Literal["legacy", "shared-root", "split-roots"]
PROJECT_MARKER = ".serre-studio-project.json"


@dataclass(frozen=True, slots=True)
class StudioProject:
    id: str
    name: str
    private_content_dir: str
    output_dir: str
    created_at: str
    kind: ProjectKind = "user"
    storage_managed: bool = False
    storage_layout: StorageLayout = "legacy"

    @classmethod
    def from_payload(cls, payload: dict[str, Any]) -> StudioProject:
        raw_kind = payload.get("kind")
        kind: ProjectKind = (
            raw_kind
            if raw_kind in {"discovery", "user"}
            else "discovery"
            if str(payload.get("id")) == "default"
            else "user"
        )
        project = cls(
            id=str(payload["id"]),
            name=str(payload["name"]),
            private_content_dir=str(payload["private_content_dir"]),
            output_dir=str(payload["output_dir"]),
            created_at=str(payload["created_at"]),
            kind=kind,
            storage_managed=payload.get("storage_managed") is True,
            storage_layout=cast(
                StorageLayout,
                str(payload["storage_layout"])
                if payload.get("storage_layout")
                in {"legacy", "shared-root", "split-roots"}
                else "legacy",
            ),
        )
        if not PROJECT_ID.fullmatch(project.id):
            raise ValueError(f"Identifiant de projet invalide : {project.id}")
        return project

    def public(self, *, active: bool, deletable: bool) -> dict[str, object]:
        work_dir = Path(self.private_content_dir).resolve()
        output_dir = Path(self.output_dir).resolve()
        return {
            **asdict(self),
            "private_content_dir": str(work_dir),
            "work_dir": str(work_dir),
            "output_dir": str(output_dir),
            "work_exists": work_dir.is_dir(),
            "output_exists": output_dir.is_dir(),
            "active": active,
            "deletable": deletable,
        }


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
        self.work_root = self.projects_root
        self.output_root = self.projects_root
        fallback = StudioProject(
            id="default",
            name="Découverte — L’Héritage interdit",
            private_content_dir=str(base_settings.private_content_dir.resolve()),
            output_dir=str(base_settings.output_dir.resolve()),
            created_at=datetime.now(UTC).isoformat(),
            kind="discovery",
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
                "storage": self.storage_listing(),
                "projects": [
                    project.public(
                        active=project.id == self.active_id,
                        deletable=len(self.projects) > 1
                        and (
                            project.id != self.active_id
                            or project.kind == "discovery"
                        ),
                    )
                    for project in self.projects.values()
                ],
            }

    def storage_listing(self) -> dict[str, object]:
        return {
            "work_root": str(self.work_root),
            "output_root": str(self.output_root),
            "layout": (
                "shared-root"
                if self.work_root == self.output_root
                else "split-roots"
            ),
        }

    def configure_storage(
        self, work_root: Path, output_root: Path
    ) -> dict[str, object]:
        """Set roots used by future projects without moving existing data."""
        with self._lock:
            work = self._validate_storage_root(work_root)
            output = self._validate_storage_root(output_root)
            work.mkdir(parents=True, exist_ok=True)
            output.mkdir(parents=True, exist_ok=True)
            self.work_root = work
            self.output_root = output
            self._save()
            return self.storage_listing()

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
            if self.work_root == self.output_root:
                project_root = self._direct_child(self.work_root, project_id)
                private_root = project_root / "work"
                output_root = project_root / "output"
                layout: StorageLayout = "shared-root"
            else:
                private_root = self._direct_child(self.work_root, project_id)
                output_root = self._direct_child(self.output_root, project_id)
                layout = "split-roots"
            namespace_exists = (
                private_root.parent.exists()
                if layout == "shared-root"
                else private_root.exists() or output_root.exists()
            )
            if namespace_exists:
                raise ValueError(
                    "Un dossier existe déjà pour cet identifiant de projet"
                )
            cleanup_targets = (
                [private_root.parent]
                if layout == "shared-root"
                else [private_root, output_root]
            )
            try:
                if clone_content and Path(self.active.private_content_dir).is_dir():
                    shutil.copytree(self.active.private_content_dir, private_root)
                else:
                    (private_root / "episodes").mkdir(parents=True, exist_ok=True)
                output_root.mkdir(parents=True, exist_ok=True)
                self._write_marker(private_root, project_id, "work")
                self._write_marker(output_root, project_id, "output")
            except OSError:
                for target in cleanup_targets:
                    if target.exists() and not target.is_symlink():
                        shutil.rmtree(target)
                raise
            project = StudioProject(
                id=project_id,
                name=clean_name,
                private_content_dir=str(private_root),
                output_dir=str(output_root),
                created_at=datetime.now(UTC).isoformat(),
                kind="user",
                storage_managed=True,
                storage_layout=layout,
            )
            self.projects[project.id] = project
            self.active_id = project.id
            self._save()
            return project

    def remove(
        self,
        project_id: str,
        *,
        delete_files: bool,
        confirmation: str | None = None,
    ) -> StudioProject:
        """Unregister a non-active project and optionally erase its verified namespace."""
        with self._lock:
            if not PROJECT_ID.fullmatch(project_id) or project_id not in self.projects:
                raise KeyError(project_id)
            project = self.projects[project_id]
            if len(self.projects) <= 1:
                raise ValueError("Le dernier projet du Studio ne peut pas être supprimé")
            if project_id == self.active_id:
                raise ValueError("Change de projet actif avant de supprimer celui-ci")

            targets: list[Path] = []
            if delete_files:
                if confirmation != project.name:
                    raise ValueError("Recopie exactement le nom du projet pour confirmer")
                targets = self._validated_delete_targets(project)

            del self.projects[project_id]
            try:
                self._save()
            except OSError:
                self.projects[project_id] = project
                raise

            try:
                for target in targets:
                    shutil.rmtree(target)
            except OSError:
                self.projects[project_id] = project
                self._save()
                raise
            return project

    def folder(self, project_id: str, role: Literal["work", "output"]) -> Path:
        with self._lock:
            if not PROJECT_ID.fullmatch(project_id) or project_id not in self.projects:
                raise KeyError(project_id)
            project = self.projects[project_id]
            path = Path(
                project.private_content_dir if role == "work" else project.output_dir
            ).resolve()
            path.mkdir(parents=True, exist_ok=True)
            return path

    def open_folder(
        self, project_id: str, role: Literal["work", "output"]
    ) -> Path:
        path = self.folder(project_id, role)
        if os.name != "nt":
            raise OSError(
                "L’ouverture de dossier est disponible dans l’application Windows"
            )
        os.startfile(str(path))
        return path

    def delete_discovery(self, project_id: str) -> StudioProject:
        """Unregister only the bundled discovery project; never delete project files."""
        with self._lock:
            if not PROJECT_ID.fullmatch(project_id) or project_id not in self.projects:
                raise KeyError(project_id)
            project = self.projects[project_id]
            if project.kind != "discovery":
                raise ValueError("Seul le projet Découverte peut être supprimé ici")
            remaining = [item for item in self.projects.values() if item.id != project_id]
            if not remaining:
                raise ValueError(
                    "Crée d’abord ton projet avant de supprimer le projet Découverte"
                )
            del self.projects[project_id]
            if self.active_id == project_id:
                self.active_id = remaining[0].id
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
        roots = raw.get("storage")
        if isinstance(roots, dict):
            raw_work = roots.get("work_root")
            raw_output = roots.get("output_root")
            if isinstance(raw_work, str) and isinstance(raw_output, str):
                self.work_root = Path(raw_work).expanduser().resolve()
                self.output_root = Path(raw_output).expanduser().resolve()
        active_id = str(raw.get("active_id", ""))
        self.active_id = active_id if active_id in self.projects else next(iter(self.projects))

    def _save(self) -> None:
        payload = {
            "version": 3,
            "active_id": self.active_id,
            "storage": self.storage_listing(),
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

    @staticmethod
    def _validate_storage_root(value: Path) -> Path:
        expanded = value.expanduser()
        if not expanded.is_absolute():
            raise ValueError("Le dossier racine doit être un chemin absolu")
        root = expanded.resolve()
        if root == Path(root.anchor):
            raise ValueError(
                "Choisis un dossier racine précis, pas la racine d’un disque"
            )
        return root

    @staticmethod
    def _direct_child(root: Path, project_id: str) -> Path:
        target = (root / project_id).resolve()
        if target.parent != root or target == root:
            raise ValueError("Chemin de projet invalide")
        return target

    @staticmethod
    def _write_marker(
        path: Path, project_id: str, role: Literal["work", "output"]
    ) -> None:
        write_text_atomic(
            path / PROJECT_MARKER,
            json.dumps(
                {"version": 1, "project_id": project_id, "role": role},
                ensure_ascii=False,
                indent=2,
            )
            + "\n",
        )

    def _validated_delete_targets(self, project: StudioProject) -> list[Path]:
        if not project.storage_managed or project.storage_layout == "legacy":
            raise ValueError(
                "Ce projet ancien peut être désenregistré, mais ses fichiers "
                "doivent être supprimés manuellement"
            )
        work = Path(project.private_content_dir).resolve()
        output = Path(project.output_dir).resolve()
        if project.storage_layout == "shared-root":
            container = work.parent
            if (
                work.name != "work"
                or output.name != "output"
                or output.parent != container
                or container.name != project.id
                or container.parent == Path(container.anchor)
            ):
                raise ValueError(
                    "Les chemins du projet ne correspondent plus à son manifeste"
                )
            targets = [container]
        else:
            if (
                work.name != project.id
                or output.name != project.id
                or work == output
                or work.parent == Path(work.anchor)
                or output.parent == Path(output.anchor)
            ):
                raise ValueError(
                    "Les chemins du projet ne correspondent plus à son manifeste"
                )
            targets = [work, output]

        self._validate_marker(work, project.id, "work")
        self._validate_marker(output, project.id, "output")
        for target in targets:
            if target.is_symlink() or target == Path(target.anchor):
                raise ValueError("Refus de supprimer un chemin non sûr")
        return targets

    @staticmethod
    def _validate_marker(
        path: Path, project_id: str, role: Literal["work", "output"]
    ) -> None:
        marker = path / PROJECT_MARKER
        try:
            payload: Any = json.loads(marker.read_text(encoding="utf-8"))
        except (OSError, ValueError) as exc:
            raise ValueError(f"Manifeste de sécurité absent pour {path}") from exc
        if (
            not isinstance(payload, dict)
            or payload.get("project_id") != project_id
            or payload.get("role") != role
        ):
            raise ValueError(f"Manifeste de sécurité invalide pour {path}")
