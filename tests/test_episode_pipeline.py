from __future__ import annotations

import json
from hashlib import sha256
from pathlib import Path

import pytest

from engine.audio.models import VoicePreset
from engine.media.ffmpeg import AssemblyRequest
from engine.production.episode_pipeline import EpisodePipeline, EpisodePipelineOptions


def write_json(path: Path, payload: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload), encoding="utf-8")


def seed_episode(root: Path, *, dialogue: bool = True) -> None:
    character = {
        "id": "iris",
        "name": "Iris",
        "role": "Witness",
        "visual_description": "A botanical iris figure with a softly expressive silver face",
        "wardrobe": "Layered iris petals growing around a long charcoal stem body",
        "signature_details": ["silver iris petal"],
        "palette": ["silver", "violet", "charcoal"],
        "personality": {"curiosity": 0.8, "loyalty": 0.5, "fear": 0.2},
        "wants": ["understand the room"],
        "fears": ["forgetting what she saw"],
        "voice_description": "Quiet French voice with measured diction",
        "generation_negative_prompt": "human hair, ordinary clothes",
    }
    location = {
        "id": "glass_room",
        "name": "Glass room",
        "visual_description": "A nocturnal glass room with black iron walls and green marble",
        "signature_details": ["green marble floor"],
        "palette": ["black", "green", "moonlight blue"],
        "generation_negative_prompt": "daylight, modern room",
    }
    shot_character = {
        "id": "iris",
        "name": "Iris",
        "emotion": "careful attention",
        "position": "foreground center",
        "visual_description": character["visual_description"],
        "wardrobe": character["wardrobe"],
        "signature_details": character["signature_details"],
        "reference_images": [],
    }
    shot = {
        "id": "S01E001-S01",
        "duration": 4,
        "location": "glass_room",
        "location_description": location["visual_description"],
        "characters": [shot_character],
        "camera": {"shot_type": "medium", "movement": "static", "lens": "50mm"},
        "action": "Iris enters the room and stops",
        "dialogue": {"speaker": "iris", "text": "Qui est là ?"} if dialogue else None,
        "lighting": "cold moonlight",
        "mood": "quiet suspicion",
        "style": ["stylized botanical animation"],
        "render": {"seed": 1, "width": 576, "height": 1024, "fps": 24, "frames": 97},
    }
    episode = {
        "id": "S01E001",
        "season": 1,
        "episode": 1,
        "title": "The room",
        "logline": "Iris enters a room that seems to remember her name.",
        "duration_target": 4,
        "status": "draft",
        "characters": ["iris"],
        "locations": ["glass_room"],
        "story": {
            "hook": "A locked room opens.",
            "setup": "Iris enters.",
            "conflict": "The door closes.",
            "reveal": "The room knows her.",
            "cliffhanger": "A light turns on.",
        },
        "narrative_source": "Iris enters the room and realizes it already knows her name.",
        "shot_order": ["S01E001-S01"],
        "shot_sources": {"S01E001-S01": "Iris enters the glass room and stops."},
    }
    write_json(root / "world/characters/iris/character.json", character)
    write_json(root / "world/locations/glass_room/location.json", location)
    write_json(root / "episodes/season-01/S01E001/episode.json", episode)
    write_json(root / "episodes/season-01/S01E001/shots/S01E001-S01.json", shot)


class FakeMedia:
    name = "fake-ffmpeg"

    def __init__(self) -> None:
        self.request: AssemblyRequest | None = None

    def duration(self, path: Path) -> float:
        return 1.25

    def fit_audio(self, source: Path, destination: Path, duration: float) -> float:
        destination.parent.mkdir(parents=True, exist_ok=True)
        destination.write_bytes(source.read_bytes())
        return 1.5

    def mix_audio_tracks(self, tracks: list[object], destination: Path, duration: float) -> None:
        destination.parent.mkdir(parents=True, exist_ok=True)
        destination.write_bytes(b"mixed-voices")

    def assemble(self, request: AssemblyRequest) -> None:
        self.request = request
        request.output.write_bytes(b"final-video")

    def verify(
        self,
        path: Path,
        *,
        duration: float,
        width: int,
        height: int,
    ) -> dict[str, object]:
        return {"duration": duration, "width": width, "height": height, "has_subtitles": True}

    def version(self) -> str:
        return "fake-ffmpeg 1"


