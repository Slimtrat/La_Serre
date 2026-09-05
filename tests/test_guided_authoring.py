from __future__ import annotations

from pathlib import Path

import httpx
import pytest

from apps.api.guided_routes import _proposal_prompt, _protect_candidate
from apps.api.main import create_app
from engine.config import Settings
from engine.narrative.guided_authoring import (
    GuidedAuthoringRegistry,
    GuidedProjectBrief,
    guided_completion,
)
from engine.world.bible import BibleRegistry


def _settings(tmp_path: Path) -> Settings:
    return Settings(
        _env_file=None,
        private_content_dir=tmp_path / "private",
        output_dir=tmp_path / "output",
    )


async def test_guided_drafts_are_persistent_incomplete_and_promotable(
    tmp_path: Path,
) -> None:
    settings = _settings(tmp_path)
    app = create_app(settings)
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        initial = (await client.get("/api/guided")).json()
        assert initial["state"]["revision"] == 0
        assert initial["completion"]["brief"]["ready"] is False

        brief = {
            **initial["state"]["brief"],
            "working_title": "Les fleurs interdites",
            "idea": "Une fleur amoureuse choisit sa victime et exige un baiser empoisonné.",
            "genre": "Fantasy gothique",
            "tone": "Drôle, sensuel et inquiétant",
        }
        saved = (
            await client.put(
                "/api/guided/brief",
                json={"expected_revision": 0, "brief": brief},
            )
        ).json()
        created = (
            await client.post(
                "/api/guided/characters",
                json={"expected_revision": saved["state"]["revision"]},
            )
        ).json()
        character = created["state"]["characters"][0]
        assert character["name"] == ""
        assert created["completion"]["characters"][0]["ready"] is False

        character.update(
            {
                "name": "Belladone",
                "role": "Voleuse botanique",
                "visual_description": (
                    "Une femme violette au sourire dangereux et aux cheveux en pétales."
                ),
                "wardrobe": "Une robe végétale noire et violette bordée de feuilles épineuses.",
                "signature_details": ["grain de beauté en cœur"],
                "palette": ["violet", "noir", "vert mousse"],
                "personality": "Séductrice, drôle et terriblement possessive.",
                "wants": ["être choisie"],
                "fears": ["être oubliée"],
                "voice_description": "Voix chaude, joueuse, avec une menace retenue.",
            }
        )
        updated = (
            await client.put(
                f"/api/guided/characters/{character['id']}",
                json={
                    "expected_revision": created["state"]["revision"],
                    "character": character,
                },
            )
        ).json()
        promoted = await client.post(
            f"/api/guided/characters/{character['id']}/promote",
            json={"expected_revision": updated["state"]["revision"]},
        )

    assert promoted.status_code == 200
    assert promoted.json()["completion"]["characters"][0]["promoted"] is True
    assert BibleRegistry(settings.private_content_dir).load().characters[0].name == "Belladone"


def test_proposal_acceptance_refuses_a_stale_revision(tmp_path: Path) -> None:
    registry = GuidedAuthoringRegistry(tmp_path)
    initial = registry.load()
    saved = registry.save(
        initial.model_copy(
            update={"brief": GuidedProjectBrief(working_title="Version A")}
        ),
        expected_revision=0,
    )
    proposal = registry.create_proposal(
        target="brief",
        mode="improve",
        base_revision=saved.revision,
        before=saved.brief.model_dump(mode="json"),
        after=saved.brief.model_copy(update={"working_title": "Version B"}).model_dump(
            mode="json"
        ),
        model="qwen3:4b",
    )
    registry.save(
        saved.model_copy(
            update={"brief": saved.brief.model_copy(update={"tone": "plus sombre"})}
        ),
        expected_revision=saved.revision,
    )

    with pytest.raises(ValueError, match="périmée"):
        registry.accept_proposal(
            proposal.id,
            expected_revision=saved.revision + 1,
        )


def test_proposal_acceptance_cannot_override_a_locked_field(tmp_path: Path) -> None:
    registry = GuidedAuthoringRegistry(tmp_path)
    initial = registry.save(
        registry.load().model_copy(
            update={
                "brief": GuidedProjectBrief(
                    working_title="Canon",
                    tone="fun et sombre",
                    locked_fields=["tone"],
                )
            }
        ),
        expected_revision=0,
    )
    proposal = registry.create_proposal(
        target="brief",
        mode="improve",
        base_revision=initial.revision,
        before=initial.brief.model_dump(mode="json"),
        after=initial.brief.model_copy(update={"idea": "Une nouvelle idée"}).model_dump(
            mode="json"
        ),
        model="qwen3:4b",
    )
    edited = dict(proposal.after)
    edited["tone"] = "écrasé"

    accepted, _ = registry.accept_proposal(
        proposal.id,
        expected_revision=initial.revision,
        edited_after=edited,
    )

    assert accepted.brief.tone == "fun et sombre"


def test_proposal_identifier_cannot_escape_its_storage_directory(tmp_path: Path) -> None:
    registry = GuidedAuthoringRegistry(tmp_path)
    with pytest.raises(KeyError):
        registry.get_proposal("..\\outside")


def test_ai_modes_use_context_and_respect_filled_and_locked_fields(tmp_path: Path) -> None:
    registry = GuidedAuthoringRegistry(tmp_path)
    state = registry.load().model_copy(
        update={"brief": GuidedProjectBrief(working_title="Canon", locked_fields=["tone"])}
    )
    prompt = _proposal_prompt(
        "brief",
        "prepare_next",
        state.brief.model_dump(),
        state,
        {"canonical_characters": [{"name": "Belladone"}]},
    )
    protected = _protect_candidate(
        {"working_title": "Canon", "tone": "fun", "idea": "", "locked_fields": ["tone"]},
        {"working_title": "Autre", "tone": "glauque", "idea": "Une idée", "locked_fields": []},
        "fill_missing",
    )

    assert "Contexte projet" in prompt
    assert "episode_title" in prompt
    assert "Belladone" in prompt
    assert protected["working_title"] == "Canon"
    assert protected["tone"] == "fun"
    assert protected["idea"] == "Une idée"
    assert guided_completion(state)["brief"]["ready"] is False


def test_guided_workspace_is_the_default_visual_product_path() -> None:
    static = Path("apps/api/static")
    index = (static / "index.html").read_text(encoding="utf-8")
    script = (static / "guided-workspace.js").read_text(encoding="utf-8")
    styles = (static / "guided-workspace.css").read_text(encoding="utf-8")

    assert 'data-workspace-view="guided"' in index
    assert 'data-workspace-target="guided"' in index
    assert 'id="guided-workspace"' in index
    assert "/static/guided-workspace.js" in index
    assert len([line for line in script.splitlines() if '["' in line[:8]]) >= 6
    for mode in ("improve", "fill_missing", "prepare_next"):
        assert f'data-ai-mode="{mode}"' in script
    assert "CONTEXTE UTILISÉ PAR L’IA" in script
    assert ".guided-journey" in styles
    assert ".guided-proposal" in styles
