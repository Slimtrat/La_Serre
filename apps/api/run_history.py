from __future__ import annotations

import json
import re
import shutil
import uuid
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from engine.production.artifacts import write_text_atomic

SHOT_ID = re.compile(r"^S\d{2}E\d{3}-S\d{2}$")
EPISODE_ID = re.compile(r"^S\d{2}E\d{3}$")
RUN_ID = re.compile(r"^[A-Za-z0-9][A-Za-z0-9_.-]{0,127}$")
RUN_FILES = (
    "keyframe.png",
    "keyframe-guide-1.png",
    "keyframe-guide-2.png",
    "keyframe-approval.json",
    "clip.mp4",
    "generation.json",
    "prompt.txt",
    "voice.wav",
    "voice.mp3",
    "studio-log.jsonl",
)
MASTER_FILES = (
    "episode.mp4",
    "episode-generation.json",
    "subtitles.fr.srt",
    "music.wav",
)


class RunHistory:
    """Immutable snapshots of generated shot outputs plus their execution log."""

    def __init__(self, output_root: Path) -> None:
        self.output_root = output_root.resolve()
        self.history_root = self.output_root / ".history"
        self.logs_root = self.output_root / ".studio" / "logs"

    def list_runs(self, shot_id: str) -> list[dict[str, Any]]:
        self._validate_shot_id(shot_id)
        runs: list[dict[str, Any]] = []
        current = self.output_root / shot_id
        if self._has_run_files(current):
            runs.append(self._describe(shot_id, "current", current, current=True))
        shot_history = self.history_root / shot_id
        if shot_history.is_dir():
            archived = sorted(
                (path for path in shot_history.iterdir() if path.is_dir()),
                key=lambda path: path.stat().st_mtime,
                reverse=True,
            )
            runs.extend(self._describe(shot_id, path.name, path) for path in archived)
        return runs

    def archive_current(self, shot_id: str) -> dict[str, Any] | None:
        self._validate_shot_id(shot_id)
        source = self.output_root / shot_id
        if not self._has_run_files(source):
            return None
        manifest = self._read_json(source / "generation.json")
        requested_id = str(manifest.get("id") or self._timestamp_id())
        run_id = self._available_run_id(shot_id, self._safe_run_id(requested_id))
        destination = self.history_root / shot_id / run_id
        destination.mkdir(parents=True, exist_ok=False)
        for filename in RUN_FILES:
            candidate = source / filename
            if candidate.is_file():
                shutil.copy2(candidate, destination / filename)
        metadata = {
            "id": run_id,
            "source_generation_id": manifest.get("id"),
            "archived_at": datetime.now(UTC).isoformat(),
        }
        write_text_atomic(
            destination / "archive.json",
            json.dumps(metadata, ensure_ascii=False, indent=2) + "\n",
        )
        return self._describe(shot_id, run_id, destination)

    def restore(self, shot_id: str, run_id: str) -> dict[str, Any]:
        self._validate_shot_id(shot_id)
        self._validate_run_id(run_id)
        if run_id == "current":
            raise ValueError("La version courante est déjà active")
        source = self.history_root / shot_id / run_id
        if not source.is_dir():
            raise FileNotFoundError(source)
        self.invalidate_master(shot_id.rsplit("-S", 1)[0])
        self.archive_current(shot_id)
        destination = self.output_root / shot_id
        destination.mkdir(parents=True, exist_ok=True)
        for filename in RUN_FILES:
            current = destination / filename
            if current.is_file():
                current.unlink()
            archived = source / filename
            if archived.is_file():
                shutil.copy2(archived, current)
        return self._describe(shot_id, "current", destination, current=True)

    def invalidate_shot_after(
        self,
        shot_id: str,
        stage: str,
        *,
        archive: bool = True,
    ) -> str | None:
        self._validate_shot_id(shot_id)
        downstream = {
            "prompt": (
                "prompt.txt",
                "keyframe.png",
                "keyframe-guide-1.png",
                "keyframe-guide-2.png",
                "clip.mp4",
                "generation.json",
            ),
            "keyframe": ("clip.mp4", "generation.json"),
            "voice": (),
            "source": tuple(name for name in RUN_FILES if name != "studio-log.jsonl"),
        }
        if stage not in downstream:
            raise ValueError(f"Unknown dependency stage: {stage}")
        destination = self.output_root / shot_id
        existing = [destination / filename for filename in downstream[stage]]
        archived = (
            self.archive_current(shot_id)
            if archive and any(path.is_file() for path in existing)
            else None
        )
        for path in existing:
            path.unlink(missing_ok=True)
        self.invalidate_master(shot_id.rsplit("-S", 1)[0], archive=archive)
        return str(archived["id"]) if archived is not None else None

    def archive_master(self, episode_id: str) -> str | None:
        self._validate_episode_id(episode_id)
        source = self.output_root / episode_id
        if not source.is_dir() or not any(
            (source / name).is_file() for name in MASTER_FILES[:3]
        ):
            return None
        manifest = self._read_json(source / "episode-generation.json")
        base = self._safe_run_id(str(manifest.get("id") or self._timestamp_id()))
        run_id = self._available_history_id(episode_id, base)
        destination = self.history_root / episode_id / run_id
        destination.mkdir(parents=True, exist_ok=False)
        for filename in MASTER_FILES:
            candidate = source / filename
            if candidate.is_file():
                shutil.copy2(candidate, destination / filename)
        write_text_atomic(
            destination / "archive.json",
            json.dumps(
                {
                    "id": run_id,
                    "source_generation_id": manifest.get("id"),
                    "archived_at": datetime.now(UTC).isoformat(),
                    "kind": "episode-master",
                },
                ensure_ascii=False,
                indent=2,
            )
            + "\n",
        )
        return run_id

    def invalidate_master(self, episode_id: str, *, archive: bool = True) -> str | None:
        run_id = self.archive_master(episode_id) if archive else None
        destination = self.output_root / episode_id
        for filename in MASTER_FILES[:3]:
            (destination / filename).unlink(missing_ok=True)
        return run_id

    def restore_master(self, episode_id: str, run_id: str) -> str:
        self._validate_episode_id(episode_id)
        self._validate_run_id(run_id)
        source = self.history_root / episode_id / run_id
        if not source.is_dir():
            raise FileNotFoundError(source)
        self.archive_master(episode_id)
        destination = self.output_root / episode_id
        destination.mkdir(parents=True, exist_ok=True)
        for filename in MASTER_FILES:
            current = destination / filename
            current.unlink(missing_ok=True)
            archived = source / filename
            if archived.is_file():
                shutil.copy2(archived, current)
        return run_id

    def media_path(self, shot_id: str, run_id: str, filename: str) -> Path:
        self._validate_shot_id(shot_id)
        self._validate_run_id(run_id)
        if filename not in RUN_FILES:
            raise ValueError(f"Unsupported history file: {filename}")
        root = (
            self.output_root / shot_id
            if run_id == "current"
            else self.history_root / shot_id / run_id
        )
        return root / filename

    def job_log_path(self, job_id: str) -> Path:
        if not RUN_ID.fullmatch(job_id):
            raise ValueError(f"Invalid job id: {job_id}")
        return self.logs_root / f"{job_id}.jsonl"

    def attach_job_log(self, job_id: str, shot_id: str) -> None:
        source = self.job_log_path(job_id)
        destination = self.output_root / shot_id / "studio-log.jsonl"
        if source.is_file() and destination.parent.is_dir():
            shutil.copy2(source, destination)

    @staticmethod
    def append_event(path: Path, event: dict[str, object]) -> None:
        path.parent.mkdir(parents=True, exist_ok=True)
        with path.open("a", encoding="utf-8") as handle:
            handle.write(json.dumps(event, ensure_ascii=False) + "\n")

    def _describe(
        self,
        shot_id: str,
        run_id: str,
        root: Path,
        *,
        current: bool = False,
    ) -> dict[str, Any]:
        manifest = self._read_json(root / "generation.json")
        archive = self._read_json(root / "archive.json")
        media_prefix = (
            f"/api/media/{shot_id}"
            if current
            else f"/api/history-media/{shot_id}/{run_id}"
        )
        keyframes = [
            f"{media_prefix}/{filename}"
            for filename in RUN_FILES[:3]
            if (root / filename).is_file()
        ]
        media: dict[str, object] = {"keyframes": keyframes}
        if keyframes:
            media["keyframe"] = keyframes[0]
        for key, filename in (
            ("video", "clip.mp4"),
            ("manifest", "generation.json"),
            ("prompt", "prompt.txt"),
            ("log", "studio-log.jsonl"),
        ):
            if (root / filename).is_file():
                media[key] = f"{media_prefix}/{filename}"
        for filename in ("voice.wav", "voice.mp3"):
            if (root / filename).is_file():
                media["audio"] = f"{media_prefix}/{filename}"
                break
        created_at = manifest.get("created_at")
        if not created_at:
            created_at = datetime.fromtimestamp(root.stat().st_mtime, UTC).isoformat()
        return {
            "id": run_id,
            "current": current,
            "status": manifest.get("status"),
            "created_at": created_at,
            "completed_at": manifest.get("completed_at"),
            "archived_at": archive.get("archived_at"),
            "seed": manifest.get("seed"),
            "media": media,
            "events": self._read_jsonl(root / "studio-log.jsonl"),
        }

    @staticmethod
    def _read_json(path: Path) -> dict[str, Any]:
        if not path.is_file():
            return {}
        try:
            payload = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, ValueError):
            return {}
        return payload if isinstance(payload, dict) else {}

    @staticmethod
    def _read_jsonl(path: Path) -> list[dict[str, Any]]:
        if not path.is_file():
            return []
        events: list[dict[str, Any]] = []
        for line in path.read_text(encoding="utf-8").splitlines():
            try:
                payload = json.loads(line)
            except ValueError:
                continue
            if isinstance(payload, dict):
                events.append(payload)
        return events

    @staticmethod
    def _has_run_files(path: Path) -> bool:
        return path.is_dir() and any((path / filename).is_file() for filename in RUN_FILES[:-1])

    def _available_run_id(self, shot_id: str, base: str) -> str:
        return self._available_history_id(shot_id, base)

    def _available_history_id(self, owner_id: str, base: str) -> str:
        candidate = base
        while (self.history_root / owner_id / candidate).exists():
            candidate = f"{base}-{uuid.uuid4().hex[:8]}"
        return candidate

    @staticmethod
    def _safe_run_id(value: str) -> str:
        safe = re.sub(r"[^A-Za-z0-9_.-]+", "-", value).strip("-.")[:96]
        return safe or RunHistory._timestamp_id()

    @staticmethod
    def _timestamp_id() -> str:
        return "run-" + datetime.now(UTC).strftime("%Y%m%dT%H%M%S%fZ")

    @staticmethod
    def _validate_shot_id(shot_id: str) -> None:
        if not SHOT_ID.fullmatch(shot_id):
            raise ValueError(f"Invalid shot id: {shot_id}")

    @staticmethod
    def _validate_run_id(run_id: str) -> None:
        if not RUN_ID.fullmatch(run_id):
            raise ValueError(f"Invalid run id: {run_id}")

    @staticmethod
    def _validate_episode_id(episode_id: str) -> None:
        if not EPISODE_ID.fullmatch(episode_id):
            raise ValueError(f"Invalid episode id: {episode_id}")
