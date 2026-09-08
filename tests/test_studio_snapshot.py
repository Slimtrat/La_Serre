from __future__ import annotations

import json
import shutil
from pathlib import Path

import httpx

from apps.api.main import create_app
from apps.api.studio_snapshot import (
    JourneyStageId,
    JourneyStageSnapshot,
    JourneyStatus,
    StudioJourneyService,
    StudioJourneySnapshot,
)
from engine.config import Settings
from engine.world.bible import BibleRegistry

ROOT = Path(__file__).parents[1]
STARTER = ROOT / "starter_catalog"
FIXTURE = ROOT / "tests" / "fixtures" / "tentafruit-journey-snapshot.json"


def build_service(
    private_root: Path,
    output_root: Path,
    *,
    runtime: dict[str, object] | None = None,
    queue: dict[str, object] | None = None,
    jobs: list[dict[str, object]] | None = None,
) -> StudioJourneyService:
    return StudioJourneyService(
        project_id="tentafruit",
        private_root=private_root,
        output_root=output_root,
        runtime_provider=lambda: runtime or {"enabled": False, "services": []},
        queue_provider=lambda: queue or {"items": []},
        jobs_provider=lambda: jobs or [],
    )


def stage(
    snapshot: StudioJourneySnapshot,
    identifier: JourneyStageId,
) -> JourneyStageSnapshot:
    return next(item for item in snapshot.stages if item.id == identifier)


def starter_project(tmp_path: Path) -> tuple[Path, Path]:
    private_root = tmp_path / "private"
    output_root = tmp_path / "output"
    shutil.copytree(STARTER, private_root)
    output_root.mkdir()
    return private_root, output_root


def test_empty_project_is_deterministic_and_exposes_every_stage(tmp_path: Path) -> None:
    private_root = tmp_path / "private"
    output_root = tmp_path / "output"

    first = build_service(private_root, output_root).build()
    second = build_service(private_root, output_root).build()

    assert first == second
    assert len(first.revision) == 64
    assert [item.id for item in first.stages] == [
        "idea",
        "casting",
        "relationships",
        "season",
        "episode",
        "storyboard",
        "production",
        "release",
    ]
    assert all(item.primary_action.code for item in first.stages)
    assert first.counts.episodes == 0


def test_missing_runtime_is_actionable_and_preserves_manual_import(
    tmp_path: Path,
) -> None:
    private_root, output_root = starter_project(tmp_path)

    snapshot = build_service(private_root, output_root).build()
    production = stage(snapshot, "production")

    assert production.status is JourneyStatus.BLOCKED
    assert [item.code for item in production.blockers] == ["RUNTIME_UNAVAILABLE"]
    assert production.blockers[0].resolution.code == "CONFIGURE_RUNTIME"
    assert production.primary_action.code == "IMPORT_OR_GENERATE_MEDIA"


def test_active_job_marks_production_running(tmp_path: Path) -> None:
    private_root, output_root = starter_project(tmp_path)

    snapshot = build_service(
        private_root,
        output_root,
        jobs=[{"status": "GENERATING"}],
    ).build()

    assert snapshot.counts.active_jobs == 1
    assert stage(snapshot, "production").status is JourneyStatus.RUNNING


def test_human_approval_is_distinct_from_failure(tmp_path: Path) -> None:
    private_root, output_root = starter_project(tmp_path)
    approval = build_service(
        private_root,
        output_root,
        queue={"items": [{"status": "awaiting_approval"}]},
    ).build()
    failure = build_service(
        private_root,
        output_root,
        queue={"items": [{"status": "failed"}]},
    ).build()

    approval_stage = stage(approval, "production")
    assert approval_stage.status is JourneyStatus.BLOCKED
    assert approval_stage.blockers[0].code == "HUMAN_APPROVAL_REQUIRED"
    assert stage(failure, "production").status is JourneyStatus.FAILED


def test_bible_change_marks_generated_episode_stale(tmp_path: Path) -> None:
    private_root, output_root = starter_project(tmp_path)
    episode_output = output_root / "S01E001"
    episode_output.mkdir(parents=True)
    (episode_output / "episode.mp4").write_bytes(b"video")
    (episode_output / "episode-generation.json").write_text(
        json.dumps({"inputs": {"canonical_context": {"revision": 0}}}),
        encoding="utf-8",
    )
    registry = BibleRegistry(private_root)
    bible = registry.load()
    aconit = next(item for item in bible.characters if item.id == "aconit")
    registry.put_character(
        aconit.model_copy(update={"voice_description": aconit.voice_description + " grave"})
    )

    snapshot = build_service(private_root, output_root).build()

    assert snapshot.counts.stale_artifacts >= 1
    assert stage(snapshot, "production").status is JourneyStatus.STALE
    assert stage(snapshot, "release").status is JourneyStatus.STALE
    assert any(item["id"] == "S01E001" for item in snapshot.stale_artifacts)


def test_tentafruit_contract_fixture(tmp_path: Path) -> None:
    private_root, output_root = starter_project(tmp_path)
    snapshot = build_service(private_root, output_root).build()
    expected = json.loads(FIXTURE.read_text(encoding="utf-8"))

    assert {
        "project_id": snapshot.project_id,
        "active_episode_id": snapshot.active_episode_id,
        "counts": {
            "episodes": snapshot.counts.episodes,
            "shots": snapshot.counts.shots,
        },
        "stages": {item.id: item.status.value for item in snapshot.stages},
    } == expected


async def test_journey_api_returns_the_active_project_read_model(tmp_path: Path) -> None:
    settings = Settings(
        _env_file=None,
        private_content_dir=tmp_path / "private",
        output_dir=tmp_path / "output",
    )
    app = create_app(settings)
    transport = httpx.ASGITransport(app=app)

    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/api/studio/journey")

    assert response.status_code == 200
    payload = response.json()
    assert payload["project_id"] == "default"
    assert payload["active_episode_id"] is None
    assert len(payload["stages"]) == 8
    assert payload["revision"]
