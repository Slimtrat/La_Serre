from __future__ import annotations

import json
from pathlib import Path

import httpx

from apps.api.main import create_app
from engine.config import Settings
from engine.narrative.episode_models import Episode, EpisodeStatus
from engine.narrative.narrative_workflow import OllamaNarrativeAuthor
from engine.narrative.ollama import OllamaClient
from engine.world.bible import BibleRegistry
from engine.world.models import CharacterProfile, LocationProfile, ProjectBible


def _settings(tmp_path: Path) -> Settings:
    return Settings(
        _env_file=None,
        private_content_dir=tmp_path / "private",
        output_dir=tmp_path / "output",
    )


def _seed_bible(root: Path) -> None:
    BibleRegistry(root).replace(
        ProjectBible(
            characters=[
                CharacterProfile(
                    id="iris",
                    name="Iris",
                    role="Héroïne",
                    visual_description=(
                        "Une femme aux cheveux argentés et à la silhouette géométrique précise"
                    ),
                    wardrobe="Un long manteau anthracite brodé de violet et des bottes sombres",
                    signature_details=["barrette iris argentée"],
                    palette=["argent", "violet", "anthracite"],
                    personality={"curiosity": 0.8, "loyalty": 0.5, "fear": 0.2},
                    wants=["comprendre la serre"],
                    fears=["oublier"],
                    voice_description="Voix française calme, basse et très précise",
                    generation_negative_prompt="blonde hair, colorful clothes",
                )
            ],
            locations=[
                LocationProfile(
                    id="glass_room",
                    name="Salle de verre",
                    visual_description=(
                        "Une salle de verre nocturne aux murs de fer noir et au sol vert sombre"
                    ),
                    signature_details=["sol de marbre vert"],
                    palette=["noir", "vert", "bleu lune"],
                    generation_negative_prompt="daylight, modern room",
                )
            ],
        )
    )


def test_episode_model_can_exist_before_casting_and_shots() -> None:
    episode = Episode(id="S01E001", season=1, episode=1)

    assert episode.status is EpisodeStatus.IDEA
    assert episode.characters == []
    assert episode.shot_order == []


async def test_director_ai_returns_a_non_canonical_structured_candidate() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        payload = json.loads(request.content)
        assert payload["format"]["type"] == "object"
        assert "priorise les relations" in payload["messages"][1]["content"]
        return httpx.Response(
            200,
            json={
                "message": {
                    "content": json.dumps(
                        {
                            "concept": "Une serre transforme le désir en poison amoureux.",
                            "genre": "Fantasy gothique",
                            "tone": "Drôle et inquiétant",
                            "visual_direction": "Violet profond et cadres végétaux",
                            "target_episode_duration": 30,
                        }
                    )
                }
            },
        )

    async with OllamaClient(
        "http://ollama.test",
        transport=httpx.MockTransport(handler),
    ) as client:
        candidate = await OllamaNarrativeAuthor(client).director(
            "Une romance botanique dangereuse et ludique.",
            bible=ProjectBible(),
            model="tiny:latest",
            custom_prompt="priorise les relations toxiques",
        )

    assert candidate.genre == "Fantasy gothique"
    assert candidate.target_episode_duration == 30


