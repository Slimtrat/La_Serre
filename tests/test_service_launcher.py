from __future__ import annotations

import json
from collections.abc import Callable
from pathlib import Path
from typing import BinaryIO

import httpx
import pytest

from apps.api.main import create_app
from apps.desktop.service_launcher import (
    LocalServiceSpec,
    LocalServiceSupervisor,
    ManagedProcess,
    ServiceState,
    discover_local_services,
    set_active_service_supervisor,
)
from engine.config import Settings


class FakeProcess:
    def __init__(self, pid: int = 4242) -> None:
        self.pid = pid
        self.return_code: int | None = None
        self.terminated = False
        self.killed = False

    def poll(self) -> int | None:
        return self.return_code

    def terminate(self) -> None:
        self.terminated = True
        self.return_code = 0

    def wait(self, timeout: float | None = None) -> int:
        del timeout
        return self.return_code or 0

    def kill(self) -> None:
        self.killed = True
        self.return_code = -9


def _service(
    *,
    command: tuple[str, ...] | None = ("service.exe", "serve"),
    url: str = "http://127.0.0.1:4321",
    auto_start: bool = True,
) -> LocalServiceSpec:
    return LocalServiceSpec(
        name="example",
        display_name="Example",
        url=url,
        health_path="/health",
        command=command,
        auto_start=auto_start,
    )


def _fake_launcher(
    process: FakeProcess,
    launched: list[LocalServiceSpec],
) -> Callable[[LocalServiceSpec, Path], ManagedProcess]:
    def launch(spec: LocalServiceSpec, log_directory: Path) -> ManagedProcess:
        launched.append(spec)
        log_directory.mkdir(parents=True, exist_ok=True)
        log_handle: BinaryIO = (log_directory / "example.log").open("ab")
        return ManagedProcess(process=process, log_handle=log_handle)

    return launch


def test_supervisor_preserves_an_already_running_external_service(tmp_path: Path) -> None:
    launched: list[LocalServiceSpec] = []
    process = FakeProcess()
    supervisor = LocalServiceSupervisor(
        [_service()],
        tmp_path,
        probe=lambda _spec: True,
        launcher=_fake_launcher(process, launched),
    )

    supervisor.check_now()
    service = supervisor.listing()["services"][0]  # type: ignore[index]
    supervisor.stop()

    assert service["state"] == ServiceState.READY
    assert service["managed"] is False
    assert service["detail"] == "Service déjà actif détecté"
    assert launched == []
    assert process.terminated is False


def test_supervisor_launches_and_stops_only_its_owned_process(tmp_path: Path) -> None:
    launched: list[LocalServiceSpec] = []
    process = FakeProcess()
    supervisor = LocalServiceSupervisor(
        [_service()],
        tmp_path,
        probe=lambda _spec: False,
        launcher=_fake_launcher(process, launched),
    )

    supervisor.check_now()
    service = supervisor.listing()["services"][0]  # type: ignore[index]
    supervisor.stop()

    assert service["state"] == ServiceState.STARTING
    assert service["managed"] is True
    assert service["pid"] == 4242
    assert len(launched) == 1
    assert process.terminated is True


def test_supervisor_stops_retrying_after_repeated_process_failure(tmp_path: Path) -> None:
    launched: list[LocalServiceSpec] = []
    process = FakeProcess()
    supervisor = LocalServiceSupervisor(
        [_service()],
        tmp_path,
        probe=lambda _spec: False,
        launcher=_fake_launcher(process, launched),
        max_restarts=0,
    )

    supervisor.check_now()
    process.return_code = 17
    supervisor.check_now()
    service = supervisor.listing()["services"][0]  # type: ignore[index]

    assert service["state"] == ServiceState.FAILED
    assert service["restart_count"] == 1
    assert service["managed"] is False
    assert len(launched) == 1


