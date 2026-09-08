from __future__ import annotations

import asyncio
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Protocol

from engine.runtime.capability_packs import PackComponent


class InstallerError(RuntimeError):
    """A safe, user-actionable installation failure."""


class IntegrityError(InstallerError):
    pass


class UnsafePathError(InstallerError):
    pass


class ManualActionRequired(InstallerError):
    pass


class InstallationCancelled(InstallerError):
    pass


class CancellationToken:
    def __init__(self) -> None:
        self._event = asyncio.Event()

    @property
    def cancelled(self) -> bool:
        return self._event.is_set()

    def cancel(self) -> None:
        self._event.set()

    async def wait(self) -> None:
        await self._event.wait()

    def raise_if_cancelled(self) -> None:
        if self.cancelled:
            raise InstallationCancelled("Installation annulée")


@dataclass(frozen=True, slots=True)
class ProcessResult:
    returncode: int
    stdout: str = ""
    stderr: str = ""


class ProcessRunner(Protocol):
    async def run(
        self,
        arguments: list[str],
        *,
        cwd: Path | None,
        cancellation: CancellationToken,
    ) -> ProcessResult: ...


class SafeProcessRunner:
    """Runs an argument vector directly; no shell is ever involved."""

    async def run(
        self,
        arguments: list[str],
        *,
        cwd: Path | None,
        cancellation: CancellationToken,
    ) -> ProcessResult:
        if not arguments or any("\x00" in argument for argument in arguments):
            raise InstallerError("Commande d’installation invalide")
        cancellation.raise_if_cancelled()
        process = await asyncio.create_subprocess_exec(
            *arguments,
            cwd=cwd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        communicate = asyncio.create_task(process.communicate())
        cancelled = asyncio.create_task(cancellation.wait())
        done, _pending = await asyncio.wait(
            {communicate, cancelled}, return_when=asyncio.FIRST_COMPLETED
        )
        if cancelled in done and cancellation.cancelled:
            process.terminate()
            try:
                await asyncio.wait_for(process.wait(), timeout=5)
            except TimeoutError:
                process.kill()
                await process.wait()
            communicate.cancel()
            raise InstallationCancelled("Installation annulée")
        cancelled.cancel()
        stdout, stderr = await communicate
        return ProcessResult(
            process.returncode or 0,
            stdout.decode(errors="replace"),
            stderr.decode(errors="replace"),
        )


@dataclass(frozen=True, slots=True)
class InstallContext:
    managed_root: Path
    comfy_workspace: Path
    models_root: Path
    workflow_root: Path


@dataclass(frozen=True, slots=True)
class InstallOutcome:
    state: str
    message: str
    version: str | None = None
    path: str | None = None
    checksum: str | None = None


class InstallerAdapter(Protocol):
    def supports(self, component: PackComponent) -> bool: ...

    async def inspect(
        self, component: PackComponent, context: InstallContext
    ) -> InstallOutcome | None: ...

    async def install(
        self,
        component: PackComponent,
        context: InstallContext,
        cancellation: CancellationToken,
    ) -> InstallOutcome: ...


_BEARER = re.compile(r"(?i)\bbearer\s+[A-Za-z0-9._~+/=-]+")
_SECRET_PAIR = re.compile(
    r"(?i)(token|secret|password|authorization|x-api-key)(\s*[:=]\s*)([^\s,;&]+)"
)
_SIGNED_QUERY = re.compile(
    r"(?i)(https?://[^\s?]+)\?[^\s]*(?:token|signature|sig|x-amz-|expires)[^\s]*"
)


def redact_sensitive(value: str) -> str:
    value = _SIGNED_QUERY.sub(r"\1?[REDACTED]", value)
    value = _BEARER.sub("Bearer [REDACTED]", value)
    return _SECRET_PAIR.sub(r"\1\2[REDACTED]", value)


def assert_safe_child(path: Path, parent: Path) -> Path:
    resolved_parent = parent.resolve()
    resolved = path.resolve()
    if not resolved.is_relative_to(resolved_parent):
        raise UnsafePathError(f"Chemin refusé hors du dossier géré : {path}")
    return resolved


def successful_process(result: ProcessResult, action: str) -> ProcessResult:
    if result.returncode:
        detail = redact_sensitive(result.stderr.strip() or result.stdout.strip())
        raise InstallerError(f"{action} a échoué ({result.returncode}) : {detail}")
    return result
