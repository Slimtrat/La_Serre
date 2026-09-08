from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar

from pydantic import BaseModel, ValidationError

from engine.narrative.ollama import OllamaClient
from engine.narrative.tasks.models import CompiledTask, TaskExecution

ResultT = TypeVar("ResultT", bound=BaseModel)


class OllamaTaskProvider:
    def __init__(self, client: OllamaClient) -> None:
        self.client = client

    async def execute(
        self,
        compiled: CompiledTask,
        *,
        model: str,
        contract: type[ResultT],
    ) -> TaskExecution[ResultT]:
        errors: list[str] = []
        for attempt in range(1, 4):
            messages = [dict(message) for message in compiled.messages]
            if errors:
                messages.append(
                    {
                        "role": "user",
                        "content": "Corrige strictement ces erreurs de contrat : " + errors[-1],
                    }
                )
            try:
                raw = await self.client.chat_structured(
                    model,
                    messages,
                    compiled.schema,
                    options=dict(compiled.inference_options),
                )
                result = contract.model_validate_json(raw)
                return TaskExecution(
                    task_id=compiled.task_id,
                    task_version=compiled.task_version,
                    model=model,
                    input_fingerprint=compiled.input_fingerprint,
                    result=result,
                    allows_mutation=compiled.allows_mutation,
                )
            except (ValidationError, ValueError) as exc:
                errors.append(f"essai {attempt}: {exc}")
        raise ValueError("La proposition ne respecte pas le contrat après 3 essais : " + errors[-1])


class FakeTaskProvider:
    """Deterministic contract-validating provider for tests and local evaluations."""

    def __init__(self, outputs: Mapping[str, Any]) -> None:
        self.outputs = dict(outputs)

    async def execute(
        self,
        compiled: CompiledTask,
        *,
        model: str,
        contract: type[ResultT],
    ) -> TaskExecution[ResultT]:
        key = f"{compiled.task_id}@{compiled.task_version}"
        if key not in self.outputs:
            raise KeyError(f"No fake output registered for {key}")
        result = contract.model_validate(self.outputs[key])
        return TaskExecution(
            task_id=compiled.task_id,
            task_version=compiled.task_version,
            model=model,
            input_fingerprint=compiled.input_fingerprint,
            result=result,
            allows_mutation=compiled.allows_mutation,
        )
