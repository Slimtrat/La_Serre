from __future__ import annotations

import json
import shutil
import tempfile
import uuid
from collections.abc import Callable
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path
from typing import Literal

from engine.audio.models import EpisodeAudioPlan
from engine.audio.score import ProceduralScoreComposer
from engine.audio.speech import SpeechSynthesizer
from engine.director.models import DialoguePerformance
from engine.media.ffmpeg import AssemblyRequest, MediaToolchain, SegmentInput
from engine.production.artifacts import sha256_file, write_text_atomic
from engine.production.presentation import EpisodePresentationPlan
from engine.world.catalog import EpisodeCatalog

VIDEO_SUFFIXES = {".mp4", ".webm", ".mov", ".mkv"}
IMAGE_SUFFIXES = {".png", ".jpg", ".jpeg", ".webp"}
AUDIO_SUFFIXES = {".wav", ".mp3", ".flac", ".ogg", ".m4a"}
ProgressCallback = Callable[[str, str, str], None]


@dataclass(frozen=True, slots=True)
class EpisodePipelineOptions:
    episode_id: str
    private_root: Path = Path(".private")
    output_root: Path = Path("output")
    audio_plan: Path | None = None
    subtitles: Path | None = None
    music: Path | None = None
    ambience: Path | None = None
    presentation_plan: Path | None = None
    width: int = 576
    height: int = 1024
    fps: int = 24
    tts_enabled: bool = True
    allow_stills: bool = False
    force: bool = False


@dataclass(frozen=True, slots=True)
class EpisodePipelineResult:
    episode_id: str
    video: Path
    manifest: Path
    subtitles: Path | None
    duration: float
    verification: dict[str, object]


