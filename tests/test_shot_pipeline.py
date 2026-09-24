from __future__ import annotations

import asyncio
import json
from pathlib import Path

import httpx

from engine.generation.comfy.client import ComfyClient
from engine.generation.models import GenerationState
from engine.production.shot_pipeline import ShotPipeline, ShotPipelineOptions


def _write_profile(
    tmp_path: Path, name: str, video: bool, *, multi_reference: bool = False
) -> Path:
    nodes: dict[str, object] = {
        "3": {"class_type": "Sampler", "inputs": {"seed": 0}},
        "6": {"class_type": "Text", "inputs": {"text": ""}},
        "9": {"class_type": "Save", "inputs": {"filename_prefix": ""}},
        "12": {"class_type": "Canvas", "inputs": {"width": 0, "height": 0}},
    }
    bindings = [
        {"source": "seed", "node_id": "3", "input": "seed"},
        {"source": "prompt", "node_id": "6", "input": "text"},
        {"source": "output_prefix", "node_id": "9", "input": "filename_prefix"},
        {"source": "width", "node_id": "12", "input": "width"},
        {"source": "height", "node_id": "12", "input": "height"},
    ]
    if video:
        nodes["10"] = {"class_type": "LoadImage", "inputs": {"image": ""}}
        if multi_reference:
            for index, node_id in enumerate(("30", "31", "32"), start=1):
                nodes[node_id] = {"class_type": "LoadImage", "inputs": {"image": ""}}
                bindings.append(
                    {
                        "source": f"character_reference_image_{index}",
                        "node_id": node_id,
                        "input": "image",
                    }
                )
            for index, node_id in enumerate(("40", "41", "42"), start=1):
                nodes[node_id] = {"class_type": "Weight", "inputs": {"weight": 0.0}}
                bindings.append(
                    {
                        "source": f"character_reference_weight_{index}",
                        "node_id": node_id,
                        "input": "weight",
                    }
                )
        else:
            bindings.append(
                {"source": "reference_image", "node_id": "10", "input": "image"}
            )
    workflow_path = tmp_path / f"{name}.api.json"
    workflow_path.write_text(json.dumps(nodes), encoding="utf-8")
    profile_path = tmp_path / f"{name}.profile.json"
    profile_path.write_text(
        json.dumps(
            {
                "schema_version": 1,
                "id": name,
                "workflow": workflow_path.name,
                "bindings": bindings,
                "output_node_ids": ["9"],
            }
        ),
        encoding="utf-8",
    )
    return profile_path


