from __future__ import annotations

import hashlib
from pathlib import Path
from typing import Protocol

import httpx

from engine.runtime.capability_packs import PackComponent
from engine.runtime.installers.base import (
    CancellationToken,
    InstallContext,
    InstallOutcome,
    IntegrityError,
    assert_safe_child,
)


class Downloader(Protocol):
    async def download(
        self, source: str, destination: Path, cancellation: CancellationToken
    ) -> None: ...


class HttpxDownloader:
    async def download(
        self, source: str, destination: Path, cancellation: CancellationToken
    ) -> None:
        async with httpx.AsyncClient(follow_redirects=True, timeout=None) as client:
            async with client.stream("GET", source) as response:
                response.raise_for_status()
                with destination.open("wb") as output:
                    async for chunk in response.aiter_bytes(1024 * 1024):
                        cancellation.raise_if_cancelled()
                        output.write(chunk)


class DirectDownloadAdapter:
    def __init__(self, downloader: Downloader) -> None:
        self.downloader = downloader

    def supports(self, component: PackComponent) -> bool:
        return component.detection.kind == "comfy_model"

    async def inspect(
        self, component: PackComponent, context: InstallContext
    ) -> InstallOutcome | None:
        destination = assert_safe_child(
            context.models_root / component.destination, context.models_root
        )
        if not destination.is_file() or destination.stat().st_size <= 0:
            return None
        digest = _sha256(destination)
        _verify_digest(component, digest)
        return InstallOutcome(
            "installed",
            "Modèle déjà présent",
            path=str(destination),
            checksum=digest if component.checksum.algorithm == "sha256" else None,
        )

    async def install(
        self,
        component: PackComponent,
        context: InstallContext,
        cancellation: CancellationToken,
    ) -> InstallOutcome:
        destination = assert_safe_child(
            context.models_root / component.destination, context.models_root
        )
        destination.parent.mkdir(parents=True, exist_ok=True)
        partial = destination.with_suffix(destination.suffix + ".part")
        assert_safe_child(partial, context.models_root)
        try:
            await self.downloader.download(str(component.source), partial, cancellation)
            cancellation.raise_if_cancelled()
            digest = _sha256(partial)
            _verify_digest(component, digest)
            partial.replace(destination)
        except BaseException:
            partial.unlink(missing_ok=True)
            raise
        return InstallOutcome(
            "installed",
            "Modèle téléchargé et installé",
            path=str(destination),
            checksum=digest if component.checksum.algorithm == "sha256" else None,
        )


def _sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _verify_digest(component: PackComponent, digest: str) -> None:
    checksum = component.checksum
    if checksum.algorithm == "sha256" and checksum.value and digest != checksum.value.lower():
        raise IntegrityError(
            f"Checksum SHA-256 invalide pour {component.id}; le fichier n’a pas été installé."
        )
