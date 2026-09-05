from __future__ import annotations

import json

import httpx
import pytest

from engine.narrative.ollama import OllamaClient


@pytest.mark.anyio
async def test_pull_model_uses_the_local_ollama_install_endpoint() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        assert request.url.path == "/api/pull"
        assert json.loads(request.content) == {"model": "qwen3:4b", "stream": False}
        return httpx.Response(200, json={"status": "success"})

    async with OllamaClient(
        "http://ollama.test",
        transport=httpx.MockTransport(handler),
    ) as client:
        await client.pull_model("qwen3:4b")
