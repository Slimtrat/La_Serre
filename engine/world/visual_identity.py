from __future__ import annotations

import hashlib
import json
import re
import threading
import uuid
from collections.abc import Iterable
from datetime import UTC, datetime
from enum import StrEnum
from pathlib import Path
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

from engine.production.artifacts import write_text_atomic

MEDIA_TYPES = {"image/png": ".png", "image/jpeg": ".jpg", "image/webp": ".webp"}


class VisualIdentityError(ValueError):
    pass


class VisualIdentityConflict(VisualIdentityError):
    pass


class StrictIdentityModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class VisualVariantStatus(StrEnum):
    CANDIDATE = "candidate"
    APPROVED = "approved"
    REJECTED = "rejected"


class VisualVariantKind(StrEnum):
    PORTRAIT = "portrait"
    FULL_BODY = "full_body"
    EXPRESSION = "expression"


class VisualVariantSource(StrEnum):
    GENERATED = "generated"
    IMPORTED = "imported"


class VisualProvenance(StrictIdentityModel):
    source: VisualVariantSource
    source_label: str = Field(min_length=1, max_length=200)
    model: str | None = Field(default=None, max_length=200)
    workflow: str | None = Field(default=None, max_length=200)
    seed: int | None = Field(default=None, ge=0, le=2**63 - 1)
    license: str = Field(min_length=1, max_length=200)
    revision: str | None = Field(default=None, max_length=200)


class VisualVariant(StrictIdentityModel):
    id: str = Field(pattern=r"^visual-[a-f0-9]{32}$")
    character_id: str = Field(pattern=r"^[a-z0-9][a-z0-9_-]*$")
    kind: VisualVariantKind
    status: VisualVariantStatus = VisualVariantStatus.CANDIDATE
    media_path: str
    media_type: str
    sha256: str = Field(pattern=r"^[a-f0-9]{64}$")
    permanent_identity: str = Field(min_length=10, max_length=4000)
    outfit: str = Field(default="", max_length=2000)
    transient_state: str = Field(default="", max_length=2000)
    provenance: VisualProvenance
    created_at: datetime
    reviewed_at: datetime | None = None


class MasterChange(StrictIdentityModel):
    revision: int = Field(ge=1)
    previous_variant_id: str | None
    variant_id: str
    changed_at: datetime


class CharacterVisualIdentity(StrictIdentityModel):
    character_id: str = Field(pattern=r"^[a-z0-9][a-z0-9_-]*$")
    active_master_id: str | None = None
    variants: list[VisualVariant] = Field(default_factory=list)
    master_history: list[MasterChange] = Field(default_factory=list)

    @model_validator(mode="after")
    def master_is_approved(self) -> CharacterVisualIdentity:
        if (
            self.active_master_id is not None
            and sum(
                item.id == self.active_master_id and item.status is VisualVariantStatus.APPROVED
                for item in self.variants
            )
            != 1
        ):
            raise ValueError("active master must select one approved variant")
        return self


class VisualIdentityBoard(StrictIdentityModel):
    schema_version: Literal[1] = 1
    revision: int = Field(default=0, ge=0)
    updated_at: datetime | None = None
    characters: list[CharacterVisualIdentity] = Field(default_factory=list)


class VisualDependencies(StrictIdentityModel):
    shot_ids: list[str] = Field(default_factory=list)
    rendered_shot_ids: list[str] = Field(default_factory=list)


