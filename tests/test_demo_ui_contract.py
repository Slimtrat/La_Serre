from __future__ import annotations

from pathlib import Path

STATIC = Path("apps/api/static")


def test_express_demo_is_reachable_and_kept_inside_the_tools_menu() -> None:
    html = (STATIC / "index.html").read_text(encoding="utf-8")
    tools = (STATIC / "topbar-tools.js").read_text(encoding="utf-8")
    guide = (STATIC / "getting-started.js").read_text(encoding="utf-8")

    assert 'id="demo-production-open"' in html
    assert 'src="/static/demo-production.js"' in html
    assert 'href="/static/demo-production.css"' in html
    assert "#demo-production-open" in tools
    assert 'data-guide-action="express-demo"' in guide


def test_every_demo_stage_exposes_imagine_approve_and_reject_controls() -> None:
    script = (STATIC / "demo-production.js").read_text(encoding="utf-8")

    assert 'const STAGES = ["story", "plan", "frames", "sound", "video"]' in script
    assert "data-demo-imagine" in script
    assert "data-demo-approve" in script
    assert "data-demo-reject" in script
    assert 'new CustomEvent("studio:demo-job"' in script


def test_demo_has_a_compact_draggable_one_page_window() -> None:
    script = (STATIC / "demo-production.js").read_text(encoding="utf-8")
    styles = (STATIC / "demo-production.css").read_text(encoding="utf-8")

    assert "data-demo-drag" in script
    assert "setPointerCapture" in script
    assert "height: min(690px, calc(100vh - 86px))" in styles
    assert "grid-template-rows: auto auto minmax(0, 1fr) auto" in styles
