from __future__ import annotations

import threading
from collections.abc import Callable
from datetime import UTC, datetime
from pathlib import Path
from typing import Literal

from apps.api.notifications import StudioNotificationLog
from apps.api.run_history import RunHistory
from engine.audio.models import EpisodeAudioPlan
from engine.audio.score import ProceduralScoreComposer
from engine.audio.speech import (
    SpeechSynthesizer,
    create_speech_synthesizer,
    voice_preset_for_performance,
)
from engine.config import Settings
from engine.director.models import Shot
from engine.director.prompt_builder import PromptBuilder
from engine.narrative.episode_models import EpisodePackage
from engine.production.artifacts import write_text_atomic
from engine.world.catalog import EpisodeCatalog

StageKind = Literal["prompt", "voice", "music"]
SpeechFactory = Callable[[str], SpeechSynthesizer | None]


class ShotStageService:
    """Runs independently addressable production stages for the Studio UI."""

    def __init__(
        self,
        settings_provider: Callable[[], Settings],
        *,
        speech_factory: SpeechFactory = create_speech_synthesizer,
        score: ProceduralScoreComposer | None = None,
    ) -> None:
        self.settings_provider = settings_provider
        self.speech_factory = speech_factory
        self.score = score or ProceduralScoreComposer()
        self.prompts = PromptBuilder()
        self._operation_lock = threading.Lock()
        self._active_operations = 0

    def has_active_operations(self) -> bool:
        with self._operation_lock:
            return self._active_operations > 0

    def generate(
        self,
        kind: StageKind,
        shot_payload: dict[str, object],
        *,
        tts: str = "auto",
    ) -> dict[str, object]:
        with self._operation_lock:
            self._active_operations += 1
        try:
            settings = self.settings_provider()
            shot: Shot | None = None
            notifications = StudioNotificationLog(settings.output_dir)
            try:
                shot = Shot.model_validate(shot_payload)
                if kind == "prompt":
                    result = self._prompt(shot, settings)
                elif kind == "voice":
                    result = self._voice(shot, settings, tts)
                elif kind == "music":
                    result = self._music(shot, settings)
                else:
                    raise ValueError(f"Étape inconnue : {kind}")
            except Exception as exc:
                if shot is not None:
                    self._event(settings, shot.id, kind, "failed", str(exc))
                notifications.publish(
                    "error",
                    f"Échec de l’étape {kind}",
                    str(exc),
                    source="shot-stage",
                    context={
                        "shot_id": str(shot_payload.get("id", "")),
                        "stage": kind,
                    },
                )
                raise
            notifications.publish(
                "success",
                f"Étape {kind} terminée",
                str(result["message"]),
                source="shot-stage",
                context={"shot_id": shot.id, "stage": kind},
            )
            return result
        finally:
            with self._operation_lock:
                self._active_operations -= 1

    def _prompt(self, shot: Shot, settings: Settings) -> dict[str, object]:
        destination = settings.output_dir / shot.id
        destination.mkdir(parents=True, exist_ok=True)
        prompt = self.prompts.build(shot)
        path = destination / "prompt.txt"
        archived = RunHistory(settings.output_dir).invalidate_shot_after(shot.id, "prompt")
        write_text_atomic(
            path,
            prompt.positive + "\n\nNEGATIVE:\n" + prompt.negative + "\n",
        )
        event = self._event(
            settings, shot.id, "prompt", "completed", "Prompt du plan construit"
        )
        return {
            "status": "completed",
            "stage": "prompt",
            "message": event["message"],
            "media": {"prompt": f"/api/media/{shot.id}/prompt.txt"},
            "event": event,
            "archived_run_id": archived,
        }

    def _voice(self, shot: Shot, settings: Settings, tts: str) -> dict[str, object]:
        if shot.dialogue is None:
            raise ValueError(f"{shot.id} ne contient aucune réplique")
        synthesizer = self.speech_factory(tts)
        if synthesizer is None:
            raise RuntimeError("Aucun synthétiseur vocal n’est disponible")
        plan = EpisodeAudioPlan.load(self._episode_dir(settings, shot.id) / "audio-plan.json")
        preset = voice_preset_for_performance(
            plan.voice_for(shot.dialogue.speaker),
            shot.dialogue.performance,
        )
        destination = settings.output_dir / shot.id
        destination.mkdir(parents=True, exist_ok=True)
        if any((destination / name).is_file() for name in ("voice.wav", "voice.mp3")):
            RunHistory(settings.output_dir).archive_current(shot.id)
        RunHistory(settings.output_dir).invalidate_master(self._episode_id(shot.id))
        for stale in (destination / "voice.wav", destination / "voice.mp3"):
            stale.unlink(missing_ok=True)
        voice = destination / f"voice{synthesizer.output_suffix}"
        synthesizer.synthesize(shot.dialogue.text, voice, preset)
        event = self._event(
            settings,
            shot.id,
            "voice",
            "completed",
            f"Voix {synthesizer.name} générée pour {shot.dialogue.speaker}",
        )
        return {
            "status": "completed",
            "stage": "voice",
            "message": event["message"],
            "media": {"audio": f"/api/media/{shot.id}/{voice.name}"},
            "event": event,
        }

    def _music(self, shot: Shot, settings: Settings) -> dict[str, object]:
        episode_id = self._episode_id(shot.id)
        package = self._episode_package(settings, episode_id)
        RunHistory(settings.output_dir).invalidate_master(episode_id)
        destination = settings.output_dir / episode_id / "music.wav"
        self.score.compose(
            destination,
            package.episode.duration_target,
            seed=package.episode.season * 10_000 + package.episode.episode,
        )
        event = self._event(
            settings,
            shot.id,
            "music",
            "completed",
            f"Musique de fond générée pour {package.episode.duration_target:g} s",
        )
        return {
            "status": "completed",
            "stage": "music",
            "message": event["message"],
            "media": {"audio": f"/api/episode-media/{episode_id}/music.wav"},
            "event": event,
        }

    def _event(
        self,
        settings: Settings,
        shot_id: str,
        stage: str,
        status: str,
        message: str,
    ) -> dict[str, object]:
        event: dict[str, object] = {
            "timestamp": datetime.now(UTC).isoformat(),
            "stage": stage,
            "status": status,
            "message": message,
        }
        RunHistory.append_event(
            settings.output_dir / shot_id / "studio-log.jsonl",
            event,
        )
        return event

    @staticmethod
    def _episode_id(shot_id: str) -> str:
        return shot_id.rsplit("-S", 1)[0]

    @classmethod
    def _episode_dir(cls, settings: Settings, shot_id: str) -> Path:
        episode_id = cls._episode_id(shot_id)
        season = episode_id[1:3]
        return settings.private_content_dir / "episodes" / f"season-{season}" / episode_id

    @staticmethod
    def _episode_package(settings: Settings, episode_id: str) -> EpisodePackage:
        return EpisodeCatalog(settings.private_content_dir).load(episode_id)
