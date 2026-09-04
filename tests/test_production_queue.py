from __future__ import annotations

import asyncio
import json
from pathlib import Path
from types import SimpleNamespace
from typing import Any, cast

import httpx
import pytest
from fastapi import FastAPI

from apps.api.assets import AssetStore
from apps.api.job_manager import JobManager, StudioJob
from apps.api.production_queue import (
    ProductionQueueManager,
    QueueKind,
    QueueStatus,
)
from apps.api.production_queue_routes import create_production_queue_router
from apps.api.stage_actions import ShotStageService
from engine.config import Settings
from engine.director.models import Shot
from engine.generation.comfy.client import ComfyClient
from engine.generation.comfy.executor import ComfyWorkflowExecutor
from engine.world.catalog import EpisodeCatalog


def shot_payload(shot_id: str = "S01E001-S01") -> dict[str, object]:
    raw = json.loads(Path("examples/shot.json").read_text(encoding="utf-8"))
    assert isinstance(raw, dict)
    raw["id"] = shot_id
    characters = raw.get("characters")
    assert isinstance(characters, list) and isinstance(characters[0], dict)
    raw["dialogue"] = {
        "speaker": characters[0]["id"],
        "text": "Ne touche pas à cette fleur.",
    }
    return cast(dict[str, object], raw)


class FakeJobs:
    def __init__(self, outcomes: dict[str, str] | None = None) -> None:
        self.outcomes = outcomes or {}
        self.started: list[tuple[str, str, str]] = []
        self.cancelled: list[str] = []
        self.jobs: dict[str, StudioJob] = {}

    async def start(
        self,
        shot: dict[str, object],
        mode: str,
        force: bool,
        keyframe_source: str,
    ) -> StudioJob:
        del force
        shot_id = str(shot["id"])
        self.started.append((shot_id, mode, keyframe_source))
        job = StudioJob(id=f"job-{len(self.started)}", shot_id=shot_id, mode=mode)  # type: ignore[arg-type]
        job.status = self.outcomes.get(shot_id, "GENERATED")
        job.message = "simulated " + job.status.lower()
        self.jobs[job.id] = job
        return job

    async def cancel(self, job_id: str) -> bool:
        self.cancelled.append(job_id)
        job = self.jobs[job_id]
        job.status = "CANCELLED"
        job.message = "cancelled"
        return True


class FakeStages:
    def __init__(self, failures: set[str] | None = None) -> None:
        self.failures = failures or set()
        self.started: list[tuple[str, str]] = []

    def generate(
        self,
        kind: str,
        shot: dict[str, object],
        *,
        tts: str,
    ) -> dict[str, object]:
        del tts
        shot_id = str(shot["id"])
        self.started.append((shot_id, kind))
        if shot_id in self.failures:
            raise RuntimeError("isolated failure")
        return {"message": f"{kind} ready"}


class FakeCatalog:
    def __init__(self, shots: list[Shot]) -> None:
        self.shots = shots

    def load(self, episode_id: str) -> SimpleNamespace:
        assert episode_id == "S01E001"
        return SimpleNamespace(shots=self.shots)


def queue_manager(
    settings_provider: Any,
    *,
    jobs: FakeJobs | None = None,
    stages: FakeStages | None = None,
    shots: list[Shot] | None = None,
) -> ProductionQueueManager:
    fake_jobs = jobs or FakeJobs()
    fake_stages = stages or FakeStages()
    fake_catalog = FakeCatalog(shots or [])
    return ProductionQueueManager(
        settings_provider,
        lambda: cast(EpisodeCatalog, fake_catalog),
        cast(JobManager, fake_jobs),
        cast(ShotStageService, fake_stages),
        poll_interval_seconds=0.01,
    )


async def wait_for_queue(manager: ProductionQueueManager) -> None:
    for _ in range(100):
        worker = manager._worker
        if worker is None:
            return
        await asyncio.sleep(0.01)
    raise AssertionError("queue worker did not stop")


async def wait_for_running_item(manager: ProductionQueueManager) -> dict[str, object]:
    for _ in range(100):
        item = next(
            (
                candidate
                for candidate in cast(list[dict[str, object]], manager.listing()["items"])
                if candidate["status"] == "running"
            ),
            None,
        )
        if item:
            return item
        await asyncio.sleep(0.01)
    raise AssertionError("queue item did not start")


