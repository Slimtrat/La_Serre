from __future__ import annotations

import json
from collections import Counter
from pathlib import Path
from typing import Literal, TypedDict, cast

from engine.narrative.episode_models import EpisodeStatus
from engine.world.catalog import EpisodeCatalog

ExplorerState = Literal[
    "idea",
    "draft",
    "review",
    "approved",
    "production",
    "complete",
    "error",
    "stale",
]

STATE_PROGRESS: dict[ExplorerState, int] = {
    "idea": 0,
    "draft": 15,
    "review": 55,
    "approved": 75,
    "production": 80,
    "complete": 100,
    "error": 0,
    "stale": 65,
}


class ExplorerProgress(TypedDict):
    completed: int
    total: int
    percent: int
    states: dict[str, int]


def build_project_explorer(
    catalog: EpisodeCatalog,
    output_root: Path,
) -> dict[str, object]:
    """Build a media-free project tree from narrative and manifest metadata."""
    seasons: dict[int, list[dict[str, object]]] = {}
    all_shot_states: list[ExplorerState] = []

    for summary in catalog.list_episodes():
        package = catalog.load(summary.id)
        shots: list[dict[str, object]] = []
        shot_states: list[ExplorerState] = []
        for index, shot in enumerate(package.shots, start=1):
            source_path = (
                catalog.root
                / "episodes"
                / f"season-{package.episode.season:02d}"
                / package.episode.id
                / "shots"
                / f"{shot.id}.json"
            )
            state = inspect_shot_state(source_path, output_root / shot.id)
            shot_states.append(state)
            shots.append(
                {
                    "id": shot.id,
                    "number": index,
                    "state": state,
                    "duration": shot.duration,
                }
            )

        episode_state = aggregate_state(
            shot_states,
            base=_episode_base_state(summary.status),
        )
        master_state = _manifest_status(output_root / summary.id / "episode-generation.json")
        if master_state == "complete":
            episode_state = "complete"
        elif master_state in {"error", "production"}:
            episode_state = master_state

        all_shot_states.extend(shot_states)
        seasons.setdefault(package.episode.season, []).append(
            {
                "id": summary.id,
                "number": package.episode.episode,
                "title": summary.title,
                "state": episode_state,
                "progress": progress_for(shot_states),
                "shots": shots,
            }
        )

    season_payload: list[dict[str, object]] = []
    for season_number, episodes in sorted(seasons.items()):
        episodes.sort(key=lambda item: int(cast(int, item["number"])))
        season_states = [
            cast(ExplorerState, shot["state"])
            for episode in episodes
            for shot in cast(list[dict[str, object]], episode["shots"])
        ]
        season_payload.append(
            {
                "id": f"S{season_number:02d}",
                "number": season_number,
                "title": f"Saison {season_number}",
                "state": aggregate_state(season_states),
                "progress": progress_for(season_states),
                "episodes": episodes,
            }
        )

    return {
        "title": "La Serre des Venins",
        "state": aggregate_state(all_shot_states),
        "progress": progress_for(all_shot_states),
        "seasons": season_payload,
    }


def inspect_shot_state(source_path: Path, output_dir: Path) -> ExplorerState:
    manifest_path = output_dir / "generation.json"
    manifest_state = _manifest_status(manifest_path)
    if manifest_state in {"error", "production"}:
        return manifest_state

    assets = _read_mapping(output_dir / "imports" / "assets.json")
    has_video = (output_dir / "clip.mp4").is_file() or isinstance(assets.get("video"), dict)
    has_keyframe = (output_dir / "keyframe.png").is_file() or isinstance(
        assets.get("keyframe"), dict
    )
    activity_paths = [
        manifest_path,
        output_dir / "clip.mp4",
        output_dir / "keyframe.png",
        output_dir / "keyframe-guide-1.png",
        output_dir / "keyframe-guide-2.png",
        output_dir / "imports" / "assets.json",
    ]
    latest_output = max((_mtime(path) for path in activity_paths), default=0.0)
    if latest_output and _mtime(source_path) > latest_output:
        return "stale"
    if has_video or manifest_state == "complete":
        return "complete"
    if manifest_state == "approved":
        return "approved"
    if has_keyframe or manifest_state == "review":
        return "review"
    return "draft"


def aggregate_state(
    states: list[ExplorerState],
    *,
    base: ExplorerState = "idea",
) -> ExplorerState:
    if not states:
        return base
    for state in ("error", "production", "stale", "review"):
        if state in states:
            return cast(ExplorerState, state)
    if all(state == "complete" for state in states):
        return "complete"
    if all(state in {"approved", "complete"} for state in states):
        return "approved"
    if base in {"approved", "complete"}:
        return base
    return "draft" if any(state == "draft" for state in states) else "idea"


def progress_for(states: list[ExplorerState]) -> ExplorerProgress:
    counts = Counter(states)
    return {
        "completed": counts["complete"],
        "total": len(states),
        "percent": (
            round(sum(STATE_PROGRESS[state] for state in states) / len(states)) if states else 0
        ),
        "states": dict(sorted(counts.items())),
    }


def _episode_base_state(status: EpisodeStatus) -> ExplorerState:
    mapping: dict[EpisodeStatus, ExplorerState] = {
        EpisodeStatus.IDEA: "idea",
        EpisodeStatus.WRITING: "draft",
        EpisodeStatus.REVIEW: "review",
        EpisodeStatus.DRAFT: "draft",
        EpisodeStatus.APPROVED: "approved",
        EpisodeStatus.BREAKDOWN: "approved",
        EpisodeStatus.PRODUCTION: "production",
        EpisodeStatus.FINAL: "complete",
    }
    return mapping[status]


def _manifest_status(path: Path) -> ExplorerState | None:
    if not path.is_file():
        return None
    payload = _read_mapping(path)
    if not payload:
        return "error"
    status = str(payload.get("status", "")).upper()
    if status in {"FAILED", "ERROR"}:
        return "error"
    if status in {"QUEUED", "GENERATING", "RUNNING"}:
        return "production"
    if status in {"AWAITING_KEYFRAME_APPROVAL", "REVIEW"}:
        return "review"
    if status == "APPROVED":
        return "approved"
    if status in {"GENERATED", "FINAL", "COMPLETE", "COMPLETED"}:
        return "complete"
    return None


def _read_mapping(path: Path) -> dict[str, object]:
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return {}
    return payload if isinstance(payload, dict) else {}


def _mtime(path: Path) -> float:
    try:
        return path.stat().st_mtime
    except OSError:
        return 0.0
