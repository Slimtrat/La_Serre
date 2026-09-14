from __future__ import annotations

import hashlib
import json
import shutil
import zipfile
from dataclasses import dataclass
from pathlib import Path, PurePosixPath
from typing import Protocol

from engine.runtime.installers.base import (
    CancellationToken,
    InstallContext,
    IntegrityError,
    assert_safe_child,
)


class ArchiveDownloader(Protocol):
    async def download(
        self, source: str, destination: Path, cancellation: CancellationToken
    ) -> None: ...


@dataclass(frozen=True, slots=True)
class ManagedToolSpec:
    name: str
    version: str
    source: str
    archive_sha256: str
    executable: str
    license_name: str
    license_url: str
    size_bytes: int


class ManagedZipTool:
    """Install and resolve one checksum-pinned tool inside La Serre's runtime."""

    def __init__(self, spec: ManagedToolSpec, downloader: ArchiveDownloader) -> None:
        self.spec = spec
        self.downloader = downloader

    def resolve(self, context: InstallContext) -> Path | None:
        return resolve_managed_tool(context.managed_root, self.spec)

    async def ensure(
        self, context: InstallContext, cancellation: CancellationToken
    ) -> Path:
        existing = self.resolve(context)
        if existing is not None:
            return existing
        tools_root = assert_safe_child(context.managed_root / "tools", context.managed_root)
        tools_root.mkdir(parents=True, exist_ok=True)
        archive = assert_safe_child(
            tools_root / f".{self.spec.name}-{self.spec.version}.zip.part", tools_root
        )
        staging = assert_safe_child(
            tools_root / f".{self.spec.name}-{self.spec.version}.staging", tools_root
        )
        destination = self._version_root(context)
        _remove_managed(staging, tools_root)
        try:
            await self.downloader.download(self.spec.source, archive, cancellation)
            cancellation.raise_if_cancelled()
            if _sha256(archive) != self.spec.archive_sha256.lower():
                raise IntegrityError(
                    f"Checksum SHA-256 invalide pour l’outil {self.spec.name}; "
                    "l’archive n’a pas été installée."
                )
            staging.mkdir(parents=True)
            _extract_zip_safely(archive, staging, cancellation)
            executable = assert_safe_child(staging / self.spec.executable, staging)
            if not executable.is_file():
                raise IntegrityError(
                    f"L’archive vérifiée de {self.spec.name} ne contient pas "
                    f"{self.spec.executable}."
                )
            receipt = {
                "name": self.spec.name,
                "version": self.spec.version,
                "source": self.spec.source,
                "archive_sha256": self.spec.archive_sha256,
                "executable_sha256": _sha256(executable),
                "license": {
                    "name": self.spec.license_name,
                    "url": self.spec.license_url,
                },
            }
            (staging / ".la-serre-tool.json").write_text(
                json.dumps(receipt, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
            )
            _remove_managed(destination, tools_root)
            destination.parent.mkdir(parents=True, exist_ok=True)
            staging.replace(destination)
        except BaseException:
            _remove_managed(staging, tools_root)
            raise
        finally:
            archive.unlink(missing_ok=True)
        resolved = self.resolve(context)
        if resolved is None:
            raise IntegrityError(f"L’installation de {self.spec.name} n’est pas vérifiable.")
        return resolved

    def _version_root(self, context: InstallContext) -> Path:
        tools_root = assert_safe_child(context.managed_root / "tools", context.managed_root)
        return assert_safe_child(tools_root / self.spec.name / self.spec.version, tools_root)


def resolve_managed_tool(managed_root: Path, spec: ManagedToolSpec) -> Path | None:
    tools_root = assert_safe_child(managed_root / "tools", managed_root)
    root = assert_safe_child(tools_root / spec.name / spec.version, tools_root)
    executable = assert_safe_child(root / spec.executable, root)
    receipt = root / ".la-serre-tool.json"
    if not executable.is_file() or not receipt.is_file():
        return None
    try:
        payload = json.loads(receipt.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return None
    expected = {
        "name": spec.name,
        "version": spec.version,
        "source": spec.source,
        "archive_sha256": spec.archive_sha256,
    }
    if any(payload.get(key) != value for key, value in expected.items()):
        return None
    if payload.get("executable_sha256") != _sha256(executable):
        return None
    return executable


def _extract_zip_safely(
    archive: Path, destination: Path, cancellation: CancellationToken
) -> None:
    with zipfile.ZipFile(archive) as bundle:
        for member in bundle.infolist():
            cancellation.raise_if_cancelled()
            relative = PurePosixPath(member.filename)
            if relative.is_absolute() or ".." in relative.parts:
                raise IntegrityError("Archive d’outil refusée : chemin non sûr.")
            target = assert_safe_child(destination.joinpath(*relative.parts), destination)
            if member.is_dir():
                target.mkdir(parents=True, exist_ok=True)
                continue
            target.parent.mkdir(parents=True, exist_ok=True)
            with bundle.open(member) as source, target.open("wb") as output:
                shutil.copyfileobj(source, output)


def _remove_managed(path: Path, parent: Path) -> None:
    safe = assert_safe_child(path, parent)
    if safe.is_dir():
        shutil.rmtree(safe)
    elif safe.exists():
        safe.unlink()


def _sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()
