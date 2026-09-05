from __future__ import annotations

import json
import os
from pathlib import Path

from httpx import ASGITransport, AsyncClient

from apps.api.asset_catalog import ProjectAssetCatalog
from apps.api.assets import AssetStore
from apps.api.main import create_app
from engine.config import Settings


def _write_json(path: Path, payload: dict[str, object]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload), encoding="utf-8")


def _shot(work: Path, shot_id: str, character: str, location: str) -> None:
    _write_json(
        work / "episodes" / "season-01" / shot_id.rsplit("-S", 1)[0] / "shots" / f"{shot_id}.json",
        {
            "id": shot_id,
            "characters": [{"id": character, "name": character.title()}],
            "location": location,
        },
    )


def test_catalog_unifies_generated_imported_and_canonical_assets(tmp_path: Path) -> None:
    output = tmp_path / "output"
    work = tmp_path / "work"
    _shot(work, "S01E001-S01", "belladone", "serre")
    _write_json(
        work / "world" / "characters" / "belladone" / "character.json",
        {"id": "belladone", "name": "Belladone"},
    )
    _write_json(
        work / "world" / "locations" / "serre" / "location.json",
        {"id": "serre", "name": "La Serre"},
    )
    generated = output / "S01E001-S01" / "keyframe.png"
    generated.parent.mkdir(parents=True)
    generated.write_bytes(b"generated-image")
    AssetStore(output).put(
        "S01E001-S01", "audio", "voice.wav", "audio/wav", b"voice-bytes"
    )

    catalog = ProjectAssetCatalog(output, work)
    listing = catalog.listing()

    assert listing["indexed_total"] >= 5
    kinds = {item["kind"] for item in listing["items"]}
    assert {"image", "audio", "character", "background", "data"} <= kinds
    image = next(item for item in listing["items"] if item["name"] == "keyframe.png")
    assert image["characters"] == ["belladone"]
    assert image["locations"] == ["serre"]
    assert image["episodes"] == ["S01E001"]
    assert image["compatible_slots"] == ["keyframe"]
    assert image["content_url"].endswith("/content")
    assert catalog.catalog_path.is_file()
    assert any(catalog.blob_root.iterdir())


def test_catalog_filters_search_and_exposes_friendly_facets(tmp_path: Path) -> None:
    output = tmp_path / "output"
    work = tmp_path / "work"
    _shot(work, "S02E004-S03", "aconit", "orangerie")
    _write_json(
        work / "world" / "characters" / "aconit" / "character.json",
        {"id": "aconit", "name": "Aconit"},
    )
    image = output / "S02E004-S03" / "keyframe.png"
    image.parent.mkdir(parents=True)
    image.write_bytes(b"aconit-frame")
    catalog = ProjectAssetCatalog(output, work)

    result = catalog.listing(
        query="keyframe",
        kind="image",
        character="aconit",
        location="orangerie",
        episode="S02E004",
        status="generated",
    )

    assert result["total"] == 1
    assert result["items"][0]["name"] == "keyframe.png"
    character_facet = catalog.listing()["facets"]["characters"]
    aconit = next(item for item in character_facet if item["value"] == "aconit")
    assert aconit["label"] == "Aconit"
    assert aconit["count"] >= 1


def test_reuse_binds_same_catalogue_payload_without_duplicate_blob(tmp_path: Path) -> None:
    output = tmp_path / "output"
    work = tmp_path / "work"
    _shot(work, "S01E001-S01", "belladone", "serre")
    _shot(work, "S01E001-S02", "belladone", "serre")
    AssetStore(output).put(
        "S01E001-S01", "keyframe", "source.png", "image/png", b"same-pixels"
    )
    catalog = ProjectAssetCatalog(output, work)
    source = next(
        item for item in catalog.listing()["items"] if item["kind"] == "image"
    )

    record = catalog.reuse("S01E001-S02", "keyframe", source["id"])
    bound = AssetStore(output).get("S01E001-S02", "keyframe")

    assert bound is not None
    assert bound[1].read_bytes() == b"same-pixels"
    assert record.source == "reuse"
    assert record.asset_id == source["id"]
    assert record.origin_asset_id == source["id"]
    assert len(list(catalog.blob_root.glob("*.png"))) == 1
    blob = catalog.content_path(source["id"])
    if os.name == "nt":
        assert os.path.samefile(blob, bound[1])
    refreshed = catalog.get(source["id"])
    assert any(link["shot_id"] == "S01E001-S02" for link in refreshed["bindings"])


async def test_asset_catalog_api_lists_previews_and_reuses(tmp_path: Path) -> None:
    output = tmp_path / "output"
    work = tmp_path / "work"
    _shot(work, "S01E001-S01", "belladone", "serre")
    _shot(work, "S01E001-S02", "belladone", "serre")
    app = create_app(Settings(output_dir=output, private_content_dir=work))
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        uploaded = await client.put(
            "/api/assets/S01E001-S01/audio?filename=voice.wav",
            headers={"content-type": "audio/wav"},
            content=b"voice",
        )
        assert uploaded.status_code == 200
        listing = await client.get("/api/asset-catalog?kind=audio&character=belladone")
        assert listing.status_code == 200
        asset = listing.json()["items"][0]
        content = await client.get(asset["content_url"])
        assert content.content == b"voice"
        reused = await client.post(
            "/api/assets/S01E001-S02/audio/reuse",
            json={"asset_id": asset["id"]},
        )
        assert reused.status_code == 200
        assert reused.json()["source"] == "reuse"
        target = await client.get("/api/assets/S01E001-S02/audio/content")
        assert target.content == b"voice"
        incompatible = await client.post(
            "/api/assets/S01E001-S02/video/reuse",
            json={"asset_id": asset["id"]},
        )
        assert incompatible.status_code == 422


def test_asset_drawer_contract_is_global_responsive_and_draggable() -> None:
    static = Path("apps/api/static")
    html = (static / "index.html").read_text(encoding="utf-8")
    script = (static / "asset-drawer.js").read_text(encoding="utf-8")
    styles = (static / "asset-drawer.css").read_text(encoding="utf-8")
    graph = (static / "graph.js").read_text(encoding="utf-8")
    stages = (static / "app.js").read_text(encoding="utf-8")

    assert 'id="asset-drawer"' in html
    assert 'id="asset-search"' in html
    for field in ("kind", "character", "location", "episode", "status"):
        assert f'id="asset-filter-{field}"' in html
    assert "/static/asset-drawer.js" in html
    assert "/static/asset-drawer.css" in html
    assert 'event.dataTransfer.setData("application/x-serre-asset"' in script
    assert 'window.SerreAssetDrawer = {' in script
    assert 'window.SerreI18n?.register?.("fr"' in script
    assert 'window.SerreI18n?.register?.("en"' in script
    assert 'window.SerreAssetDrawer?.reuse(assetId, slot)' in graph
    assert 'function bindAssetSlot(card)' in stages
    assert "@media (max-width: 640px)" in styles
