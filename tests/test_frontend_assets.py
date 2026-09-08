from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).parents[1]
STATIC = ROOT / "apps" / "api" / "static"
UI = STATIC / "ui"


def test_vite_production_assets_are_built_and_loaded_by_the_legacy_shell() -> None:
    index = (STATIC / "index.html").read_text(encoding="utf-8")

    assert 'id="studio-react-root"' in index
    assert "/static/ui/studio-react.css" in index
    assert "/static/ui/studio-react.js" in index
    assert 'type="module"' in index

    for asset in (UI / "studio-react.css", UI / "studio-react.js"):
        assert asset.is_file(), f"Asset Vite absent : {asset.relative_to(ROOT)}"
        assert asset.stat().st_size > 0, f"Asset Vite vide : {asset.relative_to(ROOT)}"

    bundle = (UI / "studio-react.js").read_text(encoding="utf-8")
    assert "process.env.NODE_ENV" not in bundle


def test_desktop_packaging_uses_static_assets_without_node_runtime() -> None:
    spec = (ROOT / "tools" / "serre_studio.spec").read_text(encoding="utf-8")

    assert 'project_root / "apps" / "api" / "static"' in spec
    assert '"apps/api/static"' in spec
    assert 'project_root / "frontend"' not in spec
    assert "node_modules" not in spec
