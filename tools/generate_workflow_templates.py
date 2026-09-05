from __future__ import annotations

import argparse
from pathlib import Path

from engine.generation.comfy.workflow_templates import WorkflowTemplateCatalogue


def parser() -> argparse.ArgumentParser:
    result = argparse.ArgumentParser(
        description="Génère le catalogue versionné de workflows ComfyUI de continuité."
    )
    result.add_argument(
        "--output-dir",
        type=Path,
        default=Path("workflows/templates"),
        help="Dossier du catalogue généré.",
    )
    return result


def main() -> None:
    args = parser().parse_args()
    manifests = WorkflowTemplateCatalogue().write(args.output_dir)
    print(f"Catalogue : {args.output_dir / 'catalogue.json'}")
    for manifest in manifests:
        print(f"Template : {manifest}")


if __name__ == "__main__":
    main()
