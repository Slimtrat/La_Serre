from __future__ import annotations

import json
import shutil
import sys
from pathlib import Path
from typing import Any

STARTER_DIRECTORY = "starter_catalog"


def install_starter_catalog(runtime_root: Path) -> list[Path]:
    """Install the bundled discovery episode into catalogues that are truly empty."""
    root = runtime_root.resolve()
    bundle_root = Path(str(getattr(sys, "_MEIPASS", Path(__file__).parents[2])))
    source = bundle_root / STARTER_DIRECTORY
    if not source.is_dir():
        return []

    destinations = {root / ".private"}
    destinations.update(_registered_catalogues(root))
    projects_root = root / "projects"
    if projects_root.is_dir():
        destinations.update(path.resolve() for path in projects_root.glob("*/private"))

    installed: list[Path] = []
    for destination in sorted(destinations):
        if not destination.is_relative_to(root) or _has_episode(destination):
            continue
        _copy_missing(source, destination)
        installed.append(destination)
    return installed


def _registered_catalogues(runtime_root: Path) -> set[Path]:
    registry = runtime_root / "workflows" / "local" / "studio-projects.json"
    if not registry.is_file():
        return set()
    try:
        payload: Any = json.loads(registry.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return set()
    if not isinstance(payload, dict) or not isinstance(payload.get("projects"), list):
        return set()
    destinations: set[Path] = set()
    for project in payload["projects"]:
        if not isinstance(project, dict):
            continue
        directory = project.get("private_content_dir")
        if isinstance(directory, str) and directory.strip():
            destinations.add(Path(directory).expanduser().resolve())
    return destinations


def _has_episode(catalogue: Path) -> bool:
    return any((catalogue / "episodes").glob("season-*/S*/episode.json"))


def _copy_missing(source: Path, destination: Path) -> None:
    for bundled in source.rglob("*"):
        target = destination / bundled.relative_to(source)
        if bundled.is_dir():
            target.mkdir(parents=True, exist_ok=True)
        elif not target.exists():
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(bundled, target)
