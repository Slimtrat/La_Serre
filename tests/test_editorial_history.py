from __future__ import annotations

import json
import shutil
from pathlib import Path

import httpx
import pytest

from apps.api.editorial_history import EditorialHistory
from apps.api.editorial_routes import _explain_comparison
from apps.api.main import create_app
from engine.config import Settings


def seed_project(tmp_path: Path) -> tuple[Path, Path]:
    private = tmp_path / "private"
    output = tmp_path / "output"
    shutil.copytree(Path("starter_catalog"), private)
    return private, output


def read_json(path: Path) -> dict[str, object]:
    payload = json.loads(path.read_text(encoding="utf-8"))
    assert isinstance(payload, dict)
    return payload


def write_media(output: Path) -> None:
    shot = output / "S01E001-S01"
    shot.mkdir(parents=True)
    (shot / "keyframe.png").write_bytes(b"canonical-frame")
    (shot / "generation.json").write_text(
        json.dumps(
            {
                "id": "gen-canon",
                "status": "GENERATED",
                "seed": 917,
                "created_at": "2026-09-05T09:00:00+00:00",
            }
        ),
        encoding="utf-8",
    )
    master = output / "S01E001"
    master.mkdir()
    (master / "episode.mp4").write_bytes(b"canonical-master")
    (master / "episode-generation.json").write_text(
        '{"id":"master-canon"}', encoding="utf-8"
    )


def test_shot_versions_compare_and_restore_their_media_chain(tmp_path: Path) -> None:
    private, output = seed_project(tmp_path)
    write_media(output)
    history = EditorialHistory(private, output)
    shot_path = (
        private
        / "episodes/season-01/S01E001/shots/S01E001-S01.json"
    )
    original = read_json(shot_path)
    changed = {**original, "action": "Belladone brise le sceau avec un sourire."}

    created = history.create(
        "S01E001",
        scope="shot",
        kind="version",
        name="Sceau brisé",
        shot_id="S01E001-S01",
        shot=changed,
        shot_source="Belladone choisit volontairement de briser le sceau.",
        provenance={
            "provider": "ollama",
            "model": "mistral-nemo",
            "prompt": "Rendre son choix plus dangereux",
            "seed": 73,
        },
    )

    assert read_json(shot_path)["action"] == changed["action"]
    assert not (output / "S01E001-S01/keyframe.png").exists()
    assert not (output / "S01E001/episode.mp4").exists()
    archived_id = str(created["archived_id"])
    listing = history.listing("S01E001", "shot", "S01E001-S01")
    assert listing["current"]["name"] == "Sceau brisé"  # type: ignore[index]
    archived = listing["versions"][0]  # type: ignore[index]
    assert archived["dependency_count"] == 2
    assert archived["provenance"]["provider"] == "canonical"

    comparison = history.compare(
        "S01E001", "shot", archived_id, "current", "S01E001-S01"
    )
    fields = {item["field"] for item in comparison["changes"]}  # type: ignore[index]
    assert {"Action", "Texte du plan"} <= fields

    restored = history.promote(
        "S01E001", archived_id, "shot", "S01E001-S01"
    )
    assert read_json(shot_path)["action"] == original["action"]
    assert (output / "S01E001-S01/keyframe.png").read_bytes() == b"canonical-frame"
    assert (output / "S01E001/episode.mp4").read_bytes() == b"canonical-master"
    assert restored["restored_shots"] == ["S01E001-S01"]
    assert restored["restored_episode_master"] is True


def test_named_variant_is_non_destructive_until_promoted(tmp_path: Path) -> None:
    private, output = seed_project(tmp_path)
    write_media(output)
    history = EditorialHistory(private, output)
    shot_path = (
        private
        / "episodes/season-01/S01E001/shots/S01E001-S01.json"
    )
    original = read_json(shot_path)
    alternative = {**original, "action": "Belladone retient la graine, soudain méfiante."}

    result = history.create(
        "S01E001",
        scope="shot",
        kind="variant",
        name="Méfiance",
        shot_id="S01E001-S01",
        shot=alternative,
        shot_source="Elle refuse le pacte pour gagner du temps.",
        provenance={"provider": "manual"},
    )
    variant_id = str(result["created"]["id"])  # type: ignore[index]

    assert result["canonical_changed"] is False
    assert read_json(shot_path)["action"] == original["action"]
    assert (output / "S01E001-S01/keyframe.png").is_file()

    history.promote("S01E001", variant_id, "shot", "S01E001-S01")

    assert read_json(shot_path)["action"] == alternative["action"]
    assert not (output / "S01E001-S01/keyframe.png").exists()
    versions = history.listing("S01E001", "shot", "S01E001-S01")["versions"]
    assert {item["kind"] for item in versions} == {"variant", "version"}  # type: ignore[index]


