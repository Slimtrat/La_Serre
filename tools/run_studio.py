from __future__ import annotations

import argparse
import threading
import webbrowser

import uvicorn


def parser() -> argparse.ArgumentParser:
    result = argparse.ArgumentParser(description="Launch the local Serre des Venins studio")
    result.add_argument("--host", default="127.0.0.1")
    result.add_argument("--port", default=8000, type=int)
    result.add_argument("--no-browser", action="store_true")
    return result


def main() -> None:
    args = parser().parse_args()
    if not args.no_browser:
        threading.Timer(0.8, webbrowser.open, args=(f"http://{args.host}:{args.port}",)).start()
    uvicorn.run("apps.api.main:app", host=args.host, port=args.port)


if __name__ == "__main__":
    main()
