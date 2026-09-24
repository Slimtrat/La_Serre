from __future__ import annotations

from datetime import timedelta
from pathlib import Path

from engine.observability.studio_activity import (
    ActivityGraphTarget,
    StageStatus,
    StudioActivityStore,
)


def test_external_activity_exposes_graph_target_and_live_progress(tmp_path: Path) -> None:
    store = StudioActivityStore(tmp_path)
    activity = store.start(
        title="Casting Belladone",
        message="Préparation",
        graph=ActivityGraphTarget(scope="series", id="series", node_id="series:cast"),
        stages=["prepare", "generate", "download"],
    )

    activity = store.update(
        activity.id,
        stage="prepare",
        status=StageStatus.RUNNING,
        message="Chargement du workflow",
    )
    activity = store.update(
        activity.id,
        stage="generate",
        status=StageStatus.RUNNING,
        message="ComfyUI génère l’image",
    )

    payload = activity.public()
    assert payload["graph"] == {
        "scope": "series",
        "id": "series",
        "node_id": "series:cast",
    }
    assert payload["progress"]["active_stage"] == "generate"  # type: ignore[index]
    assert payload["progress"]["completed"] == 1  # type: ignore[index]
    assert store.active() is not None

    completed = store.complete(activity.id, "Candidate prête")
    assert completed.public()["progress"]["percent"] == 100  # type: ignore[index]
    assert store.active() is None


def test_stale_external_activity_is_not_reported_as_active(tmp_path: Path) -> None:
    store = StudioActivityStore(tmp_path)
    store.start(
        title="Ancienne tâche",
        message="En attente",
        graph=ActivityGraphTarget(scope="series", id="series", node_id="series:cast"),
        stages=["generate"],
    )

    assert store.active(max_age=timedelta(seconds=-1)) is None