class EpisodePipeline:
    def __init__(
        self,
        media: MediaToolchain,
        speech: SpeechSynthesizer | None = None,
        score: ProceduralScoreComposer | None = None,
        on_progress: ProgressCallback | None = None,
    ) -> None:
        self.media = media
        self.speech = speech
        self.score = score or ProceduralScoreComposer()
        self.on_progress = on_progress

    def run(self, options: EpisodePipelineOptions) -> EpisodePipelineResult:
        package = EpisodeCatalog(options.private_root).load(options.episode_id)
        episode_dir = (
            options.private_root
            / "episodes"
            / f"season-{package.episode.season:02d}"
            / package.episode.id
        )
        audio_plan_path = options.audio_plan or episode_dir / "audio-plan.json"
        plan = EpisodeAudioPlan.load(audio_plan_path)
        presentation_path = options.presentation_plan or episode_dir / "presentation-plan.json"
        presentation = EpisodePresentationPlan.load(presentation_path)
        subtitles = self._optional_file(options.subtitles or episode_dir / "subtitles.fr.srt")
        music = self._optional_file(options.music or episode_dir / "music.wav")
        ambience = self._optional_file(options.ambience or episode_dir / "ambience.wav")

        destination = options.output_root / package.episode.id
        final_video = destination / "episode.mp4"
        manifest_path = destination / "episode-generation.json"
        if final_video.exists() and not options.force:
            raise FileExistsError(
                f"L'épisode existe déjà : {final_video}. Utilise --force pour le remplacer."
            )
        destination.mkdir(parents=True, exist_ok=True)
        created_at = datetime.now(UTC)
        with tempfile.TemporaryDirectory(prefix=".episode-build-", dir=destination) as temporary:
            workspace = Path(temporary)
            generated_music = music is None
            if generated_music:
                music = workspace / "music.wav"
                self.score.compose(
                    music,
                    package.episode.duration_target,
                    seed=package.episode.season * 10_000 + package.episode.episode,
                )
            segments: list[SegmentInput] = []
            source_records: list[dict[str, object]] = []
            generated_voices: list[tuple[str, Path]] = []
            self._notify("voice", "running", "Résolution et génération des voix")
            for shot in package.shots:
                caption, caption_position = presentation.caption_for(shot.id)
                visual, visual_kind, visual_source = self._resolve_visual(
                    options.output_root,
                    shot.id,
                    allow_stills=options.allow_stills,
                )
                audio, audio_source = self._resolve_audio(
                    options,
                    plan,
                    shot.id,
                    shot.dialogue.speaker if shot.dialogue else None,
                    shot.dialogue.text if shot.dialogue else None,
                    shot.dialogue.performance if shot.dialogue else None,
                    workspace,
                )
                cue = plan.cue_for(shot.id)
                performance_delay = (
                    shot.dialogue.performance.pause_before_seconds
                    if shot.dialogue and shot.dialogue.performance
                    else 0
                )
                audio_offset = cue.offset_seconds + performance_delay
                audio_fit_speed = 1.0
                if audio:
                    audio_duration = self.media.duration(audio)
                    pause_after = (
                        shot.dialogue.performance.pause_after_seconds
                        if shot.dialogue and shot.dialogue.performance
                        else 0
                    )
                    available_duration = shot.duration - audio_offset - pause_after
                    if available_duration <= 0:
                        raise ValueError(
                            f"Aucune place pour la voix de {shot.id} après les silences imposés."
                        )
                    if (
                        audio_duration > available_duration + 0.05
                        and self.speech is not None
                        and audio_source == self.speech.name
                    ):
                        fitted = workspace / "voices" / f"{shot.id}.fitted.wav"
                        audio_fit_speed = self.media.fit_audio(
                            audio,
                            fitted,
                            available_duration,
                        )
                        if audio_fit_speed > plan.max_time_fit_speed:
                            raise ValueError(
                                f"La voix de {shot.id} exige un time-fit de "
                                f"{audio_fit_speed:.2f}x, au-dessus de la limite qualité "
                                f"{plan.max_time_fit_speed:.2f}x. Retime le plan ou la réplique."
                            )
                        audio = fitted
                        audio_duration = self.media.duration(audio)
                    if audio_duration > available_duration + 0.05:
                        raise ValueError(
                            f"La voix de {shot.id} dure {audio_duration:.2f}s et dépasse le plan "
                            f"de {shot.duration:.2f}s (fenêtre disponible : "
                            f"{available_duration:.2f}s)."
                        )
                if audio and self.speech is not None and audio_source == self.speech.name:
                    generated_voices.append((shot.id, audio))
                segments.append(
                    SegmentInput(
                        shot_id=shot.id,
                        visual=visual,
                        visual_kind=visual_kind,
                        duration=shot.duration,
                        audio=audio,
                        audio_offset=audio_offset,
                        audio_gain_db=cue.gain_db,
                        overlay=presentation.frame_for(shot.id),
                        caption=caption,
                        caption_position=caption_position,
                    )
                )
                audio_record = self._source_record(audio, audio_source) if audio else None
                if audio_record is not None:
                    audio_record["fit_speed"] = audio_fit_speed
                if (
                    audio_record is not None
                    and audio is not None
                    and self.speech is not None
                    and audio_source == self.speech.name
                ):
                    audio_record["path"] = str(
                        (destination / "voices" / f"{shot.id}{audio.suffix}").resolve()
                    )
                source_records.append(
                    {
                        "shot_id": shot.id,
                        "duration": shot.duration,
                        "dialogue": (
                            shot.dialogue.model_dump(mode="json") if shot.dialogue else None
                        ),
                        "visual": self._source_record(visual, visual_source),
                        "audio": audio_record,
                    }
                )
            voice_count = sum(segment.audio is not None for segment in segments)
            self._notify(
                "voice",
                "completed",
                f"{voice_count} piste(s) de dialogue prête(s)",
            )

            temporary_video = workspace / "episode.mp4"
            self._notify("mix", "running", "Préparation du mix voix, musique et ambiance")
            request = AssemblyRequest(
                segments=segments,
                output=temporary_video,
                width=options.width,
                height=options.height,
                fps=options.fps,
                subtitles=subtitles,
                music=music,
                ambience=ambience,
                music_gain_db=plan.music_gain_db,
                ambience_gain_db=plan.ambience_gain_db,
            )
            self._notify("mix", "completed", "Plan de mix synchronisé")
            self._notify("montage", "running", "Assemblage déterministe des plans")
            self.media.assemble(request)
            self._notify("montage", "completed", "Montage vidéo et mixage terminés")
            self._notify("export", "running", "Vérification du master final")
            verification = self.media.verify(
                temporary_video,
                duration=package.episode.duration_target,
                width=options.width,
                height=options.height,
            )
            temporary_video.replace(final_video)
            final_music: Path | None = None
            if generated_music and music is not None:
                final_music = destination / "music.wav"
                self._copy_atomic(music, final_music)

            final_subtitles: Path | None = None
            if subtitles:
                final_subtitles = destination / "subtitles.fr.srt"
                self._copy_atomic(subtitles, final_subtitles)
            voices_dir = destination / "voices"
            for shot_id, voice in generated_voices:
                self._copy_atomic(voice, voices_dir / f"{shot_id}{voice.suffix}")

            record: dict[str, object] = {
                "schema_version": 1,
                "id": f"episode_{uuid.uuid4().hex}",
                "type": "episode",
                "episode_id": package.episode.id,
                "status": "FINAL",
                "created_at": created_at.isoformat(),
                "completed_at": datetime.now(UTC).isoformat(),
                "duration": package.episode.duration_target,
                "render": {
                    "width": options.width,
                    "height": options.height,
                    "fps": options.fps,
                },
                "toolchain": {
                    "name": self.media.name,
                    "version": self.media.version(),
                    "speech": self.speech.name if self.speech else None,
                },
                "inputs": {
                    "episode": str((episode_dir / "episode.json").resolve()),
                    "shots": source_records,
                    "subtitles": self._source_record(subtitles, "episode") if subtitles else None,
                    "music": (
                        self._source_record(final_music, self.score.name)
                        if final_music
                        else self._source_record(music, "episode") if music else None
                    ),
                    "ambience": self._source_record(ambience, "episode") if ambience else None,
                    "audio_plan": (
                        self._source_record(audio_plan_path, "episode")
                        if audio_plan_path.is_file()
                        else None
                    ),
                    "presentation_plan": (
                        self._source_record(presentation_path, "episode")
                        if presentation_path.is_file()
                        else None
                    ),
                },
                "verification": verification,
                "outputs": [
                    {
                        "path": final_video.name,
                        "sha256": sha256_file(final_video),
                        "media_type": "video/mp4",
                    }
                ],
            }
            if final_subtitles:
                outputs = record["outputs"]
                assert isinstance(outputs, list)
                outputs.append(
                    {
                        "path": final_subtitles.name,
                        "sha256": sha256_file(final_subtitles),
                        "media_type": "application/x-subrip",
                    }
                )
            write_text_atomic(
                manifest_path,
                json.dumps(record, ensure_ascii=False, indent=2) + "\n",
            )
            self._notify("export", "completed", "Master MP4 et manifeste vérifiés")
        return EpisodePipelineResult(
            episode_id=package.episode.id,
            video=final_video,
            manifest=manifest_path,
            subtitles=final_subtitles,
            duration=package.episode.duration_target,
            verification=verification,
        )

    def _notify(self, stage: str, status: str, message: str) -> None:
        if self.on_progress:
            self.on_progress(stage, status, message)

    def _resolve_audio(
        self,
        options: EpisodePipelineOptions,
        plan: EpisodeAudioPlan,
        shot_id: str,
        speaker: str | None,
        text: str | None,
        performance: DialoguePerformance | None,
        workspace: Path,
    ) -> tuple[Path | None, str | None]:
        imported = self._first_media(
            options.output_root / shot_id / "imports",
            "audio",
            AUDIO_SUFFIXES,
        )
        if imported:
            return imported, "manual"
        if text is None or speaker is None:
            return None, None
        if not options.tts_enabled:
            raise FileNotFoundError(
                f"Dialogue sans audio pour {shot_id}. Importe output/{shot_id}/imports/audio.* "
                "ou active la synthèse vocale."
            )
        if self.speech is None:
            raise RuntimeError(
                f"Dialogue sans synthétiseur pour {shot_id}. Configure SAPI ou importe une voix."
            )
        suffix = getattr(self.speech, "output_suffix", ".wav")
        destination = workspace / "voices" / f"{shot_id}{suffix}"
        preset = plan.voice_for(speaker)
        if performance is not None:
            preset = preset.model_copy(
                update={
                    "rate": self._clamp(preset.rate + round(performance.pace * 4), -10, 10),
                    "pitch_hz": self._clamp(
                        preset.pitch_hz + round(performance.pitch * 40), -100, 100
                    ),
                    "volume": self._clamp(
                        preset.volume + round(performance.volume * 15), 0, 100
                    ),
                }
            )
        self.speech.synthesize(text, destination, preset)
        return destination, self.speech.name

    @staticmethod
    def _clamp(value: int, minimum: int, maximum: int) -> int:
        return min(maximum, max(minimum, value))

    @classmethod
    def _resolve_visual(
        cls,
        output_root: Path,
        shot_id: str,
        *,
        allow_stills: bool,
    ) -> tuple[Path, Literal["video", "image"], str]:
        imported_video = cls._first_media(
            output_root / shot_id / "imports",
            "video",
            VIDEO_SUFFIXES,
        )
        if imported_video:
            return imported_video, "video", "manual"
        generated_video = output_root / shot_id / "clip.mp4"
        if generated_video.is_file():
            return generated_video, "video", "model"
        if allow_stills:
            imported_image = cls._first_media(
                output_root / shot_id / "imports",
                "keyframe",
                IMAGE_SUFFIXES,
            )
            if imported_image:
                return imported_image, "image", "manual-keyframe"
            generated_image = output_root / shot_id / "keyframe.png"
            if generated_image.is_file():
                return generated_image, "image", "model-keyframe"
        suffix = " ou une keyframe avec --allow-stills" if allow_stills else ""
        raise FileNotFoundError(
            f"Vidéo introuvable pour {shot_id}: attends output/{shot_id}/clip.mp4 "
            f"ou importe output/{shot_id}/imports/video.*{suffix}."
        )

    @staticmethod
    def _first_media(directory: Path, stem: str, suffixes: set[str]) -> Path | None:
        if not directory.is_dir():
            return None
        candidates = sorted(
            item
            for item in directory.iterdir()
            if item.is_file() and item.stem == stem and item.suffix.lower() in suffixes
        )
        return candidates[0] if candidates else None

    @staticmethod
    def _optional_file(path: Path | None) -> Path | None:
        return path if path is not None and path.is_file() else None

    @staticmethod
    def _source_record(path: Path, source: str | None) -> dict[str, object]:
        return {
            "path": str(path.resolve()),
            "sha256": sha256_file(path),
            "source": source,
        }

    @staticmethod
    def _copy_atomic(source: Path, destination: Path) -> None:
        destination.parent.mkdir(parents=True, exist_ok=True)
        temporary = destination.with_suffix(destination.suffix + ".tmp")
        shutil.copyfile(source, temporary)
        temporary.replace(destination)
