from __future__ import annotations

import json
from pathlib import Path

import httpx

from apps.api.main import create_app
from engine.config import Settings


async def test_episode_job_endpoint_exposes_graph_stages(tmp_path: Path) -> None:
    app = create_app(
        Settings(
            _env_file=None,
            output_dir=tmp_path / "output",
            private_content_dir=tmp_path / "private",
        )
    )
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/api/episodes/S01E001/jobs",
            json={"tts": "none", "allow_stills": True},
        )

    assert response.status_code == 202
    payload = response.json()
    assert payload["episode_id"] == "S01E001"
    assert [stage["id"] for stage in payload["stages"]] == [
        "voice",
        "mix",
        "montage",
        "export",
    ]


async def test_episode_media_endpoint_serves_only_known_outputs(tmp_path: Path) -> None:
    output = tmp_path / "output"
    episode = output / "S01E001"
    episode.mkdir(parents=True)
    (episode / "episode.mp4").write_bytes(b"finished-episode")
    app = create_app(Settings(_env_file=None, output_dir=output))
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        video = await client.get("/api/episode-media/S01E001/episode.mp4")
        refused = await client.get("/api/episode-media/S01E001/private.txt")

    assert video.status_code == 200
    assert video.content == b"finished-episode"
    assert refused.status_code == 404


async def test_episode_media_status_reports_optional_master_without_404(
    tmp_path: Path,
) -> None:
    output = tmp_path / "output"
    app = create_app(Settings(_env_file=None, output_dir=output))
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        missing = await client.get("/api/episodes/S01E001/media-status")
        assert missing.status_code == 200
        assert missing.json() == {
            "exists": False,
            "video": False,
            "manifest": False,
            "subtitles": False,
        }

        episode = output / "S01E001"
        episode.mkdir(parents=True)
        (episode / "episode.mp4").write_bytes(b"video")
        (episode / "subtitles.fr.srt").write_text("subtitles", encoding="utf-8")
        (episode / "episode-generation.json").write_text(
            json.dumps({"subtitles": "subtitles.fr.srt"}), encoding="utf-8"
        )

        ready = await client.get("/api/episodes/S01E001/media-status")
        assert ready.status_code == 200
        assert ready.json() == {
            "exists": True,
            "video": True,
            "manifest": True,
            "subtitles": True,
        }


async def test_project_explorer_endpoint_supports_an_empty_project(
    tmp_path: Path,
) -> None:
    app = create_app(
        Settings(
            _env_file=None,
            private_content_dir=tmp_path / "private",
            output_dir=tmp_path / "output",
        )
    )
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/api/episodes/project-explorer")

    assert response.status_code == 200
    assert response.json() == {
        "title": "La Serre",
        "state": "idea",
        "progress": {"completed": 0, "total": 0, "percent": 0, "states": {}},
        "seasons": [],
    }