class FakeSpeech:
    name = "fake-speech"
    output_suffix = ".wav"

    def synthesize(self, text: str, destination: Path, preset: VoicePreset) -> None:
        destination.parent.mkdir(parents=True, exist_ok=True)
        destination.write_bytes(b"generated-voice")


def test_episode_pipeline_resolves_media_synthesizes_voice_and_writes_manifest(
    tmp_path: Path,
) -> None:
    private = tmp_path / "private"
    output = tmp_path / "output"
    seed_episode(private)
    keyframe = output / "S01E001-S01" / "keyframe.png"
    keyframe.parent.mkdir(parents=True)
    keyframe.write_bytes(b"image")
    subtitles = private / "episodes/season-01/S01E001/subtitles.fr.srt"
    subtitles.write_text("1\n00:00:00,500 --> 00:00:02,000\nQui est là ?\n", encoding="utf-8")
    write_json(
        private / "episodes/season-01/S01E001/audio-plan.json",
        {
            "voices": {"iris": {"backend": "sapi", "rate": 1, "volume": 90}},
            "cues": {"S01E001-S01": {"offset_seconds": 0.5, "gain_db": -1}},
        },
    )
    media = FakeMedia()

    result = EpisodePipeline(media, FakeSpeech()).run(
        EpisodePipelineOptions(
            episode_id="S01E001",
            private_root=private,
            output_root=output,
            allow_stills=True,
        )
    )

    assert result.video.read_bytes() == b"final-video"
    assert result.subtitles and result.subtitles.is_file()
    assert (output / "S01E001/voices/S01E001-S01.wav").read_bytes() == b"generated-voice"
    assert media.request is not None
    assert media.request.segments[0].visual_kind == "image"
    assert media.request.segments[0].audio_offset == 0.5
    manifest = json.loads(result.manifest.read_text(encoding="utf-8"))
    assert result.status == "ANIMATIC"
    assert manifest["status"] == "ANIMATIC"
    assert manifest["quality"]["release_eligible"] is False
    assert manifest["quality"]["uses_stills"] is True
    assert manifest["toolchain"]["speech"] == "fake-speech"
    assert manifest["inputs"]["shots"][0]["visual"]["source"] == "unverified-local"
    assert manifest["inputs"]["episode"]["status"] == "draft"
    recorded_voice = manifest["inputs"]["shots"][0]["audio"]["path"]
    assert recorded_voice == str(
        (output / "S01E001/voices/S01E001-S01.wav").resolve()
    )


def test_episode_pipeline_requires_audio_when_tts_is_disabled(tmp_path: Path) -> None:
    private = tmp_path / "private"
    output = tmp_path / "output"
    seed_episode(private)
    clip = output / "S01E001-S01" / "clip.mp4"
    clip.parent.mkdir(parents=True)
    clip.write_bytes(b"video")

    try:
        EpisodePipeline(FakeMedia()).run(
            EpisodePipelineOptions(
                episode_id="S01E001",
                private_root=private,
                output_root=output,
                tts_enabled=False,
            )
        )
    except FileNotFoundError as exc:
        assert "Dialogue sans audio" in str(exc)
    else:
        raise AssertionError("Le pipeline aurait dû refuser un dialogue sans audio")


