from __future__ import annotations

import json
from pathlib import Path
from typing import TypedDict, cast

from engine.world.bible import BibleRegistry
from engine.world.models import ProjectBible


class ImpactArtifact(TypedDict):
    kind: str
    id: str
    status: str | None
    built_revision: int
    impacted_by: list[int]


class BibleImpactAnalyzer:
    """Maps canon revisions to dependent episodes, shots and generated artifacts."""

    def __init__(
        self,
        registry: BibleRegistry,
        output_root: Path,
    ) -> None:
        self.registry = registry
        self.output_root = output_root.resolve()

    def analyze(
        self,
        bible: ProjectBible | None = None,
        *,
        since_revision: int = 0,
    ) -> dict[str, object]:
        current = bible or self.registry.load()
        changes = [
            change for change in current.changes if change.revision > since_revision
        ]
        affected_episodes: set[str] = set()
        affected_shots: set[str] = set()
        changes_by_shot: dict[str, list[int]] = {}
        changes_by_episode: dict[str, list[int]] = {}
        change_payload = []

        for change in changes:
            episodes, shots = self.registry.dependency_ids(
                change.entity_type,
                change.entity_id,
            )
            affected_episodes.update(episodes)
            affected_shots.update(shots)
            for shot_id in shots:
                changes_by_shot.setdefault(shot_id, []).append(change.revision)
            for episode_id in episodes:
                changes_by_episode.setdefault(episode_id, []).append(change.revision)
            change_payload.append(
                {
                    **change.model_dump(mode="json"),
                    "episodes": sorted(episodes),
                    "shots": sorted(shots),
                }
            )

        artifacts: list[ImpactArtifact] = []
        for shot_id, revisions in sorted(changes_by_shot.items()):
            manifest = _read_mapping(self.output_root / shot_id / "generation.json")
            if not manifest and not _has_shot_artifact(self.output_root / shot_id):
                continue
            built_revision = _shot_bible_revision(manifest)
            impacted_by = [revision for revision in revisions if revision > built_revision]
            if impacted_by:
                artifacts.append(
                    {
                        "kind": "shot",
                        "id": shot_id,
                        "status": _optional_string(manifest.get("status")),
                        "built_revision": built_revision,
                        "impacted_by": impacted_by,
                    }
                )

        for episode_id, revisions in sorted(changes_by_episode.items()):
            manifest = _read_mapping(
                self.output_root / episode_id / "episode-generation.json"
            )
            if not manifest and not (self.output_root / episode_id / "episode.mp4").is_file():
                continue
            built_revision = _episode_bible_revision(manifest)
            impacted_by = [revision for revision in revisions if revision > built_revision]
            if impacted_by:
                artifacts.append(
                    {
                        "kind": "episode",
                        "id": episode_id,
                        "status": _optional_string(manifest.get("status")),
                        "built_revision": built_revision,
                        "impacted_by": impacted_by,
                    }
                )

        return {
            "bible_revision": current.revision,
            "since_revision": since_revision,
            "changes": change_payload,
            "affected_episodes": sorted(affected_episodes),
            "affected_shots": sorted(affected_shots),
            "artifacts": artifacts,
            "artifact_count": len(artifacts),
        }

    def dependencies(self, entity_type: str, entity_id: str) -> dict[str, object]:
        episodes, shots = self.registry.dependency_ids(entity_type, entity_id)
        return {
            "entity_type": entity_type,
            "entity_id": entity_id,
            "episodes": sorted(episodes),
            "shots": sorted(shots),
            "referenced": bool(episodes or shots),
        }


def _shot_bible_revision(manifest: dict[str, object]) -> int:
    inputs = manifest.get("input")
    if not isinstance(inputs, dict):
        return 0
    shot = inputs.get("shot")
    if not isinstance(shot, dict):
        return 0
    context = shot.get("canonical_context")
    return _revision(context)


def _episode_bible_revision(manifest: dict[str, object]) -> int:
    inputs = manifest.get("inputs")
    if not isinstance(inputs, dict):
        return 0
    return _revision(inputs.get("canonical_context"))


def _revision(value: object) -> int:
    if not isinstance(value, dict):
        return 0
    revision = value.get("revision", 0)
    return revision if isinstance(revision, int) and revision >= 0 else 0


def _has_shot_artifact(path: Path) -> bool:
    return any(
        (path / filename).is_file()
        for filename in (
            "prompt.txt",
            "keyframe.png",
            "keyframe-guide-1.png",
            "keyframe-guide-2.png",
            "clip.mp4",
            "voice.wav",
            "voice.mp3",
        )
    )


def _read_mapping(path: Path) -> dict[str, object]:
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return {}
    return cast(dict[str, object], value) if isinstance(value, dict) else {}


def _optional_string(value: object) -> str | None:
    return str(value) if value is not None else None
