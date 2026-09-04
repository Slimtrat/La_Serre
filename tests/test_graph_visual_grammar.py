from pathlib import Path

STATIC = Path(__file__).parents[1] / "apps" / "api" / "static"


def test_graph_separates_structure_from_runtime_state() -> None:
    graph = (STATIC / "graph.js").read_text(encoding="utf-8")

    assert 'story: "container"' in graph
    assert 'director: "core"' in graph
    assert 'cast: "optional"' in graph
    assert 'voice: "optional"' in graph
    assert 'export: "container"' in graph
    assert (
        'new Set(["idle", "ready", "active", "done", "blocked", "stale", "error"])'
        in graph
    )
    assert 'node.dataset.structure = structure' in graph
    assert 'node.dataset.runtimeState = runtimeState' in graph
    assert 'running: "active"' in graph
    assert 'failed: "error"' in graph


def test_graph_marks_core_optional_active_and_impact_edges() -> None:
    graph = (STATIC / "graph.js").read_text(encoding="utf-8")

    assert '"cast>director"' in graph
    assert '"shot>voice"' in graph
    assert '"mix>montage"' in graph
    assert '"graph-link edge-" + structure + " edge-state-" + targetState' in graph
    assert 'path.classList.add("edge-active")' in graph
    assert 'path.classList.add("impact-link")' in graph
    assert '"url(#graph-arrow-" + marker + ")"' in graph
    assert "showImpactFrom: focusActivityStage" in graph


def test_graph_focus_path_and_minimal_legend_are_wired() -> None:
    graph = (STATIC / "graph.js").read_text(encoding="utf-8")

    assert "function applyFocusPath(id)" in graph
    assert 'node.classList.toggle("focus-path", relation === "core")' in graph
    assert 'node.classList.toggle("focus-optional", relation === "optional")' in graph
    assert 'node.classList.toggle("focus-muted"' in graph
    assert 'applyFocusPath(id)' in graph
    assert 'legend.setAttribute("aria-label", "Légende du graphe")' in graph
    for label in ("Flux principal", "Branche optionnelle", "Étape active", "Erreur"):
        assert label in graph


def test_graph_css_encodes_semantics_and_reduced_motion() -> None:
    css = (STATIC / "graph.css").read_text(encoding="utf-8")

    for selector in (
        ".graph-link.edge-core",
        ".graph-link.edge-optional",
        ".graph-link.edge-active",
        ".graph-link.focus-muted",
        ".graph-node.structure-container",
        ".graph-node.structure-optional",
        ".graph-node.state-active",
        ".graph-node.state-stale",
        ".graph-node.state-error",
        ".graph-legend",
    ):
        assert selector in css
    assert "--graph-core: #4e9fff" in css
    assert "--graph-optional: #f4a261" in css
    assert "@media (prefers-reduced-motion: reduce)" in css
    reduced_motion = css.split("@media (prefers-reduced-motion: reduce)", maxsplit=1)[1]
    assert ".graph-link.edge-active" in reduced_motion
    assert ".graph-node.state-active" in reduced_motion
    assert "animation: none" in reduced_motion
