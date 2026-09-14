from __future__ import annotations

from pathlib import Path

import httpx
import pytest
from fastapi import FastAPI

from apps.api.season_routes import create_season_plan_router
from engine.narrative.season_plan import SeasonPlanRegistry
from engine.world.catalog import EpisodeCatalog


def _payload(revision: int, title: str = "Le premier épisode") -> dict[str, object]:
    return {
        "expected_revision": revision,
        "season": 1,
        "title": title,
        "logline": "Une rencontre bouleverse le jardin.",
        "synopsis": "Une rencontre inattendue bouleverse durablement tout le jardin.",
        "cliffhanger": "Une ombre apparaît.",
        "character_ids": [],
        "location_ids": [],
    }


@pytest.mark.asyncio
async def test_season_plan_api_supports_singleton_materialization_and_conflicts(
    tmp_path: Path,
) -> None:
    registry = SeasonPlanRegistry(tmp_path)
    catalog = EpisodeCatalog(tmp_path)
    app = FastAPI()
    app.include_router(create_season_plan_router(lambda: registry, lambda: catalog))

    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app), base_url="http://test"
    ) as client:
        empty = await client.get("/api/season-plan")
        assert empty.status_code == 200
        assert empty.json()["items"] == []

        created = await client.post("/api/season-plan/items", json=_payload(0))
        assert created.status_code == 200
        snapshot = created.json()
        assert len(snapshot["items"]) == 1
        item_id = snapshot["items"][0]["id"]
        assert snapshot["items"][0]["position"] == 1

        conflict = await client.post("/api/season-plan/items", json=_payload(0, "Conflit"))
        assert conflict.status_code == 409
        assert conflict.json()["detail"]["code"] == "season_plan_revision_conflict"

        validated = await client.put(
            f"/api/season-plan/items/{item_id}",
            json={"expected_revision": snapshot["revision"], "lifecycle": "validated"},
        )
        assert validated.status_code == 200

        materialized = await client.post(
            f"/api/season-plan/items/{item_id}/materialize",
            json={"expected_revision": validated.json()["revision"], "duration_target": 45},
        )
        assert materialized.status_code == 200
        item = materialized.json()["items"][0]
        assert item["episode_id"] == "S01E001"
        assert item["production_state"] == "materialized"
        assert catalog.get("S01E001").season_plan_item_id == item_id


@pytest.mark.asyncio
async def test_season_plan_api_reorders_and_soft_deletes_without_renaming_episodes(
    tmp_path: Path,
) -> None:
    registry = SeasonPlanRegistry(tmp_path)
    catalog = EpisodeCatalog(tmp_path)
    app = FastAPI()
    app.include_router(create_season_plan_router(lambda: registry, lambda: catalog))

    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app), base_url="http://test"
    ) as client:
        first = (await client.post("/api/season-plan/items", json=_payload(0))).json()
        second = (
            await client.post(
                "/api/season-plan/items",
                json=_payload(first["revision"], "Le deuxième épisode"),
            )
        ).json()
        first_id, second_id = [item["id"] for item in second["items"]]
        validated = (
            await client.put(
                f"/api/season-plan/items/{first_id}",
                json={"expected_revision": second["revision"], "lifecycle": "validated"},
            )
        ).json()
        linked = (
            await client.post(
                f"/api/season-plan/items/{first_id}/materialize",
                json={"expected_revision": validated["revision"]},
            )
        ).json()
        episode_path = catalog.episode_dir("S01E001")

        reordered = await client.put(
            "/api/season-plan/order",
            json={
                "expected_revision": linked["revision"],
                "item_ids": [second_id, first_id],
            },
        )
        assert reordered.status_code == 200
        active = sorted(
            (item for item in reordered.json()["items"] if item["position"]),
            key=lambda item: item["position"],
        )
        assert [item["id"] for item in active] == [second_id, first_id]
        assert episode_path.is_dir()
        assert catalog.get("S01E001").season_plan_item_id == first_id

        removed = await client.delete(
            f"/api/season-plan/items/{second_id}",
            params={"expected_revision": reordered.json()["revision"]},
        )
        assert removed.status_code == 200
        deleted = next(item for item in removed.json()["items"] if item["id"] == second_id)
        assert deleted["lifecycle"] == "obsolete"
        assert deleted["position"] is None
