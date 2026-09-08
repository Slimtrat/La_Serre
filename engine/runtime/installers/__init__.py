"""Installer adapters for managed local runtime packs."""

from engine.runtime.installers.base import (
    CancellationToken,
    InstallationCancelled,
    InstallContext,
    InstallerError,
    InstallOutcome,
    IntegrityError,
    ManualActionRequired,
    ProcessResult,
    SafeProcessRunner,
    UnsafePathError,
    redact_sensitive,
)
from engine.runtime.installers.comfy import ComfyCliAdapter
from engine.runtime.installers.direct import DirectDownloadAdapter, HttpxDownloader
from engine.runtime.installers.ollama import OllamaInstallerAdapter

__all__ = [
    "CancellationToken",
    "ComfyCliAdapter",
    "DirectDownloadAdapter",
    "HttpxDownloader",
    "InstallContext",
    "InstallOutcome",
    "InstallationCancelled",
    "InstallerError",
    "IntegrityError",
    "ManualActionRequired",
    "OllamaInstallerAdapter",
    "ProcessResult",
    "SafeProcessRunner",
    "UnsafePathError",
    "redact_sensitive",
]
