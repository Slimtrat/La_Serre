from __future__ import annotations

from pathlib import Path

import httpx
import pytest
from fastapi import FastAPI

from apps.api.continuity_routes import create_continuity_router
from engine.narrative.episode_models import EpisodeStatus, NarrativeProvenance
from engine.narrative.season_plan import SeasonPlanLifecycle, SeasonPlanRegistry
from engine.narrative.series_state import (
    DeltaEvidence,
    EpisodeStateDelta,
    SeriesStateRegistry,
    StateMutation,
)
from engine.narrative.workflow_models import ProposedEpisode
from engine.world.catalog import EpisodeCatalog


def _episode(title: str, number: int) -> ProposedEpisode:
    return ProposedEpisode(
        season=1,
        episode=number,
        title=title,
        logline="Belladone et Aconit déplacent leur confrontation.",
        synopsis="Le secret change de propriétaire pendant une confrontation déplacée.",
        character_ids=[],
        location_ids=[],
    )


def _app(tmp_path: Path, *, generator=None) -> tuple[FastAPI, SeasonPlanRegistry]:
    plan_store = SeasonPlanRegistry(tmp_path)
    catalog = EpisodeCatalog(tmp_path)
    plan = plan_store.load()
    for number, title in ((1, "La jalousie"), (2, "La révélation")):
        plan = plan_store.create(
            _episode(title, number),
            NarrativeProvenance(stage="episode", mode="manual"),
            expected_revision=plan.revision,
        )
        item = plan.active_items[-1]
        plan = plan_store.update(
            item.id,
            {"lifecycle": SeasonPlanLifecycle.VALIDATED},
            expected_revision=plan.revision,
        )
        plan = plan_store.materialize(item.id, catalog, expected_revision=plan.revision)
        episode = catalog.get(plan.active_items[-1].episode_id or "")
        catalog.save(episode.model_copy(update={"status": EpisodeStatus.APPROVED}))
    app = FastAPI()
    state_store = SeriesStateRegistry(tmp_path)
    app.include_router(
        create_continuity_router(
            lambda: state_store,
            lambda: plan_store,
            lambda: catalog,
            generator,
        )
    )
    return app, plan_store


def _delta() -> dict[str, object]:
    return EpisodeStateDelta(
        secrets_revealed=[
            StateMutation(
                key="secret-aconit",
                value="Belladone connaît le secret d’Aconit.",
                evidence_ids=["evidence-reveal"],
            )
        ],
        evidence=[
            DeltaEvidence(
                id="evidence-reveal",
                source="manual",
                reference="confrontation",
                excerpt="Aconit avoue tout.",
            )
        ],
    ).model_dump(mode="json")


@pytest.mark.asyncio
async def test_delta_proposal_requires_an_explicitly_approved_episode(
    tmp_path: Path,
) -> None:
    app, _plan = _app(tmp_path)
    catalog = EpisodeCatalog(tmp_path)
    episode = catalog.get("S01E001")
    catalog.save(episode.model_copy(update={"status": EpisodeStatus.REVIEW}))

    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app), base_url="http://test"
    ) as client:
        response = await client.post(
            "/api/continuity/episodes/S01E001/proposal/manual",
            json={"expected_revision": 0, "delta": _delta()},
        )

    assert response.status_code == 409
    assert response.json()["detail"]["code"] == "episode_not_approved"
    assert SeriesStateRegistry(tmp_path).load().proposals == []


