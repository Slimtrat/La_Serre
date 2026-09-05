from __future__ import annotations

import re
import tomllib
from pathlib import Path

ROOT = Path(__file__).parents[1]


def test_readme_is_current_and_navigates_the_open_source_project() -> None:
    readme = (ROOT / "README.md").read_text(encoding="utf-8")

    assert "https://github.com/Slimtrat/La_Serre.git" in readme
    assert "skibidy-plant" not in readme
    assert "0.2.13" in readme
    assert "AGPL-3.0-or-later" in readme
    for relative_path in (
        "README.en.md",
        "CONTRIBUTING.md",
        "SECURITY.md",
        "LICENSE",
        "docs/roadmap.md",
        "docs/architecture.md",
        "docs/bible-exchange.md",
        "docs/comfyui.md",
        "docs/workflow-templates.md",
        "docs/episode-production-contract.md",
    ):
        assert f"]({relative_path})" in readme
        assert (ROOT / relative_path).is_file()


def test_local_markdown_links_from_main_readme_resolve() -> None:
    readme = (ROOT / "README.md").read_text(encoding="utf-8")
    links = re.findall(r"\[[^]]*]\(([^)]+)\)", readme)

    local_targets = {
        target.split("#", maxsplit=1)[0]
        for target in links
        if target and not target.startswith(("http://", "https://", "#"))
    }
    missing = sorted(target for target in local_targets if not (ROOT / target).exists())
    assert missing == []


def test_roadmap_has_short_and_long_term_product_gates() -> None:
    roadmap = (ROOT / "docs" / "roadmap.md").read_text(encoding="utf-8")

    assert "30 à 90 jours" in roadmap
    assert "trois épisodes cohérents" in roadmap.lower()
    assert "Vision long terme" in roadmap
    assert "Critère de sortie" in roadmap
    assert "Un produit fiable" in roadmap
    assert "Une entreprise autour du cœur open source" in roadmap


def test_package_declares_the_repository_license() -> None:
    metadata = tomllib.loads((ROOT / "pyproject.toml").read_text(encoding="utf-8"))

    assert metadata["project"]["license"] == "AGPL-3.0-or-later"
    assert (ROOT / "LICENSE").read_text(encoding="utf-8").startswith(
        "                    GNU AFFERO GENERAL PUBLIC LICENSE"
    )
