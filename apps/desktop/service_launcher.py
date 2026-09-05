from __future__ import annotations

import json
import logging
import os
import shutil
import signal
import subprocess
import sys
import threading
import time
import urllib.error
import urllib.request
from collections.abc import Callable, Mapping, Sequence
from dataclasses import dataclass, field
from datetime import UTC, datetime
from enum import StrEnum
from pathlib import Path
from typing import BinaryIO, Protocol
from urllib.parse import urljoin, urlsplit

from engine.config import Settings

LOGGER = logging.getLogger(__name__)
DEFAULT_CONFIG_FILENAME = "runtime-services.json"
COMFYUI_MODEL_DIRECTORIES = (
    "audio_encoders",
    "background_removal",
    "checkpoints",
    "classifiers",
    "clip_vision",
    "configs",
    "controlnet",
    "detection",
    "diffusers",
    "diffusion_models",
    "embeddings",
    "frame_interpolation",
    "geometry_estimation",
    "gligen",
    "hypernetworks",
    "latent_upscale_models",
    "loras",
    "model_patches",
    "optical_flow",
    "photomaker",
    "style_models",
    "text_encoders",
    "unet",
    "upscale_models",
    "vae",
    "vae_approx",
)


class ServiceState(StrEnum):
    CHECKING = "checking"
    STARTING = "starting"
    READY = "ready"
    UNAVAILABLE = "unavailable"
    MISSING = "missing"
    RESTARTING = "restarting"
    FAILED = "failed"
    STOPPED = "stopped"


@dataclass(frozen=True, slots=True)
class LocalServiceSpec:
    name: str
    display_name: str
    url: str
    health_path: str
    command: tuple[str, ...] | None
    working_directory: Path | None = None
    environment: Mapping[str, str] = field(default_factory=dict)
    auto_start: bool = True
    startup_timeout_seconds: float = 180.0

    @property
    def health_url(self) -> str:
        return urljoin(self.url.rstrip("/") + "/", self.health_path.lstrip("/"))

    @property
    def executable(self) -> str | None:
        return self.command[0] if self.command else None


class ChildProcess(Protocol):
    pid: int

    def poll(self) -> int | None: ...

    def terminate(self) -> None: ...

    def wait(self, timeout: float | None = None) -> int: ...

    def kill(self) -> None: ...


@dataclass(slots=True)
class ManagedProcess:
    process: ChildProcess
    log_handle: BinaryIO

    def close_log(self) -> None:
        try:
            self.log_handle.close()
        except OSError:
            LOGGER.debug("Could not close service log", exc_info=True)


@dataclass(slots=True)
class _ServiceRecord:
    spec: LocalServiceSpec
    state: ServiceState = ServiceState.CHECKING
    detail: str = "Détection en cours"
    managed: ManagedProcess | None = None
    started_at: float | None = None
    restart_count: int = 0
    next_restart_at: float = 0.0
    last_checked_at: str | None = None
    desired_running: bool = True


Probe = Callable[[LocalServiceSpec], bool]
Launcher = Callable[[LocalServiceSpec, Path], ManagedProcess]


