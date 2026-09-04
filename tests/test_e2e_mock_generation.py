from __future__ import annotations

import asyncio
import json
from collections.abc import Awaitable, Callable
from pathlib import Path
from typing import Any, cast

import httpx
import pytest
from e2e_fakes import (
    MockComfyEngine,
    MockFfmpegEngine,
    MockSpeechEngine,
    write_test_wave,
)

import apps.api.episode_job_manager as episode_job_module
import apps.api.job_manager as job_manager_module
import apps.api.main as api_main
from apps.api.stage_actions import ShotStageService
from engine.config import Settings

JsonObject = dict[str, Any]


def write_json(path: Path, payload: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


def seed_canonical_episode(private_root: Path) -> None:
    character = {
        "id": "belladone",
        "name": "Belladone",
        "role": "Héritière interdite",
        "visual_description": (
            "A violet botanical witch with a petal crown and an expressive silver face"
        ),
        "wardrobe": "Layered dark-violet petals wrapped around an elegant thorned stem body",
        "signature_details": ["heart-shaped beauty mark", "black berry pendant"],
        "palette": ["violet", "black", "moonlight silver"],
        "personality": {"audacity": 0.9, "curiosity": 0.8, "tenderness": 0.6},
        "wants": ["open the forbidden seed"],
        "fears": ["becoming what the garden expects"],
        "voice_description": "Playful French alto voice hiding genuine apprehension",
        "generation_negative_prompt": "photorealistic human, ordinary modern clothes",
    }
    location = {
        "id": "serre_venins",
        "name": "Serre des Venins",
        "visual_description": (
            "A moonlit poison greenhouse of black iron, wet glass and luminous vines"
        ),
        "signature_details": ["heart-shaped lock", "moving thorn shadows"],
        "palette": ["black", "violet", "poison green"],
        "generation_negative_prompt": "daylight, white laboratory, empty background",
    }
    shot = {
        "id": "S01E001-S01",
        "duration": 4.0,
        "location": location["id"],
        "location_description": location["visual_description"],
        "characters": [
            {
                "id": character["id"],
                "name": character["name"],
                "emotion": "amusement masking unease",
                "position": "foreground center",
                "visual_description": character["visual_description"],
                "wardrobe": character["wardrobe"],
                "signature_details": character["signature_details"],
                "reference_images": [],
            }
        ],
        "camera": {"shot_type": "medium", "movement": "slow push-in", "lens": "50mm"},
        "action": "Belladone reaches for the forbidden seed while the greenhouse reacts",
        "visual_beats": [
            {"id": "start", "at": 0.0, "description": "Her hand hovers over the black seed"},
            {"id": "middle", "at": 0.5, "description": "The vines recoil and violet dust rises"},
            {"id": "end", "at": 1.0, "description": "The seed opens one luminous eye"},
        ],
        "dialogue": {
            "speaker": "belladone",
            "text": "Promis, je ne mords que les secrets.",
            "performance": {
                "intention": "provoquer la serre pour cacher sa peur",
                "emotion": "séduction nerveuse",
                "intensity": 0.72,
                "pace": 0.2,
                "pitch": -0.1,
                "volume": 0.1,
                "pause_before_seconds": 0.15,
                "pause_after_seconds": 0.2,
            },
        },
        "lighting": "violet moonlight cut by poisonous green reflections",
        "mood": "playful dark romance with a threatening undertone",
        "style": ["gothic botanical animation", "ornate fantasy storybook"],
        "render": {"seed": 4242, "width": 576, "height": 1024, "fps": 24, "frames": 97},
    }
    episode = {
        "id": "S01E001",
        "season": 1,
        "episode": 1,
        "title": "L’Héritage interdit",
        "logline": "Belladone réveille une graine qui connaît déjà le prix de son désir.",
        "duration_target": 4.0,
        "status": "approved",
        "characters": [character["id"]],
        "locations": [location["id"]],
        "story": {
            "hook": "La graine appelle Belladone par son vrai nom.",
            "setup": "Elle entre seule dans la serre interdite.",
            "conflict": "Les lianes tentent de lui barrer le passage.",
            "reveal": "La graine est éveillée et la reconnaît.",
            "cliffhanger": "Un œil s’ouvre sous sa paume.",
        },
        "narrative_source": (
            "Belladone brave la serre interdite, plaisante avec le danger et touche la graine."
        ),
        "shot_order": [shot["id"]],
        "shot_sources": {shot["id"]: "Belladone approche puis réveille la Graine Noire."},
    }
    episode_dir = private_root / "episodes/season-01/S01E001"
    write_json(private_root / "world/characters/belladone/character.json", character)
    write_json(private_root / "world/locations/serre_venins/location.json", location)
    write_json(episode_dir / "episode.json", episode)
    write_json(episode_dir / "shots/S01E001-S01.json", shot)
    write_json(
        episode_dir / "audio-plan.json",
        {
            "voices": {"belladone": {"backend": "sapi", "rate": 1, "volume": 92}},
            "cues": {"S01E001-S01": {"offset_seconds": 0.35, "gain_db": -1.5}},
            "music_gain_db": -17,
            "ambience_gain_db": -25,
        },
    )
    frame = episode_dir / "fantasy-frame.png"
    frame.write_bytes(b"\x89PNG\r\n\x1a\nmock-fantasy-frame")
    write_json(
        episode_dir / "presentation-plan.json",
        {
            "frame_asset": frame.name,
            "framed_shots": ["S01E001-S01"],
            "captions": {"S01E001-S01": "La graine vous regarde."},
            "caption_positions": {"S01E001-S01": "bottom"},
        },
    )
    (episode_dir / "subtitles.fr.srt").write_text(
        "1\n00:00:00,350 --> 00:00:03,000\nPromis, je ne mords que les secrets.\n",
        encoding="utf-8",
    )
    write_test_wave(episode_dir / "ambience.wav")


def create_mock_workflows(root: Path) -> tuple[Path, Path, Path]:
    image_workflow: dict[str, object] = {
        "1": {"class_type": "Text", "inputs": {"text": ""}},
        "2": {"class_type": "Seed", "inputs": {"seed": 0}},
        "90": {"class_type": "MockSaveImage", "inputs": {"filename_prefix": ""}},
    }
    guide_workflow: dict[str, object] = {
        **image_workflow,
        "3": {"class_type": "LoadImage", "inputs": {"image": ""}},
    }
    video_workflow: dict[str, object] = {
        "1": {"class_type": "Text", "inputs": {"text": ""}},
        "3": {"class_type": "LoadImage", "inputs": {"image": ""}},
        "90": {"class_type": "MockSaveVideo", "inputs": {"filename_prefix": ""}},
    }

    def profile(
        name: str,
        workflow: dict[str, object],
        bindings: list[dict[str, object]],
    ) -> Path:
        workflow_path = root / f"{name}.api.json"
        profile_path = root / f"{name}.profile.json"
        write_json(workflow_path, workflow)
        write_json(
            profile_path,
            {
                "id": f"mock-{name}",
                "workflow": workflow_path.name,
                "bindings": bindings,
                "output_node_ids": ["90"],
            },
        )
        return profile_path

    shared: list[dict[str, object]] = [
        {"source": "prompt", "node_id": "1", "input": "text"},
        {"source": "seed", "node_id": "2", "input": "seed"},
        {"source": "output_prefix", "node_id": "90", "input": "filename_prefix"},
    ]
    keyframe = profile("keyframe", image_workflow, shared)
    guide = profile(
        "keyframe-guide",
        guide_workflow,
        [*shared, {"source": "reference_image", "node_id": "3", "input": "image"}],
    )
    video = profile(
        "video",
        video_workflow,
        [
            {"source": "prompt", "node_id": "1", "input": "text"},
            {"source": "reference_image", "node_id": "3", "input": "image"},
            {"source": "output_prefix", "node_id": "90", "input": "filename_prefix"},
        ],
    )
    return keyframe, guide, video


async def require_json(response: httpx.Response, status: int = 200) -> JsonObject:
    assert response.status_code == status, response.text
    return cast(JsonObject, response.json())


async def poll_json(
    fetch: Callable[[], Awaitable[httpx.Response]],
    done: Callable[[JsonObject], bool],
    *,
    attempts: int = 300,
) -> tuple[JsonObject, list[JsonObject]]:
    snapshots: list[JsonObject] = []
    for _attempt in range(attempts):
        payload = await require_json(await fetch())
        snapshots.append(payload)
        if done(payload):
            return payload, snapshots
        await asyncio.sleep(0.01)
    raise AssertionError(f"Async operation did not finish; last state: {snapshots[-1]}")


async def test_complete_mocked_generation_journey_persists_real_studio_outputs(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Exercise project -> 3 frames -> queue -> audio -> montage through FastAPI."""

    private_root = tmp_path / "default-private"
    default_output = tmp_path / "default-output"
    seed_canonical_episode(private_root)
    keyframe_profile, guide_profile, video_profile = create_mock_workflows(
        tmp_path / "workflows"
    )
    MockComfyEngine.reset()
    MockSpeechEngine.reset()
    MockFfmpegEngine.reset()

    monkeypatch.setattr(job_manager_module, "ComfyClient", MockComfyEngine)
    monkeypatch.setattr(
        api_main,
        "ShotStageService",
        lambda settings_provider: ShotStageService(
            settings_provider,
            speech_factory=lambda _mode: MockSpeechEngine(),
        ),
    )
    monkeypatch.setattr(
        episode_job_module,
        "create_speech_synthesizer",
        lambda _mode: MockSpeechEngine(),
    )
    monkeypatch.setattr(episode_job_module, "FFmpegToolchain", MockFfmpegEngine)

    settings = Settings(
        _env_file=None,
        private_content_dir=private_root,
        output_dir=default_output,
        keyframe_workflow_profile=keyframe_profile,
        keyframe_guide_workflow_profile=guide_profile,
        video_workflow_profile=video_profile,
        comfyui_poll_interval_seconds=0.01,
    )
    app = api_main.create_app(settings)
    transport = httpx.ASGITransport(app=app)

    async with httpx.AsyncClient(transport=transport, base_url="http://studio") as client:
        created = await require_json(
            await client.post(
                "/api/projects",
                json={"name": "Production E2E", "clone_content": True},
            ),
            201,
        )
        project_id = str(created["active_id"])
        project = next(item for item in created["projects"] if item["id"] == project_id)
        project_output = Path(project["output_dir"])
        project_private = Path(project["private_content_dir"])
        assert project_private != private_root and (project_private / "world").is_dir()
        assert await asyncio.to_thread(project_output.is_dir)

        await require_json(await client.post("/api/projects/default/activate"))
        selected = await require_json(await client.post(f"/api/projects/{project_id}/activate"))
        assert selected["active_id"] == project_id

        episode = await require_json(await client.get("/api/episodes/S01E001"))
        shot = cast(JsonObject, episode["shots"][0])
        assert episode["episode"]["title"] == "L’Héritage interdit"
        assert [beat["id"] for beat in shot["visual_beats"]] == ["start", "middle", "end"]
        assert shot["canonical_context"]["fingerprint"]

        keyframe_start = await require_json(
            await client.post(
                "/api/jobs",
                json={"shot": shot, "mode": "keyframe", "force": False},
            ),
            202,
        )
        keyframe_job_id = str(keyframe_start["id"])
        assert keyframe_start["status"] == "QUEUED"
        keyframe_final, keyframe_states = await poll_json(
            lambda: client.get(f"/api/jobs/{keyframe_job_id}"),
            lambda payload: payload["status"] == "AWAITING_KEYFRAME_APPROVAL",
        )
        assert any(item["status"] == "GENERATING" for item in keyframe_states)
        assert any(
            item["progress"]["active_stage"] == "keyframe" for item in keyframe_states
        )
        assert keyframe_final["progress"]["percent"] == 100
        assert keyframe_final["media"]["keyframe_progress"] == {"completed": 3, "total": 3}

        shot_dir = project_output / "S01E001-S01"
        keyframe_files = [
            shot_dir / "keyframe.png",
            shot_dir / "keyframe-guide-1.png",
            shot_dir / "keyframe-guide-2.png",
        ]
        assert all(path.read_bytes().startswith(b"\x89PNG") for path in keyframe_files)
        first_manifest = json.loads((shot_dir / "generation.json").read_text(encoding="utf-8"))
        assert first_manifest["status"] == "AWAITING_KEYFRAME_APPROVAL"
        assert [stage["name"] for stage in first_manifest["stages"]] == [
            "keyframe-start",
            "keyframe-middle",
            "keyframe-end",
        ]

        approval = await require_json(
            await client.post("/api/production-queue/shots/S01E001-S01/approve")
        )
        assert approval["sha256"]
        assert (shot_dir / "keyframe-approval.json").is_file()
        await require_json(await client.post("/api/production-queue/pause"))
        queued_items: list[JsonObject] = []
        for kind, priority in (("video", 30), ("voice", 20), ("music", 10)):
            queued_items.append(
                await require_json(
                    await client.post(
                        "/api/production-queue/items",
                        json={
                            "shot": shot,
                            "kind": kind,
                            "priority": priority,
                            "tts": "auto",
                        },
                    ),
                    202,
                )
            )
        queue_path = project_output / ".studio/production-queue.json"
        persisted_queue = json.loads(queue_path.read_text(encoding="utf-8"))
        assert persisted_queue["paused"] is True
        assert {item["kind"] for item in persisted_queue["items"]} == {
            "video",
            "voice",
            "music",
        }
        assert all(item["status"] == "queued" for item in persisted_queue["items"])

        await require_json(await client.post("/api/production-queue/resume"))
        queue_final, queue_states = await poll_json(
            lambda: client.get("/api/production-queue"),
            lambda payload: (
                payload["progress"]["total"] == 3
                and payload["progress"]["completed"] == 3
                and payload["active_item_id"] is None
            ),
        )
        assert any(snapshot["active_item_id"] is not None for snapshot in queue_states)
        assert queue_final["counts"] == {"completed": 3}
        assert queue_final["progress"]["percent"] == 100
        assert all(item["progress"] == 100 for item in queue_final["items"])
        linked_video_job = next(
            item["linked_job_id"] for item in queue_final["items"] if item["kind"] == "video"
        )
        video_job = await require_json(await client.get(f"/api/jobs/{linked_video_job}"))
        assert video_job["status"] == "GENERATED"
        assert {event["stage"] for event in video_job["events"]} >= {
            "history",
            "video",
            "artifacts",
        }

        assert (shot_dir / "clip.mp4").read_bytes().startswith(b"\x00\x00\x00\x18ftyp")
        assert (shot_dir / "voice.wav").read_bytes().startswith(b"RIFF")
        assert (project_output / "S01E001/music.wav").read_bytes().startswith(b"RIFF")
        assert len(MockComfyEngine.submitted_workflows) == 4
        assert len(MockComfyEngine.uploaded_images) == 5
        assert len(MockSpeechEngine.syntheses) == 1

        history = await require_json(await client.get("/api/history/S01E001-S01"))
        runs = cast(list[JsonObject], history["runs"])
        assert len(runs) == 2 and runs[0]["id"] == "current"
        archived = runs[1]
        assert archived["status"] == "APPROVED"
        assert len(archived["media"]["keyframes"]) == 3
        archived_frame = await client.get(archived["media"]["keyframe"])
        assert archived_frame.status_code == 200
        assert archived_frame.content == keyframe_files[0].read_bytes()

        episode_start = await require_json(
            await client.post(
                "/api/episodes/S01E001/jobs",
                json={"tts": "auto", "allow_stills": False, "force": False},
            ),
            202,
        )
        episode_job_id = str(episode_start["id"])
        episode_final, episode_states = await poll_json(
            lambda: client.get(f"/api/episode-jobs/{episode_job_id}"),
            lambda payload: payload["status"] == "FINAL",
        )
        assert any(item["status"] == "GENERATING" for item in episode_states)
        assert any(item["progress"]["active_stage"] == "montage" for item in episode_states)
        assert episode_final["progress"]["percent"] == 100
        assert set(episode_final["media"]) == {"video", "manifest", "subtitles"}

        master_dir = project_output / "S01E001"
        master = master_dir / "episode.mp4"
        master_manifest_path = master_dir / "episode-generation.json"
        master_manifest = json.loads(master_manifest_path.read_text(encoding="utf-8"))
        first_master_id = master_manifest["id"]
        assert master.read_bytes().startswith(b"\x00\x00\x00\x18ftyp")
        assert master_manifest["status"] == "FINAL"
        assert master_manifest["verification"] == {
            "duration": 4.0,
            "width": 576,
            "height": 1024,
            "has_audio": True,
            "has_subtitles": True,
        }
        inputs = master_manifest["inputs"]
        assert inputs["shots"][0]["visual"]["source"] == "model"
        assert inputs["shots"][0]["audio"]["source"] == "studio-voice"
        assert inputs["music"]["path"].endswith("music.wav")
        assert inputs["ambience"]["path"].endswith("ambience.wav")
        assembly = MockFfmpegEngine.assembly_requests[0]
        assert assembly.segments[0].overlay is not None
        assert assembly.segments[0].caption == "La graine vous regarde."

        video_response = await client.get("/api/episode-media/S01E001/episode.mp4")
        subtitles_response = await client.get(
            "/api/episode-media/S01E001/subtitles.fr.srt"
        )
        assert video_response.content == master.read_bytes()
        assert "Promis, je ne mords" in subtitles_response.text

        second_job = await require_json(
            await client.post(
                "/api/episodes/S01E001/jobs",
                json={"tts": "auto", "allow_stills": False, "force": True},
            ),
            202,
        )
        await poll_json(
            lambda: client.get(f"/api/episode-jobs/{second_job['id']}"),
            lambda payload: payload["status"] == "FINAL",
        )
        archived_master = project_output / ".history/S01E001" / first_master_id
        assert (archived_master / "episode.mp4").is_file()
        assert (archived_master / "episode-generation.json").is_file()
        second_manifest = json.loads(master_manifest_path.read_text(encoding="utf-8"))
        assert second_manifest["id"] != first_master_id

        notifications = await require_json(await client.get("/api/notifications"))
        notices = cast(list[JsonObject], notifications["notifications"])
        assert {notice["source"] for notice in notices} >= {
            "projects",
            "shot-job",
            "shot-stage",
            "episode-job",
        }
        assert not any(notice["level"] == "error" for notice in notices)
        assert notifications["unread"] == len(notices)
        marked = await require_json(
            await client.post("/api/notifications/read", json={"ids": None})
        )
        assert marked["unread"] == 0

        current_log = (shot_dir / "studio-log.jsonl").read_text(encoding="utf-8")
        assert '"stage": "video"' in current_log
        assert '"stage": "voice"' in current_log
        assert '"stage": "music"' in current_log
        assert (project_output / ".studio/logs" / f"{episode_job_id}.jsonl").is_file()

    assert not (default_output / "S01E001-S01").exists()
    registry = json.loads(
        (default_output / ".studio/projects.json").read_text(encoding="utf-8")
    )
    assert registry["active_id"] == project_id
    assert {item["status"] for item in json.loads(queue_path.read_text())["items"]} == {
        "completed"
    }

    reloaded_app = api_main.create_app(settings)
    reload_transport = httpx.ASGITransport(app=reloaded_app)
    async with httpx.AsyncClient(
        transport=reload_transport, base_url="http://studio-reloaded"
    ) as reloaded:
        projects = await require_json(await reloaded.get("/api/projects"))
        outputs = await require_json(await reloaded.get("/api/outputs/S01E001-S01"))
        reloaded_queue = await require_json(await reloaded.get("/api/production-queue"))
    assert projects["active_id"] == project_id
    assert outputs["status"] == "GENERATED"
    assert len(outputs["keyframes"]) == 3 and outputs["video"]
    assert reloaded_queue["counts"] == {"completed": 3}
    assert reloaded_queue["progress"]["percent"] == 100
