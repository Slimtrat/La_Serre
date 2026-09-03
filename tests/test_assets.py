from pathlib import Path

import pytest

from apps.api.assets import AssetStore


def test_manual_asset_is_traced_and_retrievable(tmp_path: Path) -> None:
    store = AssetStore(tmp_path)

    record = store.put(
        "S01E001-S01",
        "keyframe",
        "belladone.png",
        "image/png",
        b"image-bytes",
    )
    found = store.get("S01E001-S01", "keyframe")

    assert found is not None
    assert found[0] == record
    assert found[1].read_bytes() == b"image-bytes"
    assert record.source == "manual"
    assert len(record.sha256) == 64


def test_asset_store_rejects_wrong_media_extension(tmp_path: Path) -> None:
    store = AssetStore(tmp_path)

    with pytest.raises(ValueError, match="refusée"):
        store.put("S01E001-S01", "audio", "voice.exe", "application/octet-stream", b"x")


def test_asset_store_records_model_provenance(tmp_path: Path) -> None:
    store = AssetStore(tmp_path)

    record = store.put_model(
        "S01E001-S01",
        "shot",
        "shot.json",
        "application/json",
        b"{}",
        provider="ollama",
        model="director:latest",
    )

    assert record.source == "model"
    assert record.provider == "ollama"
    assert record.model == "director:latest"