class LocalServiceSupervisor:
    """Detect, launch and supervise local AI services owned by the desktop app."""

    def __init__(
        self,
        services: Sequence[LocalServiceSpec],
        log_directory: Path,
        *,
        probe: Probe | None = None,
        launcher: Launcher | None = None,
        poll_interval_seconds: float = 3.0,
        probe_timeout_seconds: float = 0.8,
        max_restarts: int = 3,
    ) -> None:
        if poll_interval_seconds <= 0:
            raise ValueError("poll_interval_seconds must be positive")
        if probe_timeout_seconds <= 0:
            raise ValueError("probe_timeout_seconds must be positive")
        if max_restarts < 0:
            raise ValueError("max_restarts cannot be negative")
        names = [service.name for service in services]
        if len(names) != len(set(names)):
            raise ValueError("service names must be unique")

        self.log_directory = log_directory
        self.poll_interval_seconds = poll_interval_seconds
        self.probe_timeout_seconds = probe_timeout_seconds
        self.max_restarts = max_restarts
        self._records = {
            service.name: _ServiceRecord(
                service,
                desired_running=service.auto_start,
            )
            for service in services
        }
        self._probe = probe or self._http_probe
        self._launcher = launcher or _launch_process
        self._lock = threading.RLock()
        self._stop_event = threading.Event()
        self._wake_event = threading.Event()
        self._thread: threading.Thread | None = None

    @property
    def running(self) -> bool:
        return bool(self._thread and self._thread.is_alive())

    def start(self) -> None:
        if self.running:
            return
        self.log_directory.mkdir(parents=True, exist_ok=True)
        self._stop_event.clear()
        self._wake_event.clear()
        self._thread = threading.Thread(
            target=self._run,
            name="serre-local-services",
            daemon=True,
        )
        self._thread.start()
        LOGGER.info("Local service supervisor started")

    def stop(self, timeout_seconds: float = 8.0) -> None:
        self._stop_event.set()
        self._wake_event.set()
        thread = self._thread
        if thread is not None:
            thread.join(timeout=max(timeout_seconds, 0.0))
        with self._lock:
            managed = [record.managed for record in self._records.values() if record.managed]
        for process in managed:
            _stop_process(process)
        with self._lock:
            for record in self._records.values():
                record.managed = None
                record.state = ServiceState.STOPPED
                record.detail = "Supervision arrêtée"
            self._thread = None
        LOGGER.info("Local service supervisor stopped")

    def check_now(self) -> None:
        """Run one reconciliation pass synchronously (also useful for diagnostics)."""
        for record in self._records.values():
            self._reconcile(record)

    def control(self, service_name: str, action: str) -> dict[str, object]:
        """Apply a user-requested lifecycle action to one local service."""
        record = self._record(service_name)
        normalized = action.strip().lower()
        if normalized == "check":
            self._reconcile(record)
        elif normalized == "start":
            self._start_service(record)
        elif normalized == "stop":
            self._stop_service(record)
        elif normalized == "restart":
            self._restart_service(record)
        else:
            raise ValueError(f"Unsupported runtime action: {action}")
        self._wake_event.set()
        with self._lock:
            return self._snapshot(record)

    def logs(self, service_name: str, *, limit: int = 200) -> dict[str, object]:
        """Return a bounded log tail without exposing arbitrary filesystem paths."""
        record = self._record(service_name)
        safe_limit = max(1, min(int(limit), 1000))
        log_path = self.log_directory / f"{record.spec.name}.log"
        try:
            lines = log_path.read_text(encoding="utf-8", errors="replace").splitlines()
        except FileNotFoundError:
            lines = []
        except OSError as exc:
            raise ValueError(f"Could not read {record.spec.display_name} logs: {exc}") from exc
        return {
            "service": record.spec.name,
            "display_name": record.spec.display_name,
            "path": str(log_path),
            "lines": lines[-safe_limit:],
        }

    def listing(self) -> dict[str, object]:
        with self._lock:
            return {
                "enabled": True,
                "running": self.running,
                "services": [self._snapshot(record) for record in self._records.values()],
            }

    def _snapshot(self, record: _ServiceRecord) -> dict[str, object]:
        managed = record.managed
        process = managed.process if managed else None
        return {
            "name": record.spec.name,
            "display_name": record.spec.display_name,
            "url": record.spec.url,
            "health_url": record.spec.health_url,
            "state": record.state.value,
            "detail": record.detail,
            "auto_start": record.spec.auto_start,
            "desired_running": record.desired_running,
            "managed": managed is not None,
            "mode": (
                "managed"
                if managed is not None
                else "external"
                if record.state is ServiceState.READY
                else "configured"
                if record.spec.command is not None
                else "missing"
            ),
            "pid": process.pid if process and process.poll() is None else None,
            "executable": record.spec.executable,
            "restart_count": record.restart_count,
            "last_checked_at": record.last_checked_at,
            "log_path": str(self.log_directory / f"{record.spec.name}.log"),
            "actions": {
                "start": (
                    record.state is not ServiceState.READY
                    and managed is None
                    and record.spec.command is not None
                    and _is_loopback_url(record.spec.url)
                ),
                "stop": managed is not None,
                "restart": managed is not None,
                "logs": True,
            },
        }

    def _record(self, service_name: str) -> _ServiceRecord:
        try:
            return self._records[service_name]
        except KeyError as exc:
            raise ValueError(f"Unknown local runtime: {service_name}") from exc

    def _start_service(self, record: _ServiceRecord) -> None:
        self._reconcile(record)
        with self._lock:
            if record.state is ServiceState.READY:
                return
            if not _is_loopback_url(record.spec.url):
                raise ValueError("A remote runtime can be checked but not started by the Studio")
            if record.spec.command is None:
                raise ValueError(
                    f"{record.spec.display_name} is not installed or its path is not configured"
                )
            if record.managed is not None and record.managed.process.poll() is None:
                record.desired_running = True
                return
            record.desired_running = True
            record.restart_count = 0
            record.next_restart_at = 0.0
            record.state = ServiceState.CHECKING
            record.detail = "Démarrage demandé"
        self._reconcile(record)

    def _stop_service(self, record: _ServiceRecord) -> None:
        with self._lock:
            managed = record.managed
            if managed is None and record.state is ServiceState.READY:
                raise ValueError(
                    f"{record.spec.display_name} est externe; La Serre ne peut pas l’arrêter"
                )
            record.desired_running = False
            record.managed = None
            record.started_at = None
            record.next_restart_at = 0.0
            record.restart_count = 0
            record.state = ServiceState.STOPPED
            record.detail = "Arrêté par l’utilisateur"
        if managed is not None:
            _stop_process(managed)

    def _restart_service(self, record: _ServiceRecord) -> None:
        with self._lock:
            if record.managed is None and record.state is ServiceState.READY:
                raise ValueError(
                    f"{record.spec.display_name} est externe; La Serre ne peut pas le redémarrer"
                )
        self._stop_service(record)
        self._start_service(record)

    def _run(self) -> None:
        while not self._stop_event.is_set():
            self.check_now()
            self._wake_event.wait(self.poll_interval_seconds)
            self._wake_event.clear()

    def _reconcile(self, record: _ServiceRecord) -> None:
        now = time.monotonic()
        ready = False
        try:
            ready = self._probe(record.spec)
        except Exception:  # A custom diagnostic probe must not kill the supervisor.
            LOGGER.warning("Health probe failed for %s", record.spec.name, exc_info=True)
        with self._lock:
            record.last_checked_at = datetime.now(UTC).isoformat()
            if ready:
                record.state = ServiceState.READY
                record.detail = (
                    "Service local supervisé prêt"
                    if record.managed
                    else "Service déjà actif détecté"
                )
                record.restart_count = 0
                return

            managed = record.managed
            if managed is not None:
                exit_code = managed.process.poll()
                if exit_code is None:
                    elapsed = now - (record.started_at or now)
                    if elapsed <= record.spec.startup_timeout_seconds:
                        record.state = ServiceState.STARTING
                        record.detail = "Processus lancé, service en initialisation"
                    else:
                        record.state = ServiceState.UNAVAILABLE
                        record.detail = "Processus actif mais endpoint encore inaccessible"
                    return
                managed.close_log()
                record.managed = None
                record.started_at = None
                record.restart_count += 1
                record.next_restart_at = now + min(2**record.restart_count, 30)
                LOGGER.warning(
                    "%s exited with code %s (restart %s/%s)",
                    record.spec.display_name,
                    exit_code,
                    record.restart_count,
                    self.max_restarts,
                )

            if not record.desired_running:
                record.state = ServiceState.STOPPED
                record.detail = "Service arrêté; démarrage manuel disponible"
                return
            if not _is_loopback_url(record.spec.url):
                record.state = ServiceState.UNAVAILABLE
                record.detail = "Endpoint distant: détection seule, aucun lancement local"
                return
            if record.spec.command is None:
                record.state = ServiceState.MISSING
                record.detail = "Installation locale introuvable"
                return
            if record.restart_count > self.max_restarts:
                record.state = ServiceState.FAILED
                record.detail = "Arrêt après plusieurs échecs de redémarrage"
                return
            if now < record.next_restart_at:
                record.state = ServiceState.RESTARTING
                record.detail = "Redémarrage automatique planifié"
                return

            try:
                record.managed = self._launcher(record.spec, self.log_directory)
            except (OSError, ValueError) as exc:
                record.restart_count += 1
                record.next_restart_at = now + min(2**record.restart_count, 30)
                record.state = ServiceState.FAILED
                record.detail = f"Échec du lancement: {exc}"
                LOGGER.exception("Could not launch %s", record.spec.display_name)
                return
            record.started_at = now
            record.state = ServiceState.STARTING
            record.detail = "Processus local lancé"
            LOGGER.info(
                "Started %s as PID %s",
                record.spec.display_name,
                record.managed.process.pid,
            )

    def _http_probe(self, spec: LocalServiceSpec) -> bool:
        request = urllib.request.Request(spec.health_url, method="GET")
        try:
            with urllib.request.urlopen(  # noqa: S310 - endpoint is loopback/user-configured.
                request,
                timeout=self.probe_timeout_seconds,
            ) as response:
                status = int(response.status)
                return 200 <= status < 300
        except (OSError, urllib.error.URLError):
            return False


