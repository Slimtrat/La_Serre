from __future__ import annotations

import json
import shutil
from pathlib import Path

import httpx

from apps.api.main import create_app
from engine.config import Settings

ROOT = Path(__file__).parents[1]
STARTER = ROOT / "starter_catalog"


def settings_for(tmp_path: Path) -> Settings:
    private_root = tmp_path / "private"
    shutil.copytree(STARTER, private_root)
    return Settings(
        _env_file=None,
        private_content_dir=private_root,
        output_dir=tmp_path / "output",
    )


async def test_cockpit_snapshot_is_enqueue_ready_and_does_not_infer_completion(
    tmp_path: Path,
) -> None:
    app = create_app(settings_for(tmp_path))
    transport = httpx.ASGITransport(app=app)

    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/api/episodes/S01E001/production-cockpit")

    assert response.status_code == 200, response.text
    payload = response.json()
    assert payload["schema_version"] == 1
    assert payload["episode"]["id"] == "S01E001"
    assert payload["readiness"] == {
        "total_shots": 10,
        "complete_shots": 0,
        "required_media": 19,
        "present_media": 0,
        "approved_media": 0,
        "assemblable": False,
    }
    assert payload["queue"]["items"] == []
    first = payload["shots"][0]
    assert first["shot"]["id"] == first["id"]
    assert first["status"] == "blocked"
    assert first["artifacts"]["video"]["required"] is True
    assert {item["code"] for item in first["blockers"]} == {
        "VIDEO_RUNTIME_UNAVAILABLE"
    }
    assert any(item["code"] == "IMPORT_VIDEO" for item in first["next_actions"])
    assemble = next(
        item for item in payload["next_actions"] if item["code"] == "ASSEMBLE_EPISODE"
    )
    assert assemble["enabled"] is False


async def test_cockpit_assemble_route_enforces_readiness(tmp_path: Path) -> None:
    app = create_app(settings_for(tmp_path))
    transport = httpx.ASGITransport(app=app)

    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/api/episodes/S01E001/production-cockpit/assemble",
            json={"tts": "none"},
        )

    assert response.status_code == 409
    assert response.json()["detail"]["code"] == "PRODUCTION_INCOMPLETE"


async def test_approved_keyframe_requires_confirmation_before_reroll_or_import(
    tmp_path: Path,
) -> None:
    settings = settings_for(tmp_path)
    shot_dir = settings.output_dir / "S01E001-S01"
    shot_dir.mkdir(parents=True)
    original = b"approved-keyframe"
    (shot_dir / "keyframe.png").write_bytes(original)
    app = create_app(settings)
    transport = httpx.ASGITransport(app=app)

    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        approval = await client.post(
            "/api/production-queue/shots/S01E001-S01/approve"
        )
        await client.post("/api/production-queue/pause")
        refused_reroll = await client.post(
            "/api/episodes/S01E001/production-cockpit/shots/S01E001-S01/enqueue",
            json={"kind": "keyframe"},
        )
        refused_import = await client.put(
            "/api/assets/S01E001-S01/keyframe?filename=replacement.png",
            content=b"replacement",
            headers={"content-type": "image/png"},
        )
        assert (shot_dir / "keyframe.png").read_bytes() == original
        accepted_import = await client.put(
            "/api/assets/S01E001-S01/keyframe"
            "?filename=replacement.png&confirm_replace_approved=true",
            content=b"replacement",
            headers={"content-type": "image/png"},
        )

    assert approval.status_code == 200
    assert refused_reroll.status_code == 409
    assert refused_import.status_code == 409
    assert accepted_import.status_code == 200, accepted_import.text
    assert accepted_import.json()["archived_run_id"]
    assert not (shot_dir / "keyframe.png").exists()
    assert (shot_dir / "imports" / "keyframe.png").read_bytes() == b"replacement"


async def test_cockpit_exposes_retry_for_only_the_failed_shot(tmp_path: Path) -> None:
    settings = settings_for(tmp_path)
    queue_path = settings.output_dir / ".studio" / "production-queue.json"
    queue_path.parent.mkdir(parents=True)
    shot = (STARTER / "episodes/season-01/S01E001/shots/S01E001-S01.json").read_text(
        encoding="utf-8"
    )
    queue_path.write_text(
        json.dumps(
            {
                "schema_version": 1,
                "paused": True,
                "sequence": 1,
                "items": [
                    {
                        "id": "failed-one",
                        "episode_id": "S01E001",
                        "shot_id": "S01E001-S01",
                        "kind": "keyframe",
                        "shot": json.loads(shot),
                        "priority": 0,
                        "sequence": 1,
                        "status": "failed",
                        "message": "engine failed",
                        "progress": 20,
                        "attempts": 1,
                        "force": False,
                        "keyframe_source": "model",
                        "tts": "auto",
                        "linked_job_id": None,
                        "error": "engine failed",
                        "created_at": "2026-09-30T08:00:00+00:00",
                        "updated_at": "2026-09-30T08:01:00+00:00",
                    }
                ],
            },
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )
    app = create_app(settings)
    transport = httpx.ASGITransport(app=app)

    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/api/episodes/S01E001/production-cockpit")

    assert response.status_code == 200, response.text
    rows = response.json()["shots"]
    first = next(row for row in rows if row["id"] == "S01E001-S01")
    second = next(row for row in rows if row["id"] == "S01E001-S02")
    retry = next(item for item in first["next_actions"] if item["code"] == "RETRY_QUEUE_ITEM")
    assert retry["target"] == "/api/production-queue/items/failed-one/retry"
    assert all(item["code"] != "RETRY_QUEUE_ITEM" for item in second["next_actions"])
    assert first["status"] == "failed"
    assert second["status"] == "blocked"


async def test_imported_video_is_not_silently_replaced(tmp_path: Path) -> None:
    settings = settings_for(tmp_path)
    app = create_app(settings)
    transport = httpx.ASGITransport(app=app)
    target = "/api/assets/S01E001-S01/video?filename=clip.mp4"

    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        first = await client.put(
            target, content=b"approved-import", headers={"content-type": "video/mp4"}
        )
        refused = await client.put(
            target, content=b"silent-replacement", headers={"content-type": "video/mp4"}
        )
        assert (
            settings.output_dir / "S01E001-S01" / "imports" / "video.mp4"
        ).read_bytes() == b"approved-import"
        confirmed = await client.put(
            target + "&confirm_replace_approved=true",
            content=b"confirmed-replacement",
            headers={"content-type": "video/mp4"},
        )

    assert first.status_code == 200
    assert refused.status_code == 409
    assert refused.json()["detail"]["code"] == (
        "APPROVED_VARIANT_REPLACEMENT_REQUIRES_CONFIRMATION"
    )
    assert confirmed.status_code == 200
    assert (
        settings.output_dir / "S01E001-S01" / "imports" / "video.mp4"
    ).read_bytes() == b"confirmed-replacement"
