from __future__ import annotations

import json
from pathlib import Path
from typing import cast

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from apps.api.project_storage_routes import create_project_storage_router
from apps.api.projects import PROJECT_MARKER, ProjectRegistry
from engine.config import Settings


def make_registry(tmp_path: Path) -> ProjectRegistry:
    return ProjectRegistry(
        Settings(
            _env_file=None,
            private_content_dir=tmp_path / "legacy-private",
            output_dir=tmp_path / "legacy-output",
        ),
        config_path=tmp_path / "config" / "projects.json",
        projects_root=tmp_path / "studio-projects",
    )


def test_shared_root_creates_explicit_work_and_output_namespaces(
    tmp_path: Path,
) -> None:
    registry = make_registry(tmp_path)

    project = registry.create("Rose Noire", clone_content=False)
    root = tmp_path / "studio-projects" / "rose-noire"

    assert Path(project.private_content_dir) == root / "work"
    assert Path(project.output_dir) == root / "output"
    assert (root / "work" / PROJECT_MARKER).is_file()
    assert (root / "output" / PROJECT_MARKER).is_file()
    assert registry.listing()["storage"] == {
        "work_root": str((tmp_path / "studio-projects").resolve()),
        "output_root": str((tmp_path / "studio-projects").resolve()),
        "layout": "shared-root",
    }


def test_split_roots_create_same_stable_project_slug_in_each_root(
    tmp_path: Path,
) -> None:
    registry = make_registry(tmp_path)
    work_root = tmp_path / "writing"
    output_root = tmp_path / "renders"
    registry.configure_storage(work_root, output_root)

    project = registry.create("Épine d’Or", clone_content=False)

    assert Path(project.private_content_dir) == work_root / "epine-dor"
    assert Path(project.output_dir) == output_root / "epine-dor"
    assert project.storage_layout == "split-roots"
    reloaded = make_registry(tmp_path)
    assert reloaded.work_root == work_root.resolve()
    assert reloaded.output_root == output_root.resolve()


def test_roots_change_only_future_projects_and_never_move_existing_data(
    tmp_path: Path,
) -> None:
    registry = make_registry(tmp_path)
    original = registry.create("Original", clone_content=False)
    marker = Path(original.private_content_dir) / "episodes" / "keep.txt"
    marker.write_text("keep", encoding="utf-8")

    registry.configure_storage(tmp_path / "new-work", tmp_path / "new-output")

    assert marker.read_text(encoding="utf-8") == "keep"
    assert registry.active.private_content_dir == original.private_content_dir
    assert not (tmp_path / "new-work" / original.id).exists()


def test_project_can_be_unregistered_without_touching_files(tmp_path: Path) -> None:
    registry = make_registry(tmp_path)
    project = registry.create("À conserver", clone_content=False)
    registry.activate("default")

    registry.remove(project.id, delete_files=False)

    assert Path(project.private_content_dir).is_dir()
    assert Path(project.output_dir).is_dir()
    assert project.id not in registry.projects


def test_confirmed_removal_deletes_only_verified_project_namespace(
    tmp_path: Path,
) -> None:
    registry = make_registry(tmp_path)
    project = registry.create("À effacer", clone_content=False)
    project_root = Path(project.private_content_dir).parent
    sibling = registry.work_root / "unrelated"
    sibling.mkdir()
    registry.activate("default")

    with pytest.raises(ValueError, match="Recopie exactement"):
        registry.remove(project.id, delete_files=True, confirmation="wrong")

    registry.remove(
        project.id,
        delete_files=True,
        confirmation=project.name,
    )

    assert not project_root.exists()
    assert sibling.is_dir()


def test_physical_removal_refuses_legacy_or_tampered_namespaces(
    tmp_path: Path,
) -> None:
    registry = make_registry(tmp_path)
    legacy = registry.projects["default"]
    managed = registry.create("Altéré", clone_content=False)
    (Path(managed.output_dir) / PROJECT_MARKER).write_text(
        json.dumps({"project_id": managed.id, "role": "work"}),
        encoding="utf-8",
    )

    with pytest.raises(ValueError, match="projet ancien"):
        registry.remove("default", delete_files=True, confirmation=legacy.name)
    registry.activate("default")
    with pytest.raises(ValueError, match="Manifeste de sécurité invalide"):
        registry.remove(
            managed.id,
            delete_files=True,
            confirmation=managed.name,
        )

    assert Path(managed.private_content_dir).is_dir()
    assert managed.id in registry.projects


def test_active_and_last_project_are_protected(tmp_path: Path) -> None:
    registry = make_registry(tmp_path)
    project = registry.create("Actif", clone_content=False)

    with pytest.raises(ValueError, match="Change de projet actif"):
        registry.remove(project.id, delete_files=False)

    registry.delete_discovery("default")
    with pytest.raises(ValueError, match="dernier projet"):
        registry.remove(project.id, delete_files=False)


def test_legacy_registry_is_loaded_without_rewriting_or_claiming_ownership(
    tmp_path: Path,
) -> None:
    registry = make_registry(tmp_path)
    project = registry.create("Legacy", clone_content=False)
    payload = json.loads(registry.config_path.read_text(encoding="utf-8"))
    payload["version"] = 2
    payload.pop("storage")
    for item in cast(list[dict[str, object]], payload["projects"]):
        item.pop("storage_managed", None)
        item.pop("storage_layout", None)
    registry.config_path.write_text(json.dumps(payload), encoding="utf-8")

    reloaded = make_registry(tmp_path)

    assert reloaded.projects[project.id].storage_managed is False
    assert reloaded.projects[project.id].storage_layout == "legacy"
    assert Path(reloaded.projects[project.id].private_content_dir).is_dir()


def test_storage_router_exposes_paths_and_two_removal_modes(tmp_path: Path) -> None:
    registry = make_registry(tmp_path)
    app = FastAPI()
    app.include_router(
        create_project_storage_router(registry, has_active_work=lambda: False)
    )
    client = TestClient(app)

    configured = client.put(
        "/api/projects/storage",
        json={
            "work_root": str(tmp_path / "w"),
            "output_root": str(tmp_path / "o"),
        },
    )
    assert configured.status_code == 200
    project = registry.create("API project", clone_content=False)
    registry.activate("default")

    removed = client.request(
        "DELETE",
        f"/api/projects/{project.id}/remove",
        json={"mode": "keep_files"},
    )
    assert removed.status_code == 200
    assert removed.json()["removed"]["files_deleted"] is False
    assert Path(project.private_content_dir).is_dir()
