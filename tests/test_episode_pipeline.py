from __future__ import annotations

import json
from pathlib import Path

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
    assert manifest["status"] == "FINAL"
    assert manifest["toolchain"]["speech"] == "fake-speech"
    assert manifest["inputs"]["shots"][0]["visual"]["source"] == "model-keyframe"
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
