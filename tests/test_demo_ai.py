from __future__ import annotations

import json
from pathlib import Path
from types import SimpleNamespace

import httpx
import pytest

from apps.api import demo_routes
from apps.api.main import create_app
from engine.config import Settings


class FakeOllamaClient:
    pulled: list[str] = []

    def __init__(self, *_args: object, **_kwargs: object) -> None:
        pass

    async def __aenter__(self) -> FakeOllamaClient:
        return self

    async def __aexit__(self, *_args: object) -> None:
        pass

    async def list_models(self) -> list[object]:
        return [SimpleNamespace(name="tiny-local", size=42)]

    async def pull_model(self, model: str) -> None:
        self.pulled.append(model)

    async def chat_structured(
        self,
        _model: str,
        _messages: list[dict[str, str]],
        schema: dict[str, object],
    ) -> str:
        if schema.get("title") == "DemoStoryProposal":
            return json.dumps(
                {
                    "story": (
                        "Belladone dérobe la graine; Aconit sourit car elle l’avait laissée faire."
                    )
                }
            )
        return json.dumps(
            {
                "beats": [
                    {
                        "title": "Le vol",
                        "action": "Belladone saisit la graine noire sous la lune.",
                        "dialogue": "Elle est à moi.",
                        "duration": 1.6,
                    },
                    {
                        "title": "Le piège",
                        "action": "Aconit ferme doucement la porte derrière elle.",
                        "dialogue": "Je comptais dessus.",
                        "duration": 1.7,
                    },
                    {
                        "title": "Le lien",
                        "action": "La graine noue leurs ombres dans une même ronce.",
                        "dialogue": "Alors reste.",
                        "duration": 1.7,
                    },
                ],
            }
        )


@pytest.mark.anyio
async def test_demo_uses_real_ollama_for_story_and_plan(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(demo_routes, "OllamaClient", FakeOllamaClient)
    app = create_app(Settings(_env_file=None, output_dir=tmp_path))
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        capabilities = await client.get("/api/demo/capabilities")
        story = await client.post(
            "/api/demo/story/imagine",
            json={"locale": "fr", "engine": "ai", "instruction": "Une graine empoisonnée"},
        )
        await client.post("/api/demo/story/approve", json={"locale": "fr", "feedback": ""})
        plan = await client.post(
            "/api/demo/plan/imagine",
            json={"locale": "fr", "engine": "ai", "instruction": ""},
        )

    assert capabilities.json()["ollama"]["selected_model"] == "tiny-local"
    story_stage = story.json()["stages"][0]
    plan_stage = plan.json()["stages"][1]
    assert story_stage["provenance"]["real_ai"] is True
    assert story_stage["provenance"]["model"] == "tiny-local"
    assert len(plan_stage["content"]) == 3
    assert plan_stage["provenance"]["provider"] == "ollama"


@pytest.mark.anyio
async def test_demo_rejects_code_only_models_and_can_install_recommendation(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    class CoderOnlyClient(FakeOllamaClient):
        async def list_models(self) -> list[object]:
            return [SimpleNamespace(name="deepseek-coder:6.7b", size=42)]

    CoderOnlyClient.pulled = []
    monkeypatch.setattr(demo_routes, "OllamaClient", CoderOnlyClient)
    app = create_app(Settings(_env_file=None, output_dir=tmp_path))
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        capabilities = await client.get("/api/demo/capabilities")
        installed = await client.post("/api/demo/recommended-model/install")

    ollama = capabilities.json()["ollama"]
    assert ollama["ready"] is False
    assert ollama["reason"] == "narrative_model_missing"
    assert ollama["recommended_model"] == "qwen3:4b"
    assert installed.status_code == 200
    assert CoderOnlyClient.pulled == ["qwen3:4b"]
