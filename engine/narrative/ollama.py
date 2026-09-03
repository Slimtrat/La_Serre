from __future__ import annotations

from typing import Any

import httpx
from pydantic import BaseModel, ConfigDict, Field


class OllamaModel(BaseModel):
    model_config = ConfigDict(extra="allow", frozen=True)

    name: str = Field(min_length=1)
    size: int = Field(default=0, ge=0)
    details: dict[str, Any] = Field(default_factory=dict)


class OllamaClient:
    def __init__(
        self,
        base_url: str,
        *,
        timeout_seconds: float = 300,
        transport: httpx.AsyncBaseTransport | None = None,
    ) -> None:
        self._http = httpx.AsyncClient(
            base_url=base_url.rstrip("/"),
            timeout=timeout_seconds,
            transport=transport,
        )

    async def __aenter__(self) -> OllamaClient:
        return self

    async def __aexit__(self, *_: object) -> None:
        await self.aclose()

    async def aclose(self) -> None:
        await self._http.aclose()

    async def list_models(self) -> list[OllamaModel]:
        response = await self._http.get("/api/tags", timeout=10)
        response.raise_for_status()
        payload = response.json()
        raw_models = payload.get("models", []) if isinstance(payload, dict) else []
        models = [OllamaModel.model_validate(item) for item in raw_models]
        return sorted(models, key=lambda item: (item.size, item.name))

    async def chat_structured(
        self,
        model: str,
        messages: list[dict[str, str]],
        schema: dict[str, Any],
    ) -> str:
        response = await self._http.post(
            "/api/chat",
            json={
                "model": model,
                "messages": messages,
                "format": schema,
                "stream": False,
                "think": False,
                "options": {"temperature": 0.2},
            },
        )
        response.raise_for_status()
        payload = response.json()
        message = payload.get("message") if isinstance(payload, dict) else None
        content = message.get("content") if isinstance(message, dict) else None
        if not isinstance(content, str) or not content.strip():
            raise ValueError("Ollama a renvoyé une réponse vide")
        return content
