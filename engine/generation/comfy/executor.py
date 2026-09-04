from __future__ import annotations

import asyncio
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from engine.generation.comfy.client import ComfyClient, ComfyOutput
from engine.generation.comfy.workflow_loader import LoadedWorkflow, WorkflowLoader
from engine.generation.comfy.workflow_mapper import WorkflowMapper


@dataclass(frozen=True, slots=True)
class WorkflowExecution:
    prompt_id: str
    loaded: LoadedWorkflow
    outputs: list[ComfyOutput]


class ComfyWorkflowExecutor:
    def __init__(
        self,
        client: ComfyClient,
        loader: WorkflowLoader | None = None,
        mapper: WorkflowMapper | None = None,
    ) -> None:
        self.client = client
        self.loader = loader or WorkflowLoader()
        self.mapper = mapper or WorkflowMapper()

    async def execute(
        self,
        profile_path: Path,
        context: dict[str, Any],
        *,
        timeout_seconds: float | None = None,
    ) -> WorkflowExecution:
        loaded = self.loader.load(profile_path)
        workflow = self.mapper.map(loaded, context)
        prompt_id = await self.client.submit_workflow(workflow)
        try:
            await self.client.wait(prompt_id, timeout_seconds)
        except asyncio.CancelledError:
            try:
                await asyncio.shield(self.client.cancel(prompt_id))
            except Exception:
                pass
            raise
        outputs = await self.client.get_outputs(prompt_id)
        if loaded.profile.output_node_ids:
            allowed = set(loaded.profile.output_node_ids)
            outputs = [output for output in outputs if output.node_id in allowed]
        return WorkflowExecution(prompt_id=prompt_id, loaded=loaded, outputs=outputs)