_active_supervisor: LocalServiceSupervisor | None = None
_active_supervisor_lock = threading.Lock()


def set_active_service_supervisor(supervisor: LocalServiceSupervisor | None) -> None:
    global _active_supervisor
    with _active_supervisor_lock:
        _active_supervisor = supervisor


def service_supervisor_listing() -> dict[str, object]:
    with _active_supervisor_lock:
        supervisor = _active_supervisor
    if supervisor is None:
        return {"enabled": False, "running": False, "services": []}
    return supervisor.listing()


def control_service(service_name: str, action: str) -> dict[str, object]:
    with _active_supervisor_lock:
        supervisor = _active_supervisor
    if supervisor is None:
        raise ValueError("Le gestionnaire de runtimes est disponible dans l’application desktop")
    return supervisor.control(service_name, action)


def service_logs(service_name: str, *, limit: int = 200) -> dict[str, object]:
    with _active_supervisor_lock:
        supervisor = _active_supervisor
    if supervisor is None:
        raise ValueError("Le gestionnaire de runtimes est disponible dans l’application desktop")
    return supervisor.logs(service_name, limit=limit)


def create_local_service_supervisor(
    settings: Settings,
    runtime_root: Path,
    *,
    environ: Mapping[str, str] | None = None,
) -> LocalServiceSupervisor:
    services = discover_local_services(settings, runtime_root, environ=environ)
    return LocalServiceSupervisor(services, runtime_root / "logs" / "services")


