from __future__ import annotations

import argparse
import json
import tempfile
from collections.abc import Sequence
from pathlib import Path
from typing import Protocol, TypedDict

from engine.audio.models import EpisodeAudioPlan
from engine.audio.speech import (
    SpeechSynthesizer,
    create_speech_synthesizer,
    voice_preset_for_performance,
)
from engine.director.models import Shot
from engine.media.ffmpeg import FFmpegToolchain
from engine.production.artifacts import write_text_atomic


class DurationProbe(Protocol):
    def duration(self, path: Path) -> float: ...


class VoiceTimingRecord(TypedDict):
    shot_id: str
    speaker: str
    text: str
    shot_duration: float
    audio_duration: float
    available_duration: float
    required_speed: float
    limit: float
    within_limit: bool


def audit_proposal(
    proposal_dir: Path,
    synthesizer: SpeechSynthesizer,
    media: DurationProbe,
    audio_root: Path,
) -> list[VoiceTimingRecord]:
    proposal = proposal_dir.resolve()
    plan = EpisodeAudioPlan.load(proposal / "audio-plan.json")
    records: list[VoiceTimingRecord] = []
    for shot_path in sorted((proposal / "shots").glob("*.json")):
        shot = Shot.model_validate_json(shot_path.read_text(encoding="utf-8"))
        if shot.dialogue is None:
            continue
        cue = plan.cue_for(shot.id)
        performance = shot.dialogue.performance
        pause_before = performance.pause_before_seconds if performance else 0
        pause_after = performance.pause_after_seconds if performance else 0
        available = shot.duration - cue.offset_seconds - pause_before - pause_after
        preset = voice_preset_for_performance(
            plan.voice_for(shot.dialogue.speaker),
            performance,
        )
        voice_path = audio_root / f"{shot.id}{synthesizer.output_suffix}"
        synthesizer.synthesize(shot.dialogue.text, voice_path, preset)
        audio_duration = media.duration(voice_path)
        required_speed = audio_duration / available if available > 0 else float("inf")
        records.append(
            {
                "shot_id": shot.id,
                "speaker": shot.dialogue.speaker,
                "text": shot.dialogue.text,
                "shot_duration": shot.duration,
                "audio_duration": round(audio_duration, 3),
                "available_duration": round(max(0, available), 3),
                "required_speed": round(max(1.0, required_speed), 3),
                "limit": plan.max_time_fit_speed,
                "within_limit": available > 0 and required_speed <= plan.max_time_fit_speed + 0.01,
            }
        )
    return records


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Mesure le time-fit réel des dialogues d'une proposition sans l'activer."
    )
    parser.add_argument("proposal_dir", type=Path)
    parser.add_argument("--tts", choices=("auto", "sapi", "edge"), default="auto")
    parser.add_argument("--output", type=Path, help="Rapport JSON facultatif")
    parser.add_argument("--keep-audio", type=Path, help="Conserve les voix d'audit ici")
    return parser


def main(argv: Sequence[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    synthesizer = create_speech_synthesizer(args.tts)
    if synthesizer is None:
        raise RuntimeError("Aucun synthétiseur vocal disponible pour cet audit")
    if args.keep_audio:
        args.keep_audio.mkdir(parents=True, exist_ok=True)
        records = audit_proposal(
            args.proposal_dir,
            synthesizer,
            FFmpegToolchain(),
            args.keep_audio,
        )
    else:
        with tempfile.TemporaryDirectory(prefix="serre-voice-audit-") as temporary:
            records = audit_proposal(
                args.proposal_dir,
                synthesizer,
                FFmpegToolchain(),
                Path(temporary),
            )
    payload = {
        "proposal": str(args.proposal_dir.resolve()),
        "backend": synthesizer.name,
        "dialogues": records,
        "passed": all(record["within_limit"] for record in records),
        "maximum_required_speed": max(
            (record["required_speed"] for record in records),
            default=1.0,
        ),
    }
    serialized = json.dumps(payload, ensure_ascii=False, indent=2) + "\n"
    if args.output:
        write_text_atomic(args.output, serialized)
    print(serialized, end="")
    return 0 if payload["passed"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
