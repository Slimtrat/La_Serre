from __future__ import annotations

import json
import shutil
from pathlib import Path

from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient
from PIL import Image

from apps.api.release_candidate_routes import create_release_candidate_router
from engine.production.release import ReleaseCandidateService, RenderProfile
from engine.world.catalog import EpisodeCatalog


def _probe(path: Path) -> dict[str, object]:
    width, height = (576, 1024) if path.name == "episode.mp4" else (1080, 1920)
    return {
        "format": {"duration": "50", "format_name": "mov,mp4,m4a,3gp,3g2,mj2"},
        "streams": [
            {
                "codec_type": "video",
                "codec_name": "h264",
                "width": width,
                "height": height,
                "avg_frame_rate": "24/1",
            },
            {"codec_type": "audio", "codec_name": "aac"},
        ],
    }


def _render(source: Path, destination: Path, _: RenderProfile) -> None:
    assert source.read_bytes() == b"valid-probed-master"
    destination.write_bytes(b"rendered-release-reel")


async def test_release_candidate_api_enforces_revision_and_human_approval(
    tmp_path: Path,
) -> None:
    private = tmp_path / "private"
    output = tmp_path / "output"
    shutil.copytree(Path("starter_catalog"), private)
    episode = output / "S01E001"
    episode.mkdir(parents=True)
    (episode / "episode.mp4").write_bytes(b"valid-probed-master")
    (episode / "episode-generation.json").write_text(
        json.dumps({"status": "FINAL"}), encoding="utf-8"
    )
    keyframe = output / "S01E001-S01" / "keyframe.png"
    keyframe.parent.mkdir(parents=True)
    Image.new("RGB", (90, 160), "#6f436f").save(keyframe)

    service = ReleaseCandidateService(
        EpisodeCatalog(private),
        output,
        probe=_probe,
        renderer=_render,
    )
    app = FastAPI()
    app.include_router(create_release_candidate_router(service))
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        created = await client.post(
            "/api/episodes/S01E001/release-candidate",
            json={"caption_template": "{title} — {episode_id}"},
        )
        assert created.status_code == 201
        draft = created.json()
        assert draft["state"] == "draft"
        assert draft["caption"] == "L’Héritage interdit — S01E001"
        assert draft["render_profile"]["width"] == 1080
        assert draft["source"]["width"] == 576
        assert draft["reel"]["width"] == 1080

        stale_client = await client.post(
            "/api/episodes/S01E001/release-candidate/approve",
            json={"expected_revision": draft["revision"] + 1},
        )
        assert stale_client.status_code == 409
        assert stale_client.json()["detail"]["code"] == "RELEASE_REVISION_CONFLICT"

        approved = await client.post(
            "/api/episodes/S01E001/release-candidate/approve",
            json={"expected_revision": draft["revision"]},
        )
        assert approved.status_code == 200
        approved_payload = approved.json()
        assert approved_payload["state"] == "approved"

        exported = await client.post(
            "/api/episodes/S01E001/release-candidate/export",
            json={"expected_revision": approved_payload["revision"]},
        )
        assert exported.status_code == 201
        release = exported.json()
        assert release["state"] == "exported"
        assert {item["filename"] for item in release["export"]["files"]} == {
            "reel.mp4",
            "cover.png",
            "subtitles.srt",
            "caption.txt",
            "release.json",
        }

        cover = await client.get(release["cover"]["url"])
        reel = await client.get(release["reel"]["url"])
        exported_manifest = next(
            item["url"]
            for item in release["export"]["files"]
            if item["filename"] == "release.json"
        )
        manifest = await client.get(exported_manifest)
        assert cover.status_code == 200
        assert cover.headers["content-type"] == "image/png"
        assert reel.status_code == 200
        assert reel.content == b"rendered-release-reel"
        assert manifest.status_code == 200
