from __future__ import annotations

import argparse
import logging
import sys
from collections.abc import Sequence
from pathlib import Path

from apps.desktop.runtime import (
    APP_NAME,
    APP_VERSION,
    EmbeddedStudioServer,
    configure_logging,
    prepare_runtime_directory,
)
from apps.desktop.service_launcher import (
    create_local_service_supervisor,
    set_active_service_supervisor,
)
from apps.desktop.window import DesktopDependencyError, launch_native_window
from engine.config import Settings


def parser() -> argparse.ArgumentParser:
    result = argparse.ArgumentParser(description=f"Launch {APP_NAME} as a native desktop app")
    result.add_argument("--version", action="version", version=f"%(prog)s {APP_VERSION}")
    result.add_argument(
        "--port",
        default=0,
        type=int,
        help="loopback port; 0 (default) asks Windows for a free port",
    )
    result.add_argument(
        "--data-dir",
        type=Path,
        help="writable Studio data directory (defaults to the repository or LocalAppData)",
    )
    result.add_argument("--width", default=1440, type=int)
    result.add_argument("--height", default=900, type=int)
    result.add_argument("--no-maximize", action="store_true")
    result.add_argument("--debug", action="store_true", help="enable webview developer tools")
    result.add_argument("--verbose", action="store_true")
    return result


def main(argv: Sequence[str] | None = None) -> int:
    args = parser().parse_args(argv)
    if args.width < 1024 or args.height < 700:
        parser().error("the desktop window must be at least 1024x700")

    runtime_root = prepare_runtime_directory(args.data_dir)
    log_path = configure_logging(runtime_root, verbose=args.verbose or args.debug)
    service_supervisor = create_local_service_supervisor(Settings.load(), runtime_root)
    server = EmbeddedStudioServer(
        port=args.port,
        log_level="debug" if args.verbose else "info",
    )
    try:
        set_active_service_supervisor(service_supervisor)
        service_supervisor.start()
        launch_native_window(
            server,
            runtime_root,
            width=args.width,
            height=args.height,
            maximized=not args.no_maximize,
            debug=args.debug,
        )
    except (DesktopDependencyError, OSError, RuntimeError, TimeoutError) as exc:
        logging.getLogger(__name__).exception("Desktop startup failed")
        print(f"{APP_NAME}: {exc}\nLog: {log_path}", file=sys.stderr)
        return 1
    finally:
        service_supervisor.stop()
        set_active_service_supervisor(None)
    return 0
