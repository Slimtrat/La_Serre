from __future__ import annotations

from collections.abc import Mapping

from engine.runtime.capability_packs import PackComponent
from engine.runtime.installers.base import (
    CancellationToken,
    InstallContext,
    InstallerError,
    InstallOutcome,
    ManualActionRequired,
    ProcessRunner,
    assert_safe_child,
    successful_process,
)
from engine.runtime.managed_tools import ManagedToolSpec, ManagedZipTool

_DEFAULT_NODE_IDS = {"comfyui-required-nodes": "comfyui-ltxvideo"}
COMFY_CLI_VERSION = "1.20.0"
UV_WINDOWS_X64 = ManagedToolSpec(
    name="uv",
    version="0.12.13",
    source=(
        "https://github.com/astral-sh/uv/releases/download/0.12.13/"
        "uv-x86_64-pc-windows-msvc.zip"
    ),
    archive_sha256="a86c9dc7bad9b03f388583b7187c05fe9951c2e0d392217e8fd43d97787f6ec2",
    executable="uv.exe",
    license_name="Apache License 2.0 / MIT",
    license_url="https://github.com/astral-sh/uv/blob/0.12.13/LICENSE-MIT",
    size_bytes=17_612_025,
)


class ComfyCliAdapter:
    """Owns only La Serre's managed ComfyUI workspace."""

    def __init__(
        self,
        runner: ProcessRunner,
        *,
        node_ids: Mapping[str, str] = _DEFAULT_NODE_IDS,
        managed_cli: ManagedZipTool | None = None,
    ) -> None:
        self.runner = runner
        self.node_ids = dict(node_ids)
        self.managed_cli = managed_cli

    def supports(self, component: PackComponent) -> bool:
        return component.detection.kind in {"comfyui", "nodes"}

    async def inspect(
        self, component: PackComponent, context: InstallContext
    ) -> InstallOutcome | None:
        workspace = assert_safe_child(context.comfy_workspace, context.managed_root)
        if component.detection.kind == "comfyui" and (
            workspace / "ComfyUI" / "main.py"
        ).is_file():
            return InstallOutcome(
                "installed", "Workspace ComfyUI géré détecté", path=str(workspace)
            )
        if component.detection.kind == "nodes":
            marker = workspace / ".la-serre" / f"{component.id}.installed"
            if marker.is_file():
                return InstallOutcome("installed", "Nodes ComfyUI déjà préparés", path=str(marker))
        return None

    async def install(
        self,
        component: PackComponent,
        context: InstallContext,
        cancellation: CancellationToken,
    ) -> InstallOutcome:
        workspace = assert_safe_child(context.comfy_workspace, context.managed_root)
        workspace.mkdir(parents=True, exist_ok=True)
        if self.managed_cli is None:
            prefix = ["comfy", f"--workspace={workspace}", "--skip-prompt"]
        else:
            uv = await self.managed_cli.ensure(context, cancellation)
            prefix = [
                str(uv),
                "tool",
                "run",
                "--from",
                f"comfy-cli=={COMFY_CLI_VERSION}",
                "comfy",
                f"--workspace={workspace}",
                "--skip-prompt",
            ]
        if component.detection.kind == "comfyui":
            arguments = [*prefix, "install"]
        else:
            node_id = self.node_ids.get(component.id)
            if not node_id:
                raise InstallerError(
                    f"Aucun identifiant Comfy Registry déclaré pour {component.id}"
                )
            arguments = [*prefix, "node", "install", node_id]
        try:
            completed = await self.runner.run(arguments, cwd=workspace, cancellation=cancellation)
        except (FileNotFoundError, OSError) as exc:
            raise ManualActionRequired(
                "La préparation graphique de comfy-cli a échoué. Vérifie le réseau "
                "et l’espace disque, puis lance Réparer."
            ) from exc
        result = successful_process(completed, "Installation ComfyUI")
        if component.detection.kind == "comfyui" and self.managed_cli is not None:
            if not (workspace / "ComfyUI" / "main.py").is_file():
                raise InstallerError(
                    "ComfyUI ne contient pas main.py après l’installation; lance Réparer."
                )
            raise ManualActionRequired(
                "ComfyUI est préparé. Ferme puis rouvre La Serre pour démarrer le service "
                "géré, puis reprends la préparation sans retélécharger l’archive."
            )
        if component.detection.kind == "nodes":
            marker = workspace / ".la-serre" / f"{component.id}.installed"
            marker.parent.mkdir(parents=True, exist_ok=True)
            marker.write_text(f"{self.node_ids[component.id]}\n", encoding="utf-8")
        return InstallOutcome(
            "installed",
            "ComfyUI préparé dans le workspace géré",
            version=result.stdout.strip() or None,
            path=str(workspace),
        )
