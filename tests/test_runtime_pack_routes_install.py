from __future__ import annotations

import hashlib
from pathlib import Path

import httpx
import pytest
from fastapi import FastAPI

from apps.api.runtime_pack_routes import create_runtime_pack_router
from engine.config import Settings
from engine.runtime.installers import DirectDownloadAdapter, InstallContext
from engine.runtime.pack_job import PackPreparationManager
from tests.test_runtime_pack_install import FakeDownloader, FakeRunner, make_pack


@pytest.mark.asyncio
async def test_runtime_pack_job_api_start_status_repair_and_logs(tmp_path: Path) -> None:
    content = b"verified model"
    pack = make_pack(checksum=hashlib.sha256(content).hexdigest(), license_use="review_required")
    downloader = FakeDownloader(content)
    runner = FakeRunner()
    managed = tmp_path / "managed"
    managed.mkdir()
    manager = PackPreparationManager(
        state_root=tmp_path / "state",
        context=InstallContext(
            managed,
            managed / "comfy",
            managed / "comfy/ComfyUI/models",
            tmp_path / "workflows",
        ),
        adapters=(DirectDownloadAdapter(downloader),),
        process_runner=runner,
        pack=pack,
        disk_free=lambda _path: 1_000_000,
    )
    app = FastAPI()
    app.include_router(
        create_runtime_pack_router(
            lambda: Settings(output_dir=tmp_path / "output"),
            manager_factory=lambda _personal: manager,
        )
    )

    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app), base_url="http://test"
    ) as client:
        started = await client.post("/api/runtime-packs/tentafruit-local-12gb-v1/jobs", json={})
        assert started.status_code == 202
        job_id = started.json()["job"]["id"]
        blocked = await manager.wait(job_id)
        assert blocked.status == "awaiting_license"

        status = await client.get(f"/api/runtime-packs/jobs/{job_id}")
        assert status.status_code == 200
        assert status.json()["job"]["steps"][0]["status"] == "awaiting_license"

        repaired = await client.post(
            f"/api/runtime-packs/jobs/{job_id}/repair",
            json={"accepted_license_ids": ["review-license"]},
        )
        assert repaired.status_code == 202
        assert (await manager.wait(job_id)).status == "completed"

        logs = await client.get(f"/api/runtime-packs/jobs/{job_id}/logs")
        assert logs.status_code == 200
        assert any("smoke checks" in item["message"] for item in logs.json()["logs"])

        latest = await client.get("/api/runtime-packs/jobs/latest")
        assert latest.json()["job"]["id"] == job_id


@pytest.mark.asyncio
async def test_runtime_pack_api_rejects_unknown_pack(tmp_path: Path) -> None:
    app = FastAPI()
    app.include_router(
        create_runtime_pack_router(
            lambda: Settings(output_dir=tmp_path),
            manager_factory=lambda _personal: pytest.fail("manager must not be created"),
        )
    )
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app), base_url="http://test"
    ) as client:
        response = await client.post("/api/runtime-packs/unknown/jobs", json={})
    assert response.status_code == 404
