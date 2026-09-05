from __future__ import annotations

import json
from pathlib import Path
from types import SimpleNamespace

import httpx
import pytest

from apps.api import narrative_routes
from apps.api.main import create_app
from engine.config import Settings


class FakeNarrativeOllama:
    captured_messages: list[dict[str, str]] = []

    def __init__(self, *_args: object, **_kwargs: object) -> None:
        pass

    async def __aenter__(self) -> FakeNarrativeOllama:
        return self

    async def __aexit__(self, *_args: object) -> None:
        pass

    async def list_models(self) -> list[object]:
        return [SimpleNamespace(name="qwen3:4b", size=1, details={})]

    async def chat_structured(
        self,
        model: str,
        messages: list[dict[str, str]],
        schema: dict[str, object],
    ) -> str:
        assert model == "qwen3:4b"
        assert schema["title"] == "NarrativeFieldSuggestion"
        type(self).captured_messages = messages
        return json.dumps({"value": "Une serre violette referme ses ronces sur leur pacte."})


@pytest.mark.anyio
async def test_field_suggestion_uses_screen_bible_and_series_context(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    FakeNarrativeOllama.captured_messages = []
    monkeypatch.setattr(narrative_routes, "OllamaClient", FakeNarrativeOllama)
    settings = Settings(
        _env_file=None,
        output_dir=tmp_path / "output",
        private_content_dir=tmp_path / "work",
    )
    app = create_app(settings)
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/api/narrative/field/suggest",
            json={
                "field_key": "episode-story-conflict",
                "field_label": "Conflit",
                "current_value": "La graine refuse de s'ouvrir.",
                "context": "Aconit veut proteger Belladone.",
                "locale": "fr",
            },
        )

    assert response.status_code == 200
    assert response.json() == {
        "suggestion": "Une serre violette referme ses ronces sur leur pacte.",
        "model": "qwen3:4b",
        "provider": "ollama",
        "real_ai": True,
        "canonical": False,
    }
    prompt = FakeNarrativeOllama.captured_messages[1]["content"]
    assert "Aconit veut proteger Belladone" in prompt
    assert "Bible canonique" in prompt
    assert "État de la série" in prompt


@pytest.mark.anyio
async def test_narrative_status_does_not_present_code_models_as_writers(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    class CodeOnlyOllama(FakeNarrativeOllama):
        async def list_models(self) -> list[object]:
            return [SimpleNamespace(name="deepseek-coder:6.7b", size=1, details={})]

    monkeypatch.setattr(narrative_routes, "OllamaClient", CodeOnlyOllama)
    app = create_app(Settings(_env_file=None, output_dir=tmp_path))
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/api/narrative/status")

    assert response.json()["ollama_ready"] is True
    assert response.json()["ready"] is False
    assert response.json()["selected_model"] is None
    assert response.json()["reason"] == "narrative_model_missing"


def test_field_assistant_is_contextual_and_non_destructive_by_default() -> None:
    static = Path("apps/api/static")
    index = (static / "index.html").read_text(encoding="utf-8")
    script = (static / "field-assistant.js").read_text(encoding="utf-8")

    assert "/static/field-assistant.css" in index
    assert "/static/field-assistant.js" in index
    assert ".narrative-workflow-dialog label, #editorial-history-dialog label" in script
    assert 'request("/api/narrative/field/suggest"' in script
    assert "visibleContext(root, field)" in script
    assert "data-ai-before" in script
    assert "data-ai-after" in script
    assert "function applyCandidate()" in script
