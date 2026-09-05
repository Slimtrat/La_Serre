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
    episode = (STATIC / "episode.js").read_text(encoding="utf-8")
    shell = (STATIC / "workspace-shell.js").read_text(encoding="utf-8")

    assert ".episode-panel .episode-details {" in onepage
    assert ".episode-panel .episode-details[open] .episode-details-grid" in onepage
    assert 'window.SerreEpisode = Object.freeze({ openCasting, closeCasting })' in episode
    assert 'window.SerreWorkspace?.show("bible")' in graph
    assert 'window.SerreBible?.selectCategory?.("characters")' in graph
    assert 'document.querySelector("#series-cast-open")' in shell
    assert 'panel?.focus({ preventScroll: true })' in episode
    assert 'edge.description || "Dépendance du pipeline de production."' in graph
    assert "showEdgeTooltip" in graph
    assert "graph-link-hit" in graph


def test_coherence_gate_is_loaded_and_callable_from_business_nodes() -> None:
    index = (STATIC / "index.html").read_text(encoding="utf-8")
    coherence = (STATIC / "coherence.js").read_text(encoding="utf-8")

    assert "/static/coherence.css" in index
    assert "/static/coherence.js" in index
    assert 'data-stage-action="validate"' in index
    assert "Validation du découpage" in index
    assert 'request("/api/coherence/review"' in coherence
    assert '"/approve"' in coherence
    assert "textContent = text" in coherence
    assert "window.SerreCoherence = Object.freeze" in coherence


def test_getting_started_is_first_run_guided_and_reopenable() -> None:
    index = (STATIC / "index.html").read_text(encoding="utf-8")
    guide = (STATIC / "getting-started.js").read_text(encoding="utf-8")

    assert "/static/getting-started.css" in index
    assert "/static/getting-started.js" in index
    assert 'id="getting-started-open"' in index
    assert 'const STEP_COUNT = 9' in guide
    assert 'serre-studio-getting-started-v0.2.10' in guide
    assert 'localStorage.setItem(STORAGE_KEY, "seen")' in guide
    assert 'window.addEventListener("studio:status"' in guide
    assert 'window.SerreStudio.api("/api/status")' in guide
    assert 'window.SerreWorkspace?.show("settings")' in guide
    assert "new URLSearchParams(window.location.search).has(\"view\")" in guide


def test_project_explorer_is_lightweight_synchronized_and_reopenable() -> None:
    index = (STATIC / "index.html").read_text(encoding="utf-8")
    explorer = (STATIC / "project-explorer.js").read_text(encoding="utf-8")
    styles = (STATIC / "project-explorer.css").read_text(encoding="utf-8")

    assert "/static/project-explorer.css" in index
    assert "/static/project-explorer.js" in index
    assert 'toggle.id = "project-explorer-toggle"' in explorer
    assert 'fetch("/api/episodes/project-explorer")' in explorer
    assert 'window.addEventListener("studio:episode-loaded"' in explorer
    assert 'window.addEventListener("studio:shot-selected"' in explorer
    assert 'window.addEventListener("studio:project-changed"' in explorer
    assert "window.selectEpisodeShot?.(shotId)" in explorer
    assert 'window.SerreWorkspace?.show("graph")' in explorer
    assert "Ctrl+Maj+E" in explorer
    assert "/api/media/" not in explorer
    assert "<img" not in explorer
    assert "<video" not in explorer
    for state in (
        "idea",
        "draft",
        "review",
        "approved",
        "production",
        "complete",
        "error",
        "stale",
    ):
        assert f'[data-state="{state}"]' in styles
