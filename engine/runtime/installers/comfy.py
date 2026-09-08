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

_DEFAULT_NODE_IDS = {"comfyui-required-nodes": "comfyui-ltxvideo"}


class ComfyCliAdapter:
    """Owns only La Serre's managed ComfyUI workspace."""

    def __init__(
        self,
        runner: ProcessRunner,
        *,
        node_ids: Mapping[str, str] = _DEFAULT_NODE_IDS,
    ) -> None:
        self.runner = runner
        self.node_ids = dict(node_ids)

    def supports(self, component: PackComponent) -> bool:
        return component.detection.kind in {"comfyui", "nodes"}

    async def inspect(
        self, component: PackComponent, context: InstallContext
    ) -> InstallOutcome | None:
        workspace = assert_safe_child(context.comfy_workspace, context.managed_root)
        if component.detection.kind == "comfyui" and (workspace / "ComfyUI").is_dir():
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
        prefix = ["comfy", f"--workspace={workspace}", "--skip-prompt"]
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
                "Installe comfy-cli dans un environnement isolé, puis lance Réparer."
            ) from exc
        result = successful_process(completed, "Installation ComfyUI")
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
