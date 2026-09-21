from __future__ import annotations

import tomllib
from pathlib import Path

import pytest

import engine.narrative.example_catalog as catalog_module
from engine.narrative.example_catalog import ExampleStoryCatalog


def test_wheel_includes_story_examples_at_loader_fallback_path() -> None:
    with Path("pyproject.toml").open("rb") as stream:
        project = tomllib.load(stream)
    force_include = project["tool"]["hatch"]["build"]["targets"]["wheel"]["force-include"]

    assert force_include["starter_catalog/story-examples"] == (
        "engine/narrative/story-examples"
    )
    assert list(Path("starter_catalog/story-examples").glob("*.json"))


def test_loader_uses_packaged_assets_outside_checkout(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    source = ExampleStoryCatalog().list()[0]
    package_dir = tmp_path / "package"
    examples_dir = package_dir / "story-examples"
    examples_dir.mkdir(parents=True)
    (examples_dir / "example.json").write_text(source.model_dump_json(), encoding="utf-8")
    monkeypatch.setattr(catalog_module, "__file__", str(package_dir / "example_catalog.py"))
    monkeypatch.setattr(catalog_module, "_bundle_root", lambda: tmp_path / "missing-bundle")

    assert [example.id for example in ExampleStoryCatalog().list()] == [source.id]


def test_missing_or_empty_assets_fail_explicitly(tmp_path: Path) -> None:
    with pytest.raises(FileNotFoundError, match="introuvable"):
        ExampleStoryCatalog(tmp_path / "missing").list()

    empty = tmp_path / "empty"
    empty.mkdir()
    with pytest.raises(ValueError, match="vide"):
        ExampleStoryCatalog(empty).list()
