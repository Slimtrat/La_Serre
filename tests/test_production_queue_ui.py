from pathlib import Path


def test_production_queue_ui_exposes_all_explicit_actions() -> None:
    script = Path("apps/api/static/production-queue.js").read_text(encoding="utf-8")
    style = Path("apps/api/static/production-queue.css").read_text(encoding="utf-8")

    for action in (
        "missing",
        "approved",
        "pause",
        "resume",
        "cancel",
        "retry",
        "approve",
        "open-plan",
        "priority-up",
        "priority-down",
    ):
        assert action in script
    assert "/api/production-queue" in script
    assert "studio:project-changed" in script
    assert "studio:episode-loaded" in script
    assert "position" in script
    assert "priority" in script
    assert ".production-queue.is-open" in style
    assert ".production-queue-item.failed" in style
    assert ".production-queue-item.approval" in style
