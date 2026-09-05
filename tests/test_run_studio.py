from __future__ import annotations

from pathlib import Path

import pytest

from tools import run_studio


class FakeSupervisor:
    def __init__(self) -> None:
        self.started = False
        self.stopped = False

    def start(self) -> None:
        self.started = True

    def stop(self) -> None:
        self.stopped = True


def test_browser_launcher_supervises_local_ai_services(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    supervisor = FakeSupervisor()
    registrations: list[object | None] = []
    monkeypatch.setattr(run_studio, "prepare_runtime_directory", lambda _path: tmp_path)
    monkeypatch.setattr(
        run_studio, "configure_logging", lambda *_args, **_kwargs: tmp_path / "studio.log"
    )
    monkeypatch.setattr(run_studio, "create_local_service_supervisor", lambda *_args: supervisor)
    monkeypatch.setattr(run_studio, "set_active_service_supervisor", registrations.append)
    monkeypatch.setattr(run_studio.Settings, "load", lambda: object())
    monkeypatch.setattr(run_studio.uvicorn, "run", lambda *_args, **_kwargs: None)

    result = run_studio.main(["--data-dir", str(tmp_path), "--no-browser"])

    assert result == 0
    assert supervisor.started is True
    assert supervisor.stopped is True
    assert registrations == [supervisor, None]