def test_manual_lifecycle_starts_and_stops_a_configured_runtime(tmp_path: Path) -> None:
    launched: list[LocalServiceSpec] = []
    process = FakeProcess()
    supervisor = LocalServiceSupervisor(
        [_service(auto_start=False)],
        tmp_path,
        probe=lambda _spec: False,
        launcher=_fake_launcher(process, launched),
    )

    supervisor.check_now()
    initial = supervisor.listing()["services"][0]  # type: ignore[index]
    started = supervisor.control("example", "start")
    stopped = supervisor.control("example", "stop")
    supervisor.check_now()
    final = supervisor.listing()["services"][0]  # type: ignore[index]

    assert initial["state"] == ServiceState.STOPPED
    assert initial["actions"]["start"] is True  # type: ignore[index]
    assert started["state"] == ServiceState.STARTING
    assert started["managed"] is True
    assert stopped["state"] == ServiceState.STOPPED
    assert process.terminated is True
    assert final["state"] == ServiceState.STOPPED
    assert len(launched) == 1


def test_supervisor_refuses_to_stop_or_restart_an_external_runtime(tmp_path: Path) -> None:
    supervisor = LocalServiceSupervisor(
        [_service()],
        tmp_path,
        probe=lambda _spec: True,
    )
    supervisor.check_now()

    with pytest.raises(ValueError, match="externe"):
        supervisor.control("example", "stop")
    with pytest.raises(ValueError, match="externe"):
        supervisor.control("example", "restart")


def test_supervisor_returns_a_bounded_service_log_tail(tmp_path: Path) -> None:
    supervisor = LocalServiceSupervisor(
        [_service(command=None)],
        tmp_path,
        probe=lambda _spec: False,
    )
    tmp_path.mkdir(parents=True, exist_ok=True)
    (tmp_path / "example.log").write_text("one\ntwo\nthree\n", encoding="utf-8")

    result = supervisor.logs("example", limit=2)

    assert result["service"] == "example"
    assert result["lines"] == ["two", "three"]


def test_supervisor_never_launches_a_command_for_a_remote_endpoint(tmp_path: Path) -> None:
    launched: list[LocalServiceSpec] = []
    supervisor = LocalServiceSupervisor(
        [_service(url="https://comfy.example.test")],
        tmp_path,
        probe=lambda _spec: False,
        launcher=_fake_launcher(FakeProcess(), launched),
    )

    supervisor.check_now()
    service = supervisor.listing()["services"][0]  # type: ignore[index]

    assert service["state"] == ServiceState.UNAVAILABLE
    assert "Endpoint distant" in str(service["detail"])
    assert launched == []


def test_discovery_honours_explicit_commands_and_safe_autostart_config(
    tmp_path: Path,
) -> None:
    ollama = tmp_path / "bin" / "ollama.exe"
    ollama.parent.mkdir()
    ollama.write_bytes(b"")
    comfy_root = tmp_path / "portable" / "ComfyUI"
    comfy_root.mkdir(parents=True)
    (comfy_root / "main.py").write_text("", encoding="utf-8")
    embedded_python = comfy_root.parent / "python_embeded" / "python.exe"
    embedded_python.parent.mkdir()
    embedded_python.write_bytes(b"")
    (tmp_path / "runtime-services.json").write_text(
        json.dumps(
            {
                "ollama": {"auto_start": False},
                "comfyui": {"startup_timeout_seconds": 360},
            }
        ),
        encoding="utf-8",
    )
    settings = Settings(_env_file=None)

    discovered = discover_local_services(
        settings,
        tmp_path,
        environ={
            "SERRE_OLLAMA_EXECUTABLE": str(ollama),
            "SERRE_COMFYUI_DIRECTORY": str(comfy_root),
        },
    )
    by_name = {service.name: service for service in discovered}

    assert by_name["ollama"].command == (str(ollama.resolve()), "serve")
    assert by_name["ollama"].auto_start is False
    assert by_name["ollama"].environment == {"OLLAMA_HOST": "127.0.0.1:11434"}
    assert by_name["comfyui"].command == (
        str(embedded_python.resolve()),
        str((comfy_root / "main.py").resolve()),
        "--listen",
        "127.0.0.1",
        "--port",
        "8188",
    )
    assert by_name["comfyui"].startup_timeout_seconds == 360


