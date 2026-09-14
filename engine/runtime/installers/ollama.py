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
from engine.runtime.managed_tools import ManagedToolSpec, ManagedZipTool

OLLAMA_WINDOWS_X64 = ManagedToolSpec(
    name="ollama",
    version="0.34.0",
    source=(
        "https://github.com/ollama/ollama/releases/download/v0.34.0/"
        "ollama-windows-amd64.zip"
    ),
    archive_sha256="a7dd1b174f39d3d1b8a25d4cbc86045d0e190b17187bfdcbe2f2ee3b5a11470e",
    executable="ollama.exe",
    license_name="MIT License",
    license_url="https://github.com/ollama/ollama/blob/v0.34.0/LICENSE",
    size_bytes=1_469_375_054,
)


class OllamaInstallerAdapter:
    def __init__(
        self, runner: ProcessRunner, *, managed_cli: ManagedZipTool | None = None
    ) -> None:
        self.runner = runner
        self.managed_cli = managed_cli
        self._installed_this_session = False

    def supports(self, component: PackComponent) -> bool:
        return component.detection.kind in {"ollama", "ollama_model"}

    async def inspect(
        self, component: PackComponent, context: InstallContext
    ) -> InstallOutcome | None:
        executable = self._resolve(context)
        if executable is None:
            return None
        try:
            result = await self.runner.run(
                [executable, "--version"], cwd=None, cancellation=CancellationToken()
            )
        except (FileNotFoundError, OSError):
            return None
        if result.returncode:
            return None
        version = result.stdout.strip() or result.stderr.strip() or None
        if component.detection.kind == "ollama":
            return InstallOutcome("installed", "Ollama détecté", version=version)
        listing = await self.runner.run(
            [executable, "list"], cwd=None, cancellation=CancellationToken()
        )
        if listing.returncode:
            return None
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
        executable = self._resolve(context)
        if executable is None and self.managed_cli is not None:
            executable = str(await self.managed_cli.ensure(context, cancellation))
            self._installed_this_session = True
        if component.detection.kind == "ollama":
            if executable is None:
                raise ManualActionRequired(
                    "Installe Ollama depuis sa source officielle, puis lance Réparer."
                )
            result = successful_process(
                await self.runner.run(
                    [executable, "--version"], cwd=None, cancellation=cancellation
                ),
                "Vérification Ollama",
            )
            return InstallOutcome(
                "installed",
                "Ollama préparé dans l’espace géré",
                version=result.stdout.strip() or result.stderr.strip() or None,
                path=executable,
                checksum=(
                    self.managed_cli.spec.archive_sha256 if self.managed_cli else None
                ),
            )
        if executable is None:
            raise ManualActionRequired(
                "Ollama est absent. Relance la préparation automatique du moteur."
            )
        if self._installed_this_session:
            raise ManualActionRequired(
                "Ollama est installé. Ferme puis rouvre La Serre : le service démarrera "
                "automatiquement et la préparation reprendra sans retélécharger l’archive."
            )
        result = successful_process(
            await self.runner.run(
                [executable, "pull", component.detection.value],
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

    def _resolve(self, context: InstallContext) -> str | None:
        if self.managed_cli is not None:
            resolved = self.managed_cli.resolve(context)
            return str(resolved) if resolved is not None else None
        return "ollama"
