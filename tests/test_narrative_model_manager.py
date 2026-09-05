from __future__ import annotations

from pathlib import Path
from types import SimpleNamespace

import httpx
import pytest

from apps.api import narrative_routes
from apps.api.main import create_app
from engine.config import Settings


class InstallableOllama:
    installed = False
    pulled: list[str] = []

    def __init__(self, *_args: object, **_kwargs: object) -> None:
        pass

    async def __aenter__(self) -> InstallableOllama:
        return self

    async def __aexit__(self, *_args: object) -> None:
        pass

    async def list_models(self) -> list[object]:
        if not type(self).installed:
            return [SimpleNamespace(name="deepseek-coder:6.7b", size=12, details={})]
        return [
            SimpleNamespace(
                name="qwen3:4b",
                size=2_500_000_000,
                details={"parameter_size": "4B", "quantization_level": "Q4_K_M"},
            )
        ]

    async def pull_model(self, model: str) -> None:
        type(self).pulled.append(model)
        type(self).installed = True


@pytest.mark.anyio
async def test_narrative_model_manager_can_install_recommended_model(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    InstallableOllama.installed = False
    InstallableOllama.pulled = []
    monkeypatch.setattr(narrative_routes, "OllamaClient", InstallableOllama)
    app = create_app(Settings(_env_file=None, output_dir=tmp_path))
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        before = await client.get("/api/narrative/status")
        installed = await client.post("/api/narrative/models/recommended/install")

    assert before.status_code == 200
    assert before.json()["recommended_model"] == "qwen3:4b"
    assert before.json()["reason"] == "narrative_model_missing"
    assert installed.status_code == 200
    assert installed.json()["ready"] is True
    assert installed.json()["selected_model"] == "qwen3:4b"
    assert InstallableOllama.pulled == ["qwen3:4b"]


def test_settings_use_actionable_model_manager_drawers() -> None:
    static = Path("apps/api/static")
    index = (static / "index.html").read_text(encoding="utf-8")
    manager = (static / "model-manager.js").read_text(encoding="utf-8")
    narrative = (static / "narrative-workflow.js").read_text(encoding="utf-8")

    for drawer_id in (
        "settings-drawer-runtimes",
        "settings-drawer-narrative-models",
        "settings-drawer-visual-models",
        "settings-drawer-workflows",
        "settings-drawer-storage",
        "settings-drawer-desktop",
    ):
        assert f'id="{drawer_id}"' in index
    assert 'href="/static/settings-drawers.css"' in index
    assert 'src="/static/settings-drawers.js"' in index
    assert 'src="/static/model-manager.js"' in index
    assert 'request("/api/narrative/status")' in manager
    assert 'request("/api/narrative/models/recommended/install"' in manager
    assert 'window.SerreWorkspace?.show("settings")' in manager
    assert 'openDrawer("settings-drawer-narrative-models"' in manager
    assert 'id="narrative-model-manage"' in narrative
    assert 'new CustomEvent("studio:model-manager-open"' in narrative
