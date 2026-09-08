from __future__ import annotations

from pathlib import Path

import httpx
import pytest
from fastapi import FastAPI
from pydantic import ValidationError
from test_bible import character

from apps.api.relationship_board_routes import create_relationship_board_router
from engine.world.bible import BibleRegistry
from engine.world.models import ProjectBible, RelationshipState, Secret


def relationship(
    relationship_id: str = "iris-vers-rose",
    source: str = "iris",
    target: str = "rose",
) -> RelationshipState:
    return RelationshipState(
        id=relationship_id,
        source=source,
        target=target,
        label="Attirance méfiante",
        summary="Iris protège Rose tout en doutant encore de ses intentions.",
        desire=55,
        trust=20,
        anger=-5,
        fear=12,
        attachment=43,
        jealousy=61,
        toxicity=8,
    )


def relationship_app(private: Path, output: Path) -> FastAPI:
    app = FastAPI()
    app.include_router(
        create_relationship_board_router(
            lambda: BibleRegistry(private),
            lambda: output,
        )
    )
    return app


def seed_characters(registry: BibleRegistry) -> None:
    registry.put_character(character())
    registry.put_character(character().model_copy(update={"id": "rose", "name": "Rose"}))


def test_schema_v1_relationship_migrates_jealousy_and_provenance() -> None:
    payload = {
        "schema_version": 1,
        "characters": [
            character().model_dump(mode="json"),
            character().model_copy(update={"id": "rose", "name": "Rose"}).model_dump(mode="json"),
        ],
        "relationships": [
            {
                key: value
                for key, value in relationship().model_dump(mode="json").items()
                if key not in {"jealousy", "provenance"}
            }
        ],
    }

    migrated = ProjectBible.model_validate(payload)

    assert migrated.schema_version == 1
    assert migrated.relationships[0].jealousy == 0
    assert migrated.relationships[0].provenance.source == "legacy"


def test_relationship_and_secret_bounds_are_strict() -> None:
    with pytest.raises(ValidationError):
        relationship().model_copy(update={"jealousy": 101}).__class__.model_validate(
            {**relationship().model_dump(), "jealousy": 101}
        )

    with pytest.raises(ValidationError, match="unknown character"):
        ProjectBible(
            characters=[character()],
            relationships=[relationship()],
        )

    with pytest.raises(ValidationError, match="both known and hidden"):
        Secret(
            id="double-knowledge",
            owners=["iris"],
            known_by=["rose"],
            hidden_from=["rose"],
            summary="Rose ne peut pas savoir et ignorer le même secret.",
            severity=0.5,
            created_episode=1,
        )


async def test_relationship_board_mutations_are_directional_revisioned_and_impactful(
    tmp_path: Path,
) -> None:
    private = tmp_path / "private"
    output = tmp_path / "output"
    registry = BibleRegistry(private)
    seed_characters(registry)
    episode = private / "episodes/season-01/S01E001/episode.json"
    episode.parent.mkdir(parents=True)
    episode.write_text(
        '{"id":"S01E001","characters":["iris","rose"],"locations":[],"shot_order":["S01E001-S01"]}',
        encoding="utf-8",
    )
    app = relationship_app(private, output)
    transport = httpx.ASGITransport(app=app)

    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        initial = await client.get("/api/relationship-board")
        revision = initial.json()["bible_revision"]
        forward = await client.put(
            "/api/relationship-board/relationships/iris-vers-rose",
            json={
                "expected_revision": revision,
                "confirmed_by_user": True,
                "note": "Validé dans le board",
                "relationship": relationship().model_dump(mode="json"),
            },
        )
        reverse = await client.put(
            "/api/relationship-board/relationships/rose-vers-iris",
            json={
                "expected_revision": forward.json()["bible_revision"],
                "confirmed_by_user": True,
                "relationship": relationship("rose-vers-iris", "rose", "iris")
                .model_copy(update={"trust": -30, "jealousy": 12})
                .model_dump(mode="json"),
            },
        )
        stale = await client.put(
            "/api/relationship-board/relationships/iris-vers-rose",
            json={
                "expected_revision": revision,
                "confirmed_by_user": True,
                "relationship": relationship().model_dump(mode="json"),
            },
        )

    assert forward.status_code == 200
    assert reverse.status_code == 200
    payload = reverse.json()
    assert len(payload["relationships"]) == 2
    assert payload["relationships"][0]["provenance"]["source"] == "manual"
    assert payload["relationships"][0]["provenance"]["note"] == "Validé dans le board"
    assert payload["impact"]["affected_episodes"] == ["S01E001"]
    assert payload["history"][-1]["entity_type"] == "relationship"
    assert stale.status_code == 409
    assert stale.json()["detail"]["current_revision"] == payload["bible_revision"]


