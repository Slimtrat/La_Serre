from pathlib import Path

STATIC = Path("apps/api/static")


def test_getting_started_drives_the_real_series_episode_shot_graph() -> None:
    guide = (STATIC / "getting-started.js").read_text(encoding="utf-8")

    assert "Découvrir le Studio" in guide
    assert "Nouveau projet" in guide
    assert 'window.SerreGraph?.load("series", "series")' in guide
    assert 'window.SerreGraph?.load("episode", episodeId)' in guide
    assert 'window.SerreGraph?.load("shot", shotId)' in guide
    assert 'window.SerreGraph.navigate(definition.container)' in guide
    assert 'window.addEventListener("studio:graph-context"' in guide
    for node_id in ("story", "director", "shot", "keyframe", "motion"):
        assert f'"{node_id}"' in guide


def test_getting_started_marks_the_expected_node_and_stays_contextual() -> None:
    guide = (STATIC / "getting-started.js").read_text(encoding="utf-8")
    styles = (STATIC / "getting-started.css").read_text(encoding="utf-8")

    assert 'node?.classList.add("guide-expected")' in guide
    assert 'window.SerreGraph?.selectNode(expected.id)' in guide
    assert 'dialog.show()' in guide
    assert ".getting-started-dialog.contextual" in styles
    assert ".graph-node.guide-expected" in styles
    assert "guide-expected-pulse" in styles
    assert "@media (prefers-reduced-motion: reduce)" in styles


def test_new_project_is_blank_and_discovery_removal_is_explicit() -> None:
    guide = (STATIC / "getting-started.js").read_text(encoding="utf-8")
    projects = (STATIC / "projects.js").read_text(encoding="utf-8")

    assert "openCreate({ cloneContent: false })" in guide
    assert "deleteDiscovery(discovery.id)" in guide
    assert 'project.kind === "discovery"' in guide
    assert "async function deleteDiscovery(projectId = state.active_id)" in projects
    assert '{ method: "DELETE" }' in projects
