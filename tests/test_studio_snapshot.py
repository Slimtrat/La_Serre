from __future__ import annotations

import json
import shutil
from pathlib import Path

import httpx

from apps.api.assets import AssetStore
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
from engine.world.catalog import EpisodeCatalog
from engine.world.visual_identity import (
    VisualIdentityRegistry,
    VisualProvenance,
    VisualVariantKind,
    VisualVariantSource,
)

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
    assert [item.code for item in production.blockers] == ["IMAGE_VIDEO_RUNTIME_UNAVAILABLE"]
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
    assert payload["capabilities"]["manual_import"] is True
    assert payload["production"]["assemblable"] is False
    assert len(payload["stages"]) == 8
    assert payload["revision"]


def image_video_runtime() -> dict[str, object]:
    return {"services": [{"name": "comfyui", "state": "ready"}]}


def import_complete_episode(private_root: Path, output_root: Path) -> None:
    package = EpisodeCatalog(private_root).load("S01E001")
    store = AssetStore(output_root)
    for shot in package.shots:
        store.put(shot.id, "video", "clip.mp4", "video/mp4", b"video")
        if shot.dialogue is not None:
            store.put(shot.id, "audio", "voice.wav", "audio/wav", b"voice")


def test_one_keyframe_does_not_complete_ten_shots(tmp_path: Path) -> None:
    private_root, output_root = starter_project(tmp_path)
    shot_dir = output_root / "S01E001-S01"
    shot_dir.mkdir(parents=True)
    (shot_dir / "keyframe.png").write_bytes(b"one-frame")

    snapshot = build_service(private_root, output_root, runtime=image_video_runtime()).build()

    assert snapshot.counts.generated_media == 1
    assert snapshot.production.total_shots == 10
    assert snapshot.production.complete_shots == 0
    assert snapshot.production.assemblable is False
    assert stage(snapshot, "production").status is JourneyStatus.BLOCKED
    assert stage(snapshot, "release").status is JourneyStatus.BLOCKED


def test_ollama_alone_does_not_unlock_image_or_video(tmp_path: Path) -> None:
    private_root, output_root = starter_project(tmp_path)
    snapshot = build_service(
        private_root,
        output_root,
        runtime={"services": [{"name": "ollama", "state": "ready"}]},
    ).build()

    assert snapshot.capabilities.narrative is True
    assert snapshot.capabilities.image is False
    assert snapshot.capabilities.video is False
    production = stage(snapshot, "production")
    assert production.status is JourneyStatus.BLOCKED
    assert production.blockers[0].code == "IMAGE_VIDEO_RUNTIME_UNAVAILABLE"


def test_complete_manual_imports_remain_assemblable_without_runtime(tmp_path: Path) -> None:
    private_root, output_root = starter_project(tmp_path)
    import_complete_episode(private_root, output_root)

    snapshot = build_service(private_root, output_root).build()

    assert snapshot.production.assemblable is True
    assert snapshot.production.present_media == snapshot.production.required_media
    assert snapshot.production.approved_media == snapshot.production.required_media
    assert snapshot.counts.complete_shots == snapshot.counts.shots
    assert stage(snapshot, "production").status is JourneyStatus.COMPLETED
    assert stage(snapshot, "release").status is JourneyStatus.BLOCKED
    assert stage(snapshot, "release").blockers[0].code == "MASTER_REQUIRED"


def test_non_empty_master_is_ready_for_review_but_not_exported(tmp_path: Path) -> None:
    private_root, output_root = starter_project(tmp_path)
    import_complete_episode(private_root, output_root)
    master = output_root / "S01E001" / "episode.mp4"
    master.parent.mkdir(parents=True)
    master.write_bytes(b"master")

    snapshot = build_service(private_root, output_root).build()

    assert snapshot.production.master_available is True
    assert stage(snapshot, "release").status is JourneyStatus.READY
    assert stage(snapshot, "release").status is not JourneyStatus.COMPLETED


def test_foreign_episode_failure_does_not_fail_active_episode(tmp_path: Path) -> None:
    private_root, output_root = starter_project(tmp_path)
    snapshot = build_service(
        private_root,
        output_root,
        runtime=image_video_runtime(),
        jobs=[{"episode_id": "S01E999", "status": "failed"}],
    ).build()

    assert snapshot.counts.failed_jobs == 0
    assert stage(snapshot, "production").status is JourneyStatus.READY


def test_canonical_character_without_visual_master_is_explicit(tmp_path: Path) -> None:
    private_root, output_root = starter_project(tmp_path)

    snapshot = build_service(private_root, output_root).build()
    casting = stage(snapshot, "casting")

    assert casting.status is JourneyStatus.READY
    assert casting.blockers[0].code == "VISUAL_MASTER_REQUIRED"
    assert casting.blockers[0].resolution.code == "OPEN_CASTING"


def test_present_generated_clip_requires_current_human_approval(tmp_path: Path) -> None:
    private_root, output_root = starter_project(tmp_path)
    shot_dir = output_root / "S01E001-S01"
    shot_dir.mkdir(parents=True)
    (shot_dir / "keyframe.png").write_bytes(b"keyframe")
    (shot_dir / "clip.mp4").write_bytes(b"clip")

    snapshot = build_service(private_root, output_root, runtime=image_video_runtime()).build()

    assert snapshot.production.present_media == 1
    assert snapshot.production.approved_media == 0
    production = stage(snapshot, "production")
    assert production.status is JourneyStatus.BLOCKED
    assert production.blockers[0].code == "HUMAN_APPROVAL_REQUIRED"


def test_visual_master_change_persists_stale_cause_after_reload(tmp_path: Path) -> None:
    private_root, output_root = starter_project(tmp_path)
    package = EpisodeCatalog(private_root).load("S01E001")
    shot = next(item for item in package.shots if item.characters)
    shot_dir = output_root / shot.id
    shot_dir.mkdir(parents=True)
    (shot_dir / "generation.json").write_text("{}", encoding="utf-8")
    registry = VisualIdentityRegistry(private_root, output_root)
    board, variant = registry.add_image(
        character_id=shot.characters[0].id,
        kind=VisualVariantKind.PORTRAIT,
        content=b"master-image",
        media_type="image/png",
        permanent_identity="Identité visuelle persistante de test",
        outfit="",
        transient_state="",
        provenance=VisualProvenance(
            source=VisualVariantSource.IMPORTED,
            source_label="fixture",
            license="test-only",
        ),
        expected_revision=0,
    )
    registry.approve(
        shot.characters[0].id,
        variant.id,
        expected_revision=board.revision,
    )

    first = build_service(private_root, output_root).build()
    second = build_service(private_root, output_root).build()

    assert first.stale_artifacts == second.stale_artifacts
    assert any(
        item.get("id") == shot.id and item.get("reason") == "visual_identity_changed"
        for item in first.stale_artifacts
    )
    assert stage(first, "production").status is JourneyStatus.STALE