async def test_queue_is_persistent_prioritized_and_isolated_per_project(
    tmp_path: Path,
) -> None:
    settings_a = Settings(_env_file=None, output_dir=tmp_path / "project-a")
    settings_b = Settings(_env_file=None, output_dir=tmp_path / "project-b")
    active = [settings_a]
    manager = queue_manager(lambda: active[0])
    await manager.pause()

    low = await manager.enqueue(shot_payload("S01E001-S01"), QueueKind.KEYFRAME)
    high = await manager.enqueue(shot_payload("S01E001-S02"), QueueKind.KEYFRAME, priority=40)
    listing_a = manager.listing()
    assert manager.has_active_jobs() is False
    active[0] = settings_b
    listing_b = manager.listing()
    restored = queue_manager(lambda: settings_a).listing()
    listing_a_items = cast(list[dict[str, object]], listing_a["items"])
    restored_items = cast(list[dict[str, object]], restored["items"])

    assert [item["id"] for item in listing_a_items] == [high["id"], low["id"]]
    assert listing_b["items"] == []
    assert restored["paused"] is True
    assert restored["recovered"] is True
    assert [item["shot_id"] for item in restored_items] == [
        "S01E001-S02",
        "S01E001-S01",
    ]
    assert (settings_a.output_dir / ".studio" / "production-queue.json").is_file()


async def test_failed_task_does_not_block_the_next_plan(tmp_path: Path) -> None:
    settings = Settings(_env_file=None, output_dir=tmp_path / "output")
    jobs = FakeJobs(
        {
            "S01E001-S01": "FAILED",
            "S01E001-S02": "AWAITING_KEYFRAME_APPROVAL",
        }
    )
    manager = queue_manager(lambda: settings, jobs=jobs)
    await manager.pause()
    await manager.enqueue(shot_payload("S01E001-S01"), QueueKind.KEYFRAME)
    await manager.enqueue(shot_payload("S01E001-S02"), QueueKind.KEYFRAME)

    await manager.resume()
    await wait_for_queue(manager)
    statuses = {
        item["shot_id"]: item["status"]
        for item in cast(list[dict[str, object]], manager.listing()["items"])
    }

    assert statuses == {
        "S01E001-S01": QueueStatus.FAILED,
        "S01E001-S02": QueueStatus.AWAITING_APPROVAL,
    }
    assert len(jobs.started) == 2


async def test_video_requires_approval_bound_to_the_current_keyframe(
    tmp_path: Path,
) -> None:
    settings = Settings(_env_file=None, output_dir=tmp_path / "output")
    destination = settings.output_dir / "S01E001-S01"
    destination.mkdir(parents=True)
    keyframe = destination / "keyframe.png"
    keyframe.write_bytes(b"first version")
    manager = queue_manager(lambda: settings)
    await manager.pause()

    with pytest.raises(ValueError, match="approbation humaine"):
        await manager.enqueue(shot_payload(), QueueKind.VIDEO)

    approval = manager.approve_keyframe("S01E001-S01")
    queued = await manager.enqueue(shot_payload(), QueueKind.VIDEO)
    keyframe.write_bytes(b"second version")

    with pytest.raises(ValueError, match="approbation humaine"):
        await manager.enqueue(shot_payload(), QueueKind.VIDEO)

    assert approval["sha256"]
    assert queued["keyframe_source"] == "model"


async def test_missing_batch_queues_work_but_preserves_human_video_gate(
    tmp_path: Path,
) -> None:
    settings = Settings(_env_file=None, output_dir=tmp_path / "output")
    shots = [Shot.model_validate(shot_payload(f"S01E001-S{index:02d}")) for index in range(1, 4)]
    for shot_id in ("S01E001-S02", "S01E001-S03"):
        destination = settings.output_dir / shot_id
        destination.mkdir(parents=True)
        (destination / "keyframe.png").write_bytes(shot_id.encode())
    manager = queue_manager(lambda: settings, shots=shots)
    await manager.pause()
    manager.approve_keyframe("S01E001-S03")

    result, listing = await manager.enqueue_missing("S01E001")
    items = cast(list[dict[str, object]], listing["items"])
    tasks = {(item["shot_id"], item["kind"]) for item in items}

    assert tasks == {
        ("S01E001-S01", "keyframe"),
        ("S01E001-S01", "voice"),
        ("S01E001-S02", "voice"),
        ("S01E001-S03", "video"),
        ("S01E001-S03", "voice"),
    }
    assert any(
        item["shot_id"] == "S01E001-S02" and "non approuvée" in item["reason"]
        for item in result.skipped
    )
    episode = listing["episodes"][0]  # type: ignore[index]
    assert episode["id"] == "S01E001"
    assert episode["total"] == 5


