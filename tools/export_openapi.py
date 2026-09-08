from __future__ import annotations

import argparse
import json
from collections.abc import Sequence
from pathlib import Path
from typing import Any

from fastapi import FastAPI

from apps.api.main import create_app
from engine.config import Settings

DEFAULT_OUTPUT = Path("frontend/openapi.json")


def serialize_openapi(schema: dict[str, Any]) -> str:
    """Return a stable, human-readable representation of an OpenAPI schema."""
    return json.dumps(schema, ensure_ascii=False, indent=2, sort_keys=True) + "\n"


def export_openapi(output: Path = DEFAULT_OUTPUT, application: FastAPI | None = None) -> Path:
    """Export the application schema without starting an HTTP server."""
    app = application or create_app(Settings(_env_file=None))
    rendered = serialize_openapi(app.openapi())

    output.parent.mkdir(parents=True, exist_ok=True)
    if not output.is_file() or output.read_text(encoding="utf-8") != rendered:
        output.write_text(rendered, encoding="utf-8", newline="\n")
    return output


def parser() -> argparse.ArgumentParser:
    result = argparse.ArgumentParser(
        description="Exporte le schéma OpenAPI de La Serre sans démarrer de serveur."
    )
    result.add_argument(
        "--output",
        type=Path,
        default=DEFAULT_OUTPUT,
        help=f"Fichier JSON généré (défaut : {DEFAULT_OUTPUT}).",
    )
    return result


def main(argv: Sequence[str] | None = None) -> None:
    args = parser().parse_args(argv)
    output = export_openapi(args.output)
    print(f"OpenAPI : {output}")


if __name__ == "__main__":
    main()
