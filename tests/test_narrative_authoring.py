from __future__ import annotations

import json
import shutil
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


async def test_episode_get_exposes_active_project_format(tmp_path: Path) -> None:
    settings = _settings(tmp_path)
    _seed_bible(settings.private_content_dir)
    app = create_app(settings)
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        created = await client.post("/api/episodes", json={"title": "La salle"})
        episode_id = created.json()["id"]
        custom = await client.get(f"/api/episodes/{episode_id}")
        assert custom.status_code == 200
        assert custom.json()["episode"]["characters"] == []
        assert custom.json()["episode"]["locations"] == []
        assert custom.json()["characters"] == []
        assert custom.json()["locations"] == []
        assert [item["id"] for item in custom.json()["available_characters"]] == ["iris"]
        assert [item["id"] for item in custom.json()["available_locations"]] == ["glass_room"]
        assert custom.json()["format_output"] == {
            "shot_count_min": 1,
            "shot_count_max": 999,
            "duration_seconds_min": 1,
            "duration_seconds_max": 3600,
        }
        shutil.copyfile(
            Path("starter_catalog/series-format.json"),
            settings.private_content_dir / "series-format.json",
        )
        tentafruit = await client.get(f"/api/episodes/{episode_id}")
        assert tentafruit.json()["format_output"] == {
            "shot_count_min": 6,
            "shot_count_max": 10,
            "duration_seconds_min": 30,
            "duration_seconds_max": 60,
        }


async def test_director_ai_returns_a_non_canonical_structured_candidate() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        payload = json.loads(request.content)
        assert payload["format"]["type"] == "object"
        assert payload["options"] == {"temperature": 0.35}
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
        author = OllamaNarrativeAuthor(client)
        candidate = await author.director(
            "Une romance botanique dangereuse et ludique.",
            bible=ProjectBible(),
            model="tiny:latest",
            custom_prompt="priorise les relations toxiques",
        )

    assert candidate.genre == "Fantasy gothique"
    assert candidate.target_episode_duration == 30
    assert author.last_execution is not None
    assert author.last_execution.task_id == "narrative.director"
    assert author.last_execution.task_version == 1
    assert author.last_execution.model == "tiny:latest"
    assert len(author.last_execution.input_fingerprint) == 64


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


async def test_episode_approval_rejects_review_after_bible_change(tmp_path: Path) -> None:
    settings = _settings(tmp_path)
    _seed_bible(settings.private_content_dir)
    app = create_app(settings)
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        created = await client.post(
            "/api/episodes",
            json={
                "title": "La salle",
                "concept": "Iris entre dans la salle de verre et découvre une porte cachée.",
            },
        )
        episode_id = created.json()["id"]
        await client.put(
            f"/api/episodes/{episode_id}",
            json={"logline": "Iris découvre la porte cachée derrière les vitres."},
        )
        review = await client.post(f"/api/episodes/{episode_id}/review")
        assert review.json()["can_approve"] is True
        _seed_bible(settings.private_content_dir)
        stale = await client.post(f"/api/episodes/{episode_id}/approve")
        assert stale.status_code == 409
        assert "Bible" in stale.json()["detail"]
        await client.post(f"/api/episodes/{episode_id}/review")
        approved = await client.post(f"/api/episodes/{episode_id}/approve")
        assert approved.json()["status"] == "approved"