def test_generated_voice_is_time_fitted_to_the_shot(tmp_path: Path) -> None:
    class SlowVoiceMedia(FakeMedia):
        def __init__(self) -> None:
            super().__init__()
            self.fit_duration: float | None = None

        def duration(self, path: Path) -> float:
            return 3.5 if path.name.endswith(".fitted.wav") else 5.0

        def fit_audio(self, source: Path, destination: Path, duration: float) -> float:
            self.fit_duration = duration
            destination.parent.mkdir(parents=True, exist_ok=True)
            destination.write_bytes(b"fitted-voice")
            return 1.43

    private = tmp_path / "private"
    output = tmp_path / "output"
    seed_episode(private)
    keyframe = output / "S01E001-S01" / "keyframe.png"
    keyframe.parent.mkdir(parents=True)
    keyframe.write_bytes(b"image")
    write_json(
        private / "episodes/season-01/S01E001/audio-plan.json",
        {
            "cues": {"S01E001-S01": {"offset_seconds": 0.5}},
            "max_time_fit_speed": 1.5,
        },
    )
    media = SlowVoiceMedia()

    result = EpisodePipeline(media, FakeSpeech()).run(
        EpisodePipelineOptions(
            episode_id="S01E001",
            private_root=private,
            output_root=output,
            allow_stills=True,
        )
    )

    assert media.fit_duration == 3.5
    assert (output / "S01E001/voices/S01E001-S01.wav").read_bytes() == b"fitted-voice"
    manifest = json.loads(result.manifest.read_text(encoding="utf-8"))
    assert manifest["inputs"]["shots"][0]["audio"]["fit_speed"] == 1.43


def test_voice_time_fit_above_quality_limit_is_rejected(tmp_path: Path) -> None:
    class ExcessiveFitMedia(FakeMedia):
        def duration(self, path: Path) -> float:
            return 3.0 if path.name.endswith(".fitted.wav") else 6.0

        def fit_audio(self, source: Path, destination: Path, duration: float) -> float:
            destination.parent.mkdir(parents=True, exist_ok=True)
            destination.write_bytes(b"over-fitted")
            return 1.9

    private = tmp_path / "private"
    output = tmp_path / "output"
    seed_episode(private)
    keyframe = output / "S01E001-S01" / "keyframe.png"
    keyframe.parent.mkdir(parents=True)
    keyframe.write_bytes(b"image")

    with pytest.raises(ValueError, match="limite qualité"):
        EpisodePipeline(ExcessiveFitMedia(), FakeSpeech()).run(
            EpisodePipelineOptions(
                episode_id="S01E001",
                private_root=private,
                output_root=output,
                allow_stills=True,
            )
        )


def test_episode_pipeline_mixes_multiple_timed_dialogues(tmp_path: Path) -> None:
    private = tmp_path / "private"
    output = tmp_path / "output"
    seed_episode(private)
    shot_path = private / "episodes/season-01/S01E001/shots/S01E001-S01.json"
    payload = json.loads(shot_path.read_text(encoding="utf-8"))
    payload["dialogue_cues"] = [
        {"speaker": "iris", "text": "Je suis là.", "offset_seconds": 2.0}
    ]
    write_json(shot_path, payload)
    keyframe = output / "S01E001-S01/keyframe.png"
    keyframe.parent.mkdir(parents=True)
    keyframe.write_bytes(b"image")
    media = FakeMedia()

    result = EpisodePipeline(media, FakeSpeech()).run(
        EpisodePipelineOptions(
            episode_id="S01E001",
            private_root=private,
            output_root=output,
            allow_stills=True,
        )
    )

    assert (output / "S01E001/voices/S01E001-S01.wav").read_bytes() == b"mixed-voices"
    manifest = json.loads(result.manifest.read_text(encoding="utf-8"))
    assert manifest["inputs"]["shots"][0]["dialogue_cues"][0]["text"] == "Je suis là."


def test_episode_pipeline_rejects_overlapping_dialogues(tmp_path: Path) -> None:
    private = tmp_path / "private"
    output = tmp_path / "output"
    seed_episode(private)
    shot_path = private / "episodes/season-01/S01E001/shots/S01E001-S01.json"
    payload = json.loads(shot_path.read_text(encoding="utf-8"))
    payload["dialogue_cues"] = [
        {"speaker": "iris", "text": "Je coupe la parole.", "offset_seconds": 0.5}
    ]
    write_json(shot_path, payload)
    keyframe = output / "S01E001-S01/keyframe.png"
    keyframe.parent.mkdir(parents=True)
    keyframe.write_bytes(b"image")

    with pytest.raises(ValueError, match="se chevauchent"):
        EpisodePipeline(FakeMedia(), FakeSpeech()).run(
            EpisodePipelineOptions(
                episode_id="S01E001",
                private_root=private,
                output_root=output,
                allow_stills=True,
            )
        )


