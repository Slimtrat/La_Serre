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


def test_getting_started_is_first_run_guided_and_reopenable() -> None:
    index = (STATIC / "index.html").read_text(encoding="utf-8")
    guide = (STATIC / "getting-started.js").read_text(encoding="utf-8")

    assert "/static/getting-started.css" in index
    assert "/static/getting-started.js" in index
    assert 'id="getting-started-open"' in index
    assert 'const STEP_COUNT = 5' in guide
    assert 'serre-studio-getting-started-v0.2.3' in guide
    assert 'localStorage.setItem(STORAGE_KEY, "seen")' in guide
    assert 'window.addEventListener("studio:status"' in guide
    assert 'window.SerreStudio.api("/api/status")' in guide
    assert 'window.SerreWorkspace?.show("settings")' in guide
    assert "new URLSearchParams(window.location.search).has(\"view\")" in guide