@pytest.mark.asyncio
async def test_manual_proposal_refusal_and_approval_are_separate_and_revisioned(
    tmp_path: Path,
) -> None:
    app, _plan = _app(tmp_path)
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app), base_url="http://test"
    ) as client:
        initial = await client.get("/api/continuity/episodes/S01E001")
        assert initial.status_code == 200
        proposed = await client.post(
            "/api/continuity/episodes/S01E001/proposal/manual",
            json={
                "expected_revision": 0,
                "delta": _delta(),
                "source_payload": {"review_note": "Saisie manuelle"},
            },
        )
        assert proposed.status_code == 200
        payload = proposed.json()
        assert payload["input_state"]["entries"] == []
        assert payload["proposal"]["stale"] is False
        assert payload["proposal"]["changes"][0]["category"] == "secret"
        assert payload["proposal"]["changes"][0]["evidence"][0]["source_id"] == ("evidence-reveal")

        refused = await client.post(
            f"/api/continuity/episodes/S01E001/proposals/{payload['proposal']['id']}/refuse",
            json={"expected_revision": payload["revision"], "reason": "Preuve ambiguë"},
        )
        assert refused.status_code == 200
        next_before = (await client.get("/api/continuity/episodes/S01E002")).json()
        assert next_before["input_state"]["entries"] == []

        reproposed = (
            await client.post(
                "/api/continuity/episodes/S01E001/proposal/manual",
                json={"expected_revision": refused.json()["revision"], "delta": _delta()},
            )
        ).json()
        proposal = reproposed["proposal"]
        stale_revision = await client.post(
            f"/api/continuity/episodes/S01E001/proposals/{proposal['id']}/approve",
            json={
                "expected_revision": 0,
                "expected_source_fingerprint": proposal["current_source_fingerprint"],
            },
        )
        assert stale_revision.status_code == 409
        assert stale_revision.json()["detail"]["code"] == "series_state_revision_conflict"

        approved = await client.post(
            f"/api/continuity/episodes/S01E001/proposals/{proposal['id']}/approve",
            json={
                "expected_revision": reproposed["revision"],
                "expected_source_fingerprint": proposal["current_source_fingerprint"],
            },
        )
        assert approved.status_code == 200
        assert approved.json()["impact_report"]["affected_items"][0]["episode_id"] == ("S01E002")
        next_after = (await client.get("/api/continuity/episodes/S01E002")).json()
        assert next_after["input_state"]["entries"][0]["value"] == (
            "Belladone connaît le secret d’Aconit."
        )
        repeated_reveal = await client.post(
            "/api/continuity/episodes/S01E002/proposal/manual",
            json={
                "expected_revision": approved.json()["revision"],
                "delta": _delta(),
            },
        )
        assert repeated_reveal.status_code == 200
        finding = repeated_reveal.json()["proposal"]["findings"][0]
        assert finding["code"] == "secret_already_revealed"
        assert finding["severity"] == "warning"
        assert finding["cause_ids"]


@pytest.mark.asyncio
async def test_injected_generator_stale_source_and_reorder_preview(tmp_path: Path) -> None:
    async def fake_generator(_episode, _state):
        return EpisodeStateDelta.model_validate(_delta())

    app, plan_store = _app(tmp_path, generator=fake_generator)
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app), base_url="http://test"
    ) as client:
        generated = await client.post("/api/continuity/episodes/S01E001/proposal/generate")
        proposal = generated.json()["proposal"]
        stale = await client.post(
            f"/api/continuity/episodes/S01E001/proposals/{proposal['id']}/approve",
            json={"expected_revision": 1, "expected_source_fingerprint": "0" * 64},
        )
        assert stale.status_code == 409
        assert stale.json()["detail"]["code"] == "continuity_proposal_stale"

        await client.post(
            f"/api/continuity/episodes/S01E001/proposals/{proposal['id']}/approve",
            json={
                "expected_revision": 1,
                "expected_source_fingerprint": proposal["current_source_fingerprint"],
            },
        )
        plan = plan_store.load()
        ids = [item.id for item in plan.active_items]
        report = await client.post(
            "/api/continuity/impact/reorder",
            json={
                "expected_plan_revision": plan.revision,
                "item_ids": list(reversed(ids)),
            },
        )
        assert report.status_code == 200
        assert report.json()["trigger"] == "reorder"
        assert report.json()["regeneration_scheduled"] is False
        assert {item["episode_id"] for item in report.json()["affected_items"]} == {"S01E002"}