def test_episode_version_comparison_uses_readable_story_labels(tmp_path: Path) -> None:
    private, output = seed_project(tmp_path)
    history = EditorialHistory(private, output)
    episode_path = private / "episodes/season-01/S01E001/episode.json"
    episode = read_json(episode_path)
    shots = [
        read_json(
            private / f"episodes/season-01/S01E001/shots/{shot_id}.json"
        )
        for shot_id in episode["shot_order"]  # type: ignore[index]
    ]
    changed = {
        **episode,
        "title": "L'Héritage empoisonné",
        "story": {**episode["story"], "reveal": "Aconit a déjà payé le prix."},  # type: ignore[arg-type]
    }
    created = history.create(
        "S01E001",
        scope="episode",
        kind="version",
        name="Révélation Aconit",
        episode=changed,
        shots=shots,
        provenance={"provider": "manual"},
    )

    comparison = history.compare(
        "S01E001", "episode", str(created["archived_id"]), "current"
    )
    labels = {item["field"] for item in comparison["changes"]}  # type: ignore[index]
    assert {"Titre", "Révélation"} <= labels


async def test_explanation_endpoint_falls_back_with_provenance(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    private, output = seed_project(tmp_path)
    history = EditorialHistory(private, output)
    listing = history.listing("S01E001", "shot", "S01E001-S01")
    editor = listing["editor"]
    shot_path = (
        private
        / "episodes/season-01/S01E001/shots/S01E001-S01.json"
    )
    shot = read_json(shot_path)
    shot["action"] = "Une autre action, nette et visible."
    variant = history.create(
        "S01E001",
        scope="shot",
        kind="variant",
        name="Alternative",
        shot_id="S01E001-S01",
        shot=shot,
        shot_source=str(editor["shot_source"]),  # type: ignore[index]
        provenance={"provider": "manual"},
    )
    variant_id = str(variant["created"]["id"])  # type: ignore[index]

    async def unavailable(_self: object) -> list[object]:
        raise httpx.ConnectError("offline")

    monkeypatch.setattr(
        "engine.narrative.ollama.OllamaClient.list_models", unavailable
    )
    app = create_app(
        Settings(
            _env_file=None,
            private_content_dir=private,
            output_dir=output,
        )
    )
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app), base_url="http://test"
    ) as client:
        response = await client.post(
            "/api/editorial-history/S01E001/compare/explain",
            json={
                "scope": "shot",
                "shot_id": "S01E001-S01",
                "left": "current",
                "right": variant_id,
            },
        )

    assert response.status_code == 200
    body = response.json()
    assert body["provenance"]["provider"] == "deterministic"
    assert body["provenance"]["fallback"] is True
    assert body["summary"].startswith("1 différence")
    assert body["recommendation"] == "either"


async def test_explanation_records_the_local_ollama_model(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    class FakeModel:
        name = "local-story:latest"

    class FakeOllama:
        def __init__(self, *_args: object, **_kwargs: object) -> None:
            pass

        async def __aenter__(self) -> FakeOllama:
            return self

        async def __aexit__(self, *_args: object) -> None:
            pass

        async def list_models(self) -> list[FakeModel]:
            return [FakeModel()]

        async def chat_structured(self, *_args: object, **_kwargs: object) -> str:
            return json.dumps(
                {
                    "summary": "La droite renforce le conflit.",
                    "recommendation": "right",
                    "reason": "L'action devient plus nette.",
                    "risks": ["Préserver la motivation du personnage."],
                }
            )

    monkeypatch.setattr("apps.api.editorial_routes.OllamaClient", FakeOllama)
    comparison: dict[str, object] = {
        "left": {"name": "A"},
        "right": {"name": "B"},
        "changes": [{"field": "Action", "before": "Attend", "after": "Frappe"}],
    }

    result = await _explain_comparison(
        Settings(
            _env_file=None,
            output_dir=tmp_path / "output",
            ollama_model="local-story:latest",
        ),
        comparison,
    )

    assert result["recommendation"] == "right"
    assert result["provenance"]["provider"] == "ollama"  # type: ignore[index]
    assert result["provenance"]["model"] == "local-story:latest"  # type: ignore[index]
    assert result["provenance"]["fallback"] is False  # type: ignore[index]


def test_editorial_history_ui_exposes_friendly_diff_and_promotion() -> None:
    html = Path("apps/api/static/index.html").read_text(encoding="utf-8")
    script = Path("apps/api/static/editorial-history.js").read_text(encoding="utf-8")

    assert 'id="editorial-history-dialog"' in html
    assert 'id="editorial-explain"' in html
    assert 'data-editorial-field="action"' in html
    assert "Choisir comme canon" in script
    assert "/compare/explain" in script
    assert "change.before" in script and "change.after" in script
    assert "JSON.stringify(payload)" in script
    assert "JSON à déchiffrer" in html
