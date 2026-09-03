from __future__ import annotations

import json

import httpx

from engine.generation.comfy.client import ComfyClient, ComfyJobStatus


async def test_submit_status_and_outputs() -> None:
    prompt_id = "prompt-123"

    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path == "/prompt":
            body = json.loads(request.content)
            assert body["client_id"] == "client-test"
            return httpx.Response(200, json={"prompt_id": prompt_id, "number": 1})
        if request.url.path == f"/history/{prompt_id}":
            return httpx.Response(
                200,
                json={
                    prompt_id: {
                        "status": {"status_str": "success", "completed": True},
                        "outputs": {
                            "9": {
                                "images": [
                                    {
                                        "filename": "shot.png",
                                        "subfolder": "",
                                        "type": "output",
                                    }
                                ]
                            }
                        },
                    }
                },
            )
        raise AssertionError(f"Unexpected request: {request.method} {request.url}")

    async with ComfyClient(
        "http://comfy.test",
        client_id="client-test",
        poll_interval_seconds=0.001,
        transport=httpx.MockTransport(handler),
    ) as client:
        submitted = await client.submit_workflow({"1": {"class_type": "Example", "inputs": {}}})
        status = await client.get_status(submitted)
        await client.wait(submitted, timeout_seconds=0.1)
        outputs = await client.get_outputs(submitted)

    assert status is ComfyJobStatus.COMPLETED
    assert outputs[0].filename == "shot.png"
    assert outputs[0].node_id == "9"
