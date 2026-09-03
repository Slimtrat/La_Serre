from pathlib import Path

import httpx
import pytest

from apps.api.job_manager import JobManager
from apps.api.main import create_app
from engine.config import Settings


async def test_health() -> None:
    app = create_app(Settings(_env_file=None))
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


async def test_hybrid_asset_upload(tmp_path: Path) -> None:
    app = create_app(Settings(_env_file=None, output_dir=tmp_path))
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.put(
            "/api/assets/S01E001-S01/audio?filename=voice.wav",
            content=b"wave-data",
            headers={"Content-Type": "audio/wav"},
        )
        media = await client.get("/api/assets/S01E001-S01/audio/content")

    assert response.status_code == 200
    assert response.json()["source"] == "manual"
    assert media.content == b"wave-data"


async def test_install_completed_model_download(tmp_path: Path) -> None:
    downloads = tmp_path / "Downloads"
    models = tmp_path / "models"
    downloads.mkdir()
    filename = "ltx-video-2b-v0.9.5.safetensors"
    (downloads / filename).write_bytes(b"completed-model")
    app = create_app(
        Settings(
            _env_file=None,
            downloads_dir=downloads,
            comfyui_models_dir=models,
            output_dir=tmp_path / "output",
        )
    )
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post("/api/models/install")

    assert response.status_code == 200
    assert response.json()["restart_required"] is True
    assert response.json()["installed"][0]["filename"] == filename
    assert (models / "checkpoints" / filename).read_bytes() == b"completed-model"


async def test_generated_outputs_survive_studio_reload(tmp_path: Path) -> None:
    output = tmp_path / "output"
    shot_dir = output / "S01E001-S01"
    shot_dir.mkdir(parents=True)
    (shot_dir / "keyframe.png").write_bytes(b"image")
    (shot_dir / "keyframe-guide-1.png").write_bytes(b"image-middle")
    (shot_dir / "keyframe-guide-2.png").write_bytes(b"image-end")
    (shot_dir / "clip.mp4").write_bytes(b"video")
    (shot_dir / "generation.json").write_text(
        '{"status":"GENERATED"}',
        encoding="utf-8",
    )
    app = create_app(Settings(_env_file=None, output_dir=output))
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/api/outputs/S01E001-S01")

    assert response.status_code == 200
    assert response.json() == {
        "shot_id": "S01E001-S01",
        "status": "GENERATED",
        "keyframe": "/api/media/S01E001-S01/keyframe.png",
        "keyframes": [
            "/api/media/S01E001-S01/keyframe.png",
            "/api/media/S01E001-S01/keyframe-guide-1.png",
            "/api/media/S01E001-S01/keyframe-guide-2.png",
        ],
        "video": "/api/media/S01E001-S01/clip.mp4",
    }


async def test_workflow_graph_endpoint_exposes_comfy_subgraph(tmp_path: Path) -> None:
    workflow_root = tmp_path / "workflows" / "local"
    from engine.generation.comfy.workflow_factory import WorkflowFactory

    WorkflowFactory().write(workflow_root)
    app = create_app(Settings(_env_file=None))
    transport = httpx.ASGITransport(app=app)
    original = Path.cwd()
    try:
        import os

        os.chdir(tmp_path)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.get("/api/workflow-graphs/video")
    finally:
        os.chdir(original)

    assert response.status_code == 200
    payload = response.json()
    assert payload["kind"] == "video"
    assert any(node["class_type"] == "LTXVAddGuide" for node in payload["nodes"])
    assert any(edge["target_input"] == "image" for edge in payload["edges"])


async def test_generation_history_endpoint_serves_archived_media(tmp_path: Path) -> None:
    output = tmp_path / "output"
    shot_dir = output / "S01E001-S01"
    shot_dir.mkdir(parents=True)
    (shot_dir / "keyframe.png").write_bytes(b"first")
    (shot_dir / "generation.json").write_text(
        '{"id":"gen_first","status":"GENERATED"}', encoding="utf-8"
    )
    from apps.api.run_history import RunHistory

    RunHistory(output).archive_current("S01E001-S01")
    app = create_app(Settings(_env_file=None, output_dir=output))
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        listing = await client.get("/api/history/S01E001-S01")
        media = await client.get(
            "/api/history-media/S01E001-S01/gen_first/keyframe.png"
        )

    assert listing.status_code == 200
    assert listing.json()["runs"][0]["id"] == "current"
    assert listing.json()["runs"][1]["id"] == "gen_first"
    assert media.content == b"first"


async def test_project_switch_isolates_outputs_assets_and_notifications(
    tmp_path: Path,
) -> None:
    output = tmp_path / "output"
    default_shot = output / "S01E001-S01"
    default_shot.mkdir(parents=True)
    (default_shot / "keyframe.png").write_bytes(b"default-frame")
    app = create_app(
        Settings(
            _env_file=None,
            output_dir=output,
            private_content_dir=tmp_path / "private",
        )
    )
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        await client.put(
            "/api/assets/S01E001-S01/audio?filename=default.wav",
            content=b"default-audio",
            headers={"Content-Type": "audio/wav"},
        )
        default_notice = await client.post(
            "/api/notifications",
            json={"title": "Default", "message": "Only default"},
        )
        created = await client.post(
            "/api/projects",
            json={"name": "Projet B", "clone_content": False},
        )
        project_b = created.json()["active_id"]
        empty_assets = await client.get("/api/assets/S01E001-S01")
        empty_output = await client.get("/api/outputs/S01E001-S01")
        project_b_notices = await client.get("/api/notifications")
        await client.put(
            "/api/assets/S01E001-S01/audio?filename=second.wav",
            content=b"second-audio",
            headers={"Content-Type": "audio/wav"},
        )
        await client.post("/api/projects/default/activate")
        default_audio = await client.get("/api/assets/S01E001-S01/audio/content")
        default_output = await client.get("/api/outputs/S01E001-S01")
        default_notices = await client.get("/api/notifications")
        await client.post(f"/api/projects/{project_b}/activate")
        second_audio = await client.get("/api/assets/S01E001-S01/audio/content")

    assert default_notice.status_code == 201
    assert created.status_code == 201
    assert empty_assets.json() == {}
    assert empty_output.json()["keyframe"] is None
    assert [item["title"] for item in project_b_notices.json()["notifications"]] == [
        "Projet créé"
    ]
    assert default_audio.content == b"default-audio"
    assert default_output.json()["keyframe"] == "/api/media/S01E001-S01/keyframe.png"
    assert "Default" in {
        item["title"] for item in default_notices.json()["notifications"]
    }
    assert second_audio.content == b"second-audio"


async def test_project_mutation_is_blocked_while_a_job_is_active(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(JobManager, "has_active_jobs", lambda _self: True)
    app = create_app(Settings(_env_file=None, output_dir=tmp_path / "output"))
    transport = httpx.ASGITransport(app=app)

    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        create = await client.post(
            "/api/projects", json={"name": "Blocked", "clone_content": False}
        )
        activate = await client.post("/api/projects/default/activate")

    assert create.status_code == 409
    assert activate.status_code == 409
