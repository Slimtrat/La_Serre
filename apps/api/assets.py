from __future__ import annotations

import hashlib
import json
import re
from dataclasses import asdict, dataclass
from datetime import UTC, datetime
from pathlib import Path
from typing import Literal

AssetSlot = Literal["story", "shot", "keyframe", "audio", "video"]
SHOT_ID = re.compile(r"^S\d{2}E\d{3}-S\d{2}$")
SLOT_RULES: dict[AssetSlot, tuple[set[str], int]] = {
    "story": ({".txt", ".md"}, 2 * 1024 * 1024),
    "shot": ({".json"}, 2 * 1024 * 1024),
    "keyframe": ({".png", ".jpg", ".jpeg", ".webp"}, 30 * 1024 * 1024),
    "audio": ({".wav", ".mp3", ".flac", ".ogg", ".m4a"}, 100 * 1024 * 1024),
    "video": ({".mp4", ".webm", ".mov", ".mkv"}, 500 * 1024 * 1024),
}


@dataclass(frozen=True, slots=True)
class AssetRecord:
    slot: AssetSlot
    source: str
    filename: str
    media_type: str
    bytes: int
    sha256: str
    updated_at: str
    provider: str | None = None
    model: str | None = None


class AssetStore:
    def __init__(self, output_root: Path) -> None:
        self.output_root = output_root

    def put(
        self,
        shot_id: str,
        slot: AssetSlot,
        filename: str,
        media_type: str,
        content: bytes,
    ) -> AssetRecord:
        return self._put(shot_id, slot, filename, media_type, content, source="manual")

    def put_model(
        self,
        shot_id: str,
        slot: AssetSlot,
        filename: str,
        media_type: str,
        content: bytes,
        *,
        provider: str,
        model: str,
    ) -> AssetRecord:
        return self._put(
            shot_id,
            slot,
            filename,
            media_type,
            content,
            source="model",
            provider=provider,
            model=model,
        )

    def _put(
        self,
        shot_id: str,
        slot: AssetSlot,
        filename: str,
        media_type: str,
        content: bytes,
        *,
        source: str,
        provider: str | None = None,
        model: str | None = None,
    ) -> AssetRecord:
        self._validate_shot_id(shot_id)
        suffix = Path(filename).suffix.lower()
        allowed, maximum = SLOT_RULES[slot]
        if suffix not in allowed:
            raise ValueError(f"Extension {suffix or '(aucune)'} refusée pour le slot {slot}")
        if not content:
            raise ValueError("Le fichier importé est vide")
        if len(content) > maximum:
            raise ValueError(f"Le fichier dépasse la limite de {maximum // (1024 * 1024)} Mo")

        imports = self.output_root / shot_id / "imports"
        imports.mkdir(parents=True, exist_ok=True)
        destination = imports / f"{slot}{suffix}"
        temporary = destination.with_suffix(destination.suffix + ".tmp")
        temporary.write_bytes(content)
        temporary.replace(destination)

        record = AssetRecord(
            slot=slot,
            source=source,
            filename=destination.name,
            media_type=media_type or "application/octet-stream",
            bytes=len(content),
            sha256=hashlib.sha256(content).hexdigest(),
            updated_at=datetime.now(UTC).isoformat(),
            provider=provider,
            model=model,
        )
        manifest = self._manifest(shot_id)
        manifest[slot] = asdict(record)
        self._write_manifest(shot_id, manifest)
        return record

    def get(self, shot_id: str, slot: AssetSlot) -> tuple[AssetRecord, Path] | None:
        self._validate_shot_id(shot_id)
        raw = self._manifest(shot_id).get(slot)
        if not isinstance(raw, dict):
            return None
        record = AssetRecord(**raw)
        path = self.output_root / shot_id / "imports" / record.filename
        if not path.is_file():
            return None
        return record, path

    def list(self, shot_id: str) -> dict[str, object]:
        self._validate_shot_id(shot_id)
        return self._manifest(shot_id)

    def _manifest(self, shot_id: str) -> dict[str, object]:
        path = self.output_root / shot_id / "imports" / "assets.json"
        if not path.is_file():
            return {}
        value = json.loads(path.read_text(encoding="utf-8"))
        return value if isinstance(value, dict) else {}

    def _write_manifest(self, shot_id: str, manifest: dict[str, object]) -> None:
        path = self.output_root / shot_id / "imports" / "assets.json"
        temporary = path.with_suffix(".tmp")
        temporary.write_text(
            json.dumps(manifest, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )
        temporary.replace(path)

    @staticmethod
    def _validate_shot_id(shot_id: str) -> None:
        if not SHOT_ID.fullmatch(shot_id):
            raise ValueError("Identifiant de plan invalide")
