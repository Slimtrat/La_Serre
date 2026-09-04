from __future__ import annotations

import json
import os
from pathlib import Path
from types import SimpleNamespace
from typing import cast

from apps.api.project_explorer import (
    ExplorerState,
    aggregate_state,
    build_project_explorer,
    inspect_shot_state,
    progress_for,
)
from engine.narrative.episode_models import EpisodeStatus
from engine.world.catalog import EpisodeCatalog


def write_json(path: Path, payload: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload), encoding="utf-8")


def test_shot_state_uses_metadata_without_reading_media(tmp_path: Path) -> None:
    source = tmp_path / "private" / "S01E001-S01.json"
    output = tmp_path / "output" / "S01E001-S01"
    source.parent.mkdir(parents=True)
    source.write_text("{}", encoding="utf-8")

    assert inspect_shot_state(source, output) == "draft"

    frame = output / "keyframe.png"
    frame.parent.mkdir(parents=True)
    frame.write_bytes(b"not-an-image-and-never-decoded")
    assert inspect_shot_state(source, output) == "review"

    clip = output / "clip.mp4"
    clip.write_bytes(b"not-a-video-and-never-decoded")
    assert inspect_shot_state(source, output) == "complete"

    newer = clip.stat().st_mtime + 10
    os.utime(source, (newer, newer))
    assert inspect_shot_state(source, output) == "stale"

    write_json(output / "generation.json", {"status": "FAILED"})
    assert inspect_shot_state(source, output) == "error"


def test_imported_assets_and_manifest_states_are_understood(tmp_path: Path) -> None:
    source = tmp_path / "S01E001-S01.json"
    source.write_text("{}", encoding="utf-8")
    output = tmp_path / "output"
    write_json(output / "imports" / "assets.json", {"video": {"filename": "video.mp4"}})

    assert inspect_shot_state(source, output) == "complete"

    write_json(output / "generation.json", {"status": "GENERATING"})
    assert inspect_shot_state(source, output) == "production"


def test_progress_and_parent_state_aggregate_plan_states() -> None:
    states: list[ExplorerState] = ["complete", "review", "draft", "error"]

    assert progress_for(states) == {
        "completed": 1,
        "total": 4,
        "percent": 42,
        "states": {"complete": 1, "draft": 1, "error": 1, "review": 1},
    }
    assert aggregate_state(states) == "error"
    assert aggregate_state(["complete", "approved"]) == "approved"
    assert aggregate_state(["complete", "complete"]) == "complete"
    assert aggregate_state([]) == "idea"


def test_project_tree_groups_multiple_seasons_and_aggregates_them(
    tmp_path: Path,
) -> None:
    class CatalogStub:
        root = tmp_path / "private"

        @staticmethod
        def list_episodes() -> list[SimpleNamespace]:
            return [
                SimpleNamespace(id="S01E001", title="One", status=EpisodeStatus.DRAFT),
                SimpleNamespace(id="S02E001", title="Two", status=EpisodeStatus.APPROVED),
            ]

        @staticmethod
        def load(episode_id: str) -> SimpleNamespace:
            season = int(episode_id[1:3])
            shot = SimpleNamespace(id=episode_id + "-S01", duration=4)
            return SimpleNamespace(
                episode=SimpleNamespace(id=episode_id, season=season, episode=1),
                shots=[shot],
            )

    for season in (1, 2):
        source = (
            CatalogStub.root
            / "episodes"
            / f"season-{season:02d}"
            / f"S{season:02d}E001"
            / "shots"
            / f"S{season:02d}E001-S01.json"
        )
        source.parent.mkdir(parents=True)
        source.write_text("{}", encoding="utf-8")
    completed = tmp_path / "output" / "S02E001-S01" / "clip.mp4"
    completed.parent.mkdir(parents=True)
    completed.write_bytes(b"metadata-only")

    result = build_project_explorer(
        cast(EpisodeCatalog, CatalogStub()),
        tmp_path / "output",
    )

    seasons = cast(list[dict[str, object]], result["seasons"])
    assert [season["id"] for season in seasons] == ["S01", "S02"]
    assert seasons[0]["state"] == "draft"
    assert seasons[1]["state"] == "complete"
    assert result["progress"] == {
        "completed": 1,
        "total": 2,
        "percent": 58,
        "states": {"complete": 1, "draft": 1},
    }