def discover_local_services(
    settings: Settings,
    runtime_root: Path,
    *,
    environ: Mapping[str, str] | None = None,
) -> tuple[LocalServiceSpec, LocalServiceSpec]:
    """Resolve safe launch commands without starting any process."""
    environment = dict(os.environ if environ is None else environ)
    overrides = _load_service_overrides(runtime_root / DEFAULT_CONFIG_FILENAME)
    return (
        _ollama_spec(str(settings.ollama_url), runtime_root, environment, overrides),
        _comfyui_spec(str(settings.comfyui_url), runtime_root, environment, overrides),
    )


def _ollama_spec(
    url: str,
    runtime_root: Path,
    environ: Mapping[str, str],
    overrides: Mapping[str, object],
) -> LocalServiceSpec:
    configured = _service_override(overrides, "ollama")
    command = _configured_command(configured, runtime_root)
    if command is None:
        executable = _first_executable(
            environ.get("SERRE_OLLAMA_EXECUTABLE"),
            shutil.which("ollama"),
            _environment_path(environ, "LOCALAPPDATA", "Programs", "Ollama", "ollama.exe"),
            _environment_path(environ, "PROGRAMFILES", "Ollama", "ollama.exe"),
        )
        command = (str(executable), "serve") if executable else None
    return LocalServiceSpec(
        name="ollama",
        display_name="Ollama",
        url=url,
        health_path="/api/tags",
        command=command,
        working_directory=_configured_directory(configured, runtime_root),
        environment={"OLLAMA_HOST": _listen_address(url)},
        auto_start=_configured_bool(configured, "auto_start", True),
        startup_timeout_seconds=_configured_float(configured, "startup_timeout_seconds", 45.0),
    )


