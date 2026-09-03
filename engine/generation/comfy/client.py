from __future__ import annotations

import asyncio
import time
import uuid
from enum import StrEnum
from pathlib import Path
from typing import Any

import httpx
from pydantic import BaseModel, ConfigDict

from engine.generation.comfy.errors import (
    ComfyExecutionError,
    ComfyProtocolError,
    ComfyTimeoutError,
)


class ComfyJobStatus(StrEnum):
    QUEUED = "queued"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    UNKNOWN = "unknown"


class ComfyOutput(BaseModel):
    model_config = ConfigDict(extra="allow", frozen=True)

    node_id: str
    kind: str
    filename: str
    subfolder: str = ""
    folder_type: str = "output"

    @property
    def suffix(self) -> str:
        return Path(self.filename).suffix.lower()


class UploadedImage(BaseModel):
    model_config = ConfigDict(extra="allow", frozen=True)

    name: str
    subfolder: str = ""
    type: str = "input"

    @property
    def workflow_reference(self) -> str:
        return f"{self.subfolder}/{self.name}" if self.subfolder else self.name


class ComfyClient:
    def __init__(
        self,
        base_url: str,
        *,
        request_timeout_seconds: float = 1800,
        poll_interval_seconds: float = 1,
        client_id: str | None = None,
        transport: httpx.AsyncBaseTransport | None = None,
    ) -> None:
        self.base_url = base_url.rstrip("/")
        self.request_timeout_seconds = request_timeout_seconds
        self.poll_interval_seconds = poll_interval_seconds
        self.client_id = client_id or str(uuid.uuid4())
        self._http = httpx.AsyncClient(
            base_url=self.base_url,
            timeout=request_timeout_seconds,
            follow_redirects=True,
            transport=transport,
        )

    async def __aenter__(self) -> ComfyClient:
        return self

    async def __aexit__(self, *_: object) -> None:
        await self.aclose()

    async def aclose(self) -> None:
        await self._http.aclose()

    async def is_ready(self) -> bool:
        try:
            response = await self._http.get("/system_stats", timeout=10)
            return response.is_success
        except httpx.HTTPError:
            return False

    async def submit_workflow(self, workflow: dict[str, Any]) -> str:
        response = await self._http.post(
            "/prompt",
            json={"prompt": workflow, "client_id": self.client_id},
        )
        if not response.is_success:
            raise ComfyProtocolError(self._response_error("workflow rejected", response))
        payload = self._json(response)
        prompt_id = payload.get("prompt_id")
        if not isinstance(prompt_id, str) or not prompt_id:
            detail = payload.get("error") or payload.get("node_errors") or payload
            raise ComfyProtocolError(f"ComfyUI did not return prompt_id: {detail}")
        return prompt_id

    async def get_status(self, prompt_id: str) -> ComfyJobStatus:
        history = await self._history(prompt_id)
        entry = history.get(prompt_id)
        if isinstance(entry, dict):
            status = entry.get("status", {})
            status_text = status.get("status_str") if isinstance(status, dict) else None
            if status_text in {"error", "failed"}:
                return ComfyJobStatus.FAILED
            if status_text in {"success", "completed"} or (
                isinstance(status, dict) and status.get("completed") is True
            ):
                return ComfyJobStatus.COMPLETED
            messages = status.get("messages", []) if isinstance(status, dict) else []
            if any(message and message[0] == "execution_error" for message in messages):
                return ComfyJobStatus.FAILED

        response = await self._http.get("/queue")
        response.raise_for_status()
        queue = self._json(response)
        if self._queue_contains(queue.get("queue_running", []), prompt_id):
            return ComfyJobStatus.RUNNING
        if self._queue_contains(queue.get("queue_pending", []), prompt_id):
            return ComfyJobStatus.QUEUED
        return ComfyJobStatus.UNKNOWN

    async def wait(self, prompt_id: str, timeout_seconds: float | None = None) -> None:
        timeout = timeout_seconds or self.request_timeout_seconds
        deadline = time.monotonic() + timeout
        while time.monotonic() < deadline:
            status = await self.get_status(prompt_id)
            if status is ComfyJobStatus.COMPLETED:
                return
            if status is ComfyJobStatus.FAILED:
                raise ComfyExecutionError(await self._execution_error(prompt_id))
            await asyncio.sleep(self.poll_interval_seconds)
        raise ComfyTimeoutError(f"ComfyUI prompt {prompt_id} exceeded {timeout:g} seconds")

    async def get_outputs(self, prompt_id: str) -> list[ComfyOutput]:
        history = await self._history(prompt_id)
        entry = history.get(prompt_id)
        if not isinstance(entry, dict):
            raise ComfyProtocolError(f"No history found for ComfyUI prompt {prompt_id}")
        raw_outputs = entry.get("outputs", {})
        results: list[ComfyOutput] = []
        if not isinstance(raw_outputs, dict):
            return results
        for node_id, node_outputs in raw_outputs.items():
            if not isinstance(node_outputs, dict):
                continue
            for kind in ("images", "gifs", "videos", "audio"):
                items = node_outputs.get(kind, [])
                if not isinstance(items, list):
                    continue
                for item in items:
                    if isinstance(item, dict) and isinstance(item.get("filename"), str):
                        results.append(
                            ComfyOutput(
                                node_id=str(node_id),
                                kind=kind,
                                filename=item["filename"],
                                subfolder=str(item.get("subfolder", "")),
                                folder_type=str(item.get("type", "output")),
                            )
                        )
        return results

    async def download_output(self, output: ComfyOutput, destination: Path) -> None:
        response = await self._http.get(
            "/view",
            params={
                "filename": output.filename,
                "subfolder": output.subfolder,
                "type": output.folder_type,
            },
        )
        response.raise_for_status()
        await asyncio.to_thread(destination.parent.mkdir, parents=True, exist_ok=True)
        await asyncio.to_thread(destination.write_bytes, response.content)

    async def upload_image(self, source: Path, *, overwrite: bool = False) -> UploadedImage:
        if not await asyncio.to_thread(source.is_file):
            raise FileNotFoundError(f"Reference image does not exist: {source}")
        content = await asyncio.to_thread(source.read_bytes)
        response = await self._http.post(
            "/upload/image",
            files={"image": (source.name, content, "application/octet-stream")},
            data={"type": "input", "overwrite": str(overwrite).lower()},
        )
        if not response.is_success:
            raise ComfyProtocolError(self._response_error("image upload failed", response))
        return UploadedImage.model_validate(self._json(response))

    async def cancel(self, prompt_id: str) -> None:
        status = await self.get_status(prompt_id)
        if status is ComfyJobStatus.QUEUED:
            response = await self._http.post("/queue", json={"delete": [prompt_id]})
            response.raise_for_status()
        elif status is ComfyJobStatus.RUNNING:
            response = await self._http.post("/interrupt")
            response.raise_for_status()

    async def _history(self, prompt_id: str) -> dict[str, Any]:
        response = await self._http.get(f"/history/{prompt_id}")
        response.raise_for_status()
        return self._json(response)

    async def _execution_error(self, prompt_id: str) -> str:
        history = await self._history(prompt_id)
        entry = history.get(prompt_id, {})
        status = entry.get("status", {}) if isinstance(entry, dict) else {}
        messages = status.get("messages", []) if isinstance(status, dict) else []
        for message in reversed(messages):
            if isinstance(message, list) and len(message) > 1 and message[0] == "execution_error":
                return f"ComfyUI prompt {prompt_id} failed: {message[1]}"
        return f"ComfyUI prompt {prompt_id} failed"

    @staticmethod
    def _queue_contains(entries: object, prompt_id: str) -> bool:
        if not isinstance(entries, list):
            return False
        return any(isinstance(entry, list) and prompt_id in entry for entry in entries)

    @staticmethod
    def _json(response: httpx.Response) -> dict[str, Any]:
        try:
            payload = response.json()
        except ValueError as exc:
            raise ComfyProtocolError("ComfyUI returned invalid JSON") from exc
        if not isinstance(payload, dict):
            raise ComfyProtocolError("ComfyUI returned a non-object JSON response")
        return payload

    @staticmethod
    def _response_error(prefix: str, response: httpx.Response) -> str:
        try:
            detail: object = response.json()
        except ValueError:
            detail = response.text
        return f"ComfyUI {prefix} ({response.status_code}): {detail}"
