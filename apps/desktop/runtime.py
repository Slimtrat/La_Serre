from __future__ import annotations

import logging
import os
import shutil
import socket
import sys
import threading
import time
from dataclasses import dataclass
from logging.handlers import RotatingFileHandler
from pathlib import Path
from types import TracebackType

import uvicorn

APP_NAME = "La Serre des Venins"
APP_VERSION = "0.2.1"
DEFAULT_STARTUP_TIMEOUT_SECONDS = 20.0


@dataclass(frozen=True, slots=True)
class ServerEndpoint:
    host: str
    port: int

    @property
    def url(self) -> str:
        display_host = f"[{self.host}]" if ":" in self.host else self.host
        return f"http://{display_host}:{self.port}"


class EmbeddedStudioServer:
    """Own a Uvicorn server and its pre-bound loopback socket."""

    def __init__(
        self,
        *,
        host: str = "127.0.0.1",
        port: int = 0,
        startup_timeout_seconds: float = DEFAULT_STARTUP_TIMEOUT_SECONDS,
        log_level: str = "info",
    ) -> None:
        if host not in {"127.0.0.1", "::1", "localhost"}:
            raise ValueError("The desktop server can only listen on a loopback address")
        if not 0 <= port <= 65535:
            raise ValueError("port must be between 0 and 65535")
        if startup_timeout_seconds <= 0:
            raise ValueError("startup_timeout_seconds must be positive")

        self.host = host
        self.requested_port = port
        self.startup_timeout_seconds = startup_timeout_seconds
        self.log_level = log_level
        self.endpoint: ServerEndpoint | None = None
        self._server: uvicorn.Server | None = None
        self._thread: threading.Thread | None = None
        self._thread_error: BaseException | None = None
        self._finished = threading.Event()

    @property
    def running(self) -> bool:
        return bool(self._thread and self._thread.is_alive() and self._server)

    def start(self) -> ServerEndpoint:
        if self.running:
            if self.endpoint is None:
                raise RuntimeError("Desktop server is running without an endpoint")
            return self.endpoint

        listener, endpoint = _open_listener(self.host, self.requested_port)
        config = uvicorn.Config(
            "apps.api.main:app",
            host=endpoint.host,
            port=endpoint.port,
            log_level=self.log_level,
            access_log=False,
            log_config=None,
        )
        server = uvicorn.Server(config)
        self.endpoint = endpoint
        self._server = server
        self._thread_error = None
        self._finished.clear()

        def serve() -> None:
            try:
                server.run(sockets=[listener])
            except BaseException as exc:  # Uvicorn may surface SystemExit on startup errors.
                self._thread_error = exc
            finally:
                listener.close()
                self._finished.set()

        self._thread = threading.Thread(
            target=serve,
            name="serre-studio-uvicorn",
            daemon=True,
        )
        self._thread.start()

        deadline = time.monotonic() + self.startup_timeout_seconds
        while time.monotonic() < deadline:
            if server.started:
                logging.getLogger(__name__).info("Studio server ready at %s", endpoint.url)
                return endpoint
            if self._finished.wait(0.025):
                break

        self.stop()
        if self._thread_error is not None:
            raise RuntimeError("The embedded Studio server failed to start") from self._thread_error
        raise TimeoutError(
            f"The embedded Studio server did not start within "
            f"{self.startup_timeout_seconds:g} seconds"
        )

    def stop(self, timeout_seconds: float = 10.0) -> None:
        server = self._server
        thread = self._thread
        if server is None or thread is None:
            return

        server.should_exit = True
        thread.join(timeout=max(timeout_seconds, 0.0))
        if thread.is_alive():
            logging.getLogger(__name__).warning("Forcing the embedded server to stop")
            server.force_exit = True
            thread.join(timeout=2.0)
        if thread.is_alive():
            logging.getLogger(__name__).error("Embedded server thread did not stop cleanly")
        else:
            logging.getLogger(__name__).info("Studio server stopped")
        self._thread = None
        self._server = None

    def __enter__(self) -> EmbeddedStudioServer:
        self.start()
        return self

    def __exit__(
        self,
        exc_type: type[BaseException] | None,
        exc: BaseException | None,
        traceback: TracebackType | None,
    ) -> None:
        del exc_type, exc, traceback
        self.stop()


def prepare_runtime_directory(requested: Path | None = None) -> Path:
    """Create and select the writable root used by relative backend paths."""
    if requested is not None:
        root = requested.expanduser().resolve()
    elif getattr(sys, "frozen", False):
        local_app_data = os.environ.get("LOCALAPPDATA")
        base = Path(local_app_data) if local_app_data else Path.home() / "AppData" / "Local"
        root = base / "SerreStudio"
    else:
        root = Path.cwd()

    for relative in ("output", ".private", "projects", "workflows/local", "logs"):
        (root / relative).mkdir(parents=True, exist_ok=True)
    _copy_bundled_examples(root)
    os.chdir(root)
    return root


def configure_logging(runtime_root: Path, *, verbose: bool = False) -> Path:
    log_path = runtime_root / "logs" / "desktop.log"
    handler = RotatingFileHandler(
        log_path,
        maxBytes=2_000_000,
        backupCount=3,
        encoding="utf-8",
    )
    handler.setFormatter(
        logging.Formatter("%(asctime)s %(levelname)s %(name)s: %(message)s")
    )
    root_logger = logging.getLogger()
    root_logger.setLevel(logging.DEBUG if verbose else logging.INFO)
    root_logger.addHandler(handler)
    return log_path


def _open_listener(host: str, port: int) -> tuple[socket.socket, ServerEndpoint]:
    last_error: OSError | None = None
    for family, sock_type, protocol, _, address in socket.getaddrinfo(
        host,
        port,
        type=socket.SOCK_STREAM,
    ):
        listener = socket.socket(family, sock_type, protocol)
        try:
            listener.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            if family == socket.AF_INET6:
                listener.setsockopt(socket.IPPROTO_IPV6, socket.IPV6_V6ONLY, 1)
            listener.bind(address)
            listener.listen(2048)
            listener.set_inheritable(False)
            actual_port = int(listener.getsockname()[1])
            return listener, ServerEndpoint(host=host, port=actual_port)
        except OSError as exc:
            last_error = exc
            listener.close()
    if last_error is not None:
        raise last_error
    raise OSError(f"Could not resolve loopback host {host!r}")


def _copy_bundled_examples(runtime_root: Path) -> None:
    bundle_root = Path(str(getattr(sys, "_MEIPASS", Path(__file__).parents[2])))
    for relative in (Path("examples"), Path("workflows/images"), Path("workflows/video")):
        source = bundle_root / relative
        destination = runtime_root / relative
        if source.is_dir() and not destination.exists():
            destination.parent.mkdir(parents=True, exist_ok=True)
            shutil.copytree(source, destination)
