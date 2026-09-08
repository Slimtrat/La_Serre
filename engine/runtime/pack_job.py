from __future__ import annotations

import asyncio
import json
import shlex
import shutil
import uuid
from collections.abc import Callable
from datetime import UTC, datetime
from pathlib import Path
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from engine.runtime.capability_packs import DEFAULT_CAPABILITY_PACK, CapabilityPack, PackComponent
from engine.runtime.installers.base import (
    CancellationToken,
    InstallationCancelled,
    InstallContext,
    InstallerAdapter,
    IntegrityError,
    ManualActionRequired,
    ProcessRunner,
    redact_sensitive,
)

JobStatus = Literal[
    "queued",
    "running",
    "paused",
    "awaiting_license",
    "awaiting_manual",
    "completed",
    "failed",
    "cancelled",
]
StepStatus = Literal[
    "pending",
    "running",
    "installed",
    "skipped",
    "awaiting_license",
    "awaiting_manual",
    "failed",
    "cancelled",
]


def _now() -> str:
    return datetime.now(UTC).isoformat()


class StoredModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class PackStep(StoredModel):
    component_id: str
    status: StepStatus = "pending"
    attempts: int = 0
    message: str = "En attente"
    version: str | None = None
    path: str | None = None
    checksum: str | None = None
    updated_at: str = Field(default_factory=_now)


class SmokeResult(StoredModel):
    check_id: str
    status: Literal["passed", "failed"]
    required_components: list[str]
    message: str


class PackPreparationJob(StoredModel):
    schema_version: int = 1
    id: str
    pack_id: str
    pack_version: int
    status: JobStatus = "queued"
    mode: Literal["automatic", "manual"] = "automatic"
    accepted_license_ids: list[str] = Field(default_factory=list)
    pause_requested: bool = False
    cancel_requested: bool = False
    recovered: bool = False
    error: str | None = None
    created_at: str = Field(default_factory=_now)
    updated_at: str = Field(default_factory=_now)
    steps: list[PackStep]
    smoke_checks: list[SmokeResult] = Field(default_factory=list)


