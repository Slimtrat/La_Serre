from __future__ import annotations

import json
import shutil
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any

from apps.api.projects import PROJECT_MARKER
from engine.production.artifacts import write_text_atomic

UNINSTALL_CONFIRMATION = "SUPPRIMER-LES-DONNEES-SERRE-STUDIO"


@dataclass(frozen=True, slots=True)
class ProjectDataTarget:
    project_id: str
    project_name: str
    role: str
    path: str


@dataclass(frozen=True, slots=True)
class UninstallInventory:
    version: int
    runtime_root: str
    custom_project_data: tuple[ProjectDataTarget, ...]

    def payload(self) -> dict[str, object]:
        targets = [asdict(item) for item in self.custom_project_data]
        return {
            "version": self.version,
            "runtime_root": self.runtime_root,
            "custom_project_data": targets,
            "custom_path_count": len(targets),
            "custom_paths": [item.path for item in self.custom_project_data],
        }


def build_uninstall_inventory(runtime_root: Path) -> UninstallInventory:
    """List only externally stored namespaces that the Studio verifiably owns."""
    runtime = runtime_root.expanduser().resolve()
    registry_path = runtime / "workflows" / "local" / "studio-projects.json"
    if not registry_path.is_file():
        return UninstallInventory(1, str(runtime), ())
    try:
        payload: Any = json.loads(registry_path.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return UninstallInventory(1, str(runtime), ())
    if not isinstance(payload, dict) or not isinstance(payload.get("projects"), list):
        return UninstallInventory(1, str(runtime), ())

    found: dict[str, ProjectDataTarget] = {}
    for raw in payload["projects"]:
        if not isinstance(raw, dict) or raw.get("storage_managed") is not True:
            continue
        project_id = str(raw.get("id", ""))
        project_name = str(raw.get("name", project_id))
        layout = raw.get("storage_layout")
        work = Path(str(raw.get("private_content_dir", ""))).expanduser().resolve()
        output = Path(str(raw.get("output_dir", ""))).expanduser().resolve()
        candidates: list[tuple[str, Path]]
        if (
            layout == "shared-root"
            and work.name == "work"
            and output.name == "output"
            and work.parent == output.parent
            and work.parent.name == project_id
        ):
            _require_marker(work, project_id, "work")
            _require_marker(output, project_id, "output")
            candidates = [("work+output", work.parent)]
        elif (
            layout == "split-roots"
            and work.name == project_id
            and output.name == project_id
            and work != output
        ):
            _require_marker(work, project_id, "work")
            _require_marker(output, project_id, "output")
            candidates = [("work", work), ("output", output)]
        else:
            continue
        for role, target in candidates:
            if _is_within(target, runtime):
                continue
            if target.is_symlink() or target == Path(target.anchor):
                continue
            found[str(target)] = ProjectDataTarget(
                project_id=project_id,
                project_name=project_name,
                role=role,
                path=str(target),
            )
    return UninstallInventory(
        version=1,
        runtime_root=str(runtime),
        custom_project_data=tuple(found[key] for key in sorted(found)),
    )


def write_uninstall_inventory(runtime_root: Path, destination: Path) -> Path:
    inventory = build_uninstall_inventory(runtime_root)
    path = destination.expanduser().resolve()
    write_text_atomic(
        path,
        json.dumps(inventory.payload(), ensure_ascii=False, indent=2) + "\n",
    )
    return path


def remove_custom_project_data(
    runtime_root: Path,
    inventory_path: Path,
    *,
    confirmation: str,
) -> tuple[Path, ...]:
    """Delete the exact confirmed inventory after re-auditing every ownership marker."""
    if confirmation != UNINSTALL_CONFIRMATION:
        raise ValueError("Confirmation de suppression invalide")
    runtime = runtime_root.expanduser().resolve()
    raw: Any = json.loads(inventory_path.read_text(encoding="utf-8"))
    if not isinstance(raw, dict) or raw.get("runtime_root") != str(runtime):
        raise ValueError("Inventaire de désinstallation invalide")
    requested = {
        str(Path(str(item["path"])).expanduser().resolve())
        for item in raw.get("custom_project_data", [])
        if isinstance(item, dict) and isinstance(item.get("path"), str)
    }
    current = build_uninstall_inventory(runtime)
    verified = {item.path for item in current.custom_project_data}
    if requested != verified:
        raise ValueError(
            "Les dossiers projet ont changé depuis la confirmation ; suppression annulée"
        )
    removed: list[Path] = []
    for raw_path in sorted(requested):
        target = Path(raw_path)
        if target.is_symlink() or target == Path(target.anchor):
            raise ValueError(f"Chemin de suppression non sûr : {target}")
        if target.exists():
            shutil.rmtree(target)
        removed.append(target)
    return tuple(removed)


def _require_marker(path: Path, project_id: str, role: str) -> None:
    try:
        marker: Any = json.loads(
            (path / PROJECT_MARKER).read_text(encoding="utf-8")
        )
    except (OSError, ValueError) as exc:
        raise ValueError(f"Manifeste projet absent ou invalide : {path}") from exc
    if (
        not isinstance(marker, dict)
        or marker.get("project_id") != project_id
        or marker.get("role") != role
    ):
        raise ValueError(f"Manifeste projet incohérent : {path}")


def _is_within(path: Path, parent: Path) -> bool:
    try:
        path.relative_to(parent)
    except ValueError:
        return False
    return True
