from __future__ import annotations

from engine.runtime.capability_packs import PackComponent
from engine.runtime.installers.base import (
    CancellationToken,
    InstallContext,
    InstallOutcome,
    ManualActionRequired,
    ProcessRunner,
    successful_process,
)


class OllamaInstallerAdapter:
    def __init__(self, runner: ProcessRunner) -> None:
        self.runner = runner

    def supports(self, component: PackComponent) -> bool:
        return component.detection.kind in {"ollama", "ollama_model"}

    async def inspect(
        self, component: PackComponent, context: InstallContext
    ) -> InstallOutcome | None:
        del context
        try:
            result = await self.runner.run(
                ["ollama", "--version"], cwd=None, cancellation=CancellationToken()
            )
        except (FileNotFoundError, OSError):
            return None
        if result.returncode:
            return None
        version = result.stdout.strip() or result.stderr.strip() or None
        if component.detection.kind == "ollama":
            return InstallOutcome("installed", "Ollama détecté", version=version)
        listing = await self.runner.run(
            ["ollama", "list"], cwd=None, cancellation=CancellationToken()
        )
        candidates = {component.detection.value, *component.detection.aliases}
        installed = any(
            line.split(maxsplit=1)[0] in candidates
            for line in listing.stdout.splitlines()
            if line.strip()
        )
        return (
            InstallOutcome("installed", "Modèle Ollama déjà présent", version=version)
            if installed
            else None
        )

    async def install(
        self,
        component: PackComponent,
        context: InstallContext,
        cancellation: CancellationToken,
    ) -> InstallOutcome:
        del context
        if component.detection.kind == "ollama":
            raise ManualActionRequired(
                "Installe Ollama depuis sa source officielle, puis lance Réparer."
            )
        result = successful_process(
            await self.runner.run(
                ["ollama", "pull", component.detection.value],
                cwd=None,
                cancellation=cancellation,
            ),
            "Téléchargement Ollama",
        )
        return InstallOutcome(
            "installed",
            "Modèle Ollama installé",
            version=result.stdout.strip() or None,
            checksum=component.checksum.value,
        )
