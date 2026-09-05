from __future__ import annotations

import re
import threading
from datetime import UTC, datetime
from pathlib import Path
from typing import Literal
from uuid import uuid4

from pydantic import BaseModel, ConfigDict, Field

from engine.production.artifacts import write_text_atomic
from engine.world.bible import BibleRegistry
from engine.world.models import CharacterProfile


class GuidedModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class GuidedProjectBrief(GuidedModel):
    working_title: str = Field(default="", max_length=180)
    idea: str = Field(default="", max_length=50_000)
    genre: str = Field(default="", max_length=200)
    tone: str = Field(default="", max_length=500)
    audience: str = Field(default="", max_length=500)
    episode_title: str = Field(default="", max_length=180)
    episode_concept: str = Field(default="", max_length=50_000)
    locked_fields: list[str] = Field(default_factory=list)


class GuidedCharacterDraft(GuidedModel):
    id: str = Field(max_length=64, pattern=r"^[a-z0-9][a-z0-9_-]*$")
    name: str = Field(default="", max_length=180)
    role: str = Field(default="", max_length=300)
    visual_description: str = Field(default="", max_length=5_000)
    wardrobe: str = Field(default="", max_length=3_000)
    signature_details: list[str] = Field(default_factory=list, max_length=12)
    palette: list[str] = Field(default_factory=list, max_length=8)
    personality: str = Field(default="", max_length=3_000)
    wants: list[str] = Field(default_factory=list, max_length=12)
    fears: list[str] = Field(default_factory=list, max_length=12)
    voice_description: str = Field(default="", max_length=2_000)
    generation_negative_prompt: str = Field(default="", max_length=3_000)
    locked_fields: list[str] = Field(default_factory=list)
    promoted_revision: int | None = Field(default=None, ge=1)


class GuidedAuthoringState(GuidedModel):
    schema_version: int = 1
    revision: int = Field(default=0, ge=0)
    updated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    brief: GuidedProjectBrief = Field(default_factory=GuidedProjectBrief)
    characters: list[GuidedCharacterDraft] = Field(default_factory=list)
    active_episode_id: str | None = Field(default=None, pattern=r"^S\d{2}E\d{3}$")
    selected_templates: dict[str, str] = Field(default_factory=dict)


class GuidedProposal(GuidedModel):
    id: str
    target: str
    mode: Literal["improve", "fill_missing", "prepare_next"]
    base_revision: int = Field(ge=0)
    before: dict[str, object]
    after: dict[str, object]
    model: str
    status: Literal["candidate", "accepted", "rejected"] = "candidate"
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    decided_at: datetime | None = None


