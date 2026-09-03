import json
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from typing import cast

import pytest

from apps.api.projects import ProjectRegistry
from engine.config import Settings


def registry(tmp_path: Path) -> ProjectRegistry:
    return ProjectRegistry(
        Settings(
            _env_file=None,
            private_content_dir=tmp_path / "private",
            output_dir=tmp_path / "output",
        ),
        config_path=tmp_path / "config" / "projects.json",
        projects_root=tmp_path / "projects",
    )


def test_project_registry_creates_isolated_namespace_and_persists_selection(
    tmp_path: Path,
) -> None:
    source = tmp_path / "private" / "episodes" / "story.txt"
    source.parent.mkdir(parents=True)
    source.write_text("original", encoding="utf-8")
    projects = registry(tmp_path)

    created = projects.create("Épisode Démo", clone_content=True)

    assert created.id == "episode-demo"
    cloned = Path(created.private_content_dir) / "episodes" / "story.txt"
    assert cloned.read_text(encoding="utf-8") == "original"
    assert Path(created.output_dir).is_dir()
    assert Path(created.output_dir) != tmp_path / "output"

    reloaded = registry(tmp_path)
    assert reloaded.active.id == created.id
    assert reloaded.settings(Settings(_env_file=None)).output_dir == Path(
        created.output_dir
    )


def test_project_registry_creates_unique_slugs_without_cloning(tmp_path: Path) -> None:
    projects = registry(tmp_path)

    first = projects.create("Même projet", clone_content=False)
    second = projects.create("Même projet", clone_content=False)

    assert first.id == "meme-projet"
    assert second.id == "meme-projet-2"
    assert (Path(second.private_content_dir) / "episodes").is_dir()
    assert projects.listing()["active_id"] == second.id


def test_project_registry_rejects_unknown_or_malformed_selection(tmp_path: Path) -> None:
    projects = registry(tmp_path)

    with pytest.raises(KeyError):
        projects.activate("../outside")
    with pytest.raises(KeyError):
        projects.activate("missing")

    assert projects.active.id == "default"


def test_project_registry_recovers_when_saved_active_id_is_missing(tmp_path: Path) -> None:
    projects = registry(tmp_path)
    projects.create("Second", clone_content=False)
    payload = json.loads(projects.config_path.read_text(encoding="utf-8"))
    payload["active_id"] = "removed"
    projects.config_path.write_text(json.dumps(payload), encoding="utf-8")

    reloaded = registry(tmp_path)

    assert reloaded.active_id == "default"


def test_project_registry_serializes_concurrent_creations(tmp_path: Path) -> None:
    projects = registry(tmp_path)

    with ThreadPoolExecutor(max_workers=4) as pool:
        created = list(
            pool.map(
                lambda _index: projects.create("Concurrent", clone_content=False),
                range(6),
            )
        )

    assert len({project.id for project in created}) == 6
    assert len(cast(list[object], projects.listing()["projects"])) == 7
    reloaded = registry(tmp_path)
    assert len(cast(list[object], reloaded.listing()["projects"])) == 7