async def test_manual_series_workflow_requires_each_gate_and_publishes_episodes(
    tmp_path: Path,
) -> None:
    app = create_app(_settings(tmp_path))
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        empty = await client.get("/api/narrative/series")
        blocked = await client.put(
            "/api/narrative/series/screenwriter",
            json={
                "content": {
                    "series_arc": "Un arc suffisamment détaillé pour être valide dans le contrat.",
                    "episodes": [],
                }
            },
        )
        director = await client.put(
            "/api/narrative/series/director",
            json={
                "content": {
                    "concept": "Une serre transforme chaque désir en poison amoureux.",
                    "genre": "Fantasy gothique",
                    "tone": "Drôle, séduisant et inquiétant",
                    "visual_direction": "Cadres végétaux violets récurrents",
                    "target_episode_duration": 30,
                },
                "mode": "manual",
            },
        )
        await client.post("/api/narrative/series/director/approve", json={})
        screenwriter = await client.put(
            "/api/narrative/series/screenwriter",
            json={
                "content": {
                    "series_arc": (
                        "Belladone vole la graine puis découvre qu’elle choisit son propre maître."
                    ),
                    "character_progression": [
                        "Belladone apprend à ne pas confondre désir et contrôle."
                    ],
                    "relationship_progression": [
                        "La confiance envers Aconit devient une dette toxique."
                    ],
                    "episodes": [
                        {
                            "episode": 1,
                            "title": "La graine noire",
                            "logline": "Belladone ouvre un héritage qui connaît déjà son désir.",
                            "synopsis": (
                                "Belladone vole une graine interdite et comprend que la serre "
                                "l’observait depuis toujours."
                            ),
                            "cliffhanger": "La graine prononce son nom.",
                        }
                    ],
                },
                "mode": "manual",
            },
        )
        await client.post("/api/narrative/series/screenwriter/approve", json={})
        validator = await client.put(
            "/api/narrative/series/validator",
            json={
                "content": {
                    "verdict": "pass",
                    "summary": (
                        "La progression respecte le brief et ne contredit aucun élément canonique."
                    ),
                    "findings": [],
                },
                "mode": "manual",
            },
        )
        await client.post("/api/narrative/series/validator/approve", json={})
        published = await client.post("/api/narrative/series/publish")
        episode = await client.get("/api/episodes/S01E001")

    assert empty.json()["director"]["status"] == "empty"
    assert blocked.status_code == 422
    assert director.json()["director"]["status"] == "draft"
    assert screenwriter.json()["screenwriter"]["provenance"]["mode"] == "manual"
    assert validator.json()["validator"]["status"] == "draft"
    assert published.json()["created_episode_ids"] == ["S01E001"]
    assert episode.json()["episode"]["status"] == "writing"
    assert episode.json()["shots"] == []


async def test_episode_authoring_review_gate_and_manual_breakdown(tmp_path: Path) -> None:
    settings = _settings(tmp_path)
    _seed_bible(settings.private_content_dir)
    app = create_app(settings)
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        created = await client.post(
            "/api/episodes",
            json={
                "title": "La salle",
                "concept": "Iris entre dans la salle qui connaît déjà son nom.",
            },
        )
        episode_id = created.json()["id"]
        updated = await client.put(
            f"/api/episodes/{episode_id}",
            json={
                "logline": "Iris découvre une salle qui se souvient d’elle.",
                "narrative_source": (
                    "Iris entre dans la salle de verre et la porte se referme derrière elle."
                ),
                "characters": ["iris"],
                "locations": ["glass_room"],
                "story": {
                    "hook": "Une porte verrouillée s’ouvre.",
                    "setup": "Iris entre.",
                    "conflict": "La salle refuse de la laisser sortir.",
                    "reveal": "Elle connaît son nom.",
                    "cliffhanger": "La lumière répond à sa voix.",
                },
            },
        )
        premature = await client.post(f"/api/episodes/{episode_id}/approve")
        reviewed = await client.post(f"/api/episodes/{episode_id}/review")
        approved = await client.post(f"/api/episodes/{episode_id}/approve")
        breakdown = await client.post(
            f"/api/episodes/{episode_id}/breakdown/apply",
            json={
                "mode": "manual",
                "candidate": {
                    "shots": [
                        {
                            "source_text": (
                                "Iris entre dans la salle et observe le sol de marbre vert."
                            ),
                            "duration": 4,
                            "location_id": "glass_room",
                            "character_ids": ["iris"],
                            "shot_type": "medium",
                            "camera_movement": "slow push-in",
                            "lens": "50mm",
                            "action": "Iris franchit la porte puis s’immobilise.",
                            "lighting": "lumière de lune froide",
                            "mood": "suspicion silencieuse",
                            "style": ["fantasy cinématique"],
                        }
                    ]
                },
            },
        )

    assert updated.json()["status"] == "writing"
    assert premature.status_code == 409
    assert reviewed.json()["can_approve"] is True
    assert approved.json()["status"] == "approved"
    assert breakdown.status_code == 200
    payload = breakdown.json()
    assert payload["episode"]["status"] == "breakdown"
    assert payload["episode"]["shot_sources"] == {
        f"{episode_id}-S01": "Iris entre dans la salle et observe le sol de marbre vert."
    }
    assert [beat["id"] for beat in payload["shots"][0]["visual_beats"]] == [
        "start",
        "middle",
        "end",
    ]
    assert payload["episode"]["provenance"][-1]["stage"] == "breakdown"
