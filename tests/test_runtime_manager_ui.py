from pathlib import Path

STATIC = Path("apps/api/static")


def test_runtime_manager_is_visible_in_guided_settings() -> None:
    html = (STATIC / "index.html").read_text(encoding="utf-8")

    assert 'id="runtime-manager-title"' in html
    assert 'id="runtime-service-list"' in html
    assert 'id="runtime-log-viewer"' in html
    assert 'src="/static/runtime-manager.js"' in html
    assert 'href="/static/runtime-manager.css"' in html


def test_runtime_manager_ui_exposes_safe_actions_and_graph_events() -> None:
    script = (STATIC / "runtime-manager.js").read_text(encoding="utf-8")
    graph = (STATIC / "graph.js").read_text(encoding="utf-8")

    assert 'control(name, action' in script
    assert '"start"), actionButton(service, "stop"), actionButton(service, "restart")' in script
    assert '/logs?limit=250' in script
    assert 'new CustomEvent("studio:runtime"' in script
    assert 'window.addEventListener("studio:runtime"' in graph
    assert 'Démarrer " + service.display_name' in graph
