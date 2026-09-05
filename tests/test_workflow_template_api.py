from pathlib import Path

import httpx

from apps.api.main import create_app
from engine.config import Settings


def _settings(tmp_path: Path) -> Settings:
    return Settings(
        _env_file=None,
        private_content_dir=tmp_path / "private",
        output_dir=tmp_path / "output",
        comfyui_models_dir=tmp_path / "models",
        downloads_dir=tmp_path / "downloads",
    )


async def test_template_catalogue_exposes_readiness_and_real_comfy_graphs(
    tmp_path: Path,
) -> None:
    app = create_app(_settings(tmp_path))
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/api/workflow-templates")
        graph = await client.get(
            "/api/workflow-templates/ltx-triptych-animation-v1/graph"
        )

    assert response.status_code == 200
    payload = response.json()
    assert len(payload["continuity_chain"]) == 4
    assert [item["id"] for item in payload["templates"]] == payload["continuity_chain"]
    assert all("models_ready" in item for item in payload["templates"])
    flux = payload["templates"][0]
    assert flux["models_ready"] is False
    assert flux["models"][0]["destination"].endswith("flux1-dev-fp8.safetensors")
    assert graph.status_code == 200
    assert graph.json()["nodes"]
    assert graph.json()["profile_id"] == "template-ltx-triptych-animation-v1"


async def test_guided_template_selection_is_revisioned_and_stage_safe(
    tmp_path: Path,
) -> None:
    app = create_app(_settings(tmp_path))
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        selected = await client.put(
            "/api/guided/template-selection",
            json={
                "expected_revision": 0,
                "stage": "scene_anchor",
                "template_id": "sdxl-scene-anchor-v1",
            },
        )
        mismatched = await client.put(
            "/api/guided/template-selection",
            json={
                "expected_revision": 1,
                "stage": "video_triptych",
                "template_id": "sdxl-scene-anchor-v1",
            },
        )

    assert selected.status_code == 200
    assert selected.json()["state"]["selected_templates"] == {
        "scene_anchor": "sdxl-scene-anchor-v1"
    }
    assert selected.json()["state"]["revision"] == 1
    assert mismatched.status_code == 422
