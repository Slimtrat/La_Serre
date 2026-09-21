"""Public-contract tests for the independent guided-story examples (#76)."""

from __future__ import annotations

import json
from pathlib import Path

import httpx
import pytest

from apps.api.main import create_app
from engine.config import Settings
from engine.narrative.guided_authoring import (
    GuidedAuthoringState,
    GuidedProjectBrief,
    guided_completion,
)


def _settings(tmp_path: Path) -> Settings:
    return Settings(
        _env_file=None,
        private_content_dir=tmp_path / "private",
        output_dir=tmp_path / "output",
    )


def _examples(payload: object) -> list[dict[str, object]]:
    # Accept either a bare collection or an API envelope; the example fields
    # themselves are the public contract used by the guided editor.
    if isinstance(payload, dict):
        payload = payload["examples"]
    assert isinstance(payload, list)
    assert all(isinstance(item, dict) for item in payload)
    return payload


@pytest.mark.anyio
async def test_guided_examples_are_two_complete_isolated_briefs(tmp_path: Path) -> None:
    transport = httpx.ASGITransport(app=create_app(_settings(tmp_path)))
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        result = await client.get("/api/guided/examples")

    assert result.status_code == 200
    examples = _examples(result.json())
    assert len(examples) == 2
    assert len({item["id"] for item in examples}) == 2
    assert {item["language"] for item in examples} == {"de", "fr"}
    for item in examples:
        assert item["name"]
        assert item["description"]
        brief = GuidedProjectBrief.model_validate(item["brief"])
        assert brief.language == item["language"]
        assert guided_completion(GuidedAuthoringState(brief=brief))["brief"]["ready"]

    german = next(item for item in examples if item["language"] == "de")
    french = next(item for item in examples if item["language"] == "fr")
    german_text = json.dumps(german, ensure_ascii=False).casefold()
    french_text = json.dumps(french, ensure_ascii=False).casefold()
    assert "fritz" in german_text and "pizza" in german_text
    assert "hiva" in french_text
    assert any(bird in french_text for bird in ("corbeau", "corneille", "corvidé"))
    assert "hiva" not in german_text
    assert "fritz" not in french_text
    for unrelated in ("tentafruit", "seigneur des anneaux"):
        assert unrelated not in german_text
        assert unrelated not in french_text


@pytest.mark.anyio
async def test_each_example_starts_a_separate_project_without_cross_contamination(
    tmp_path: Path,
) -> None:
    transport = httpx.ASGITransport(app=create_app(_settings(tmp_path)))
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        original = _examples((await client.get("/api/guided/examples")).json())
        german = next(item for item in original if item["language"] == "de")
        french = next(item for item in original if item["language"] == "fr")

        first_project = await client.post(
            "/api/projects",
            json={"name": "Fritz", "template_id": "custom", "clone_content": False},
        )
        assert first_project.status_code == 201
        first_id = first_project.json()["active_id"]
        saved_german = await client.put(
            "/api/guided/brief",
            json={"expected_revision": 0, "brief": german["brief"]},
        )
        assert saved_german.status_code == 200
        first_state = saved_german.json()
        assert first_state["completion"]["brief"]["ready"] is True
        assert first_state["state"]["brief"] == german["brief"]

        second_project = await client.post(
            "/api/projects",
            json={"name": "Hiva", "template_id": "custom", "clone_content": False},
        )
        assert second_project.status_code == 201
        second_id = second_project.json()["active_id"]
        assert first_id != second_id
        fresh = (await client.get("/api/guided")).json()["state"]
        assert fresh["revision"] == 0
        assert fresh["characters"] == []
        assert fresh["active_episode_id"] is None

        saved_french = await client.put(
            "/api/guided/brief",
            json={"expected_revision": 0, "brief": french["brief"]},
        )
        assert saved_french.status_code == 200
        second_state = saved_french.json()
        assert second_state["completion"]["brief"]["ready"] is True
        assert second_state["state"]["brief"] == french["brief"]

        reloaded = (await client.get("/api/guided")).json()
        unchanged_examples = _examples((await client.get("/api/guided/examples")).json())
        reactivated = await client.post(f"/api/projects/{first_id}/activate")
        assert reactivated.status_code == 200
        first_reloaded = (await client.get("/api/guided")).json()

    assert reloaded["state"]["brief"] == french["brief"]
    assert first_reloaded["state"]["brief"] == german["brief"]
    assert unchanged_examples == original
    assert "fritz" not in json.dumps(reloaded["state"]["brief"], ensure_ascii=False).casefold()