async def test_pipeline_produces_traceable_keyframe_and_clip(tmp_path: Path) -> None:
    prompt_ids = iter(
        ("keyframe-start-job", "keyframe-middle-job", "keyframe-end-job", "video-job")
    )
    canvas_widths: list[int] = []

    def handler(request: httpx.Request) -> httpx.Response:
        if request.method == "POST" and request.url.path == "/prompt":
            payload = json.loads(request.content)
            canvas_widths.append(payload["prompt"]["12"]["inputs"]["width"])
            return httpx.Response(200, json={"prompt_id": next(prompt_ids)})
        if request.method == "POST" and request.url.path == "/upload/image":
            return httpx.Response(200, json={"name": "keyframe.png", "type": "input"})
        if request.url.path.startswith("/history/"):
            prompt_id = request.url.path.rsplit("/", 1)[-1]
            filename = "source.mp4" if prompt_id == "video-job" else f"{prompt_id}.png"
            kind = "gifs" if prompt_id == "video-job" else "images"
            return httpx.Response(
                200,
                json={
                    prompt_id: {
                        "status": {"status_str": "success", "completed": True},
                        "outputs": {
                            "9": {kind: [{"filename": filename, "subfolder": "", "type": "output"}]}
                        },
                    }
                },
            )
        if request.url.path == "/view":
            filename = request.url.params["filename"]
            return httpx.Response(
                200, content=b"png-bytes" if filename.endswith(".png") else b"mp4-bytes"
            )
        raise AssertionError(f"Unexpected request: {request.method} {request.url}")

    shot_text = await asyncio.to_thread(Path("examples/shot.json").read_text, encoding="utf-8")
    shot_payload = json.loads(shot_text)
    shot_payload["visual_beats"] = [
        {"id": "start", "at": 0, "description": "Belladone reaches toward the lock"},
        {"id": "middle", "at": 0.5, "description": "the lock snaps at her vine"},
        {"id": "end", "at": 1, "description": "she recoils while petals scatter"},
    ]
    shot_path = tmp_path / "shot.json"
    shot_path.write_text(json.dumps(shot_payload), encoding="utf-8")
    keyframe_profile = _write_profile(tmp_path, "keyframe", video=False)
    keyframe_guide_profile = _write_profile(tmp_path, "keyframe-guide", video=True)
    video_profile = _write_profile(tmp_path, "video", video=True)
    imports = tmp_path / "output" / "S01E001-S01" / "imports"
    imports.mkdir(parents=True)
    (imports / "story.md").write_text("Brief importé", encoding="utf-8")
    progress: list[tuple[str, str, str]] = []
    async with ComfyClient(
        "http://comfy.test",
        transport=httpx.MockTransport(handler),
        poll_interval_seconds=0.001,
    ) as client:
        record = await ShotPipeline(
            client,
            on_progress=lambda stage, status, message: progress.append((stage, status, message)),
        ).run(
            ShotPipelineOptions(
                shot_path=shot_path,
                output_root=tmp_path / "output",
                keyframe_profile=keyframe_profile,
                keyframe_guide_profile=keyframe_guide_profile,
                video_profile=video_profile,
                keyframe_width=768,
                keyframe_height=1024,
            )
        )

    destination = tmp_path / "output" / "S01E001-S01"
    assert record.status is GenerationState.GENERATED
    assert canvas_widths == [768, 768, 768, 576]
    assert (destination / "keyframe.png").read_bytes() == b"png-bytes"
    assert (destination / "keyframe-guide-1.png").read_bytes() == b"png-bytes"
    assert (destination / "keyframe-guide-2.png").read_bytes() == b"png-bytes"
    assert (destination / "clip.mp4").read_bytes() == b"mp4-bytes"
    assert (destination / "prompt.txt").is_file()
    manifest = json.loads((destination / "generation.json").read_text(encoding="utf-8"))
    assert manifest["seed"] == 384723
    assert [stage["prompt_id"] for stage in manifest["stages"]] == [
        "keyframe-start-job",
        "keyframe-middle-job",
        "keyframe-end-job",
        "video-job",
    ]
    assert [
        message
        for stage, status, message in progress
        if stage == "keyframe" and status == "running" and "disponible" in message
    ] == [
        "Pose 1/3 disponible",
        "Pose 2/3 disponible",
        "Pose 3/3 disponible",
    ]


async def test_first_keyframe_uses_character_reference_profile(tmp_path: Path) -> None:
    submitted: list[dict[str, object]] = []

    def handler(request: httpx.Request) -> httpx.Response:
        if request.method == "POST" and request.url.path == "/upload/image":
            return httpx.Response(200, json={"name": "master.png", "type": "input"})
        if request.method == "POST" and request.url.path == "/prompt":
            submitted.append(json.loads(request.content)["prompt"])
            return httpx.Response(200, json={"prompt_id": "keyframe-job"})
        if request.url.path == "/history/keyframe-job":
            return httpx.Response(
                200,
                json={
                    "keyframe-job": {
                        "status": {"status_str": "success", "completed": True},
                        "outputs": {
                            "9": {
                                "images": [
                                    {"filename": "keyframe.png", "subfolder": "", "type": "output"}
                                ]
                            }
                        },
                    }
                },
            )
        if request.url.path == "/view":
            return httpx.Response(200, content=b"png-bytes")
        raise AssertionError(f"Unexpected request: {request.method} {request.url}")

    shot_text = await asyncio.to_thread(Path("examples/shot.json").read_text, encoding="utf-8")
    shot_payload = json.loads(shot_text)
    reference = tmp_path / "master.png"
    reference.write_bytes(b"reference")
    shot_payload["characters"][0]["reference_images"] = [str(reference)]
    shot_path = tmp_path / "shot.json"
    shot_path.write_text(json.dumps(shot_payload), encoding="utf-8")
    standard = _write_profile(tmp_path, "standard", video=False)
    reference_profile = _write_profile(
        tmp_path, "reference", video=True, multi_reference=True
    )
    video = _write_profile(tmp_path, "video", video=True)

    async with ComfyClient(
        "http://comfy.test",
        transport=httpx.MockTransport(handler),
        poll_interval_seconds=0.001,
    ) as client:
        await ShotPipeline(client).run(
            ShotPipelineOptions(
                shot_path=shot_path,
                output_root=tmp_path / "output",
                keyframe_profile=standard,
                keyframe_reference_profile=reference_profile,
                video_profile=video,
                keyframe_only=True,
            )
        )

    assert submitted[0]["30"]["inputs"]["image"] == "master.png"


