from __future__ import annotations

import hashlib
import json
from collections.abc import Mapping
from dataclasses import dataclass
from enum import StrEnum
from types import MappingProxyType
from typing import Any, cast

from pydantic import BaseModel


class TaskKind(StrEnum):
    FACTUAL = "factual"
    CREATIVE = "creative"
    VALIDATION = "validation"


@dataclass(frozen=True, slots=True)
class TaskContext:
    values: Mapping[str, Any]

    def normalized(self) -> dict[str, Any]:
        return cast(dict[str, Any], _json_value(dict(self.values)))

    @property
    def fingerprint(self) -> str:
        payload = json.dumps(
            self.normalized(),
            ensure_ascii=False,
            sort_keys=True,
            separators=(",", ":"),
            default=str,
        )
        return hashlib.sha256(payload.encode("utf-8")).hexdigest()


@dataclass(frozen=True, slots=True)
class CompiledTask:
    task_id: str
    task_version: int
    kind: TaskKind
    messages: tuple[dict[str, str], ...]
    schema: dict[str, Any]
    inference_options: Mapping[str, Any]
    input_fingerprint: str
    allows_mutation: bool


@dataclass(frozen=True, slots=True)
class TaskExecution[ResultT: BaseModel]:
    task_id: str
    task_version: int
    model: str
    input_fingerprint: str
    result: ResultT
    allows_mutation: bool

    def require_mutation_permission(self) -> None:
        if not self.allows_mutation:
            raise PermissionError(f"Task {self.task_id}@{self.task_version} is validation-only")

    def metadata(self) -> dict[str, object]:
        return {
            "task_id": self.task_id,
            "task_version": self.task_version,
            "model": self.model,
            "input_fingerprint": self.input_fingerprint,
            "allows_mutation": self.allows_mutation,
        }


@dataclass(frozen=True, slots=True)
class TaskSpec[ResultT: BaseModel]:
    task_id: str
    version: int
    kind: TaskKind
    objective: str
    contract: type[ResultT]
    required_context: tuple[str, ...]
    rules: tuple[str, ...]
    inference_options: Mapping[str, Any]
    allows_mutation: bool = True

    def __post_init__(self) -> None:
        if not self.task_id or self.version < 1:
            raise ValueError("A TaskSpec requires an id and a positive version")
        if self.kind is TaskKind.VALIDATION and self.allows_mutation:
            raise ValueError("Validation tasks cannot authorize mutations")
        object.__setattr__(
            self, "inference_options", MappingProxyType(dict(self.inference_options))
        )

    def compile(self, context: TaskContext) -> CompiledTask:
        missing = [key for key in self.required_context if key not in context.values]
        if missing:
            raise ValueError(
                f"Missing context for {self.task_id}@{self.version}: {', '.join(missing)}"
            )
        system = "\n".join((self.objective, "Règles :", *(f"- {rule}" for rule in self.rules)))
        user = json.dumps(context.normalized(), ensure_ascii=False, indent=2, default=str)
        return CompiledTask(
            task_id=self.task_id,
            task_version=self.version,
            kind=self.kind,
            messages=(
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ),
            schema=self.contract.ollama_schema(),  # type: ignore[attr-defined]
            inference_options=self.inference_options,
            input_fingerprint=context.fingerprint,
            allows_mutation=self.allows_mutation,
        )


class TaskRegistry:
    def __init__(self, specs: tuple[TaskSpec[Any], ...] = ()) -> None:
        self._specs: dict[tuple[str, int], TaskSpec[Any]] = {}
        for spec in specs:
            self.register(spec)

    def register(self, spec: TaskSpec[Any]) -> None:
        key = (spec.task_id, spec.version)
        if key in self._specs:
            raise ValueError(f"TaskSpec already registered: {spec.task_id}@{spec.version}")
        self._specs[key] = spec

    def get(self, task_id: str, version: int | None = None) -> TaskSpec[Any]:
        candidates = [key for key in self._specs if key[0] == task_id]
        if not candidates:
            raise KeyError(f"Unknown TaskSpec: {task_id}")
        selected = version if version is not None else max(item[1] for item in candidates)
        try:
            return self._specs[(task_id, selected)]
        except KeyError as exc:
            raise KeyError(f"Unknown TaskSpec: {task_id}@{selected}") from exc

    def list(self) -> tuple[TaskSpec[Any], ...]:
        return tuple(self._specs[key] for key in sorted(self._specs))


def _json_value(value: Any) -> Any:
    if isinstance(value, BaseModel):
        return value.model_dump(mode="json")
    if isinstance(value, Mapping):
        return {str(key): _json_value(item) for key, item in value.items()}
    if isinstance(value, (list, tuple)):
        return [_json_value(item) for item in value]
    return value
