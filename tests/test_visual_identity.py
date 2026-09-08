from __future__ import annotations

from pathlib import Path

import httpx
import pytest
from fastapi import FastAPI
from test_bible import character

from apps.api.casting_routes import (
    GeneratedIdentityImage,
    create_casting_router,
)
from engine.world.bible import BibleRegistry
from engine.world.models import ProjectBible
from engine.world.visual_identity import (
    VisualIdentityConflict,
    VisualIdentityError,
    VisualIdentityRegistry,
    VisualProvenance,
    VisualVariantKind,
    VisualVariantSource,
)


def provenance(source: VisualVariantSource = VisualVariantSource.IMPORTED) -> VisualProvenance:
    return VisualProvenance(
        source=source,
        source_label="artist export",
        model="sdxl" if source is VisualVariantSource.GENERATED else None,
        workflow="casting-v1" if source is VisualVariantSource.GENERATED else None,
        seed=42 if source is VisualVariantSource.GENERATED else None,
        license="CC-BY-4.0",
        revision="source-r2",
    )


def add_variant(
    store: VisualIdentityRegistry,
    revision: int,
    kind: VisualVariantKind = VisualVariantKind.PORTRAIT,
):
    return store.add_image(
        character_id="iris",
        kind=kind,
        content=b"fake-image",
        media_type="image/png",
        permanent_identity="Silver hair, angular adult face",
        outfit="Charcoal petal coat",
        transient_state="Neutral expression",
        provenance=provenance(),
        expected_revision=revision,
    )


def test_variants_keep_provenance_and_master_requires_human_gate(tmp_path: Path) -> None:
    store = VisualIdentityRegistry(tmp_path)
    board, first = add_variant(store, 0)
    board, second = add_variant(store, board.revision, VisualVariantKind.FULL_BODY)

    assert store.active_references() == {}
    board, affected = store.approve("iris", first.id, expected_revision=board.revision)
    identity = board.characters[0]
    assert identity.active_master_id == first.id
    assert identity.variants[0].provenance.license == "CC-BY-4.0"
    assert affected.shot_ids == []

    board, _ = store.approve("iris", second.id, expected_revision=board.revision)
    assert board.characters[0].active_master_id == second.id
    restored, _ = store.restore("iris", first.id, expected_revision=board.revision)
    assert restored.characters[0].active_master_id == first.id
    assert len(restored.characters[0].master_history) == 3
    assert store.active_references()["iris"].is_file()


def test_revision_conflicts_and_active_master_cannot_be_rejected(tmp_path: Path) -> None:
    store = VisualIdentityRegistry(tmp_path)
    board, variant = add_variant(store, 0)
    with pytest.raises(VisualIdentityConflict):
        add_variant(store, 0)
    board, _ = store.approve("iris", variant.id, expected_revision=board.revision)
    with pytest.raises(VisualIdentityError, match="active master"):
        store.reject("iris", variant.id, expected_revision=board.revision)


def casting_app(private: Path, output: Path) -> FastAPI:
    BibleRegistry(private).replace(ProjectBible(characters=[character()]))

    async def generate(_character_id: str, _payload: object) -> GeneratedIdentityImage:
        return GeneratedIdentityImage(
            content=b"generated-image",
            media_type="image/webp",
            source_label="ComfyUI local",
        )

    app = FastAPI()
    app.include_router(create_casting_router(lambda: private, lambda: output, generate))
    return app


async def test_casting_api_import_generate_approve_restore_and_conflict(tmp_path: Path) -> None:
    app = casting_app(tmp_path / "private", tmp_path / "output")
    transport = httpx.ASGITransport(app=app)
    query = {
        "expected_revision": 0,
        "kind": "portrait",
        "permanent_identity": "Silver hair and angular adult face",
        "license": "artist-owned",
        "source_label": "concept.png",
    }
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        imported = await client.post(
            "/api/casting/iris/variants/import",
            params=query,
            content=b"png-bytes",
            headers={"content-type": "image/png"},
        )
        assert imported.status_code == 201
        first = imported.json()["variant"]
        revision = imported.json()["board"]["revision"]

        conflict = await client.post(
            f"/api/casting/iris/variants/{first['id']}/approve",
            json={"expected_revision": 0},
        )
        assert conflict.status_code == 409

        approved = await client.post(
            f"/api/casting/iris/variants/{first['id']}/approve",
            json={"expected_revision": revision},
        )
        assert approved.status_code == 200
        assert approved.json()["regeneration_started"] is False
        revision = approved.json()["board"]["revision"]

        generated = await client.post(
            "/api/casting/iris/variants/generate",
            json={
                "expected_revision": revision,
                "kind": "full_body",
                "permanent_identity": "Silver hair and angular adult face",
                "outfit": "Long charcoal coat",
                "transient_state": "",
                "prompt": "Full body neutral turnaround on plain background",
                "model": "sdxl",
                "workflow": "casting-v1",
                "seed": 123,
                "license": "model-output",
                "revision": "workflow-r1",
            },
        )
        assert generated.status_code == 201
        second = generated.json()["variant"]
        assert second["provenance"]["source"] == "generated"
        revision = generated.json()["board"]["revision"]

        switched = await client.post(
            f"/api/casting/iris/variants/{second['id']}/approve",
            json={"expected_revision": revision},
        )
        revision = switched.json()["board"]["revision"]
        restored = await client.post(
            f"/api/casting/iris/variants/{first['id']}/restore",
            json={"expected_revision": revision},
        )
        assert restored.json()["board"]["characters"][0]["active_master_id"] == first["id"]

        media = await client.get(f"/api/casting/iris/variants/{first['id']}/content")
        assert media.status_code == 200
        assert media.content == b"png-bytes"


async def test_casting_import_remains_available_without_generator(tmp_path: Path) -> None:
    private = tmp_path / "private"
    BibleRegistry(private).replace(ProjectBible(characters=[character()]))
    app = FastAPI()
    app.include_router(create_casting_router(lambda: private, lambda: tmp_path / "out"))
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        unavailable = await client.post(
            "/api/casting/iris/variants/generate",
            json={
                "expected_revision": 0,
                "kind": "portrait",
                "permanent_identity": "Silver hair and angular adult face",
                "prompt": "Portrait with neutral background",
                "model": "sdxl",
                "workflow": "casting-v1",
                "seed": 1,
                "license": "model-output",
            },
        )
    assert unavailable.status_code == 503


def test_unversioned_casting_board_is_loaded_non_destructively(tmp_path: Path) -> None:
    path = tmp_path / "world" / "visual-identities.json"
    path.parent.mkdir(parents=True)
    path.write_text('{"revision":0,"updated_at":null,"characters":[]}', encoding="utf-8")

    loaded = VisualIdentityRegistry(tmp_path).load()

    assert loaded.schema_version == 1
    assert '"schema_version"' not in path.read_text(encoding="utf-8")
