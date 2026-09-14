from __future__ import annotations

import json
from collections.abc import Mapping, Sequence
from pathlib import Path
from typing import Any, TypedDict, cast

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
        changes = [change for change in current.changes if change.revision > since_revision]
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
            manifest = _read_mapping(self.output_root / episode_id / "episode-generation.json")
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


class ContinuityImpactAnalyzer:
    """Explain the exact continuity entries changed by a delta or season reorder."""

    def compare(
        self,
        before: object,
        after: object,
        *,
        cause_type: str,
        cause_ids: Sequence[str],
    ) -> dict[str, object]:
        before_entries = _continuity_entries(before)
        after_entries = _continuity_entries(after)
        affected: list[dict[str, object]] = []

        for item_id in sorted(set(before_entries) | set(after_entries)):
            previous = before_entries.get(item_id)
            current = after_entries.get(item_id)
            previous_state = _mapping_value(previous, "state")
            current_state = _mapping_value(current, "state")
            previous_deltas = _string_list(previous, "applied_delta_ids")
            current_deltas = _string_list(current, "applied_delta_ids")
            changed_fields = _changed_state_fields(previous_state, current_state)
            if (
                previous is not None
                and current is not None
                and not changed_fields
                and (previous_deltas == current_deltas)
            ):
                continue

            delta_causes = sorted(set(previous_deltas) ^ set(current_deltas))
            causes = [{"type": cause_type, "id": cause_id} for cause_id in dict.fromkeys(cause_ids)]
            causes.extend(
                {"type": "approved_delta", "id": delta_id}
                for delta_id in delta_causes
                if delta_id not in cause_ids
            )
            affected.append(
                {
                    "season_plan_item_id": item_id,
                    "episode_id": _optional_entry_string(current or previous, "episode_id"),
                    "changed_fields": changed_fields,
                    "causes": causes,
                }
            )

        episode_ids = sorted(
            episode_id
            for item in affected
            if isinstance((episode_id := item.get("episode_id")), str)
        )
        return {
            "cause": {"type": cause_type, "ids": list(dict.fromkeys(cause_ids))},
            "affected_items": affected,
            "affected_episode_ids": episode_ids,
            "affected_count": len(affected),
            "regeneration_scheduled": False,
        }


def _continuity_entries(composition: object) -> dict[str, Mapping[str, Any]]:
    payload = _as_mapping(composition)
    raw_entries = payload.get("entries", [])
    if not isinstance(raw_entries, list):
        return {}
    entries: dict[str, Mapping[str, Any]] = {}
    for raw_entry in raw_entries:
        entry = _as_mapping(raw_entry)
        item_id = entry.get("season_plan_item_id")
        if isinstance(item_id, str):
            entries[item_id] = entry
    return entries


def _as_mapping(value: object) -> Mapping[str, Any]:
    if isinstance(value, Mapping):
        return cast(Mapping[str, Any], value)
    dump = getattr(value, "model_dump", None)
    if callable(dump):
        payload = dump(mode="json")
        if isinstance(payload, Mapping):
            return cast(Mapping[str, Any], payload)
    return {}


def _mapping_value(value: Mapping[str, Any] | None, key: str) -> Mapping[str, Any]:
    if value is None:
        return {}
    return _as_mapping(value.get(key))


def _string_list(value: Mapping[str, Any] | None, key: str) -> list[str]:
    if value is None:
        return []
    raw = value.get(key, [])
    if not isinstance(raw, list):
        return []
    return [item for item in raw if isinstance(item, str)]


def _optional_entry_string(value: Mapping[str, Any] | None, key: str) -> str | None:
    if value is None:
        return None
    raw = value.get(key)
    return raw if isinstance(raw, str) else None


def _changed_state_fields(previous: Mapping[str, Any], current: Mapping[str, Any]) -> list[str]:
    return sorted(
        key for key in set(previous) | set(current) if previous.get(key) != current.get(key)
    )


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
