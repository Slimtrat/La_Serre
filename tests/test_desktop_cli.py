from __future__ import annotations

from pathlib import Path

import pytest

from apps.desktop import cli


class FakeSupervisor:
    def __init__(self) -> None:
        self.started = False
        self.stopped = False

    def start(self) -> None:
        self.started = True

    def stop(self) -> None:
        self.stopped = True


def test_desktop_cli_always_stops_the_local_service_supervisor(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    supervisor = FakeSupervisor()
    registrations: list[object | None] = []
    monkeypatch.setattr(cli, "prepare_runtime_directory", lambda _path: tmp_path)
    monkeypatch.setattr(cli, "configure_logging", lambda *_args, **_kwargs: tmp_path / "log")
    monkeypatch.setattr(
        cli,
        "create_local_service_supervisor",
        lambda *_args, **_kwargs: supervisor,
    )
    monkeypatch.setattr(cli, "set_active_service_supervisor", registrations.append)

    def fail_window(*_args: object, **_kwargs: object) -> None:
        raise RuntimeError("window failed")

    monkeypatch.setattr(cli, "launch_native_window", fail_window)

    assert cli.main(["--data-dir", str(tmp_path)]) == 1
    assert supervisor.started is True
    assert supervisor.stopped is True
    assert registrations == [supervisor, None]