def _comfyui_spec(
    url: str,
    runtime_root: Path,
    environ: Mapping[str, str],
    overrides: Mapping[str, object],
) -> LocalServiceSpec:
    configured = _service_override(overrides, "comfyui")
    command = _configured_command(configured, runtime_root)
    working_directory = _configured_directory(configured, runtime_root)
    if command is None:
        executable = _first_executable(
            environ.get("SERRE_COMFYUI_EXECUTABLE"),
            shutil.which("ComfyUI"),
            shutil.which("comfyui"),
            _environment_path(environ, "LOCALAPPDATA", "Programs", "ComfyUI", "ComfyUI.exe"),
            _environment_path(
                environ,
                "LOCALAPPDATA",
                "Programs",
                "@comfyorgcomfyui-electron",
                "ComfyUI.exe",
            ),
            _environment_path(environ, "PROGRAMFILES", "ComfyUI", "ComfyUI.exe"),
        )
        if executable:
            command = (str(executable),)
        else:
            install_root = _discover_comfyui_root(environ)
            if install_root:
                extra_paths = _write_comfyui_desktop_model_paths(runtime_root, environ)
                command = _comfyui_python_command(
                    install_root,
                    url,
                    extra_model_paths=extra_paths,
                )
                working_directory = install_root
    return LocalServiceSpec(
        name="comfyui",
        display_name="ComfyUI",
        url=url,
        health_path="/system_stats",
        command=command,
        working_directory=working_directory,
        auto_start=_configured_bool(configured, "auto_start", True),
        startup_timeout_seconds=_configured_float(configured, "startup_timeout_seconds", 240.0),
    )


def _launch_process(spec: LocalServiceSpec, log_directory: Path) -> ManagedProcess:
    if not spec.command:
        raise ValueError(f"No command configured for {spec.display_name}")
    log_path = log_directory / f"{spec.name}.log"
    log_handle = log_path.open("ab", buffering=0)
    environment = {**os.environ, **spec.environment}
    creation_flags = 0
    start_new_session = os.name != "nt"
    if os.name == "nt":
        creation_flags = subprocess.CREATE_NEW_PROCESS_GROUP | subprocess.CREATE_NO_WINDOW
    try:
        process = subprocess.Popen(
            list(spec.command),
            cwd=spec.working_directory,
            env=environment,
            stdin=subprocess.DEVNULL,
            stdout=log_handle,
            stderr=subprocess.STDOUT,
            shell=False,
            creationflags=creation_flags,
            start_new_session=start_new_session,
        )
    except BaseException:
        log_handle.close()
        raise
    return ManagedProcess(process=process, log_handle=log_handle)


def _stop_process(managed: ManagedProcess, timeout_seconds: float = 5.0) -> None:
    process = managed.process
    if process.poll() is not None:
        managed.close_log()
        return
    try:
        if os.name != "nt":
            _kill_process_group(process.pid, signal.SIGTERM)
        else:
            process.terminate()
        process.wait(timeout=timeout_seconds)
    except (OSError, subprocess.TimeoutExpired):
        try:
            if os.name == "nt":
                subprocess.run(
                    ["taskkill", "/PID", str(process.pid), "/T", "/F"],
                    check=False,
                    stdin=subprocess.DEVNULL,
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.DEVNULL,
                    timeout=5,
                )
            else:
                sigkill: int = getattr(signal, "SIG" + "KILL")
                _kill_process_group(process.pid, sigkill)
        except (OSError, subprocess.SubprocessError):
            LOGGER.warning("Could not force-stop PID %s", process.pid, exc_info=True)
    finally:
        managed.close_log()


def _kill_process_group(pid: int, requested_signal: int) -> None:
    kill_process_group: Callable[[int, int], None] = getattr(os, "kill" + "pg")
    kill_process_group(pid, requested_signal)


def _load_service_overrides(path: Path) -> Mapping[str, object]:
    if not path.is_file():
        return {}
    try:
        raw = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        LOGGER.warning("Ignoring invalid local service configuration: %s", path, exc_info=True)
        return {}
    if not isinstance(raw, dict):
        LOGGER.warning("Ignoring non-object local service configuration: %s", path)
        return {}
    return raw


def _service_override(overrides: Mapping[str, object], name: str) -> Mapping[str, object]:
    value = overrides.get(name, {})
    return value if isinstance(value, dict) else {}


def _configured_command(
    configured: Mapping[str, object], runtime_root: Path
) -> tuple[str, ...] | None:
    raw = configured.get("command")
    if not isinstance(raw, list) or not raw or not all(isinstance(item, str) for item in raw):
        return None
    command = tuple(item.strip() for item in raw if item.strip())
    if not command:
        return None
    first = Path(os.path.expandvars(command[0])).expanduser()
    if not first.is_absolute() and (runtime_root / first).exists():
        first = (runtime_root / first).resolve()
    return (str(first), *command[1:])