class PackPreparationManager:
    """Persistent, idempotent coordinator for one managed local capability pack."""

    def __init__(
        self,
        *,
        state_root: Path,
        context: InstallContext,
        adapters: tuple[InstallerAdapter, ...],
        process_runner: ProcessRunner,
        pack: CapabilityPack = DEFAULT_CAPABILITY_PACK,
        disk_free: Callable[[Path], int] | None = None,
    ) -> None:
        self.pack = pack
        self.state_root = state_root.resolve()
        self.context = context
        self.adapters = adapters
        self.process_runner = process_runner
        self.disk_free = disk_free or (lambda path: shutil.disk_usage(path).free)
        self._jobs: dict[str, PackPreparationJob] = {}
        self._tasks: dict[str, asyncio.Task[None]] = {}
        self._tokens: dict[str, CancellationToken] = {}
        self.state_root.mkdir(parents=True, exist_ok=True)
        self._restore()

    def start(
        self,
        *,
        accepted_license_ids: set[str] | frozenset[str] = frozenset(),
        mode: Literal["automatic", "manual"] = "automatic",
    ) -> PackPreparationJob:
        active = next(
            (job for job in self._jobs.values() if job.status in {"queued", "running"}), None
        )
        if active:
            raise ValueError("Une préparation du pack est déjà en cours")
        job = PackPreparationJob(
            id=uuid.uuid4().hex,
            pack_id=self.pack.id,
            pack_version=self.pack.version,
            mode=mode,
            accepted_license_ids=sorted(accepted_license_ids),
            steps=[
                PackStep(component_id=item.id) for item in self.pack.components if item.required
            ],
        )
        self._jobs[job.id] = job
        self._save(job)
        self._schedule(job)
        return job.model_copy(deep=True)

    def get(self, job_id: str) -> PackPreparationJob:
        try:
            return self._jobs[job_id].model_copy(deep=True)
        except KeyError as exc:
            raise KeyError(f"Préparation introuvable : {job_id}") from exc

    def latest(self) -> PackPreparationJob | None:
        if not self._jobs:
            return None
        return max(self._jobs.values(), key=lambda item: item.created_at).model_copy(deep=True)

    def logs(self, job_id: str) -> list[dict[str, object]]:
        self.get(job_id)
        path = self._log_path(job_id)
        if not path.is_file():
            return []
        entries: list[dict[str, object]] = []
        for line in path.read_text(encoding="utf-8").splitlines():
            try:
                value = json.loads(line)
            except json.JSONDecodeError:
                continue
            if isinstance(value, dict):
                entries.append(value)
        return entries

    def pause(self, job_id: str) -> PackPreparationJob:
        job = self._mutable(job_id)
        if job.status not in {"queued", "running"}:
            raise ValueError("Cette préparation ne peut pas être mise en pause")
        job.pause_requested = True
        self._touch(job)
        return job.model_copy(deep=True)

    def resume(
        self, job_id: str, *, accepted_license_ids: set[str] | frozenset[str] = frozenset()
    ) -> PackPreparationJob:
        job = self._mutable(job_id)
        if job.status not in {"paused", "awaiting_license", "awaiting_manual", "failed"}:
            raise ValueError("Cette préparation ne peut pas être reprise")
        job.accepted_license_ids = sorted(set(job.accepted_license_ids).union(accepted_license_ids))
        job.pause_requested = False
        job.cancel_requested = False
        job.error = None
        job.status = "queued"
        for step in job.steps:
            if step.status in {"failed", "awaiting_license", "awaiting_manual", "cancelled"}:
                step.status = "pending"
                step.message = "Nouvelle vérification demandée"
        self._touch(job)
        self._schedule(job)
        return job.model_copy(deep=True)

    def repair(
        self, job_id: str, *, accepted_license_ids: set[str] | frozenset[str] = frozenset()
    ) -> PackPreparationJob:
        job = self._mutable(job_id)
        if job.status in {"queued", "running"}:
            raise ValueError("Une préparation active ne peut pas être réparée")
        job.accepted_license_ids = sorted(set(job.accepted_license_ids).union(accepted_license_ids))
        job.pause_requested = False
        job.cancel_requested = False
        job.error = None
        job.status = "queued"
        job.smoke_checks = []
        for step in job.steps:
            step.status = "pending"
            step.message = "Diagnostic de réparation demandé"
        self._touch(job)
        self._schedule(job)
        return job.model_copy(deep=True)

    def cancel(self, job_id: str) -> PackPreparationJob:
        job = self._mutable(job_id)
        if job.status not in {"queued", "running", "paused", "awaiting_manual", "awaiting_license"}:
            raise ValueError("Cette préparation ne peut pas être annulée")
        job.cancel_requested = True
        token = self._tokens.get(job_id)
        if token:
            token.cancel()
        if job.status not in {"queued", "running"}:
            job.status = "cancelled"
        self._touch(job)
        return job.model_copy(deep=True)

    async def wait(self, job_id: str) -> PackPreparationJob:
        task = self._tasks.get(job_id)
        if task:
            await task
        return self.get(job_id)

    def _schedule(self, job: PackPreparationJob) -> None:
        token = CancellationToken()
        self._tokens[job.id] = token
        task = asyncio.create_task(self._execute(job.id, token))
        self._tasks[job.id] = task
        task.add_done_callback(lambda _task: self._tasks.pop(job.id, None))

    async def _execute(self, job_id: str, token: CancellationToken) -> None:
        job = self._mutable(job_id)
        job.status = "running"
        self._log(job, "info", "Préparation démarrée")
        self._touch(job)
        try:
            await self._preflight(job)
            if job.status in {"awaiting_license", "awaiting_manual"}:
                return
            for step in job.steps:
                if step.status in {"installed", "skipped"}:
                    continue
                if job.cancel_requested:
                    raise InstallationCancelled("Annulation demandée")
                if job.pause_requested:
                    job.status = "paused"
                    self._log(job, "info", "Préparation mise en pause")
                    self._touch(job)
                    return
                component = self.pack.component(step.component_id)
                await self._run_component(job, step, component, token)
                if job.status in {"awaiting_license", "awaiting_manual"}:
                    self._touch(job)
                    return
                if job.pause_requested:
                    job.status = "paused"
                    self._log(job, "info", "Préparation mise en pause")
                    self._touch(job)
                    return
            if job.cancel_requested:
                raise InstallationCancelled("Annulation demandée")
            if job.pause_requested:
                job.status = "paused"
                self._log(job, "info", "Préparation mise en pause")
                self._touch(job)
                return
            await self._run_smoke_checks(job, token)
            job.status = "completed"
            job.error = None
            self._log(job, "info", "Pack installé et smoke checks validés")
        except InstallationCancelled:
            job.status = "cancelled"
            for step in job.steps:
                if step.status == "running":
                    step.status = "cancelled"
                    step.message = "Annulé sans publier de fichier partiel"
            self._log(job, "warning", "Préparation annulée")
        except Exception as exc:
            job.status = "failed"
            job.error = redact_sensitive(str(exc))
            for step in job.steps:
                if step.status == "running":
                    step.status = "failed"
                    step.message = job.error
            self._log(job, "error", job.error)
        finally:
            self._tokens.pop(job.id, None)
            self._touch(job)

    async def _preflight(self, job: PackPreparationJob) -> None:
        self.context.managed_root.mkdir(parents=True, exist_ok=True)
        missing_bytes = 0
        license_blocks: list[tuple[PackStep, PackComponent]] = []
        for step in job.steps:
            component = self.pack.component(step.component_id)
            adapter = self._adapter(component)
            if adapter:
                try:
                    installed = await adapter.inspect(component, self.context)
                except IntegrityError as exc:
                    installed = None
                    step.message = str(exc)
                    self._log(job, "warning", f"Réparation requise pour {component.id}")
                if installed:
                    self._apply_outcome(step, installed)
                    continue
            if component.kind == "workflow_bundle" and self._workflow_present(component):
                step.status = "installed"
                step.message = "Workflows locaux déjà présents"
                continue
            if component.kind == "model":
                missing_bytes += component.size_bytes
            if (
                component.license.commercial_use != "allowed"
                and component.license.id not in job.accepted_license_ids
            ):
                license_blocks.append((step, component))
        if license_blocks:
            for step, component in license_blocks:
                step.status = "awaiting_license"
                step.message = f"Acceptation requise : {component.license.name}"
            job.status = "awaiting_license"
            self._log(job, "warning", "Acceptation de licence requise avant téléchargement")
            return
        required = missing_bytes + self.pack.hardware.workspace_reserve_bytes
        available = self.disk_free(self.context.managed_root)
        if available < required:
            raise OSError(f"Espace disque insuffisant : {available} disponibles, {required} requis")

    async def _run_component(
        self,
        job: PackPreparationJob,
        step: PackStep,
        component: PackComponent,
        token: CancellationToken,
    ) -> None:
        if job.status == "awaiting_license":
            return
        adapter = self._adapter(component)
        if job.mode == "manual" or adapter is None:
            step.status = "awaiting_manual"
            step.message = component.action
            step.updated_at = _now()
            job.status = "awaiting_manual"
            self._log(job, "warning", f"Action manuelle requise pour {component.id}")
            return
        step.status = "running"
        step.attempts += 1
        step.message = "Installation en cours"
        step.updated_at = _now()
        self._touch(job)
        try:
            outcome = await adapter.install(component, self.context, token)
        except ManualActionRequired as exc:
            step.status = "awaiting_manual"
            step.message = str(exc)
            job.status = "awaiting_manual"
            self._log(job, "warning", f"Action manuelle requise pour {component.id}")
            return
        self._apply_outcome(step, outcome)
        self._log(job, "info", f"Composant prêt : {component.id}")

    async def _run_smoke_checks(self, job: PackPreparationJob, token: CancellationToken) -> None:
        job.smoke_checks = []
        for check in self.pack.smoke_checks:
            token.raise_if_cancelled()
            arguments = shlex.split(check.command, posix=True)
            result = await self.process_runner.run(arguments, cwd=Path.cwd(), cancellation=token)
            required = list(check.required_roles)
            if result.returncode:
                message = redact_sensitive(result.stderr.strip() or result.stdout.strip())
                job.smoke_checks.append(
                    SmokeResult(
                        check_id=check.id,
                        status="failed",
                        required_components=required,
                        message=message,
                    )
                )
                raise RuntimeError(
                    f"Smoke check {check.id} en échec; composants concernés: {', '.join(required)}"
                )
            job.smoke_checks.append(
                SmokeResult(
                    check_id=check.id,
                    status="passed",
                    required_components=required,
                    message="Contrôle réussi",
                )
            )

    def _adapter(self, component: PackComponent) -> InstallerAdapter | None:
        return next((item for item in self.adapters if item.supports(component)), None)

    def _workflow_present(self, component: PackComponent) -> bool:
        names = (component.detection.value, *component.detection.aliases)
        return all((self.context.workflow_root / name).is_file() for name in names)

    @staticmethod
    def _apply_outcome(step: PackStep, outcome: object) -> None:
        from engine.runtime.installers.base import InstallOutcome

        assert isinstance(outcome, InstallOutcome)
        step.status = "installed"
        step.message = outcome.message
        step.version = outcome.version
        step.path = outcome.path
        step.checksum = outcome.checksum
        step.updated_at = _now()

    def _mutable(self, job_id: str) -> PackPreparationJob:
        try:
            return self._jobs[job_id]
        except KeyError as exc:
            raise KeyError(f"Préparation introuvable : {job_id}") from exc

    def _touch(self, job: PackPreparationJob) -> None:
        job.updated_at = _now()
        self._save(job)

    def _save(self, job: PackPreparationJob) -> None:
        path = self.state_root / f"{job.id}.json"
        temporary = path.with_suffix(".tmp")
        temporary.write_text(job.model_dump_json(indent=2) + "\n", encoding="utf-8")
        temporary.replace(path)

    def _restore(self) -> None:
        for path in self.state_root.glob("*.json"):
            try:
                job = PackPreparationJob.model_validate_json(path.read_text(encoding="utf-8"))
            except (OSError, ValueError):
                continue
            if job.status in {"queued", "running"}:
                job.status = "paused"
                job.recovered = True
                job.pause_requested = False
                for step in job.steps:
                    if step.status == "running":
                        step.status = "pending"
                        step.message = "Interrompu par le redémarrage; reprise disponible"
                self._save(job)
            self._jobs[job.id] = job

    def _log(self, job: PackPreparationJob, level: str, message: str) -> None:
        entry = {
            "timestamp": _now(),
            "level": level,
            "job_id": job.id,
            "message": redact_sensitive(message),
        }
        with self._log_path(job.id).open("a", encoding="utf-8") as stream:
            stream.write(json.dumps(entry, ensure_ascii=False) + "\n")

    def _log_path(self, job_id: str) -> Path:
        return self.state_root / f"{job_id}.jsonl"
