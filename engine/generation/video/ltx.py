from __future__ import annotations

from engine.generation.comfy.client import ComfyClient, ComfyJobStatus
from engine.generation.comfy.executor import ComfyWorkflowExecutor
from engine.generation.video.base import (
    VideoGenerationRequest,
    VideoGenerationResult,
    VideoGenerator,
)


class LTXVideoGenerator(VideoGenerator):
    def __init__(
        self,
        client: ComfyClient,
        executor: ComfyWorkflowExecutor | None = None,
    ) -> None:
        self.client = client
        self.executor = executor or ComfyWorkflowExecutor(client)

    async def generate(self, request: VideoGenerationRequest) -> VideoGenerationResult:
        uploaded = await self.client.upload_image(request.keyframe)
        context = {**request.context, "reference_image": uploaded.workflow_reference}
        execution = await self.executor.execute(
            request.profile_path,
            context,
            timeout_seconds=request.timeout_seconds,
        )
        return VideoGenerationResult(
            generation_id=execution.prompt_id,
            workflow=execution.loaded,
            outputs=execution.outputs,
        )

    async def status(self, generation_id: str) -> ComfyJobStatus:
        return await self.client.get_status(generation_id)

    async def cancel(self, generation_id: str) -> None:
        await self.client.cancel(generation_id)
