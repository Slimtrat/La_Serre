from __future__ import annotations

from pathlib import Path

STATIC = Path("apps/api/static")


def test_bible_view_is_a_complete_project_scoped_inspector() -> None:
    script = (STATIC / "bible-view.js").read_text(encoding="utf-8")
    styles = (STATIC / "bible-view.css").read_text(encoding="utf-8")
    relationships = (STATIC / "bible-relations.js").read_text(encoding="utf-8")
    relationship_styles = (STATIC / "bible-relations.css").read_text(encoding="utf-8")

    assert 'navButton.dataset.workspaceTarget = "bible"' in script
    assert 'request("/api/bible")' in script
    assert 'request("/api/bible/impact")' in script
    assert 'method: "PUT"' in script
    assert 'method: "DELETE"' in script
    assert 'window.addEventListener("studio:project-changed"' in script
    assert 'window.addEventListener("studio:shot-selected"' in script
    assert 'new CustomEvent("studio:bible-changed"' in script
    for category in (
        "characters",
        "locations",
        "relationships",
        "world_rules",
        "narrative_arcs",
        "secrets",
        "references",
        "prompts",
    ):
        assert category in script
    assert 'body[data-workspace-view="bible"]' in styles
    assert ".bible-impact" in styles
    assert 'class="bible-json-advanced"' in script
    assert "relationship-edge-hit" in relationships
    assert "data-toxicity" in relationships
    assert "pointerdown" in relationships
    assert "studio:bible-entity-selected" in script
    assert ".bible-layout.relationship-mode" in relationship_styles
    assert ".relationship-popover" in relationship_styles


def test_bible_relationship_editor_keeps_json_explicitly_advanced() -> None:
    script = (STATIC / "bible-relations.js").read_text(encoding="utf-8")

    assert "Mode avancé · JSON" in script
    assert "Édition guidée" in script
    assert "Appliquer au formulaire" in script
    assert "relationship-direction-row" in script
    for metric in ("desire", "trust", "anger", "fear", "attachment", "toxicity"):
        assert metric in script
