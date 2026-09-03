from pathlib import Path

STATIC = Path("apps/api/static")


def test_activity_overlay_and_current_version_are_loaded() -> None:
    index = (STATIC / "index.html").read_text(encoding="utf-8")
    activity = (STATIC / "activity-bar.js").read_text(encoding="utf-8")

    assert 'id="app-version"' in index
    assert "/static/activity-bar.css" in index
    assert "/static/activity-bar.js" in index
    assert 'id="activity-log-toggle"' in activity
    assert 'localStorage.setItem(STORAGE_KEY' in activity
    assert 'request("/api/activity")' in activity


def test_casting_is_visible_and_graph_edges_explain_their_connections() -> None:
    onepage = (STATIC / "onepage.css").read_text(encoding="utf-8")
    graph = (STATIC / "graph.js").read_text(encoding="utf-8")

    assert ".episode-panel .episode-details {" in onepage
    assert ".episode-panel .episode-details[open] .episode-details-grid" in onepage
    assert "edgeDescriptions" in graph
    assert "showEdgeTooltip" in graph
    assert "graph-link-hit" in graph
