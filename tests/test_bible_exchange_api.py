from __future__ import annotations

from pathlib import Path

import httpx
from fastapi import FastAPI
from test_bible import character

from apps.api.bible_routes import create_bible_router
from engine.world.bible import BibleRegistry


def exchange_app(private: Path, output: Path) -> FastAPI:
    app = FastAPI()
    app.include_router(
        create_bible_router(
            lambda: BibleRegistry(private),
            lambda: output,
        )
    )
    return app


async def test_exchange_api_exports_schema_template_and_chatgpt_kit(tmp_path: Path) -> None:
    app = exchange_app(tmp_path / "private", tmp_path / "output")
    transport = httpx.ASGITransport(app=app)

    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        await client.put(
            "/api/bible/characters/iris",
            json=character().model_dump(mode="json"),
        )
        exported = await client.get("/api/bible/exchange")
        template = await client.get("/api/bible/exchange/template")
        schema = await client.get("/api/bible/exchange/schema")
        kit = await client.get("/api/bible/exchange/ai-kit")

    assert exported.status_code == 200
    assert exported.json()["bible"]["characters"][0]["id"] == "iris"
    assert "revision" not in exported.json()["bible"]
    assert template.json()["bible"]["characters"] == []
    assert schema.headers["content-type"].startswith("application/schema+json")
    assert schema.json()["$schema"].endswith("2020-12/schema")
    assert kit.json()["empty_template"] == template.json()


async def test_exchange_import_replaces_canon_and_guards_revision(tmp_path: Path) -> None:
    private = tmp_path / "private"
    app = exchange_app(private, tmp_path / "output")
    transport = httpx.ASGITransport(app=app)

    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        created = await client.put(
            "/api/bible/characters/iris",
            json=character().model_dump(mode="json"),
        )
        document = (await client.get("/api/bible/exchange")).json()
        document["bible"]["title"] = "Canon extrait d'une conversation"
        imported = await client.post(
            "/api/bible/exchange/import?expected_revision=1",
            json=document,
        )
        stale = await client.post(
            "/api/bible/exchange/import?expected_revision=1",
            json=document,
        )

    assert created.json()["bible"]["revision"] == 1
    assert imported.status_code == 200
    assert imported.json()["bible"]["revision"] == 2
    assert imported.json()["bible"]["title"] == "Canon extrait d'une conversation"
    assert imported.json()["exchange"]["operation"] == "replace"
    assert stale.status_code == 409
    assert stale.json()["detail"]["current_revision"] == 2
    assert BibleRegistry(private).load().revision == 2


async def test_exchange_import_rejects_non_standard_json(tmp_path: Path) -> None:
    app = exchange_app(tmp_path / "private", tmp_path / "output")
    transport = httpx.ASGITransport(app=app)

    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/api/bible/exchange/import",
            json={"title": "Ancien format libre"},
        )

    assert response.status_code == 422


def test_exchange_routes_are_part_of_the_bible_contract(tmp_path: Path) -> None:
    router = create_bible_router(
        lambda: BibleRegistry(tmp_path / "private"),
        lambda: tmp_path / "output",
    )
    paths = {route.path for route in router.routes if hasattr(route, "path")}

    assert {
        "/api/bible/exchange",
        "/api/bible/exchange/template",
        "/api/bible/exchange/schema",
        "/api/bible/exchange/ai-kit",
        "/api/bible/exchange/import",
    } <= paths