class GuidedAuthoringRegistry:
    """Persistent guided drafts with optimistic revisions and separate AI proposals."""

    _lock = threading.RLock()

    def __init__(self, private_root: Path) -> None:
        root = private_root.resolve() / "world"
        self.path = root / "guided-authoring.json"
        self.history_dir = root / "guided-history"
        self.proposal_dir = root / "guided-proposals"

    def load(self) -> GuidedAuthoringState:
        with self._lock:
            if not self.path.is_file():
                return GuidedAuthoringState()
            return GuidedAuthoringState.model_validate_json(
                self.path.read_text(encoding="utf-8")
            )

    def save(
        self,
        state: GuidedAuthoringState,
        *,
        expected_revision: int,
    ) -> GuidedAuthoringState:
        with self._lock:
            current = self.load()
            if current.revision != expected_revision:
                raise ValueError(
                    "Le brouillon a changé dans une autre vue. Recharge avant de continuer."
                )
            updated = state.model_copy(
                update={
                    "revision": current.revision + 1,
                    "updated_at": datetime.now(UTC),
                }
            )
            write_text_atomic(self.path, updated.model_dump_json(indent=2) + "\n")
            write_text_atomic(
                self.history_dir / f"revision-{updated.revision:06d}.json",
                updated.model_dump_json(indent=2) + "\n",
            )
            return updated

    def create_character(self, *, expected_revision: int) -> GuidedAuthoringState:
        current = self.load()
        draft = GuidedCharacterDraft(id=f"character_{uuid4().hex[:10]}")
        return self.save(
            current.model_copy(update={"characters": [*current.characters, draft]}),
            expected_revision=expected_revision,
        )

    def put_character(
        self,
        character_id: str,
        draft: GuidedCharacterDraft,
        *,
        expected_revision: int,
    ) -> GuidedAuthoringState:
        if draft.id != character_id:
            raise ValueError("L’identifiant du personnage ne correspond pas à la fiche")
        current = self.load()
        found = False
        characters: list[GuidedCharacterDraft] = []
        for character in current.characters:
            if character.id == character_id:
                characters.append(draft.model_copy(update={"promoted_revision": None}))
                found = True
            else:
                characters.append(character)
        if not found:
            raise KeyError(character_id)
        return self.save(
            current.model_copy(update={"characters": characters}),
            expected_revision=expected_revision,
        )

    def delete_character(
        self,
        character_id: str,
        *,
        expected_revision: int,
    ) -> GuidedAuthoringState:
        current = self.load()
        characters = [item for item in current.characters if item.id != character_id]
        if len(characters) == len(current.characters):
            raise KeyError(character_id)
        return self.save(
            current.model_copy(update={"characters": characters}),
            expected_revision=expected_revision,
        )

    def create_proposal(
        self,
        *,
        target: str,
        mode: Literal["improve", "fill_missing", "prepare_next"],
        base_revision: int,
        before: dict[str, object],
        after: dict[str, object],
        model: str,
    ) -> GuidedProposal:
        with self._lock:
            if self.load().revision != base_revision:
                raise ValueError(
                    "Le contexte a changé pendant la génération. Relance la proposition."
                )
            proposal = GuidedProposal(
                id=f"proposal-{uuid4().hex}",
                target=target,
                mode=mode,
                base_revision=base_revision,
                before=before,
                after=after,
                model=model,
            )
            self._write_proposal(proposal)
            return proposal

    def get_proposal(self, proposal_id: str) -> GuidedProposal:
        if not re.fullmatch(r"proposal-[0-9a-f]{32}", proposal_id):
            raise KeyError(proposal_id)
        path = self.proposal_dir / f"{proposal_id}.json"
        if not path.is_file():
            raise KeyError(proposal_id)
        return GuidedProposal.model_validate_json(path.read_text(encoding="utf-8"))

    def list_proposals(self, *, limit: int = 20) -> list[GuidedProposal]:
        proposals: list[GuidedProposal] = []
        paths = sorted(
            self.proposal_dir.glob("proposal-*.json"),
            key=lambda item: item.stat().st_mtime,
            reverse=True,
        )
        for path in paths[:limit]:
            proposals.append(GuidedProposal.model_validate_json(path.read_text(encoding="utf-8")))
        return proposals

    def accept_proposal(
        self,
        proposal_id: str,
        *,
        expected_revision: int,
        edited_after: dict[str, object] | None = None,
    ) -> tuple[GuidedAuthoringState, GuidedProposal]:
        with self._lock:
            proposal = self.get_proposal(proposal_id)
            if proposal.status != "candidate":
                raise ValueError("Cette proposition a déjà été traitée")
            current = self.load()
            if current.revision != expected_revision or current.revision != proposal.base_revision:
                raise ValueError(
                    "Cette proposition est périmée car le brouillon a changé. Relance l’IA."
                )
            candidate = dict(edited_after or proposal.after)
            raw_locked = proposal.before.get("locked_fields", [])
            if isinstance(raw_locked, list):
                for field in raw_locked:
                    name = str(field)
                    if name in proposal.before:
                        candidate[name] = proposal.before[name]
            if proposal.target == "brief":
                next_state = current.model_copy(
                    update={"brief": GuidedProjectBrief.model_validate(candidate)}
                )
            elif proposal.target.startswith("character:"):
                character_id = proposal.target.partition(":")[2]
                replacement = GuidedCharacterDraft.model_validate(candidate)
                if replacement.id != character_id:
                    raise ValueError("La proposition ne cible plus le même personnage")
                replaced = False
                characters: list[GuidedCharacterDraft] = []
                for character in current.characters:
                    if character.id == character_id:
                        characters.append(
                            replacement.model_copy(update={"promoted_revision": None})
                        )
                        replaced = True
                    else:
                        characters.append(character)
                if not replaced:
                    raise KeyError(character_id)
                next_state = current.model_copy(update={"characters": characters})
            else:
                raise ValueError("Cible de proposition inconnue")
            saved = self.save(next_state, expected_revision=expected_revision)
            decided = proposal.model_copy(
                update={
                    "status": "accepted",
                    "decided_at": datetime.now(UTC),
                    "after": candidate,
                }
            )
            self._write_proposal(decided)
            return saved, decided

    def reject_proposal(self, proposal_id: str) -> GuidedProposal:
        with self._lock:
            proposal = self.get_proposal(proposal_id)
            if proposal.status != "candidate":
                raise ValueError("Cette proposition a déjà été traitée")
            rejected = proposal.model_copy(
                update={"status": "rejected", "decided_at": datetime.now(UTC)}
            )
            self._write_proposal(rejected)
            return rejected

    def promote_character(
        self,
        character_id: str,
        *,
        expected_revision: int,
    ) -> tuple[GuidedAuthoringState, CharacterProfile]:
        with self._lock:
            current = self.load()
            if current.revision != expected_revision:
                raise ValueError("Le brouillon a changé. Recharge avant de publier le personnage.")
            draft = next((item for item in current.characters if item.id == character_id), None)
            if draft is None:
                raise KeyError(character_id)
            missing = character_missing_fields(draft)
            if missing:
                raise ValueError("Complète d’abord : " + ", ".join(missing))
            character = CharacterProfile(
                id=draft.id,
                name=draft.name.strip(),
                role=draft.role.strip(),
                visual_description=draft.visual_description.strip(),
                wardrobe=draft.wardrobe.strip(),
                signature_details=draft.signature_details,
                palette=draft.palette,
                personality={"desire": 0.8, "control": 0.5, "vulnerability": 0.4},
                wants=draft.wants,
                fears=draft.fears,
                voice_description=draft.voice_description.strip(),
                generation_negative_prompt=(
                    draft.generation_negative_prompt.strip()
                    or "identity drift, inconsistent wardrobe, anatomy errors"
                ),
            )
            BibleRegistry(self.path.parents[1]).put_character(character)
            characters = [
                item.model_copy(update={"promoted_revision": expected_revision + 1})
                if item.id == character_id
                else item
                for item in current.characters
            ]
            saved = self.save(
                current.model_copy(update={"characters": characters}),
                expected_revision=expected_revision,
            )
            return saved, character

    def _write_proposal(self, proposal: GuidedProposal) -> None:
        write_text_atomic(
            self.proposal_dir / f"{proposal.id}.json",
            proposal.model_dump_json(indent=2) + "\n",
        )


