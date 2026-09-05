from __future__ import annotations

import json
from datetime import UTC, datetime
from pathlib import Path
from typing import Any, Literal

from apps.api.run_history import EPISODE_ID, RUN_ID, SHOT_ID, RunHistory
from engine.director.models import Shot
from engine.narrative.episode_models import Episode
from engine.production.artifacts import write_text_atomic

EditorialScope = Literal["episode", "shot"]
EditorialKind = Literal["version", "variant"]


class EditorialHistory:
    """Immutable narrative snapshots linked to compatible generated media."""

    def __init__(self, private_root: Path, output_root: Path) -> None:
        self.private_root = private_root.resolve()
        self.output_root = output_root.resolve()
        self.root = self.output_root / ".history" / "editorial"
        self.runs = RunHistory(self.output_root)

    def listing(
        self, episode_id: str, scope: EditorialScope, shot_id: str | None = None
    ) -> dict[str, object]:
        current = self._current(episode_id, scope, shot_id)
        versions = [
            item
            for item in self._stored(episode_id)
            if item.get("scope") == scope
            and (scope == "episode" or item.get("shot_id") == shot_id)
        ]
        versions.sort(key=lambda item: str(item.get("created_at", "")), reverse=True)
        return {
            "episode_id": episode_id,
            "scope": scope,
            "shot_id": shot_id,
            "current": self._summary(current, current=True),
            "versions": [self._summary(item) for item in versions],
            "editor": self._editor(current),
        }

    def create(
        self,
        episode_id: str,
        *,
        scope: EditorialScope,
        kind: EditorialKind,
        name: str,
        shot_id: str | None = None,
        episode: dict[str, Any] | None = None,
        shots: list[dict[str, Any]] | None = None,
        shot: dict[str, Any] | None = None,
        shot_source: str | None = None,
        provenance: dict[str, Any] | None = None,
    ) -> dict[str, object]:
        name = self._name(name)
        current = self._current(episode_id, scope, shot_id)
        candidate = self._candidate(
            current,
            episode=episode,
            shots=shots,
            shot=shot,
            shot_source=shot_source,
        )
        candidate.update(
            name=name,
            kind=kind,
            created_at=self._now(),
            provenance=self._provenance(provenance),
        )
        if kind == "variant":
            candidate["id"] = self._new_id(episode_id, "variant")
            candidate["dependencies"] = (
                self._capture_dependencies(current)
                if self._content(candidate) == self._content(current)
                else {"shots": {}, "episode_master": None}
            )
            self._write_snapshot(candidate)
            return {
                "created": self._summary(candidate),
                "canonical_changed": False,
            }

        archived = self._archive_current(current)
        result = self._apply(candidate, restore_dependencies=False)
        self._write_state(candidate)
        return {
            "created": self._summary(
                self._current(episode_id, scope, shot_id), current=True
            ),
            "archived_id": archived["id"],
            "canonical_changed": True,
            **result,
        }

    def compare(
        self,
        episode_id: str,
        scope: EditorialScope,
        left: str,
        right: str,
        shot_id: str | None = None,
    ) -> dict[str, object]:
        before = self._resolve(episode_id, scope, left, shot_id)
        after = self._resolve(episode_id, scope, right, shot_id)
        changes: list[dict[str, str]] = []
        self._diff(self._content(before), self._content(after), "", changes)
        return {
            "left": self._summary(before, current=left == "current"),
            "right": self._summary(after, current=right == "current"),
            "changed": bool(changes),
            "changes": changes,
        }

    def promote(
        self,
        episode_id: str,
        version_id: str,
        scope: EditorialScope,
        shot_id: str | None = None,
    ) -> dict[str, object]:
        if version_id == "current":
            raise ValueError("La version canonique est déjà active")
        target = self._resolve(episode_id, scope, version_id, shot_id)
        archived = self._archive_current(self._current(episode_id, scope, shot_id))
        result = self._apply(target, restore_dependencies=True)
        state = {
            **target,
            "kind": "version",
            "source_version": version_id,
            "created_at": self._now(),
        }
        self._write_state(state)
        return {
            "current": self._summary(
                self._current(episode_id, scope, shot_id), current=True
            ),
            "archived_id": archived["id"],
            "promoted_from": version_id,
            **result,
        }

    def _candidate(
        self,
        current: dict[str, Any],
        *,
        episode: dict[str, Any] | None,
        shots: list[dict[str, Any]] | None,
        shot: dict[str, Any] | None,
        shot_source: str | None,
    ) -> dict[str, Any]:
        result = {
            key: value
            for key, value in current.items()
            if key not in {"id", "dependencies"}
        }
        if current["scope"] == "episode":
            if episode is not None:
                result["episode"] = Episode.model_validate(episode).model_dump(mode="json")
            if shots is not None:
                result["shots"] = {
                    value.id: value.model_dump(mode="json")
                    for value in (Shot.model_validate(item) for item in shots)
                }
            self._validate_episode(result)
        else:
            if shot is not None:
                result["shot"] = Shot.model_validate(shot).model_dump(mode="json")
            if shot_source is not None:
                result["shot_source"] = shot_source.strip()
            self._validate_shot(result)
        return result

    def _current(
        self, episode_id: str, scope: EditorialScope, shot_id: str | None
    ) -> dict[str, Any]:
        self._validate_scope(episode_id, scope, shot_id)
        episode_path = self._episode_dir(episode_id) / "episode.json"
        episode = Episode.model_validate_json(episode_path.read_text(encoding="utf-8"))
        metadata = self._state(episode_id, scope, shot_id)
        current: dict[str, Any] = {
            "id": "current",
            "episode_id": episode_id,
            "scope": scope,
            "shot_id": shot_id,
            "name": metadata.get("name", "Canon actuel"),
            "kind": "version",
            "created_at": metadata.get("created_at")
            or datetime.fromtimestamp(episode_path.stat().st_mtime, UTC).isoformat(),
            "provenance": metadata.get("provenance")
            or self._provenance({"provider": "canonical"}),
        }
        if scope == "episode":
            current["episode"] = episode.model_dump(mode="json")
            current["shots"] = {
                item.id: item.model_dump(mode="json")
                for item in (
                    self._load_shot(episode_id, item_id) for item_id in episode.shot_order
                )
            }
        else:
            assert shot_id is not None
            current["shot"] = self._load_shot(episode_id, shot_id).model_dump(
                mode="json"
            )
            current["shot_source"] = episode.shot_sources[shot_id]
        return current

    def _archive_current(self, current: dict[str, Any]) -> dict[str, Any]:
        snapshot = {
            **current,
            "id": self._new_id(str(current["episode_id"]), "version"),
            "kind": "version",
            "created_at": self._now(),
            "dependencies": self._capture_dependencies(current),
        }
        self._write_snapshot(snapshot)
        return snapshot

    def _capture_dependencies(self, snapshot: dict[str, Any]) -> dict[str, Any]:
        shot_runs: dict[str, str] = {}
        for shot_id in self._shot_ids(snapshot):
            archived = self.runs.archive_current(shot_id)
            if archived is not None:
                shot_runs[shot_id] = str(archived["id"])
        master = self.runs.archive_master(str(snapshot["episode_id"]))
        return {"shots": shot_runs, "episode_master": master}

    def _apply(
        self, snapshot: dict[str, Any], *, restore_dependencies: bool
    ) -> dict[str, object]:
        if snapshot["scope"] == "episode":
            self._validate_episode(snapshot)
        else:
            self._validate_shot(snapshot)
        shot_ids = self._shot_ids(snapshot)
        for shot_id in shot_ids:
            self.runs.invalidate_shot_after(shot_id, "source", archive=False)

        episode_id = str(snapshot["episode_id"])
        episode_dir = self._episode_dir(episode_id)
        if snapshot["scope"] == "episode":
            self._write_json(episode_dir / "episode.json", snapshot["episode"])
            for shot_id, shot in snapshot["shots"].items():
                self._write_json(episode_dir / "shots" / f"{shot_id}.json", shot)
        else:
            shot_id = str(snapshot["shot_id"])
            self._write_json(episode_dir / "shots" / f"{shot_id}.json", snapshot["shot"])
            episode = Episode.model_validate_json(
                (episode_dir / "episode.json").read_text(encoding="utf-8")
            )
            updated = episode.model_copy(
                update={
                    "shot_sources": {
                        **episode.shot_sources,
                        shot_id: snapshot["shot_source"],
                    }
                }
            )
            self._write_json(episode_dir / "episode.json", updated.model_dump(mode="json"))

        dependencies = snapshot.get("dependencies", {}) if restore_dependencies else {}
        shot_dependencies = (
            dependencies.get("shots", {}) if isinstance(dependencies, dict) else {}
        )
        restored: list[str] = []
        if isinstance(shot_dependencies, dict):
            for shot_id, run_id in shot_dependencies.items():
                self.runs.restore(str(shot_id), str(run_id))
                restored.append(str(shot_id))
        master = (
            dependencies.get("episode_master")
            if isinstance(dependencies, dict)
            else None
        )
        if master:
            self.runs.restore_master(episode_id, str(master))
        return {
            "restored_shots": restored,
            "restored_episode_master": bool(master),
            "invalidated_shots": [item for item in shot_ids if item not in restored],
        }

    def _resolve(
        self,
        episode_id: str,
        scope: EditorialScope,
        version_id: str,
        shot_id: str | None,
    ) -> dict[str, Any]:
        if version_id == "current":
            return self._current(episode_id, scope, shot_id)
        self._validate_scope(episode_id, scope, shot_id)
        if not RUN_ID.fullmatch(version_id):
            raise ValueError("Identifiant de version invalide")
        path = self._snapshots(episode_id) / f"{version_id}.json"
        if not path.is_file():
            raise FileNotFoundError(path)
        snapshot = self._read(path)
        if snapshot.get("scope") != scope or snapshot.get("shot_id") != shot_id:
            raise ValueError("Cette version n’appartient pas à l’objet sélectionné")
        return snapshot

    def _validate_episode(self, snapshot: dict[str, Any]) -> None:
        episode = Episode.model_validate(snapshot["episode"])
        shots = {
            shot_id: Shot.model_validate(payload)
            for shot_id, payload in snapshot["shots"].items()
        }
        if list(shots) != episode.shot_order:
            raise ValueError(
                "Les plans de la version ne correspondent pas à leur ordre canonique"
            )
        if abs(sum(item.duration for item in shots.values()) - episode.duration_target) > 0.01:
            raise ValueError(
                "La durée des plans ne correspond pas à la durée de l’épisode"
            )

    @staticmethod
    def _validate_shot(snapshot: dict[str, Any]) -> None:
        shot = Shot.model_validate(snapshot["shot"])
        if shot.id != snapshot["shot_id"]:
            raise ValueError(
                "Le plan de la version ne correspond pas au plan sélectionné"
            )
        if not str(snapshot.get("shot_source", "")).strip():
            raise ValueError("Le texte source du plan ne peut pas être vide")

    def _summary(
        self, snapshot: dict[str, Any], *, current: bool = False
    ) -> dict[str, Any]:
        if snapshot["scope"] == "episode":
            episode = snapshot["episode"]
            description = f"{episode['title']} · {len(snapshot['shots'])} plans"
        else:
            action = str(snapshot["shot"].get("action", ""))
            description = action[:120] + ("…" if len(action) > 120 else "")
        dependencies = snapshot.get("dependencies") or {}
        return {
            "id": "current" if current else snapshot["id"],
            "name": snapshot.get("name") or "Sans nom",
            "kind": snapshot.get("kind") or "version",
            "scope": snapshot["scope"],
            "shot_id": snapshot.get("shot_id"),
            "current": current,
            "canonical": current,
            "created_at": snapshot.get("created_at"),
            "description": description,
            "provenance": snapshot.get("provenance") or {},
            "dependency_count": len(dependencies.get("shots", {}))
            + int(bool(dependencies.get("episode_master"))),
        }

    @staticmethod
    def _content(snapshot: dict[str, Any]) -> dict[str, Any]:
        if snapshot["scope"] == "episode":
            return {"episode": snapshot["episode"], "shots": snapshot["shots"]}
        return {"shot_source": snapshot["shot_source"], "shot": snapshot["shot"]}

    @staticmethod
    def _editor(snapshot: dict[str, Any]) -> dict[str, Any]:
        if snapshot["scope"] == "episode":
            episode = snapshot["episode"]
            return {
                "title": episode["title"],
                "logline": episode["logline"],
                "narrative_source": episode["narrative_source"],
                **episode["story"],
            }
        shot = snapshot["shot"]
        dialogue = shot.get("dialogue") or {}
        performance = dialogue.get("performance") or {}
        return {
            "shot_source": snapshot["shot_source"],
            "action": shot["action"],
            "speaker": dialogue.get("speaker", ""),
            "dialogue": dialogue.get("text", ""),
            "intention": performance.get("intention", ""),
            "emotion": performance.get("emotion", ""),
        }

    @staticmethod
    def _diff(
        left: Any, right: Any, path: str, changes: list[dict[str, str]]
    ) -> None:
        if isinstance(left, dict) and isinstance(right, dict):
            for key in sorted(set(left) | set(right)):
                EditorialHistory._diff(
                    left.get(key), right.get(key), f"{path}.{key}".strip("."), changes
                )
        elif left != right:
            changes.append(
                {
                    "field": EditorialHistory._label(path),
                    "before": EditorialHistory._display(left),
                    "after": EditorialHistory._display(right),
                }
            )

    @staticmethod
    def _label(path: str) -> str:
        labels = {
            "episode.title": "Titre",
            "episode.logline": "Promesse",
            "episode.narrative_source": "Scénario",
            "episode.story.hook": "Accroche",
            "episode.story.setup": "Mise en place",
            "episode.story.conflict": "Conflit",
            "episode.story.reveal": "Révélation",
            "episode.story.cliffhanger": "Cliffhanger",
            "shot_source": "Texte du plan",
            "shot.action": "Action",
            "shot.dialogue.text": "Dialogue",
            "shot.dialogue.performance.intention": "Intention",
            "shot.dialogue.performance.emotion": "Émotion",
            "shot.camera.movement": "Mouvement caméra",
        }
        return labels.get(
            path, path.replace(".", " › ").replace("_", " ").capitalize()
        )

    @staticmethod
    def _display(value: Any) -> str:
        if value is None or value == "":
            return "—"
        if isinstance(value, list):
            return ", ".join(EditorialHistory._display(item) for item in value)
        if isinstance(value, dict):
            return " · ".join(
                f"{key.replace('_', ' ')} : {EditorialHistory._display(item)}"
                for key, item in value.items()
            )
        return str(value)

    def _state(
        self, episode_id: str, scope: EditorialScope, shot_id: str | None
    ) -> dict[str, Any]:
        state = self._read(self.root / episode_id / "state.json")
        value = (
            state.get("episode", {})
            if scope == "episode"
            else state.get("shots", {}).get(shot_id, {})
        )
        return value if isinstance(value, dict) else {}

    def _write_state(self, snapshot: dict[str, Any]) -> None:
        episode_id = str(snapshot["episode_id"])
        path = self.root / episode_id / "state.json"
        state = self._read(path)
        metadata = {
            key: snapshot.get(key)
            for key in ("name", "created_at", "provenance", "source_version")
            if snapshot.get(key) is not None
        }
        if snapshot["scope"] == "episode":
            state["episode"] = metadata
        else:
            state.setdefault("shots", {})[str(snapshot["shot_id"])] = metadata
        self._write_json(path, state)

    def _write_snapshot(self, snapshot: dict[str, Any]) -> None:
        episode_id = str(snapshot["episode_id"])
        self._write_json(
            self._snapshots(episode_id) / f"{snapshot['id']}.json", snapshot
        )

    def _stored(self, episode_id: str) -> list[dict[str, Any]]:
        root = self._snapshots(episode_id)
        return [self._read(path) for path in root.glob("*.json")] if root.is_dir() else []

    def _snapshots(self, episode_id: str) -> Path:
        if not EPISODE_ID.fullmatch(episode_id):
            raise ValueError("Identifiant d’épisode invalide")
        return self.root / episode_id / "snapshots"

    def _episode_dir(self, episode_id: str) -> Path:
        if not EPISODE_ID.fullmatch(episode_id):
            raise ValueError("Identifiant d’épisode invalide")
        return (
            self.private_root
            / "episodes"
            / f"season-{episode_id[1:3]}"
            / episode_id
        )

    def _load_shot(self, episode_id: str, shot_id: str) -> Shot:
        path = self._episode_dir(episode_id) / "shots" / f"{shot_id}.json"
        return Shot.model_validate_json(path.read_text(encoding="utf-8"))

    @staticmethod
    def _validate_scope(
        episode_id: str, scope: EditorialScope, shot_id: str | None
    ) -> None:
        if not EPISODE_ID.fullmatch(episode_id):
            raise ValueError("Identifiant d’épisode invalide")
        if scope == "shot":
            if (
                not shot_id
                or not SHOT_ID.fullmatch(shot_id)
                or not shot_id.startswith(episode_id + "-")
            ):
                raise ValueError("Sélectionne un plan valide de cet épisode")
        elif scope != "episode":
            raise ValueError("Portée éditoriale invalide")

    @staticmethod
    def _name(name: str) -> str:
        value = name.strip()
        if not value or len(value) > 80:
            raise ValueError("Le nom doit contenir entre 1 et 80 caractères")
        return value

    @staticmethod
    def _provenance(value: dict[str, Any] | None) -> dict[str, Any]:
        raw = value or {}
        return {
            "provider": str(raw.get("provider") or "manual")[:80],
            "model": str(raw["model"])[:160] if raw.get("model") else None,
            "prompt": str(raw["prompt"])[:10_000] if raw.get("prompt") else None,
            "seed": raw.get("seed"),
            "recorded_at": EditorialHistory._now(),
        }

    @staticmethod
    def _read(path: Path) -> dict[str, Any]:
        if not path.is_file():
            return {}
        payload = json.loads(path.read_text(encoding="utf-8"))
        return payload if isinstance(payload, dict) else {}

    @staticmethod
    def _write_json(path: Path, payload: object) -> None:
        write_text_atomic(
            path, json.dumps(payload, ensure_ascii=False, indent=2) + "\n"
        )

    def _new_id(self, episode_id: str, prefix: str) -> str:
        base = prefix + "-" + datetime.now(UTC).strftime("%Y%m%dT%H%M%S%fZ")
        candidate = base
        index = 2
        while (self._snapshots(episode_id) / f"{candidate}.json").exists():
            candidate = f"{base}-{index}"
            index += 1
        return candidate

    @staticmethod
    def _shot_ids(snapshot: dict[str, Any]) -> list[str]:
        if snapshot["scope"] == "episode":
            return list(snapshot["episode"]["shot_order"])
        return [str(snapshot["shot_id"])]

    @staticmethod
    def _now() -> str:
        return datetime.now(UTC).isoformat()
