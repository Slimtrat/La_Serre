from __future__ import annotations

import json
from pathlib import Path
from typing import cast

import httpx
import pytest
from fastapi import FastAPI

from apps.api.season_routes import create_season_plan_router
from engine.narrative.season_plan import SeasonPlanRegistry
from engine.narrative.tasks.models import CompiledTask, TaskExecution
from engine.narrative.tasks.tentafruit_series_plan import (
    SeriesPlanBudget,
    TentafruitSeriesPlan,
    build_fake_series_plan,
)
from engine.world.bible import BibleRegistry
from engine.world.catalog import EpisodeCatalog
from engine.world.models import ProjectBible

FIXTURE = Path(__file__).parent / "fixtures" / "tentafruit-season-six-episodes.json"


def _fixture_bible() -> ProjectBible:
    fixture = cast(
        dict[str, object], json.loads(FIXTURE.read_text(encoding="utf-8"))
    )
    return ProjectBible.model_validate(fixture["bible"])


def _app(tmp_path: Path) -> tuple[FastAPI, SeasonPlanRegistry, BibleRegistry]:
    plan_registry = SeasonPlanRegistry(tmp_path)
    bible_registry = BibleRegistry(tmp_path)
    bible_registry.replace(_fixture_bible())

    async def generate(
        compiled: CompiledTask, model: str
    ) -> TaskExecution[TentafruitSeriesPlan]:
        result = build_fake_series_plan(
            bible_registry.load(),
            SeriesPlanBudget(episode_count=6),
        )
        return TaskExecution(
            task_id=compiled.task_id,
            task_version=compiled.task_version,
            model=model,
            input_fingerprint=compiled.input_fingerprint,
            result=result,
            allows_mutation=compiled.allows_mutation,
        )

    app = FastAPI()
    app.include_router(
        create_season_plan_router(
            lambda: plan_registry,
            lambda: EpisodeCatalog(tmp_path),
            format_profile_provider=lambda: {
                "output": {"duration_seconds_min": 30, "duration_seconds_max": 60}
            },
            series_plan_generator=generate,
        )
    )
    return app, plan_registry, bible_registry


@pytest.mark.asyncio
async def test_proposal_api_generate_edit_and_accept_preserves_human_changes(
    tmp_path: Path,
) -> None:
    app, plan_registry, _ = _app(tmp_path)
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app), base_url="http://test"
    ) as client:
        missing = await client.get("/api/season-plan/proposal")
        assert missing.status_code == 404

        generated = await client.post(
            "/api/season-plan/proposal/generate",
            json={
                "episode_count": 6,
                "model": "fake:tentafruit-season-v1",
                "custom_prompt": "Six bascules distinctes.",
            },
        )
        assert generated.status_code == 200
        proposal = generated.json()
        assert proposal["id"] == "current"
        assert proposal["revision"] == 1
        assert proposal["base_plan_revision"] == 0
        assert proposal["stale"] is False
        assert proposal["validation"] == {"valid": True, "issues": []}
        assert len(proposal["items"]) == 6
        assert proposal["provenance"]["task_id"] == "tentafruit.season-plan"
        assert proposal["provenance"]["task_version"] == 2
        assert proposal["provenance"]["model"] == "fake:tentafruit-season-v1"
        assert plan_registry.load().items == []

        reread = await client.get("/api/season-plan/proposal")
        assert reread.status_code == 200
        assert reread.json()["items"] == proposal["items"]

        edited_items = proposal["items"]
        edited_items[0]["title"] = "Titre choisi par l'autrice"
        edited_items[0]["manually_edited_fields"] = ["title"]
        edited = await client.put(
            "/api/season-plan/proposal",
            json={"expected_revision": proposal["revision"], "items": edited_items},
        )
        assert edited.status_code == 200
        assert edited.json()["revision"] == 2
        assert edited.json()["items"][0]["title"] == "Titre choisi par l'autrice"
        assert plan_registry.load().items == []

        accepted = await client.post(
            "/api/season-plan/proposal/accept",
            json={"expected_revision": 2, "expected_plan_revision": 0},
        )
        assert accepted.status_code == 200
        season_plan = accepted.json()
        assert season_plan["revision"] == 1
        assert len(season_plan["items"]) == 6
        assert season_plan["items"][0]["title"] == "Titre choisi par l'autrice"
        assert all(item["lifecycle"] == "draft" for item in season_plan["items"])

        cleared = await client.get("/api/season-plan/proposal")
        assert cleared.status_code == 404


@pytest.mark.asyncio
async def test_proposal_api_reports_proposal_and_plan_revision_conflicts(
    tmp_path: Path,
) -> None:
    app, _, _ = _app(tmp_path)
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app), base_url="http://test"
    ) as client:
        proposal = (
            await client.post(
                "/api/season-plan/proposal/generate", json={"episode_count": 6}
            )
        ).json()

        stale_edit = await client.put(
            "/api/season-plan/proposal",
            json={"expected_revision": 0, "items": proposal["items"]},
        )
        assert stale_edit.status_code == 409
        assert stale_edit.json()["detail"] == {
            "code": "proposal_revision_conflict",
            "expected_revision": 0,
            "current_revision": 1,
        }

        plan_conflict = await client.post(
            "/api/season-plan/proposal/accept",
            json={"expected_revision": 1, "expected_plan_revision": 7},
        )
        assert plan_conflict.status_code == 409
        assert plan_conflict.json()["detail"]["code"] == "season_plan_revision_conflict"


@pytest.mark.asyncio
async def test_proposal_api_blocks_stale_bible_and_unknown_ids_before_acceptance(
    tmp_path: Path,
) -> None:
    app, plan_registry, bible_registry = _app(tmp_path)
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app), base_url="http://test"
    ) as client:
        first = (
            await client.post(
                "/api/season-plan/proposal/generate", json={"episode_count": 6}
            )
        ).json()
        current_bible = bible_registry.load()
        changed_relationship = current_bible.relationships[0].model_copy(
            update={"trust": current_bible.relationships[0].trust + 1}
        )
        changed_bible = current_bible.model_copy(
            update={
                "relationships": [changed_relationship, *current_bible.relationships[1:]]
            }
        )
        bible_registry.replace(changed_bible)

        stale = await client.post(
            "/api/season-plan/proposal/accept",
            json={"expected_revision": first["revision"], "expected_plan_revision": 0},
        )
        assert stale.status_code == 409
        assert stale.json()["detail"]["code"] == "season_proposal_stale"
        assert plan_registry.load().items == []

    second_app, second_plan_registry, _ = _app(tmp_path / "unknown-id")
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=second_app), base_url="http://test"
    ) as client:
        second = (
            await client.post(
                "/api/season-plan/proposal/generate", json={"episode_count": 6}
            )
        ).json()
        second["items"][0]["character_ids"] = ["personnage-inconnu"]
        updated = await client.put(
            "/api/season-plan/proposal",
            json={"expected_revision": second["revision"], "items": second["items"]},
        )
        assert updated.status_code == 200
        assert updated.json()["validation"]["valid"] is False
        assert updated.json()["validation"]["issues"][0]["code"] == "unknown_bible_id"

        rejected = await client.post(
            "/api/season-plan/proposal/accept",
            json={"expected_revision": 2, "expected_plan_revision": 0},
        )
        assert rejected.status_code == 422
        assert rejected.json()["detail"]["code"] == "season_proposal_invalid"
        assert second_plan_registry.load().items == []
