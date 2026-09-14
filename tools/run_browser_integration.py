from __future__ import annotations

import argparse
import os
import socket
import subprocess
import sys
import tempfile
import time
import urllib.error
import urllib.request
from collections.abc import Sequence
from pathlib import Path


def parser() -> argparse.ArgumentParser:
    result = argparse.ArgumentParser(
        description="Run Playwright scenarios against an isolated real FastAPI server."
    )
    result.add_argument("--scenario", action="append", type=Path)
    result.add_argument("--artifacts", type=Path, default=Path("artifacts/browser-integration"))
    result.add_argument("--port", type=int, default=0)
    result.add_argument("--timeout", type=float, default=120)
    return result


def _free_port() -> int:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as listener:
        listener.bind(("127.0.0.1", 0))
        return int(listener.getsockname()[1])


def _wait_until_ready(process: subprocess.Popen[str], url: str, timeout: float) -> None:
    deadline = time.monotonic() + timeout
    last_error = "server did not answer"
    while time.monotonic() < deadline:
        if process.poll() is not None:
            raise RuntimeError(f"FastAPI exited early with code {process.returncode}")
        try:
            with urllib.request.urlopen(url, timeout=1) as response:  # noqa: S310
                if response.status == 200:
                    return
        except (OSError, urllib.error.URLError) as exc:
            last_error = str(exc)
        time.sleep(0.2)
    raise TimeoutError(f"FastAPI readiness timed out: {last_error}")


def _stop(process: subprocess.Popen[str]) -> None:
    if process.poll() is not None:
        return
    process.terminate()
    try:
        process.wait(timeout=10)
    except subprocess.TimeoutExpired:
        process.kill()
        process.wait(timeout=5)


def main(argv: Sequence[str] | None = None) -> int:
    args = parser().parse_args(argv)
    root = Path(__file__).resolve().parents[1]
    scenarios = args.scenario or [
        Path("tests/browser/guided_casting_integration.mjs"),
        Path("tests/browser/season_board_smoke.mjs"),
    ]
    scenario_paths = [
        (root / item).resolve() if not item.is_absolute() else item.resolve()
        for item in scenarios
    ]
    for scenario in scenario_paths:
        if not scenario.is_relative_to(root) or not scenario.is_file():
            raise ValueError(f"Browser scenario must be a repository file: {scenario}")
    artifacts = (
        (root / args.artifacts).resolve()
        if not args.artifacts.is_absolute()
        else args.artifacts.resolve()
    )
    artifacts.mkdir(parents=True, exist_ok=True)
    port = args.port or _free_port()
    base_url = f"http://127.0.0.1:{port}/"

    with tempfile.TemporaryDirectory(prefix="la-serre-browser-integration-") as folder:
        data = Path(folder)
        private = data / "private"
        output = data / "output"
        downloads = data / "downloads"
        for path in (private, output, downloads):
            path.mkdir(parents=True, exist_ok=True)
        environment = {
            **os.environ,
            "PYTHONUNBUFFERED": "1",
            "SERRE_E2E_PRIVATE_DIR": str(private),
            "SERRE_E2E_OUTPUT_DIR": str(output),
            "SERRE_E2E_DOWNLOADS_DIR": str(downloads),
            "SERRE_E2E_ARTIFACT_DIR": str(artifacts),
            "SERRE_STUDIO_URL": base_url,
        }
        server_log = artifacts / "fastapi.log"
        browser_log = artifacts / "playwright.log"
        with server_log.open("w", encoding="utf-8") as server_output:
            process = subprocess.Popen(  # noqa: S603
                [
                    sys.executable,
                    "-m",
                    "uvicorn",
                    "tools.browser_integration_server:app",
                    "--host",
                    "127.0.0.1",
                    "--port",
                    str(port),
                ],
                cwd=root,
                env=environment,
                stdout=server_output,
                stderr=subprocess.STDOUT,
                text=True,
            )
            try:
                _wait_until_ready(process, f"{base_url}health", min(args.timeout, 30))
                outputs: list[str] = []
                for scenario in scenario_paths:
                    try:
                        completed = subprocess.run(  # noqa: S603
                            ["node", str(scenario)],
                            cwd=root,
                            env=environment,
                            capture_output=True,
                            encoding="utf-8",
                            errors="replace",
                            timeout=args.timeout,
                            check=False,
                        )
                    except subprocess.TimeoutExpired as exc:
                        outputs.extend(
                            (
                                f"## {scenario.name}",
                                str(exc.stdout or ""),
                                str(exc.stderr or ""),
                                f"TIMEOUT after {args.timeout:g} seconds",
                            )
                        )
                        browser_log.write_text("\n".join(outputs), encoding="utf-8")
                        return 124
                    outputs.extend(
                        (f"## {scenario.name}", completed.stdout or "", completed.stderr or "")
                    )
                    if completed.returncode != 0:
                        browser_log.write_text("\n".join(outputs), encoding="utf-8")
                        return completed.returncode
                browser_log.write_text("\n".join(outputs), encoding="utf-8")
            finally:
                _stop(process)
    print(f"Browser integration passed against {base_url}; evidence: {artifacts}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
