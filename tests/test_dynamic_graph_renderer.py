from pathlib import Path

STATIC = Path("apps/api/static")


def test_renderer_consumes_graph_dto_instead_of_business_definitions() -> None:
    graph = (STATIC / "graph.js").read_text(encoding="utf-8")

    assert '"/api/graphs/"' in graph
    assert "graphDefinition.nodes.map" in graph
    assert "graphDefinition?.edges || []" in graph
    assert "const definitions =" not in graph
    assert "const optionalEdgeKeys" not in graph
    assert "definition.actions.forEach" in graph
    assert 'action.kind === "navigate"' in graph
    assert 'action.kind === "generate"' in graph
    assert 'action.kind === "stage"' in graph
    assert 'action.kind === "workflow"' in graph
    assert 'action.kind === "import"' in graph


def test_renderer_opens_containers_and_persists_each_context() -> None:
    graph = (STATIC / "graph.js").read_text(encoding="utf-8")

    assert 'node.addEventListener("dblclick"' in graph
    assert "definitionFor(node.dataset.nodeId)?.container" in graph
    assert 'loadGraph("series", "series"' in graph
    assert 'contextKey("serre-studio-graph-layout-v2")' in graph
    assert 'contextKey("serre-studio-graph-view-v2")' in graph
    assert 'target.scope === "episode"' in graph
    assert 'target.scope === "shot"' in graph
    assert 'new CustomEvent("studio:graph-context"' in graph


def test_renderer_exposes_progress_and_dynamic_viewport() -> None:
    graph = (STATIC / "graph.js").read_text(encoding="utf-8")
    css = (STATIC / "graph.css").read_text(encoding="utf-8")

    assert 'progress.setAttribute("role", "progressbar")' in graph
    assert 'world.style.width = worldWidth() + "px"' in graph
    assert 'links.setAttribute("width", String(worldWidth()))' in graph
    assert "graph-node-container" in css
    assert "graph-node-progress" in css
    assert "graph-context-crumb" in css
    assert "graph-loading" in css
