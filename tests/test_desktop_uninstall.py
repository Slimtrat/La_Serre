from __future__ import annotations

import json
from pathlib import Path

import pytest

from apps.api.projects import ProjectRegistry
from apps.desktop.uninstall import (
    UNINSTALL_CONFIRMATION,
    build_uninstall_inventory,
    remove_custom_project_data,
    write_uninstall_inventory,
)
from engine.config import Settings


def make_external_project(
    runtime: Path,
    custom_root: Path,
) -> tuple[ProjectRegistry, Path]:
    registry = ProjectRegistry(
        Settings(
            _env_file=None,
            private_content_dir=runtime / ".private",
            output_dir=runtime / "output",
        ),
        config_path=runtime / "workflows" / "local" / "studio-projects.json",
        projects_root=runtime / "projects",
    )
    registry.configure_storage(custom_root, custom_root)
    project = registry.create("Projet externe", clone_content=False)
    return registry, Path(project.private_content_dir).parent


def test_uninstall_inventory_lists_only_verified_external_project_data(
    tmp_path: Path,
) -> None:
    runtime = tmp_path / "runtime"
    registry, external = make_external_project(runtime, tmp_path / "elsewhere")

    inventory = build_uninstall_inventory(runtime)

    assert inventory.runtime_root == str(runtime.resolve())
    assert len(inventory.custom_project_data) == 1
    assert inventory.custom_project_data[0].path == str(external)
    assert Path(registry.projects["default"].output_dir) not in {
        Path(item.path) for item in inventory.custom_project_data
    }


def test_uninstall_removes_exact_confirmed_custom_inventory_only(
    tmp_path: Path,
) -> None:
    runtime = tmp_path / "runtime"
    _registry, external = make_external_project(runtime, tmp_path / "elsewhere")
    unrelated = tmp_path / "elsewhere" / "unrelated"
    unrelated.mkdir()
    manifest = write_uninstall_inventory(runtime, tmp_path / "inventory.json")

    removed = remove_custom_project_data(
        runtime,
        manifest,
        confirmation=UNINSTALL_CONFIRMATION,
    )

    assert removed == (external,)
    assert not external.exists()
    assert unrelated.is_dir()
    assert runtime.is_dir()


def test_uninstall_cancels_when_inventory_or_confirmation_changed(
    tmp_path: Path,
) -> None:
    runtime = tmp_path / "runtime"
    _registry, external = make_external_project(runtime, tmp_path / "elsewhere")
    manifest = write_uninstall_inventory(runtime, tmp_path / "inventory.json")

    with pytest.raises(ValueError, match="Confirmation"):
        remove_custom_project_data(runtime, manifest, confirmation="non")

    payload = json.loads(manifest.read_text(encoding="utf-8"))
    payload["custom_project_data"][0]["path"] = str(tmp_path / "other")
    manifest.write_text(json.dumps(payload), encoding="utf-8")
    with pytest.raises(ValueError, match="ont changé"):
        remove_custom_project_data(
            runtime,
            manifest,
            confirmation=UNINSTALL_CONFIRMATION,
        )

    assert external.is_dir()


def test_windows_uninstaller_requires_explicit_choices_for_local_and_custom_data() -> None:
    script = Path("tools/serre_studio.iss").read_text(encoding="utf-8")

    assert "function InitializeUninstall(): Boolean;" in script
    assert "Supprimer aussi les données locales" in script
    assert "--uninstall-inventory" in script
    assert "--remove-custom-project-data" in script
    assert UNINSTALL_CONFIRMATION in script
    assert "ShouldRemoveStudioData" in script
    assert "ShouldRemoveCustomProjectData" in script
    assert 'Name: "{localappdata}\\SerreStudio"' in script
