"""Select a minimal, high-signal visual proof before full episode production."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict

from engine.narrative.workflow_models import EpisodeBreakdownCandidate, ShotBlueprint


class VisualWitness(BaseModel):
    model_config = ConfigDict(extra="forbid")

    shot_index: int
    shot_id: str
    role: Literal["establishing", "interaction", "climax"]
    reason: str
    checks: list[str]
    source_text: str


class VisualProofGate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    status: Literal["awaiting_generation", "awaiting_review", "approved", "rejected"]
    production_unlocked: bool = False
    witnesses: list[VisualWitness]


def build_visual_proof_gate(
    episode_id: str,
    storyboard: EpisodeBreakdownCandidate,
) -> VisualProofGate:
    """Choose opening, interaction and climax shots without duplicating a witness."""
    shots = storyboard.shots
    if not shots:
        raise ValueError("Le sas visuel exige au moins un plan.")
    opening_index = 0
    climax_index = len(shots) - 1
    selected: list[
        tuple[int, Literal["establishing", "interaction", "climax"], str, list[str]]
    ] = [
        (
            opening_index,
            "establishing",
            "Valide le décor, la palette et la silhouette générale avant toute série.",
            ["décor canonique", "palette", "style", "absence d’éléments interdits"],
        )
    ]
    if len(shots) >= 3:
        interaction_index = max(
            range(1, climax_index),
            key=lambda index: (
                _interaction_score(shots[index]),
                -abs(index - len(shots) / 2),
            ),
        )
        selected.append(
            (
                interaction_index,
                "interaction",
                "Valide ensemble les personnages, leurs proportions et leur lisibilité dramatique.",
                ["identités", "proportions", "relation spatiale", "jeu émotionnel"],
            )
        )
    if climax_index != opening_index:
        selected.append(
            (
            climax_index,
            "climax",
            "Valide l’effet le plus risqué et la continuité avec les plans précédents.",
            ["continuité", "effet narratif", "accessoires", "lisibilité du climax"],
            )
        )
    witnesses = [
        VisualWitness(
            shot_index=index,
            shot_id=f"{episode_id}-S{index + 1:02d}",
            role=role,
            reason=reason,
            checks=checks,
            source_text=shots[index].source_text,
        )
        for index, role, reason, checks in selected
    ]
    return VisualProofGate(status="awaiting_generation", witnesses=witnesses)


def _interaction_score(shot: ShotBlueprint) -> int:
    return len(shot.character_ids) * 3 + (2 if shot.dialogue else 0)
