from __future__ import annotations

import hashlib
from pathlib import Path

from engine.generation.models import GenerationRecord, OutputArtifact


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def artifact(path: Path, media_type: str) -> OutputArtifact:
    return OutputArtifact(path=path.name, sha256=sha256_file(path), media_type=media_type)


def write_text_atomic(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(content, encoding="utf-8")
    temporary.replace(path)


def write_record(path: Path, record: GenerationRecord) -> None:
    write_text_atomic(path, record.model_dump_json(indent=2) + "\n")
