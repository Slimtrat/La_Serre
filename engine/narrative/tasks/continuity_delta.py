from __future__ import annotations

import json
from collections.abc import Mapping
from typing import Any

from pydantic import BaseModel

from engine.narrative.series_state import (
    DeltaEvidence,
    EpisodeStateDelta,
    SeriesState,
    StateMutation,
)
from engine.narrative.tasks.models import TaskContext, TaskKind, TaskSpec

TASK_ID = "tentafruit.continuity-delta"
TASK_VERSION = 2

CONTINUITY_DELTA_TASK = TaskSpec(
    task_id=TASK_ID,
    version=TASK_VERSION,
    kind=TaskKind.FACTUAL,
    objective=(
        "Compare l’état d’entrée canonique et l’épisode approuvé. Propose uniquement "
        "les changements explicitement prouvés par la source."
    ),
    contract=EpisodeStateDelta,
    required_context=("entry_state", "episode", "bible"),
    rules=(
        "Retourne une proposition: tu n’appliques jamais le delta au canon.",
        "Cite chaque changement par un evidence_id structuré.",
        "N’invente aucun fait, savoir, secret, relation, objectif, objet ou fil implicite.",
        "Un secret révélé doit être explicite dans l’épisode.",
        "Utilise exclusivement les identifiants canoniques fournis.",
        "Distingue les objets des états visuels temporaires.",
    ),
    inference_options={"temperature": 0.0},
    allows_mutation=False,
)


def build_continuity_delta_context(
    entry_state: SeriesState,
    episode: BaseModel | Mapping[str, Any] | str,
    bible: BaseModel | Mapping[str, Any],
) -> TaskContext:
    return TaskContext(
        {
            "entry_state": entry_state.model_dump(mode="json"),
            "episode": _json_value(episode),
            "bible": _json_value(bible),
        }
    )


def build_fake_continuity_delta(
    entry_state: SeriesState,
    episode: BaseModel | Mapping[str, Any] | str,
    bible: BaseModel | Mapping[str, Any],
) -> EpisodeStateDelta:
    """Deterministic CI adapter: valid evidence, no inference and no network."""

    context = build_continuity_delta_context(entry_state, episode, bible)
    episode_value = context.normalized()["episode"]
    if isinstance(episode_value, dict):
        episode_id = str(episode_value.get("id", "episode"))
        source = str(
            episode_value.get("narrative_source")
            or episode_value.get("synopsis")
            or episode_value.get("title")
            or episode_id
        )
    else:
        episode_id = "episode"
        source = str(episode_value)
    evidence = DeltaEvidence(
        id="evidence-fake-source",
        source="episode",
        reference=episode_id,
        excerpt=source[:2000],
    )
    return EpisodeStateDelta(
        facts=[
            StateMutation(
                key=f"observed-{context.fingerprint[:12]}",
                value=f"Source de {episode_id} examinée par le moteur factice.",
                evidence_ids=[evidence.id],
            )
        ],
        evidence=[evidence],
    )


def _json_value(value: BaseModel | Mapping[str, Any] | str) -> object:
    if isinstance(value, BaseModel):
        return value.model_dump(mode="json")
    if isinstance(value, Mapping):
        return json.loads(json.dumps(dict(value), ensure_ascii=False, default=str))
    return value
