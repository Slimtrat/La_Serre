from __future__ import annotations

import argparse
import hashlib
import json
import os
import shutil
import subprocess
import sys
import tomllib
from collections.abc import Sequence
from datetime import UTC, datetime
from pathlib import Path


def parser() -> argparse.ArgumentParser:
    result = argparse.ArgumentParser(description="Build the Windows Serre Studio desktop app")
    result.add_argument(
        "--installer",
        action="store_true",
        help="also build the Inno Setup installer (requires ISCC.exe)",
    )
    result.add_argument(
        "--publish-desktop",
        action="store_true",
        help="publish the current EXE and archive versions on the Windows desktop",
    )
    result.add_argument(
        "--desktop-dir",
        type=Path,
        help="override the desktop release directory",
    )
    return result


def main(argv: Sequence[str] | None = None) -> int:
    args = parser().parse_args(argv)
    if sys.platform != "win32":
        parser().error("the desktop executable can only be built on Windows")

    project_root = Path(__file__).resolve().parents[1]
    subprocess.run(
        [
            sys.executable,
            "-m",
            "PyInstaller",
            "--clean",
            "--noconfirm",
            str(project_root / "tools" / "serre_studio.spec"),
        ],
        cwd=project_root,
        check=True,
    )
    executable = project_root / "dist" / "SerreStudio.exe"
    if not executable.is_file():
        raise FileNotFoundError(f"PyInstaller did not create {executable}")

    if args.installer:
        iscc = _find_iscc()
        environment = os.environ.copy()
        environment.setdefault("SERRE_STUDIO_VERSION", _project_version(project_root))
        subprocess.run(
            [str(iscc), str(project_root / "tools" / "serre_studio.iss")],
            cwd=project_root,
            env=environment,
            check=True,
        )
    if args.publish_desktop:
        destination = args.desktop_dir or Path.home() / "Desktop" / "La Serre des Venins"
        current = publish_desktop_release(executable, destination, _project_version(project_root))
        print(current)
    else:
        print(executable)
    return 0


def publish_desktop_release(executable: Path, destination: Path, version: str) -> Path:
    """Publish current/versioned copies and archive the previously published patch."""
    if not executable.is_file():
        raise FileNotFoundError(executable)
    root = destination.expanduser().resolve()
    root.mkdir(parents=True, exist_ok=True)
    (root / "versions-old").mkdir(parents=True, exist_ok=True)
    current = root / "SerreStudio.exe"
    manifest_path = root / "current-version.json"
    previous_version = _published_version(manifest_path)
    if current.is_file() and previous_version and previous_version != version:
        archive = root / "versions-old" / previous_version
        archive.mkdir(parents=True, exist_ok=True)
        shutil.copy2(current, archive / f"SerreStudio-{previous_version}.exe")
    version_dir = root / "versions" / version
    version_dir.mkdir(parents=True, exist_ok=True)
    versioned = version_dir / f"SerreStudio-{version}.exe"
    shutil.copy2(executable, versioned)
    shutil.copy2(executable, current)
    digest = _sha256(executable)
    manifest = {
        "version": version,
        "published_at": datetime.now(UTC).isoformat(),
        "current": str(current),
        "versioned": str(versioned),
        "sha256": digest,
    }
    temporary = manifest_path.with_suffix(".tmp")
    temporary.write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    temporary.replace(manifest_path)
    return current


def _project_version(project_root: Path) -> str:
    with (project_root / "pyproject.toml").open("rb") as handle:
        payload = tomllib.load(handle)
    return str(payload["project"]["version"])


def _published_version(manifest_path: Path) -> str | None:
    if not manifest_path.is_file():
        return None
    try:
        payload = json.loads(manifest_path.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return None
    value = payload.get("version") if isinstance(payload, dict) else None
    return str(value) if value else None


def _sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _find_iscc() -> Path:
    candidates = [
        shutil.which("ISCC.exe"),
        r"C:\Program Files (x86)\Inno Setup 6\ISCC.exe",
        r"C:\Program Files\Inno Setup 6\ISCC.exe",
    ]
    for candidate in candidates:
        if candidate and Path(candidate).is_file():
            return Path(candidate)
    raise FileNotFoundError("ISCC.exe not found; install Inno Setup 6")


if __name__ == "__main__":
    raise SystemExit(main())
