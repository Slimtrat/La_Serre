from __future__ import annotations

from pathlib import Path

from engine.config import Settings


def test_character_master_profile_defaults_to_flux_schnell_template() -> None:
    settings = Settings(_env_file=None)

    assert settings.character_master_workflow_profile == Path(
        "workflows/templates/flux-schnell-character-master-v1/profile.json"
    )


def test_character_master_profile_is_saved_in_local_settings(tmp_path: Path) -> None:
    local = tmp_path / "studio-settings.json"
    profile = tmp_path / "cartoon-master.profile.json"
    settings = Settings(
        _env_file=None,
        character_master_workflow_profile=profile,
    )

    settings.save_local(local)
    loaded = Settings.load(local)

    assert loaded.character_master_workflow_profile == profile
