from __future__ import annotations

from pathlib import Path

STATIC = Path("apps/api/static")


def test_project_ui_exposes_locations_roots_and_safe_removal_choices() -> None:
    script = (STATIC / "projects.js").read_text(encoding="utf-8")
    styles = (STATIC / "project-storage.css").read_text(encoding="utf-8")

    assert 'style.href = "/static/project-storage.css"' in script
    assert 'id="project-manage-dialog"' in script
    assert "Dossier work" in script
    assert "Dossier output" in script
    assert 'textContent = "Copier"' in script
    assert 'textContent = "Ouvrir"' in script
    assert 'id="project-work-root"' in script
    assert 'id="project-output-root"' in script
    assert 'id="project-roots-together"' in script
    assert 'mode: deleteFiles ? "delete_files" : "keep_files"' in script
    assert "deleteConfirmation.value !== projectPendingRemoval.name" in script
    assert "/api/projects/storage" in script
    assert "/open-folder" in script
    assert "/remove" in script
    assert ".project-path-row" in styles
    assert ".removal-choice.danger" in styles