def character_missing_fields(character: GuidedCharacterDraft) -> list[str]:
    checks = (
        ("nom", len(character.name.strip()) >= 1),
        ("rôle", len(character.role.strip()) >= 1),
        ("apparence", len(character.visual_description.strip()) >= 20),
        ("tenue", len(character.wardrobe.strip()) >= 20),
        ("détails signature", bool(character.signature_details)),
        ("palette (3 couleurs)", len(character.palette) >= 3),
        ("personnalité", len(character.personality.strip()) >= 10),
        ("désir", bool(character.wants)),
        ("peur", bool(character.fears)),
        ("voix", len(character.voice_description.strip()) >= 10),
    )
    return [label for label, complete in checks if not complete]


def guided_completion(state: GuidedAuthoringState) -> dict[str, object]:
    brief_missing = [
        label
        for label, complete in (
            ("titre de travail", bool(state.brief.working_title.strip())),
            ("idée", len(state.brief.idea.strip()) >= 20),
            ("genre", bool(state.brief.genre.strip())),
            ("ton", bool(state.brief.tone.strip())),
        )
        if not complete
    ]
    characters = []
    for character in state.characters:
        missing = character_missing_fields(character)
        characters.append(
            {
                "id": character.id,
                "ready": not missing,
                "missing": missing,
                "promoted": character.promoted_revision is not None,
            }
        )
    return {
        "brief": {"ready": not brief_missing, "missing": brief_missing},
        "characters": characters,
        "universe": {
            "ready": bool(characters) and all(bool(item["ready"]) for item in characters),
            "missing": [] if characters else ["au moins un personnage"],
        },
        "episode_linked": state.active_episode_id is not None,
    }
