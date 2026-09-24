"""Compile explicit story constraints into a storyboard skeleton that AI cannot erase."""

from __future__ import annotations

import re
from dataclasses import dataclass

from engine.narrative.workflow_models import EpisodeBreakdownCandidate, ShotBlueprint

_TIMED_BEAT = re.compile(
    r"(?m)^\s*(?P<number>\d+)\.\s*"
    r"(?P<start>\d+(?:[.,]\d+)?)\s*[–—-]\s*"
    r"(?P<end>\d+(?:[.,]\d+)?)\s*s\s*:\s*(?P<instruction>.+?)\s*$"
)


@dataclass(frozen=True, slots=True)
class TimedStoryBeat:
    number: int
    start: float
    end: float
    instruction: str

    @property
    def duration(self) -> float:
        return self.end - self.start

    @property
    def source_text(self) -> str:
        return f"{self.start:g}–{self.end:g} s : {self.instruction}"


@dataclass(frozen=True, slots=True)
class StoryContract:
    source: str
    beats: tuple[TimedStoryBeat, ...]

    @property
    def duration(self) -> float:
        return sum(beat.duration for beat in self.beats)


def compile_story_contract(source: str) -> StoryContract | None:
    """Return a strict timed contract when the author supplied an explicit breakdown."""
    beats = tuple(
        TimedStoryBeat(
            number=int(match.group("number")),
            start=_number(match.group("start")),
            end=_number(match.group("end")),
            instruction=match.group("instruction").strip(),
        )
        for match in _TIMED_BEAT.finditer(source)
    )
    if not beats:
        return None
    expected_numbers = tuple(range(1, len(beats) + 1))
    if tuple(beat.number for beat in beats) != expected_numbers:
        raise ValueError("Le découpage temporel doit être numéroté sans interruption.")
    for previous, current in zip(beats, beats[1:], strict=False):
        if previous.end != current.start:
            raise ValueError(
                f"Les fenêtres {previous.number} et {current.number} ne sont pas contiguës."
            )
    if any(beat.duration <= 0 or beat.duration > 12 for beat in beats):
        raise ValueError("Chaque fenêtre doit durer entre 0 et 12 secondes.")
    return StoryContract(source=source.strip(), beats=beats)


def reconcile_storyboard(
    contract: StoryContract,
    candidate: EpisodeBreakdownCandidate,
) -> EpisodeBreakdownCandidate:
    """Keep AI direction while restoring the author's immutable timing and beats."""
    shots: list[ShotBlueprint] = []
    for index, beat in enumerate(contract.beats):
        generated = candidate.shots[min(index, len(candidate.shots) - 1)]
        interpretation = generated.action.strip()
        action = beat.instruction
        if interpretation and _normalized(interpretation) != _normalized(action):
            action = f"{action}\n\nInterprétation visuelle IA : {interpretation}"
        shots.append(
            generated.model_copy(
                update={
                    "source_text": beat.source_text,
                    "duration": beat.duration,
                    "action": action,
                }
            )
        )
    return EpisodeBreakdownCandidate(shots=shots)


def _number(value: str) -> float:
    return float(value.replace(",", "."))


def _normalized(value: str) -> str:
    return " ".join(re.sub(r"[^a-z0-9]+", " ", value.casefold()).split())
