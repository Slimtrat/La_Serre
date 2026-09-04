from __future__ import annotations

import json
import sys
from pathlib import Path

import pytest

from apps.desktop.starter import install_starter_catalog
from engine.world.catalog import EpisodeCatalog


def test_versioned_starter_catalog_contains_complete_episode() -> None:
    package = EpisodeCatalog(Path("starter_catalog")).load("S01E001")

    assert package.episode.title == "L’Héritage interdit"
    assert len(package.characters) == 3
    assert len(package.locations) == 1
    assert len(package.shots) == 10
    assert sum(shot.duration for shot in package.shots) == 50
    episode = Path("starter_catalog/episodes/season-01/S01E001")
    assert (episode / "audio-plan.json").is_file()
    assert (episode / "presentation-plan.json").is_file()
    assert (episode / "subtitles.fr.srt").is_file()


def test_installer_seeds_empty_registered_project_without_overwriting_catalogue(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    bundle = tmp_path / "bundle"
    starter = bundle / "starter_catalog" / "episodes" / "season-01" / "S01E001"
    starter.mkdir(parents=True)
    (starter / "episode.json").write_text('{"title":"starter"}', encoding="utf-8")
    runtime = tmp_path / "runtime"
    empty_project = runtime / "projects" / "empty" / "private"
    empty_project.mkdir(parents=True)
    existing = runtime / "projects" / "existing" / "private"
    existing_episode = existing / "episodes" / "season-01" / "S01E999" / "episode.json"
    existing_episode.parent.mkdir(parents=True)
    existing_episode.write_text('{"title":"mine"}', encoding="utf-8")
    registry = runtime / "workflows" / "local" / "studio-projects.json"
    registry.parent.mkdir(parents=True)
    registry.write_text(
        json.dumps(
            {
                "projects": [
                    {"private_content_dir": str(empty_project)},
                    {"private_content_dir": str(existing)},
                    {"private_content_dir": str(tmp_path.parent / "outside")},
                ]
            }
        ),
        encoding="utf-8",
    )
    monkeypatch.setattr(sys, "_MEIPASS", str(bundle), raising=False)

    installed = install_starter_catalog(runtime)

    relative = Path("episodes/season-01/S01E001/episode.json")
    assert (runtime / ".private" / relative).is_file()
    assert (empty_project / relative).is_file()
    assert existing_episode.read_text(encoding="utf-8") == '{"title":"mine"}'
    assert len(installed) == 2
