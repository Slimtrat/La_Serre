from pathlib import Path

from engine.generation.comfy.model_installer import ModelInstaller
from engine.generation.comfy.workflow_factory import ModelRequirement


def requirement() -> tuple[ModelRequirement, ...]:
    return (
        ModelRequirement(
            role="Test",
            filename="model.safetensors",
            folder="checkpoints",
            url="https://example.invalid/model.safetensors",
        ),
    )


def test_installer_distinguishes_partial_and_completed_downloads(tmp_path: Path) -> None:
    downloads = tmp_path / "Downloads"
    models = tmp_path / "models"
    downloads.mkdir()
    installer = ModelInstaller(requirement(), downloads_dir=downloads, models_root=models)

    assert installer.inspect()[0]["state"] == "missing"
    (downloads / "model.random.safetensors.part").write_bytes(b"partial")
    assert installer.inspect()[0]["state"] == "downloading"
    (downloads / "model.safetensors").write_bytes(b"complete")
    assert installer.inspect()[0]["state"] == "ready"

    installed = installer.install_ready()

    assert installed[0]["state"] == "installed"
    assert (models / "checkpoints" / "model.safetensors").read_bytes() == b"complete"
    assert not (downloads / "model.safetensors").exists()


def test_installer_never_moves_empty_placeholder(tmp_path: Path) -> None:
    downloads = tmp_path / "Downloads"
    downloads.mkdir()
    (downloads / "model.safetensors").touch()
    installer = ModelInstaller(
        requirement(),
        downloads_dir=downloads,
        models_root=tmp_path / "models",
    )

    assert installer.inspect()[0]["state"] == "downloading"
    assert installer.install_ready() == []
