from __future__ import annotations

import os
import shutil
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Literal

from engine.generation.comfy.workflow_factory import ModelRequirement

DownloadState = Literal["installed", "ready", "downloading", "missing"]


@dataclass(frozen=True, slots=True)
class ModelInstallStatus:
    filename: str
    folder: str
    state: DownloadState
    downloaded_bytes: int
    destination: str


class ModelInstaller:
    """Moves only allow-listed, completed model downloads into ComfyUI."""

    def __init__(
        self,
        requirements: tuple[ModelRequirement, ...],
        *,
        downloads_dir: Path | None = None,
        models_root: Path | None = None,
        model_search_roots: tuple[Path, ...] | None = None,
    ) -> None:
        self.requirements = requirements
        self.downloads_dir = downloads_dir or Path.home() / "Downloads"
        if models_root is not None:
            self.models_root = models_root
            self.model_search_roots = model_search_roots or (models_root,)
        else:
            detected = self.detect_model_roots()
            self.models_root = detected[0]
            self.model_search_roots = detected

    @staticmethod
    def detect_models_root() -> Path:
        return ModelInstaller.detect_model_roots()[0]

    @staticmethod
    def detect_model_roots() -> tuple[Path, ...]:
        local_app_data = Path(os.environ.get("LOCALAPPDATA", Path.home() / "AppData/Local"))
        candidates = (
            local_app_data / "Comfy-Desktop" / "ComfyUI-Shared" / "models",
            local_app_data
            / "Comfy-Desktop"
            / "ComfyUI-Installs"
            / "ComfyUI"
            / "ComfyUI"
            / "models",
            Path.home() / "Documents" / "ComfyUI" / "models",
            Path.home() / "ComfyUI" / "models",
        )
        existing = tuple(candidate for candidate in candidates if candidate.is_dir())
        return existing or (candidates[0],)

    def inspect(self) -> list[dict[str, object]]:
        return [asdict(self._status(requirement)) for requirement in self.requirements]

    def install_ready(self) -> list[dict[str, object]]:
        installed: list[dict[str, object]] = []
        for requirement in self.requirements:
            status = self._status(requirement)
            if status.state != "ready":
                continue
            source = self.downloads_dir / requirement.filename
            destination = self.models_root / requirement.folder / requirement.filename
            self._assert_child(source, self.downloads_dir)
            self._assert_child(destination, self.models_root)
            destination.parent.mkdir(parents=True, exist_ok=True)
            if destination.exists():
                raise FileExistsError(f"Le modèle existe déjà : {destination}")
            shutil.move(str(source), str(destination))
            installed.append(asdict(self._status(requirement)))
        return installed

    def _status(self, requirement: ModelRequirement) -> ModelInstallStatus:
        destination = self.models_root / requirement.folder / requirement.filename
        source = self.downloads_dir / requirement.filename
        installed_path = next(
            (
                root / requirement.folder / requirement.filename
                for root in self.model_search_roots
                if (root / requirement.folder / requirement.filename).is_file()
                and (root / requirement.folder / requirement.filename).stat().st_size > 0
            ),
            None,
        )
        if installed_path is not None:
            state: DownloadState = "installed"
            destination = installed_path
            downloaded_bytes = installed_path.stat().st_size
        elif source.is_file() and source.stat().st_size > 0:
            state = "ready"
            downloaded_bytes = source.stat().st_size
        else:
            partial_bytes = self._partial_bytes(requirement.filename)
            if partial_bytes or source.exists():
                state = "downloading"
                downloaded_bytes = partial_bytes
            else:
                state = "missing"
                downloaded_bytes = 0
        return ModelInstallStatus(
            filename=requirement.filename,
            folder=requirement.folder,
            state=state,
            downloaded_bytes=downloaded_bytes,
            destination=str(destination),
        )

    def _partial_bytes(self, filename: str) -> int:
        if not self.downloads_dir.is_dir():
            return 0
        prefix = filename.partition(".")[0]
        return max(
            (
                item.stat().st_size
                for item in self.downloads_dir.iterdir()
                if item.is_file()
                and item.name.startswith(prefix)
                and item.name.lower().endswith((".part", ".crdownload", ".download"))
            ),
            default=0,
        )

    @staticmethod
    def _assert_child(path: Path, parent: Path) -> None:
        if not path.resolve().is_relative_to(parent.resolve()):
            raise ValueError(f"Chemin refusé hors du dossier autorisé : {path}")