class VisualIdentityRegistry:
    """Persistent casting board with immutable media and explicit human gates."""

    _lock = threading.RLock()

    def __init__(self, private_root: Path, output_root: Path | None = None) -> None:
        self.root = private_root.resolve()
        self.output_root = output_root.resolve() if output_root else None
        self.path = self.root / "world" / "visual-identities.json"

    def load(self) -> VisualIdentityBoard:
        with self._lock:
            if not self.path.is_file():
                return VisualIdentityBoard()
            payload = json.loads(self.path.read_text(encoding="utf-8"))
            if isinstance(payload, dict) and "schema_version" not in payload:
                payload = {"schema_version": 1, **payload}
            return VisualIdentityBoard.model_validate(payload)

    def list_for_character(self, character_id: str) -> CharacterVisualIdentity:
        self._validate_character(character_id)
        return next(
            (item for item in self.load().characters if item.character_id == character_id),
            CharacterVisualIdentity(character_id=character_id),
        )

    def add_image(
        self,
        *,
        character_id: str,
        kind: VisualVariantKind,
        content: bytes,
        media_type: str,
        permanent_identity: str,
        outfit: str,
        transient_state: str,
        provenance: VisualProvenance,
        expected_revision: int,
    ) -> tuple[VisualIdentityBoard, VisualVariant]:
        self._validate_character(character_id)
        if media_type not in MEDIA_TYPES:
            raise VisualIdentityError("Use a PNG, JPEG or WebP image")
        if not content or len(content) > 25 * 1024 * 1024:
            raise VisualIdentityError("Image must contain between 1 byte and 25 MiB")
        with self._lock:
            board = self.load()
            self._check_revision(board, expected_revision)
            variant_id = f"visual-{uuid.uuid4().hex}"
            relative = Path("world/visual-identities/media") / (
                variant_id + MEDIA_TYPES[media_type]
            )
            variant = VisualVariant(
                id=variant_id,
                character_id=character_id,
                kind=kind,
                media_path=relative.as_posix(),
                media_type=media_type,
                sha256=hashlib.sha256(content).hexdigest(),
                permanent_identity=permanent_identity.strip(),
                outfit=outfit.strip(),
                transient_state=transient_state.strip(),
                provenance=provenance,
                created_at=datetime.now(UTC),
            )
            destination = self.root / relative
            destination.parent.mkdir(parents=True, exist_ok=True)
            temporary = destination.with_suffix(destination.suffix + ".tmp")
            temporary.write_bytes(content)
            temporary.replace(destination)
            return self._put_variant(board, variant), variant

    def approve(
        self, character_id: str, variant_id: str, *, expected_revision: int
    ) -> tuple[VisualIdentityBoard, VisualDependencies]:
        return self._select_master(character_id, variant_id, expected_revision, False)

    def restore(
        self, character_id: str, variant_id: str, *, expected_revision: int
    ) -> tuple[VisualIdentityBoard, VisualDependencies]:
        return self._select_master(character_id, variant_id, expected_revision, True)

    def reject(
        self, character_id: str, variant_id: str, *, expected_revision: int
    ) -> VisualIdentityBoard:
        with self._lock:
            board = self.load()
            self._check_revision(board, expected_revision)
            identity = self._identity(board, character_id)
            if identity.active_master_id == variant_id:
                raise VisualIdentityError("The active master cannot be rejected")
            variant = self._variant(identity, variant_id)
            changed = variant.model_copy(
                update={"status": VisualVariantStatus.REJECTED, "reviewed_at": datetime.now(UTC)}
            )
            return self._replace(
                board,
                identity.model_copy(
                    update={
                        "variants": [
                            changed if item.id == variant_id else item for item in identity.variants
                        ]
                    }
                ),
            )

    def media_path(self, character_id: str, variant_id: str) -> tuple[Path, str]:
        variant = self._variant(self.list_for_character(character_id), variant_id)
        path = (self.root / variant.media_path).resolve()
        if self.root not in path.parents or not path.is_file():
            raise FileNotFoundError(variant_id)
        return path, variant.media_type

    def active_references(self) -> dict[str, Path]:
        result: dict[str, Path] = {}
        for identity in self.load().characters:
            if identity.active_master_id:
                variant = self._variant(identity, identity.active_master_id)
                result[identity.character_id] = self.root / variant.media_path
        return result

    def dependencies(self, character_id: str) -> VisualDependencies:
        shot_ids: set[str] = set()
        root = self.root / "episodes"
        if root.is_dir():
            for path in root.rglob("*.json"):
                try:
                    payload = __import__("json").loads(path.read_text(encoding="utf-8"))
                except (OSError, ValueError):
                    continue
                shot_ids.update(self._matching_shots(payload, character_id))
        rendered = [
            item
            for item in sorted(shot_ids)
            if self.output_root is not None
            and (self.output_root / item / "generation.json").is_file()
        ]
        return VisualDependencies(shot_ids=sorted(shot_ids), rendered_shot_ids=rendered)

    def _select_master(
        self, character_id: str, variant_id: str, expected_revision: int, restore: bool
    ) -> tuple[VisualIdentityBoard, VisualDependencies]:
        with self._lock:
            board = self.load()
            self._check_revision(board, expected_revision)
            identity = self._identity(board, character_id)
            variant = self._variant(identity, variant_id)
            if variant.status is VisualVariantStatus.REJECTED:
                raise VisualIdentityError("A rejected variant cannot become master")
            if restore and variant.status is not VisualVariantStatus.APPROVED:
                raise VisualIdentityError("Only a previously approved variant can be restored")
            if identity.active_master_id == variant_id:
                raise VisualIdentityError("This variant is already the active master")
            now = datetime.now(UTC)
            variants = [
                item.model_copy(
                    update={
                        "status": VisualVariantStatus.APPROVED,
                        "reviewed_at": item.reviewed_at or now,
                    }
                )
                if item.id == variant_id
                else item
                for item in identity.variants
            ]
            changed = identity.model_copy(
                update={
                    "active_master_id": variant_id,
                    "variants": variants,
                    "master_history": [
                        *identity.master_history,
                        MasterChange(
                            revision=board.revision + 1,
                            previous_variant_id=identity.active_master_id,
                            variant_id=variant_id,
                            changed_at=now,
                        ),
                    ],
                }
            )
            saved = self._replace(board, changed)
            return saved, self.dependencies(character_id)

    def _put_variant(
        self, board: VisualIdentityBoard, variant: VisualVariant
    ) -> VisualIdentityBoard:
        identities = list(board.characters)
        identity = next(
            (item for item in identities if item.character_id == variant.character_id), None
        )
        if identity is None:
            identity = CharacterVisualIdentity(character_id=variant.character_id)
            identities.append(identity)
        changed = identity.model_copy(update={"variants": [*identity.variants, variant]})
        return self._save(
            board.model_copy(
                update={
                    "revision": board.revision + 1,
                    "updated_at": datetime.now(UTC),
                    "characters": [
                        changed if item.character_id == variant.character_id else item
                        for item in identities
                    ],
                }
            )
        )

    def _replace(
        self, board: VisualIdentityBoard, identity: CharacterVisualIdentity
    ) -> VisualIdentityBoard:
        return self._save(
            board.model_copy(
                update={
                    "revision": board.revision + 1,
                    "updated_at": datetime.now(UTC),
                    "characters": [
                        identity if item.character_id == identity.character_id else item
                        for item in board.characters
                    ],
                }
            )
        )

    def _save(self, board: VisualIdentityBoard) -> VisualIdentityBoard:
        write_text_atomic(self.path, board.model_dump_json(indent=2) + "\n")
        return board

    @staticmethod
    def _check_revision(board: VisualIdentityBoard, expected: int) -> None:
        if board.revision != expected:
            raise VisualIdentityConflict(
                f"Revision conflict: expected {expected}, current {board.revision}"
            )

    @staticmethod
    def _validate_character(character_id: str) -> None:
        if not re.fullmatch(r"[a-z0-9][a-z0-9_-]*", character_id):
            raise VisualIdentityError("Invalid character id")

    @staticmethod
    def _identity(board: VisualIdentityBoard, character_id: str) -> CharacterVisualIdentity:
        VisualIdentityRegistry._validate_character(character_id)
        identity = next(
            (item for item in board.characters if item.character_id == character_id), None
        )
        if identity is None:
            raise VisualIdentityError(f"Unknown character identity: {character_id}")
        return identity

    @staticmethod
    def _variant(identity: CharacterVisualIdentity, variant_id: str) -> VisualVariant:
        variant = next((item for item in identity.variants if item.id == variant_id), None)
        if variant is None:
            raise VisualIdentityError(f"Unknown visual variant: {variant_id}")
        return variant

    @classmethod
    def _matching_shots(cls, value: object, character_id: str) -> Iterable[str]:
        if isinstance(value, dict):
            shot_id, characters = value.get("id"), value.get("characters")
            if (
                isinstance(shot_id, str)
                and re.fullmatch(r"S\d{2}E\d{3}-S\d{2}", shot_id)
                and isinstance(characters, list)
                and any(
                    isinstance(item, dict) and item.get("id") == character_id for item in characters
                )
            ):
                yield shot_id
            for nested in value.values():
                yield from cls._matching_shots(nested, character_id)
        elif isinstance(value, list):
            for nested in value:
                yield from cls._matching_shots(nested, character_id)
