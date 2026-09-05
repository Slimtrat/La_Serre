from pathlib import Path


def test_bible_ui_exposes_portable_json_exchange_actions() -> None:
    source = Path("apps/api/static/bible-view.js").read_text(encoding="utf-8")

    for marker in (
        'id="bible-export"',
        'id="bible-ai-kit"',
        'id="bible-import"',
        'id="bible-import-file"',
        'request("/api/bible/exchange")',
        'request("/api/bible/exchange/ai-kit")',
        '"/api/bible/exchange/import?expected_revision="',
        'format !== "serre.project-bible"',
        "URL.createObjectURL",
    ):
        assert marker in source