def test_unverified_clip_can_only_produce_a_preview(tmp_path: Path) -> None:
    private = tmp_path / "private"
    output = tmp_path / "output"
    seed_episode(private, dialogue=False)
    episode_path = private / "episodes/season-01/S01E001/episode.json"
    episode = json.loads(episode_path.read_text(encoding="utf-8"))
    episode["status"] = "approved"
    write_json(episode_path, episode)
    clip = output / "S01E001-S01/clip.mp4"
    clip.parent.mkdir(parents=True)
    clip.write_bytes(b"video-without-manifest")

    result = EpisodePipeline(FakeMedia()).run(
        EpisodePipelineOptions(
            episode_id="S01E001",
            private_root=private,
            output_root=output,
            tts_enabled=False,
        )
    )

    manifest = json.loads(result.manifest.read_text(encoding="utf-8"))
    assert result.status == "PREVIEW"
    assert manifest["quality"]["verified_visual_sources"] is False
    assert manifest["inputs"]["shots"][0]["visual"]["source"] == "unverified-local"


def test_approved_episode_with_verified_video_can_be_final(tmp_path: Path) -> None:
    private = tmp_path / "private"
    output = tmp_path / "output"
    seed_episode(private, dialogue=False)
    episode_path = private / "episodes/season-01/S01E001/episode.json"
    episode = json.loads(episode_path.read_text(encoding="utf-8"))
    episode["status"] = "approved"
    write_json(episode_path, episode)
    clip = output / "S01E001-S01/clip.mp4"
    clip.parent.mkdir(parents=True)
    clip.write_bytes(b"verified-video")
    write_json(
        clip.parent / "generation.json",
        {
            "status": "GENERATED",
            "outputs": [
                {
                    "path": "clip.mp4",
                    "sha256": sha256(clip.read_bytes()).hexdigest(),
                }
            ],
        },
    )

    result = EpisodePipeline(FakeMedia()).run(
        EpisodePipelineOptions(
            episode_id="S01E001",
            private_root=private,
            output_root=output,
            tts_enabled=False,
        )
    )

    manifest = json.loads(result.manifest.read_text(encoding="utf-8"))
    assert result.status == "FINAL"
    assert manifest["quality"]["release_eligible"] is True
    assert manifest["inputs"]["shots"][0]["visual"]["source"] == "model-video"


def test_frozen_verified_video_is_rejected_as_final(tmp_path: Path) -> None:
    class FrozenMedia(FakeMedia):
        def verify(
            self,
            path: Path,
            *,
            duration: float,
            width: int,
            height: int,
        ) -> dict[str, object]:
            report = super().verify(path, duration=duration, width=width, height=height)
            report["frozen_ratio"] = 0.95
            return report

    private = tmp_path / "private"
    output = tmp_path / "output"
    seed_episode(private, dialogue=False)
    episode_path = private / "episodes/season-01/S01E001/episode.json"
    episode = json.loads(episode_path.read_text(encoding="utf-8"))
    episode["status"] = "approved"
    write_json(episode_path, episode)
    clip = output / "S01E001-S01/clip.mp4"
    clip.parent.mkdir(parents=True)
    clip.write_bytes(b"frozen-video")
    write_json(
        clip.parent / "generation.json",
        {
            "status": "GENERATED",
            "outputs": [
                {
                    "path": "clip.mp4",
                    "sha256": sha256(clip.read_bytes()).hexdigest(),
                }
            ],
        },
    )

    with pytest.raises(ValueError, match="figé"):
        EpisodePipeline(FrozenMedia()).run(
            EpisodePipelineOptions(
                episode_id="S01E001",
                private_root=private,
                output_root=output,
                tts_enabled=False,
            )
        )