async def test_running_queue_item_can_cancel_its_linked_job(tmp_path: Path) -> None:
    settings = Settings(_env_file=None, output_dir=tmp_path / "output")
    jobs = FakeJobs({"S01E001-S01": "GENERATING"})
    manager = queue_manager(lambda: settings, jobs=jobs)

    await manager.enqueue(shot_payload(), QueueKind.KEYFRAME)
    item = await wait_for_running_item(manager)
    cancelled = await manager.cancel(str(item["id"]))
    await wait_for_queue(manager)

    assert cancelled["status"] == "cancelled"
    assert jobs.cancelled == ["job-1"]


async def test_queue_router_exposes_explicit_controls(tmp_path: Path) -> None:
    settings = Settings(_env_file=None, output_dir=tmp_path / "output")
    manager = queue_manager(lambda: settings)
    await manager.pause()
    app = FastAPI()
    app.include_router(create_production_queue_router(manager))
    transport = httpx.ASGITransport(app=app)

    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        queued = await client.post(
            "/api/production-queue/items",
            json={"shot": shot_payload(), "kind": "keyframe", "priority": 12},
        )
        listing = await client.get("/api/production-queue")
        resumed = await client.post("/api/production-queue/resume")

    assert queued.status_code == 202
    assert queued.json()["priority"] == 12
    assert listing.json()["paused"] is True
    assert resumed.status_code == 200
    await wait_for_queue(manager)


async def test_job_manager_cancel_marks_job_and_stops_task(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    started = asyncio.Event()

    class FakeComfyClient:
        def __init__(self, *_args: object, **_kwargs: object) -> None:
            pass

        async def __aenter__(self) -> FakeComfyClient:
            return self

        async def __aexit__(self, *_args: object) -> None:
            return None

    class BlockingPipeline:
        def __init__(self, *_args: object, **_kwargs: object) -> None:
            pass

        async def run(self, _options: object) -> object:
            started.set()
            await asyncio.Event().wait()
            raise AssertionError("unreachable")

    profile = tmp_path / "profile.json"
    profile.write_text("{}", encoding="utf-8")
    settings = Settings(
        _env_file=None,
        output_dir=tmp_path / "output",
        keyframe_workflow_profile=profile,
        keyframe_guide_workflow_profile=profile,
        video_workflow_profile=profile,
    )
    monkeypatch.setattr("apps.api.job_manager.ComfyClient", FakeComfyClient)
    monkeypatch.setattr("apps.api.job_manager.ShotPipeline", BlockingPipeline)
    monkeypatch.setattr(
        "apps.api.job_manager.BibleRegistry.resolve_shot",
        lambda _registry, shot, **_kwargs: shot,
    )
    manager = JobManager(lambda: settings, lambda: AssetStore(settings.output_dir))
    job = await manager.start(shot_payload(), "keyframe", False)
    await asyncio.wait_for(started.wait(), timeout=1)

    assert await manager.cancel(job.id) is True
    assert job.status == "CANCELLED"
    assert job.completed_at is not None
    assert not manager.has_active_jobs()


async def test_executor_cancels_comfy_prompt_when_task_is_cancelled() -> None:
    waiting = asyncio.Event()
    cancelled: list[str] = []

    class FakeClient:
        async def submit_workflow(self, _workflow: object) -> str:
            return "prompt-42"

        async def wait(self, _prompt_id: str, _timeout: float | None) -> None:
            waiting.set()
            await asyncio.Event().wait()

        async def cancel(self, prompt_id: str) -> None:
            cancelled.append(prompt_id)

    class FakeLoader:
        def load(self, _path: Path) -> object:
            return object()

    class FakeMapper:
        def map(self, _loaded: object, _context: object) -> dict[str, object]:
            return {}

    executor = ComfyWorkflowExecutor(
        cast(ComfyClient, FakeClient()),
        loader=cast(Any, FakeLoader()),
        mapper=cast(Any, FakeMapper()),
    )
    task = asyncio.create_task(executor.execute(Path("unused.json"), {}))
    await asyncio.wait_for(waiting.wait(), timeout=1)
    task.cancel()

    with pytest.raises(asyncio.CancelledError):
        await task
    assert cancelled == ["prompt-42"]
