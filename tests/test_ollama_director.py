from __future__ import annotations

import json
from pathlib import Path
from typing import cast

import httpx

from engine.narrative.draft_models import CreativeShotDraft
from engine.narrative.ollama import OllamaClient
from engine.narrative.shot_director import OllamaShotDirector


def valid_draft() -> dict[str, object]:
    value = json.loads(Path("examples/shot.json").read_text(encoding="utf-8"))
    value.pop("id")
    value.pop("duration")
    value.pop("render")
    for character in value["characters"]:
        character.pop("id")
        character.pop("reference_images")
    return cast(dict[str, object], value)


async def test_ollama_client_lists_smallest_model_first() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        assert request.url.path == "/api/tags"
        return httpx.Response(
            200,
            json={
                "models": [
                    {"name": "large:latest", "size": 20},
                    {"name": "small:latest", "size": 10},
                ]
            },
        )

    async with OllamaClient(
        "http://ollama.test",
        transport=httpx.MockTransport(handler),
    ) as client:
        models = await client.list_models()

    assert [model.name for model in models] == ["small:latest", "large:latest"]


async def test_director_retries_until_shot_is_valid() -> None:
    responses = iter(('{"location":"invalid"}', json.dumps(valid_draft())))

    def handler(request: httpx.Request) -> httpx.Response:
        assert request.url.path == "/api/chat"
        payload = json.loads(request.content)
        assert payload["stream"] is False
        assert isinstance(payload["format"], dict)
        return httpx.Response(
            200,
            json={"message": {"role": "assistant", "content": next(responses)}},
        )

    async with OllamaClient(
        "http://ollama.test",
        transport=httpx.MockTransport(handler),
    ) as client:
        result = await OllamaShotDirector(client).draft(
            "Belladone découvre une bague dans la serre et hésite à la toucher.",
            shot_id="S01E001-S02",
            duration=3.0,
            model="small:latest",
        )

    assert result.shot.id == "S01E001-S02"
    assert result.attempts == 2
    assert result.model == "small:latest"


def test_unquoted_source_discards_invented_dialogue() -> None:
    value = valid_draft()
    value["dialogue"] = {
        "speaker_name": "Belladone",
        "text": "Une phrase inventée",
    }
    draft = CreativeShotDraft.model_validate(value)

    shot = draft.to_shot(
        shot_id="S01E001-S03",
        duration=4,
        source_text="Belladone découvre silencieusement la boîte.",
    )

    assert shot.dialogue is None
