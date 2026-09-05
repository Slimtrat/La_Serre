from __future__ import annotations

from pathlib import Path

import httpx
from fastapi import FastAPI
from test_bible import character

from apps.api.bible_routes import create_bible_router
from engine.world.bible import BibleRegistry


def bible_app(private: Path, output: Path) -> FastAPI:
    app = FastAPI()
    app.include_router(
        create_bible_router(
            lambda: BibleRegistry(private),
            lambda: output,
        )
    )
    return app


async def test_bible_api_crud_revision_and_path_identity(tmp_path: Path) -> None:
    app = bible_app(tmp_path / "private", tmp_path / "output")
    transport = httpx.ASGITransport(app=app)
    payload = character().model_dump(mode="json")

    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        initial = await client.get("/api/bible")
        created = await client.put("/api/bible/characters/iris", json=payload)
        fetched = await client.get("/api/bible/characters/iris")
        mismatch = await client.put("/api/bible/characters/not-iris", json=payload)
        impact = await client.get("/api/bible/impact?since_revision=0")

    assert initial.status_code == 200
    assert initial.json()["revision"] == 0
    assert created.status_code == 200
    assert created.json()["bible"]["revision"] == 1
    assert created.json()["impact"]["changes"][0]["entity_id"] == "iris"
    assert fetched.json()["name"] == "Iris"
    assert mismatch.status_code == 409
    assert impact.json()["bible_revision"] == 1


async def test_bible_api_protects_a_referenced_identity_from_deletion(
    tmp_path: Path,
) -> None:
    private = tmp_path / "private"
    app = bible_app(private, tmp_path / "output")
    transport = httpx.ASGITransport(app=app)
    episode = private / "episodes/season-01/S01E001/episode.json"
    episode.parent.mkdir(parents=True)
    episode.write_text(
        '{"id":"S01E001","characters":["iris"],"locations":[],"shot_order":["S01E001-S01"]}',
        encoding="utf-8",
    )

    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        await client.put(
            "/api/bible/characters/iris",
            json=character().model_dump(mode="json"),
        )
        response = await client.delete("/api/bible/characters/iris")

    assert response.status_code == 409
    assert response.json()["detail"]["dependencies"]["episodes"] == ["S01E001"]


def test_bible_router_exposes_every_canonical_registry(tmp_path: Path) -> None:
    router = create_bible_router(
        lambda: BibleRegistry(tmp_path / "private"),
        lambda: tmp_path / "output",
    )
    paths = {route.path for route in router.routes if hasattr(route, "path")}

    assert {
        "/api/bible",
        "/api/bible/direction",
        "/api/bible/impact",
        "/api/bible/dependencies/{entity_type}/{entity_id}",
        "/api/bible/characters/{entity_id}",
        "/api/bible/locations/{entity_id}",
        "/api/bible/relationships/{entity_id}",
        "/api/bible/world_rules/{entity_id}",
        "/api/bible/narrative_arcs/{entity_id}",
        "/api/bible/secrets/{entity_id}",
        "/api/bible/references/{entity_id}",
        "/api/bible/prompts/{entity_id}",
        "/api/bible/{collection}/{entity_id}",
    } <= paths
