from __future__ import annotations

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