async def test_secret_editor_and_summary_candidate_never_mutate_canon(
    tmp_path: Path,
) -> None:
    private = tmp_path / "private"
    registry = BibleRegistry(private)
    seed_characters(registry)
    registry.put_relationship(relationship())
    app = relationship_app(private, tmp_path / "output")
    transport = httpx.ASGITransport(app=app)

    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        board = await client.get("/api/relationship-board")
        secret = await client.put(
            "/api/relationship-board/secrets/rose-cache-la-cle",
            json={
                "expected_revision": board.json()["bible_revision"],
                "confirmed_by_user": True,
                "secret": {
                    "id": "rose-cache-la-cle",
                    "owners": ["rose"],
                    "known_by": ["rose"],
                    "hidden_from": ["iris"],
                    "summary": "Rose cache à Iris où se trouve la clé de la serre.",
                    "severity": 0.8,
                    "created_episode": 1,
                    "revealed": False,
                },
            },
        )
        revision = secret.json()["bible_revision"]
        candidate = await client.post(
            "/api/relationship-board/summary-candidates",
            json={
                "expected_revision": revision,
                "relationship_ids": ["iris-vers-rose"],
                "secret_ids": ["rose-cache-la-cle"],
                "locale": "fr",
            },
        )
        after = await client.get("/api/relationship-board")
        unknown = await client.post(
            "/api/relationship-board/summary-candidates",
            json={
                "expected_revision": revision,
                "relationship_ids": ["inconnue"],
                "secret_ids": [],
            },
        )

    assert secret.status_code == 200
    assert secret.json()["secrets"][0]["provenance"]["source"] == "manual"
    assert candidate.status_code == 200
    assert candidate.json()["status"] == "candidate"
    assert candidate.json()["provenance"] == {
        "provider": "deterministic",
        "method": "relationship-board-v1",
        "canonical": False,
    }
    assert "Jalousie 61/100" in candidate.json()["summary"]
    assert after.json()["bible_revision"] == revision
    assert unknown.status_code == 404


async def test_mutations_require_explicit_human_confirmation(tmp_path: Path) -> None:
    private = tmp_path / "private"
    registry = BibleRegistry(private)
    seed_characters(registry)
    app = relationship_app(private, tmp_path / "output")
    transport = httpx.ASGITransport(app=app)

    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        rejected = await client.put(
            "/api/relationship-board/relationships/iris-vers-rose",
            json={
                "expected_revision": registry.load().revision,
                "confirmed_by_user": False,
                "relationship": relationship().model_dump(mode="json"),
            },
        )

    assert rejected.status_code == 422
    assert registry.load().relationships == []


def test_starter_catalog_carries_belladone_aconit_jealousy_and_template_provenance() -> None:
    bible_path = Path(__file__).parents[1] / "starter_catalog/world/bible.json"
    bible = ProjectBible.model_validate_json(bible_path.read_text(encoding="utf-8"))

    relation = next(item for item in bible.relationships if item.id == "belladone-aconit")
    assert (relation.source, relation.target) == ("belladone", "aconit")
    assert relation.jealousy == 64
    assert relation.provenance.source == "template"
    assert bible.secrets[0].provenance.source == "template"
