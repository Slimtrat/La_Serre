from pathlib import Path

import httpx

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