def test_force_resume_preserves_all_three_input_poses(tmp_path: Path) -> None:
    destination = tmp_path / "S01E001-S01"
    destination.mkdir()
    start = destination / "keyframe.png"
    middle = destination / "keyframe-guide-1.png"
    end = destination / "keyframe-guide-2.png"
    for path in (start, middle, end):
        path.write_bytes(path.name.encode())
    (destination / "clip.mp4").write_bytes(b"old-video")

    ShotPipeline._prepare_destination(
        destination,
        True,
        start,
        (middle, end),
    )

    assert start.is_file()
    assert middle.is_file()
    assert end.is_file()
    assert not (destination / "clip.mp4").exists()


async def test_multiple_character_masters_are_mapped_to_separate_ipadapters(tmp_path: Path) -> None:
    uploads: list[str] = []
    submitted: list[dict[str, object]] = []

    def handler(request: httpx.Request) -> httpx.Response:
        if request.method == "POST" and request.url.path == "/upload/image":
            name = f"upload-{len(uploads) + 1}.png"
            uploads.append(name)
            return httpx.Response(200, json={"name": name, "type": "input"})
        if request.method == "POST" and request.url.path == "/prompt":
            submitted.append(json.loads(request.content)["prompt"])
            return httpx.Response(200, json={"prompt_id": "keyframe-job"})
        if request.url.path == "/history/keyframe-job":
            return httpx.Response(
                200,
                json={
                    "keyframe-job": {
                        "status": {"status_str": "success", "completed": True},
                        "outputs": {
                            "9": {
                                "images": [
                                    {"filename": "keyframe.png", "subfolder": "", "type": "output"}
                                ]
                            }
                        },
                    }
                },
            )
        if request.url.path == "/view":
            return httpx.Response(200, content=b"png-bytes")
        raise AssertionError(f"Unexpected request: {request.method} {request.url}")

    shot_text = await asyncio.to_thread(
        Path("examples/shot.json").read_text, encoding="utf-8"
    )
    payload = json.loads(shot_text)
    second = {**payload["characters"][0], "id": "aconit", "name": "Aconit"}
    payload["characters"].append(second)
    first_ref = tmp_path / "belladone.png"
    second_ref = tmp_path / "aconit.png"
    first_ref.write_bytes(b"belladone")
    second_ref.write_bytes(b"aconit")
    payload["characters"][0]["reference_images"] = [str(first_ref)]
    payload["characters"][1]["reference_images"] = [str(second_ref)]
    shot_path = tmp_path / "shot.json"
    shot_path.write_text(json.dumps(payload), encoding="utf-8")
    standard = _write_profile(tmp_path, "standard", video=False)
    reference_profile = _write_profile(
        tmp_path, "reference", video=True, multi_reference=True
    )
    video = _write_profile(tmp_path, "video", video=True)

    async with ComfyClient(
        "http://comfy.test",
        transport=httpx.MockTransport(handler),
        poll_interval_seconds=0.001,
    ) as client:
        await ShotPipeline(client).run(
            ShotPipelineOptions(
                shot_path=shot_path,
                output_root=tmp_path / "output",
                keyframe_profile=standard,
                keyframe_reference_profile=reference_profile,
                video_profile=video,
                keyframe_only=True,
                continuity_keyframe=first_ref,
            )
        )

    assert len(uploads) == 2
    assert submitted[0]["30"]["inputs"]["image"] == "upload-1.png"
    assert submitted[0]["31"]["inputs"]["image"] == "upload-2.png"
    assert submitted[0]["32"]["inputs"]["image"] == "upload-1.png"
    assert submitted[0]["40"]["inputs"]["weight"] == 0.52
    assert submitted[0]["41"]["inputs"]["weight"] == 0.52
    assert submitted[0]["42"]["inputs"]["weight"] == 0.0
    assert not (tmp_path / "output/S01E001-S01/reference-cast.png").exists()
