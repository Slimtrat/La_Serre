from __future__ import annotations

from fastapi import FastAPI

from engine.config import Settings
from engine.generation.comfy.client import ComfyClient


def create_app(settings: Settings | None = None) -> FastAPI:
    resolved = settings or Settings()
    app = FastAPI(title="La Serre des Venins", version="0.1.0")

    @app.get("/health")
    async def health() -> dict[str, str]:
        return {"status": "ok"}

    @app.get("/ready")
    async def ready() -> dict[str, object]:
        configured = resolved.profiles_configured
        comfyui = False
        if configured:
            async with ComfyClient(
                str(resolved.comfyui_url),
                request_timeout_seconds=min(resolved.comfyui_timeout_seconds, 10),
                poll_interval_seconds=resolved.comfyui_poll_interval_seconds,
            ) as client:
                comfyui = await client.is_ready()
        return {
            "status": "ready" if configured and comfyui else "not_ready",
            "profiles_configured": configured,
            "comfyui": comfyui,
        }

    return app


app = create_app()
