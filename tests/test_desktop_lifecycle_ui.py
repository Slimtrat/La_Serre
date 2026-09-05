from pathlib import Path

STATIC = Path("apps/api/static")


def test_native_lifecycle_ui_exposes_close_choice_and_settings() -> None:
    html = (STATIC / "index.html").read_text(encoding="utf-8")
    script = (STATIC / "desktop-lifecycle.js").read_text(encoding="utf-8")

    assert "/static/desktop-lifecycle.css" in html
    assert "/static/desktop-lifecycle.js" in html
    assert "serre:native-close-request" in script
    assert "resolve_close_request" in script
    assert 'value="background"' in script
    assert 'value="quit"' in script
    assert 'name="remember"' in script
    assert "desktop-notifications" in script
    assert "backgroundAvailable" in script
