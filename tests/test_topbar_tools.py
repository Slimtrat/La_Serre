from __future__ import annotations

from pathlib import Path

STATIC = Path("apps/api/static")


def test_topbar_regroups_secondary_tools_in_accessible_overflow() -> None:
    script = (STATIC / "topbar-tools.js").read_text(encoding="utf-8")
    styles = (STATIC / "topbar-tools.css").read_text(encoding="utf-8")
    explorer = (STATIC / "project-explorer.js").read_text(encoding="utf-8")

    assert 'toggle.setAttribute("aria-expanded", "false")' in script
    assert 'menu.setAttribute("role", "menu")' in script
    assert "#project-explorer-toggle" in script
    assert "[data-tool-action=assets]" in script
    assert "#getting-started-open" in script
    assert "#settings-toggle" in script
    assert ".language-switcher" in script
    assert 'event.key === "Escape"' in script
    assert "@media (max-width: 760px)" in styles
    assert 'document.querySelector(".studio-tools")' in explorer
