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

    assert 'node.classList.add("guide-expected")' in guide
    assert 'window.SerreGraph?.selectNode(expected.id)' in guide
    assert 'dialog.show()' in guide
    assert ".getting-started-dialog.contextual" in styles
    assert ".graph-node.guide-expected" in styles
    assert "guide-expected-pulse" in styles
    assert "@media (prefers-reduced-motion: reduce)" in styles


def test_guide_is_non_modal_draggable_dockable_and_persistent() -> None:
    guide = (STATIC / "getting-started.js").read_text(encoding="utf-8")
    styles = (STATIC / "getting-started.css").read_text(encoding="utf-8")

    assert 'dialog.setAttribute("aria-modal", "false")' in guide
    assert "dialog.show()" in guide
    assert "showModal" not in guide
    assert "data-guide-drag-handle" in guide
    assert 'heading.addEventListener("pointerdown", beginDrag)' in guide
    assert "setPointerCapture" in guide
    assert "snapToEdge" in guide
    assert "POSITION_KEY" in guide
    assert "localStorage.setItem(POSITION_KEY" in guide
    assert 'action === "reset-position"' in guide
    assert 'event.key === "Home"' in guide
    assert 'event.key === "End"' in guide
    assert 'event.key === "Escape"' in guide
    assert "html.getting-started-open body" in styles
    assert "overflow: hidden !important" in styles


def test_guide_is_responsive_and_keeps_the_graph_center_available() -> None:
    styles = (STATIC / "getting-started.css").read_text(encoding="utf-8")

    assert "width: clamp(430px, 34vw, 510px)" in styles
    assert "inset: 64px 12px auto auto" in styles
    assert "@media (max-width: 680px)" in styles
    assert "height: min(72dvh, 590px)" in styles
    assert "overscroll-behavior: contain" in styles
    assert ".getting-started-dialog button:focus-visible" in styles


def test_all_guide_copy_has_french_english_and_i18n_adapter() -> None:
    guide = (STATIC / "getting-started.js").read_text(encoding="utf-8")

    assert "const UI_COPY =" in guide
    assert "const STEP_COPY =" in guide
    assert 'window.SerreI18n?.t?.(translationKey, variables)' in guide
    assert 'window.SerreI18n?.setLocale?.(language)' in guide
    assert 'data-guide-language="fr"' in guide
    assert 'data-guide-language="en"' in guide
    assert 'discover: "Découvrir le Studio"' in guide
    assert 'discover: "Discover the Studio"' in guide
    assert 'dialog.lang = language' in guide
    assert "content: attr(data-guide-label)" in (
        STATIC / "getting-started.css"
    ).read_text(encoding="utf-8")


def test_new_project_is_blank_and_discovery_removal_is_explicit() -> None:
    guide = (STATIC / "getting-started.js").read_text(encoding="utf-8")
    projects = (STATIC / "projects.js").read_text(encoding="utf-8")

    assert "openCreate({ cloneContent: false })" in guide
    assert "deleteDiscovery(discovery.id)" in guide
    assert 'project.kind === "discovery"' in guide
    assert "async function deleteDiscovery(projectId = state.active_id)" in projects
    assert '{ method: "DELETE" }' in projects
