import json
import wave
from io import BytesIO
from pathlib import Path

import httpx
import pytest

from engine.audio.ace_step import AceStepClient, AceStepError


def _wav() -> bytes:
    stream = BytesIO()
    with wave.open(stream, "wb") as output:
        output.setnchannels(1)
        output.setsampwidth(2)
        output.setframerate(24_000)
        output.writeframes(b"\0\0" * 100)
    return stream.getvalue()


def test_generates_instrumental_music_and_saves_wav(tmp_path: Path) -> None:
    requests: list[dict[str, object]] = []

    def handle(request: httpx.Request) -> httpx.Response:
        if request.url.path == "/release_task":
            payload: dict[str, object] = json.loads(request.content)
            requests.append(payload)
            return httpx.Response(200, json={"code": 200, "data": {"task_id": "task-1"}})
        if request.url.path == "/query_result":
            return httpx.Response(
                200,
                json={
                    "code": 200,
                    "data": [
                        {
                            "task_id": "task-1",
                            "status": 1,
                            "result": json.dumps([{"file": "/v1/audio?path=local.wav"}]),
                        }
                    ],
                },
            )
        return httpx.Response(200, content=_wav())

    with httpx.Client(
        base_url="http://127.0.0.1:8001", transport=httpx.MockTransport(handle)
    ) as http:
        with AceStepClient(client=http, sleep=lambda _seconds: None) as client:
            task_id = client.generate(
                prompt="Valse botanique nocturne, sans chant",
                duration=20,
                destination=tmp_path / "music.wav",
                seed=42,
            )
    assert task_id == "task-1"
    assert (tmp_path / "music.wav").read_bytes() == _wav()
    assert requests[0]["lyrics"] == "[Instrumental]"
    assert requests[0]["use_random_seed"] is False


def test_rejects_remote_service_and_external_audio_url(tmp_path: Path) -> None:
    with pytest.raises(ValueError, match="local"):
        AceStepClient("https://example.com")

    def handle(request: httpx.Request) -> httpx.Response:
        if request.url.path == "/release_task":
            return httpx.Response(200, json={"code": 200, "data": {"task_id": "task-1"}})
        return httpx.Response(
            200,
            json={
                "code": 200,
                "data": [
                    {
                        "task_id": "task-1",
                        "status": 1,
                        "result": json.dumps([{"file": "https://example.com/evil.wav"}]),
                    }
                ],
            },
        )

    with httpx.Client(
        base_url="http://127.0.0.1:8001", transport=httpx.MockTransport(handle)
    ) as http:
        with AceStepClient(client=http, sleep=lambda _seconds: None) as client:
            with pytest.raises(AceStepError, match="non locale"):
                client.generate(
                    prompt="Calme", duration=10, destination=tmp_path / "music.wav", seed=1
                )
    assert not (tmp_path / "music.wav").exists()