def test_discovery_supports_comfyui_desktop_installation(tmp_path: Path) -> None:
    local_app_data = tmp_path / "LocalAppData"
    comfy_root = (
        local_app_data
        / "Comfy-Desktop"
        / "ComfyUI-Installs"
        / "ComfyUI"
        / "ComfyUI"
    )
    (comfy_root / "main.py").parent.mkdir(parents=True)
    (comfy_root / "main.py").write_text("", encoding="utf-8")
    python = comfy_root / ".venv" / "Scripts" / "python.exe"
    python.parent.mkdir(parents=True)
    python.write_bytes(b"")
    shared = local_app_data / "Comfy-Desktop" / "ComfyUI-Shared" / "models"
    (shared / "checkpoints").mkdir(parents=True)
    (shared / "text_encoders").mkdir()

    discovered = discover_local_services(
        Settings(_env_file=None),
        tmp_path,
        environ={"LOCALAPPDATA": str(local_app_data)},
    )
    comfyui = next(service for service in discovered if service.name == "comfyui")

    assert comfyui.working_directory == comfy_root.resolve()
    assert comfyui.command == (
        str(python.resolve()),
        str((comfy_root / "main.py").resolve()),
        "--listen",
        "127.0.0.1",
        "--port",
        "8188",
        "--extra-model-paths-config",
        str((tmp_path / "comfyui-extra-model-paths.yaml").resolve()),
    )
    config = (tmp_path / "comfyui-extra-model-paths.yaml").read_text(encoding="utf-8")
    assert f'base_path: "{shared.parent.resolve().as_posix()}"' in config
    assert "checkpoints: models/checkpoints" in config
    assert "text_encoders: models/text_encoders" in config


async def test_runtime_services_api_exposes_the_native_supervisor(tmp_path: Path) -> None:
    supervisor = LocalServiceSupervisor(
        [_service(command=None)],
        tmp_path,
        probe=lambda _spec: False,
    )
    supervisor.check_now()
    set_active_service_supervisor(supervisor)
    try:
        app = create_app(Settings(_env_file=None, output_dir=tmp_path / "output"))
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.get("/api/runtime/services")
            desktop_status = await client.get("/api/desktop/status")
    finally:
        set_active_service_supervisor(None)

    assert response.status_code == 200
    assert response.json()["enabled"] is True
    assert response.json()["services"][0]["state"] == "missing"
    assert desktop_status.status_code == 200
    assert desktop_status.json()["state"] == "idle"
    assert desktop_status.json()["runtimes"][0]["name"] == "example"


async def test_runtime_services_api_controls_owned_process_and_exposes_logs(
    tmp_path: Path,
) -> None:
    process = FakeProcess()
    supervisor = LocalServiceSupervisor(
        [_service(auto_start=False)],
        tmp_path / "logs",
        probe=lambda _spec: False,
        launcher=_fake_launcher(process, []),
    )
    supervisor.check_now()
    set_active_service_supervisor(supervisor)
    try:
        app = create_app(Settings(_env_file=None, output_dir=tmp_path / "output"))
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
            started = await client.post("/api/runtime/services/example/start")
            logs = await client.get("/api/runtime/services/example/logs")
            stopped = await client.post("/api/runtime/services/example/stop")
    finally:
        supervisor.stop()
        set_active_service_supervisor(None)

    assert started.status_code == 200
    assert started.json()["service"]["managed"] is True
    assert logs.status_code == 200
    assert logs.json()["service"] == "example"
    assert stopped.status_code == 200
    assert stopped.json()["service"]["state"] == "stopped"
    assert process.terminated is True