def _configured_directory(configured: Mapping[str, object], runtime_root: Path) -> Path | None:
    raw = configured.get("working_directory")
    if not isinstance(raw, str) or not raw.strip():
        return None
    directory = Path(os.path.expandvars(raw)).expanduser()
    return directory if directory.is_absolute() else (runtime_root / directory).resolve()


def _configured_bool(configured: Mapping[str, object], key: str, default: bool) -> bool:
    value = configured.get(key)
    return value if isinstance(value, bool) else default


def _configured_float(configured: Mapping[str, object], key: str, default: float) -> float:
    value = configured.get(key)
    if isinstance(value, int | float) and not isinstance(value, bool) and value > 0:
        return float(value)
    return default


def _first_executable(*candidates: str | Path | None) -> Path | None:
    for candidate in candidates:
        if not candidate:
            continue
        path = Path(os.path.expandvars(str(candidate))).expanduser()
        if path.is_file():
            return path.resolve()
    return None


def _environment_path(environ: Mapping[str, str], variable: str, *relative: str) -> Path | None:
    root = environ.get(variable)
    return Path(root, *relative) if root else None


def _discover_comfyui_root(environ: Mapping[str, str]) -> Path | None:
    candidates: list[Path] = []
    configured = environ.get("SERRE_COMFYUI_DIRECTORY")
    if configured:
        candidates.append(Path(configured).expanduser())
    local_app_data = environ.get("LOCALAPPDATA")
    if local_app_data:
        candidates.append(
            Path(local_app_data)
            / "Comfy-Desktop"
            / "ComfyUI-Installs"
            / "ComfyUI"
            / "ComfyUI"
        )
    user_profile = environ.get("USERPROFILE")
    if user_profile:
        candidates.extend(
            [
                Path(user_profile) / "ComfyUI",
                Path(user_profile) / "ComfyUI_windows_portable" / "ComfyUI",
            ]
        )
    for candidate in candidates:
        if (candidate / "main.py").is_file():
            return candidate.resolve()
    return None


def _comfyui_python_command(
    install_root: Path,
    url: str,
    *,
    extra_model_paths: Path | None = None,
) -> tuple[str, ...] | None:
    python_candidates = (
        install_root / ".venv" / "Scripts" / "python.exe",
        install_root.parent / "python_embeded" / "python.exe",
        Path(sys.executable) if not getattr(sys, "frozen", False) else None,
    )
    python = _first_executable(*python_candidates)
    if python is None:
        return None
    parsed = urlsplit(url)
    host = parsed.hostname or "127.0.0.1"
    port = parsed.port or 8188
    command: tuple[str, ...] = (
        str(python),
        str((install_root / "main.py").resolve()),
        "--listen",
        host,
        "--port",
        str(port),
    )
    if extra_model_paths is not None:
        command += ("--extra-model-paths-config", str(extra_model_paths.resolve()))
    return command


def _write_comfyui_desktop_model_paths(
    runtime_root: Path,
    environ: Mapping[str, str],
) -> Path | None:
    local_app_data = environ.get("LOCALAPPDATA")
    if not local_app_data:
        return None
    shared_root = Path(local_app_data) / "Comfy-Desktop" / "ComfyUI-Shared"
    models_root = shared_root / "models"
    if not models_root.is_dir():
        return None
    available = [name for name in COMFYUI_MODEL_DIRECTORIES if (models_root / name).is_dir()]
    if not available:
        return None
    lines = [
        "serre_comfy_desktop:",
        f'  base_path: "{shared_root.resolve().as_posix()}"',
        "  is_default: true",
        *(f"  {name}: models/{name}" for name in available),
        "",
    ]
    destination = runtime_root / "comfyui-extra-model-paths.yaml"
    content = "\n".join(lines)
    try:
        if not destination.is_file() or destination.read_text(encoding="utf-8") != content:
            destination.parent.mkdir(parents=True, exist_ok=True)
            destination.write_text(content, encoding="utf-8")
    except OSError:
        LOGGER.warning("Could not write ComfyUI shared model configuration", exc_info=True)
        return None
    return destination


def _listen_address(url: str) -> str:
    parsed = urlsplit(url)
    host = parsed.hostname or "127.0.0.1"
    port = parsed.port or 11434
    return f"{host}:{port}"


def _is_loopback_url(url: str) -> bool:
    host = (urlsplit(url).hostname or "").lower()
    return host in {"127.0.0.1", "::1", "localhost"}
