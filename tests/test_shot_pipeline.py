from __future__ import annotations

import json
from pathlib import Path

import httpx

from engine.generation.comfy.client import ComfyClient
from engine.generation.models import GenerationState
from engine.production.shot_pipeline import ShotPipeline, ShotPipelineOptions


def _write_profile(tmp_path: Path, name: str, video: bool) -> Path:
    nodes: dict[str, object] = {
        "3": {"class_type": "Sampler", "inputs": {"seed": 0}},
        "6": {"class_type": "Text", "inputs": {"text": ""}},
        "9": {"class_type": "Save", "inputs": {"filename_prefix": ""}},
    }
    bindings = [
        {"source": "seed", "node_id": "3", "input": "seed"},
        {"source": "prompt", "node_id": "6", "input": "text"},
        {"source": "output_prefix", "node_id": "9", "input": "filename_prefix"},
    ]
    if video:
        nodes["10"] = {"class_type": "LoadImage", "inputs": {"image": ""}}
        bindings.append({"source": "reference_image", "node_id": "10", "input": "image"})
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
    prompt_ids = iter(("keyframe-job", "video-job"))

    def handler(request: httpx.Request) -> httpx.Response:
        if request.method == "POST" and request.url.path == "/prompt":
            return httpx.Response(200, json={"prompt_id": next(prompt_ids)})
        if request.method == "POST" and request.url.path == "/upload/image":
            return httpx.Response(200, json={"name": "keyframe.png", "type": "input"})
        if request.url.path.startswith("/history/"):
            prompt_id = request.url.path.rsplit("/", 1)[-1]
            filename = "source.png" if prompt_id == "keyframe-job" else "source.mp4"
            kind = "images" if prompt_id == "keyframe-job" else "gifs"
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

    shot_path = Path("examples/shot.json")
    keyframe_profile = _write_profile(tmp_path, "keyframe", video=False)
    video_profile = _write_profile(tmp_path, "video", video=True)
    async with ComfyClient(
        "http://comfy.test",
        transport=httpx.MockTransport(handler),
        poll_interval_seconds=0.001,
    ) as client:
        record = await ShotPipeline(client).run(
            ShotPipelineOptions(
                shot_path=shot_path,
                output_root=tmp_path / "output",
                keyframe_profile=keyframe_profile,
                video_profile=video_profile,
            )
        )

    destination = tmp_path / "output" / "S01E001-S01"
    assert record.status is GenerationState.GENERATED
    assert (destination / "keyframe.png").read_bytes() == b"png-bytes"
    assert (destination / "clip.mp4").read_bytes() == b"mp4-bytes"
    assert (destination / "prompt.txt").is_file()
    manifest = json.loads((destination / "generation.json").read_text(encoding="utf-8"))
    assert manifest["seed"] == 384723
    assert [stage["prompt_id"] for stage in manifest["stages"]] == [
        "keyframe-job",
        "video-job",
    ]
