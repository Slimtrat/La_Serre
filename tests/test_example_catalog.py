from __future__ import annotations

import json
import sys
from pathlib import Path

import pytest

from engine.narrative.example_catalog import ExampleStoryCatalog
from engine.narrative.guided_authoring import GuidedProjectBrief


def test_catalog_contains_two_independent_serializable_stories() -> None:
    examples = ExampleStoryCatalog().list()

    assert {item.id for item in examples} == {
        "fritz-pizzafest-de",
        "hiva-forest-magic",
    }
    assert {item.language for item in examples} == {"de", "fr"}
    for item in examples:
        assert isinstance(item.brief, GuidedProjectBrief)
        assert item.brief.idea
        assert item.brief.episode_concept
        assert json.loads(item.model_dump_json())["brief"]["working_title"]
        assert item.continuity_notes


def test_catalog_supports_custom_root_and_rejects_duplicate_ids(tmp_path: Path) -> None:
    source = ExampleStoryCatalog().list()[0].model_dump(mode="json")
    (tmp_path / "one.json").write_text(json.dumps(source), encoding="utf-8")
    (tmp_path / "two.json").write_text(json.dumps(source), encoding="utf-8")

    with pytest.raises(ValueError, match="Duplicate example story id"):
        ExampleStoryCatalog(tmp_path).list()


def test_catalog_rejects_unknown_brief_fields(tmp_path: Path) -> None:
    source = ExampleStoryCatalog().list()[0].model_dump(mode="json")
    source["brief"]["unexpected"] = "not part of the guided contract"
    (tmp_path / "invalid.json").write_text(json.dumps(source), encoding="utf-8")

    with pytest.raises(ValueError):
        ExampleStoryCatalog(tmp_path).list()


def test_catalog_rejects_language_mismatch(tmp_path: Path) -> None:
    source = ExampleStoryCatalog().list()[0].model_dump(mode="json")
    source["brief"]["language"] = "en"
    (tmp_path / "mismatch.json").write_text(json.dumps(source), encoding="utf-8")

    with pytest.raises(ValueError, match="language"):
        ExampleStoryCatalog(tmp_path).list()


def test_catalog_resolves_pyinstaller_bundle_root(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    bundle_dir = tmp_path / "starter_catalog" / "story-examples"
    bundle_dir.mkdir(parents=True)
    source = ExampleStoryCatalog().list()[0].model_dump(mode="json")
    (bundle_dir / "story.json").write_text(json.dumps(source), encoding="utf-8")
    monkeypatch.setattr(sys, "_MEIPASS", str(tmp_path), raising=False)

    assert [item.id for item in ExampleStoryCatalog().list()] == [source["id"]]
