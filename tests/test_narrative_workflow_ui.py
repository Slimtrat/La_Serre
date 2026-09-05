from pathlib import Path

STATIC = Path("apps/api/static")


def test_authoring_workflow_is_available_without_a_json_editor() -> None:
    index = (STATIC / "index.html").read_text(encoding="utf-8")
    script = (STATIC / "narrative-workflow.js").read_text(encoding="utf-8")
    styles = (STATIC / "narrative-workflow.css").read_text(encoding="utf-8")

    assert 'id="narrative-workflow-open"' in index
    assert 'data-i18n-title="narrative.openTitle"' in index
    assert 'data-i18n="narrative.open"' in index
    assert "/static/narrative-workflow.js" in index
    assert "/static/narrative-workflow.css" in index
    for stage in ("director", "screenwriter", "validator"):
        assert f'id="{stage}-stage"' in script
    assert "/api/narrative/series/${stage}/approve" in script
    assert "Une proposition IA reste candidate" in script
    assert 'id="episode-review"' in script
    assert 'id="breakdown-editor"' in script
    assert 'data-shot="action"' in script
    assert ".narrative-workflow-dialog" in styles
    assert 'textarea id="shot-editor"' not in script


def test_authoring_workflow_is_fully_reactive_in_french_and_english() -> None:
    script = (STATIC / "narrative-workflow.js").read_text(encoding="utf-8")

    assert 'window.SerreI18n?.register?.("fr", { narrative: COPY.fr })' in script
    assert 'window.SerreI18n?.register?.("en", { narrative: COPY.en })' in script
    for english_copy in (
        'title: "Story room"',
        'screenwriter: "Screenwriter"',
        'breakdown: "Shot breakdown"',
        'confirmTrash: "Move {id} to recoverable trash?"',
        'episodeSaved: "Episode saved in writing."',
        'noInconsistency: "No inconsistency detected."',
    ):
        assert english_copy in script
    assert 'function t(key, params = {})' in script
    assert 'window.confirm(t("errors.confirmTrash", { id: currentEpisode.id }))' in script
    assert 'window.addEventListener("serre:i18n-changed", relocalize)' in script
    assert 't(`episodeStatus.${currentEpisode.status}`)' in script
    assert 'select.options[0].textContent = t("ollamaOffline")' in script


def test_episode_authoring_refreshes_the_existing_navigation() -> None:
    authoring = (STATIC / "narrative-workflow.js").read_text(encoding="utf-8")
    episode = (STATIC / "episode.js").read_text(encoding="utf-8")

    assert "window.SerreEpisode?.refresh?." in authoring
    assert "refresh: initEpisodeCatalog" in episode
    assert "preferredEpisodeId" in episode


def test_series_graph_opens_the_same_authoring_workflow() -> None:
    graph = (STATIC / "graph.js").read_text(encoding="utf-8")

    assert 'value === "authoring-series"' in graph
    assert 'window.SerreNarrativeWorkflow?.open("series")' in graph