async def test_guided_breakdown_enforces_project_format_before_writing(tmp_path: Path) -> None:
    settings = _settings(tmp_path)
    _seed_bible(settings.private_content_dir)
    settings.private_content_dir.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(
        Path("starter_catalog/series-format.json"),
        settings.private_content_dir / "series-format.json",
    )
    app = create_app(settings)
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        created = await client.post(
            "/api/episodes",
            json={
                "title": "La salle",
                "concept": "Iris entre dans la salle de verre et découvre une porte cachée.",
                "duration_target": 30,
            },
        )
        episode_id = created.json()["id"]
        await client.put(
            f"/api/episodes/{episode_id}",
            json={"logline": "Iris découvre la porte cachée derrière les vitres."},
        )
        await client.post(f"/api/episodes/{episode_id}/review")
        await client.post(f"/api/episodes/{episode_id}/approve")

        def card(index: int, duration: float = 5) -> dict[str, object]:
            return {
                "source_text": f"Iris explore la salle de verre, mouvement narratif {index}.",
                "duration": duration,
                "location_id": "glass_room",
                "character_ids": ["iris"],
                "shot_type": "medium",
                "camera_movement": "slow push-in",
                "action": f"Iris observe le détail numéro {index} et avance.",
                "lighting": "lumière de lune froide",
                "mood": "suspicion silencieuse",
                "style": ["fantasy cinématique"],
            }

        too_few = await client.post(
            f"/api/episodes/{episode_id}/breakdown/apply",
            json={"candidate": {"shots": [card(1)]}, "enforce_format": True},
        )
        assert too_few.status_code == 422
        assert "6" in too_few.json()["detail"]
        wrong_budget = await client.post(
            f"/api/episodes/{episode_id}/breakdown/apply",
            json={
                "candidate": {"shots": [card(index, 4) for index in range(6)]},
                "enforce_format": True,
            },
        )
        assert wrong_budget.status_code == 422
        assert "somme" in wrong_budget.json()["detail"]
        before = await client.get(f"/api/episodes/{episode_id}")
        assert before.json()["episode"]["status"] == "approved"
        assert before.json()["shots"] == []

        applied = await client.post(
            f"/api/episodes/{episode_id}/breakdown/apply",
            json={
                "candidate": {"shots": [card(index) for index in reversed(range(6))]},
                "enforce_format": True,
                "mode": "manual",
            },
        )
        assert applied.status_code == 200
        package = applied.json()
        assert package["episode"]["duration_target"] == 30
        assert len(package["shots"]) == 6
        assert package["shots"][0]["id"] == f"{episode_id}-S01"
        assert "numéro 5" in package["shots"][0]["action"]
        assert package["episode"]["provenance"][-1]["mode"] == "manual"

        original_fingerprint = package["breakdown_fingerprint"]
        assert isinstance(original_fingerprint, str)
        reloaded = await client.get(f"/api/episodes/{episode_id}")
        assert reloaded.json()["breakdown_fingerprint"] == original_fingerprint
        revised_cards = [card(index) for index in range(6)]
        revised_cards[0]["action"] = "Iris reprend le premier plan après rechargement."
        revision = {
            "candidate": {"shots": revised_cards},
            "enforce_format": True,
            "expected_breakdown_fingerprint": original_fingerprint,
            "mode": "manual",
        }
        saved_again = await client.post(
            f"/api/episodes/{episode_id}/breakdown/apply", json=revision
        )
        assert saved_again.status_code == 200
        assert saved_again.json()["shots"][0]["action"] == revised_cards[0]["action"]
        assert saved_again.json()["breakdown_fingerprint"] != original_fingerprint

        stale = await client.post(f"/api/episodes/{episode_id}/breakdown/apply", json=revision)
        assert stale.status_code == 409
        missing_token = await client.post(
            f"/api/episodes/{episode_id}/breakdown/apply",
            json={"candidate": {"shots": revised_cards}, "enforce_format": True},
        )
        assert missing_token.status_code == 409
        persisted = await client.get(f"/api/episodes/{episode_id}")
        assert persisted.json()["shots"][0]["action"] == revised_cards[0]["action"]


async def test_ai_task_identity_is_persisted_when_episode_candidate_is_applied(
    tmp_path: Path,
) -> None:
    settings = _settings(tmp_path)
    _seed_bible(settings.private_content_dir)
    app = create_app(settings)
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        created = await client.post(
            "/api/episodes",
            json={"title": "Le pacte d’Iris", "concept": "Iris négocie avec la serre."},
        )
        episode_id = created.json()["id"]
        applied = await client.post(
            f"/api/episodes/{episode_id}/draft/apply",
            json={
                "candidate": {
                    "title": "Le pacte d’Iris",
                    "logline": "Iris négocie avec la serre qui conserve chacun de ses silences.",
                    "story": {"hook": "La vitre répond."},
                    "narrative_source": (
                        "Iris pose sa main sur la vitre et attend que la serre formule son prix."
                    ),
                    "character_ids": ["iris"],
                    "location_ids": ["glass_room"],
                },
                "mode": "ai",
                "model": "tiny:latest",
                "task_id": "tentafruit.short-episode",
                "task_version": 1,
                "input_fingerprint": "b" * 64,
            },
        )

    assert applied.status_code == 200
    provenance = applied.json()["provenance"][-1]
    assert provenance["task_id"] == "tentafruit.short-episode"
    assert provenance["task_version"] == 1
    assert provenance["input_fingerprint"] == "b" * 64
