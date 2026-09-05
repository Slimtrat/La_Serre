from __future__ import annotations

import argparse
import threading
import webbrowser
from collections.abc import Sequence
from pathlib import Path

import uvicorn

from apps.desktop.runtime import configure_logging, prepare_runtime_directory
from apps.desktop.service_launcher import (
    create_local_service_supervisor,
    set_active_service_supervisor,
)
from engine.config import Settings


def parser() -> argparse.ArgumentParser:
    result = argparse.ArgumentParser(description="Launch the local La Serre studio")
    result.add_argument("--host", default="127.0.0.1")
    result.add_argument("--port", default=8000, type=int)
    result.add_argument("--no-browser", action="store_true")
    result.add_argument(
        "--data-dir",
        type=Path,
        help="dossier de données du Studio (répertoire courant par défaut)",
    )
    result.add_argument("--verbose", action="store_true")
    return result


def main(argv: Sequence[str] | None = None) -> int:
    args = parser().parse_args(argv)
    runtime_root = prepare_runtime_directory(args.data_dir or Path.cwd())
    configure_logging(runtime_root, verbose=args.verbose)
    supervisor = create_local_service_supervisor(Settings.load(), runtime_root)
    set_active_service_supervisor(supervisor)
    supervisor.start()
    try:
        if not args.no_browser:
            threading.Timer(
                0.8,
                webbrowser.open,
                args=(f"http://{args.host}:{args.port}",),
            ).start()
        uvicorn.run(
            "apps.api.main:app",
            host=args.host,
            port=args.port,
            log_level="debug" if args.verbose else "info",
        )
    finally:
        supervisor.stop()
        set_active_service_supervisor(None)
    return 0


if __name__ == "__main__":
    main()
