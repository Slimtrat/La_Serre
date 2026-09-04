from pathlib import Path

import httpx
from fastapi import FastAPI

from apps.api.context_graph import ContextGraphBuilder, create_context_graph_router
from apps.api.graph_contract import GraphRuntimeState, GraphScope, GraphStructure
from engine.world.catalog import EpisodeCatalog

PRIVATE = Path(".private")


def test_one_graph_contract_builds_series_episode_and_shot_scopes(tmp_path: Path) -> None:
    builder = ContextGraphBuilder(EpisodeCatalog(PRIVATE), tmp_path / "output")

    series = builder.series()
    episode = builder.episode("S01E001")
    shot = builder.shot("S01E001-S01")

    assert series.scope is GraphScope.SERIES
    series_cast = next(node for node in series.nodes if node.id == "series:cast")
    assert series_cast.type_label == "BIBLE · SÉRIE"
    assert any(action.value == "characters" for action in series_cast.actions)
    first_episode = next(node for node in series.nodes if node.container is not None)
    assert first_episode.container is not None
    assert first_episode.container.scope is GraphScope.EPISODE
    assert episode.scope is GraphScope.EPISODE
    assert episode.parent is not None
    assert episode.parent.scope is GraphScope.SERIES
    shot_containers = [node for node in episode.nodes if node.container]
    assert len(shot_containers) == 10
    for node in shot_containers:
        assert node.container is not None
        assert node.container.scope is GraphScope.SHOT
    assert shot.scope is GraphScope.SHOT
    assert shot.parent is not None
    assert shot.parent.id == "S01E001"


def test_shot_graph_preserves_pipeline_and_data_driven_actions(tmp_path: Path) -> None:
    graph = ContextGraphBuilder(
        EpisodeCatalog(PRIVATE),
        tmp_path / "output",
    ).shot("S01E001-S01")

    assert [node.id for node in graph.nodes] == [
        "story",
        "director",
        "shot",
        "cast",
        "keyframe",
        "review",
        "motion",
        "voice",
        "mix",
        "montage",
        "export",
    ]
    assert len(graph.edges) == 12
    assert sum(edge.structure is GraphStructure.OPTIONAL for edge in graph.edges) == 5
    actions = {
        (node.id, action.kind.value, action.value)
        for node in graph.nodes
        for action in node.actions
    }
    assert ("keyframe", "generate", "keyframe") in actions
    assert ("keyframe", "workflow", "keyframe") in actions
    assert ("voice", "stage", "voice") in actions
    assert ("voice", "import", "audio") in actions
    assert ("mix", "stage", "music") in actions
    assert ("shot", "validate", "all") in actions
    assert ("story", "validate", "story") in actions
    assert ("cast", "validate", "characters") in actions
    assert next(node for node in graph.nodes if node.id == "shot").label == (
        "Validation du découpage"
    )


def test_graph_runtime_and_progress_follow_generated_artifacts(tmp_path: Path) -> None:
    output = tmp_path / "output"
    shot_output = output / "S01E001-S01"
    shot_output.mkdir(parents=True)
    for filename in (
        "keyframe.png",
        "keyframe-guide-1.png",
        "keyframe-guide-2.png",
        "clip.mp4",
        "voice.wav",
    ):
        (shot_output / filename).write_bytes(b"generated")
    episode_output = output / "S01E001"
    episode_output.mkdir()
    (episode_output / "music.wav").write_bytes(b"music")
    (episode_output / "episode.mp4").write_bytes(b"master")

    graph = ContextGraphBuilder(EpisodeCatalog(PRIVATE), output).shot("S01E001-S01")
    nodes = {node.id: node for node in graph.nodes}

    assert nodes["keyframe"].state is GraphRuntimeState.DONE
    assert nodes["keyframe"].progress is not None
    assert nodes["keyframe"].progress.percent == 100
    assert nodes["motion"].state is GraphRuntimeState.DONE
    assert nodes["voice"].state is GraphRuntimeState.DONE
    assert nodes["mix"].state is GraphRuntimeState.DONE
    assert nodes["export"].state is GraphRuntimeState.DONE


def test_empty_series_graph_is_actionable_and_valid(tmp_path: Path) -> None:
    graph = ContextGraphBuilder(
        EpisodeCatalog(tmp_path / "private"),
        tmp_path / "output",
    ).series()

    assert graph.id == "series"
    assert graph.progress is not None
    assert graph.progress.total == 0
    assert [node.id for node in graph.nodes] == ["series:cast", "series:empty"]
    assert graph.nodes[0].label == "Personnages"
    assert graph.nodes[0].state is GraphRuntimeState.BLOCKED
    assert graph.nodes[1].label == "Projet sans épisode"
    assert graph.nodes[1].state is GraphRuntimeState.BLOCKED


async def test_context_graph_router_serves_common_dto_and_errors(tmp_path: Path) -> None:
    app = FastAPI()
    app.include_router(
        create_context_graph_router(
            lambda: EpisodeCatalog(PRIVATE),
            lambda: tmp_path / "output",
        )
    )
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        series = await client.get("/api/graphs/series/series")
        episode = await client.get("/api/graphs/episode/S01E001")
        shot = await client.get("/api/graphs/shot/S01E001-S01")
        unknown = await client.get("/api/graphs/episode/S09E999")
        invalid = await client.get("/api/graphs/unknown/nope")

    assert series.status_code == 200
    assert episode.status_code == 200
    assert shot.status_code == 200
    for response, scope in (
        (series, "series"),
        (episode, "episode"),
        (shot, "shot"),
    ):
        payload = response.json()
        assert payload["scope"] == scope
        assert {"id", "nodes", "edges", "viewport", "progress"} <= payload.keys()
    assert unknown.status_code == 404
    assert invalid.status_code == 422
