from __future__ import annotations

from pathlib import Path

import pytest
from pydantic import ValidationError
from test_bible import character

from engine.world.bible import BibleRegistry
from engine.world.bible_exchange import (
    BIBLE_EXCHANGE_FORMAT,
    BibleExchangeDocument,
    PortableProjectBible,
    bible_ai_kit,
    bible_exchange_schema,
    empty_bible_exchange,
)
from engine.world.models import ProjectBible


def test_exchange_round_trip_keeps_canon_but_not_local_history(tmp_path: Path) -> None:
    registry = BibleRegistry(tmp_path)
    original = registry.put_character(character())

    document = BibleExchangeDocument.from_project_bible(original)
    imported = registry.replace(document.bible.to_project_bible())

    payload = document.model_dump(mode="json")
    assert payload["format"] == BIBLE_EXCHANGE_FORMAT
    assert "revision" not in payload["bible"]
    assert "updated_at" not in payload["bible"]
    assert "changes" not in payload["bible"]
    assert imported.revision == original.revision + 1
    assert imported.characters == original.characters
    assert imported.changes[-1].operation == "replace"


def test_empty_exchange_is_valid_and_schema_is_self_describing() -> None:
    document = empty_bible_exchange()
    schema = bible_exchange_schema()
    kit = bible_ai_kit()

    assert set(schema["required"]) == {"format", "format_version", "bible"}
    assert document.bible == PortableProjectBible()
    assert schema["$schema"].endswith("2020-12/schema")
    assert schema["$id"].endswith("project-bible-exchange:1")
    assert schema["additionalProperties"] is False
    assert kit.empty_template == document
    assert "uniquement le document JSON" in kit.instructions[0]


def test_exchange_rejects_cross_references_to_unknown_characters() -> None:
    payload = empty_bible_exchange().model_dump(mode="json")
    payload["bible"]["relationships"] = [
        {
            "id": "inconnus",
            "source": "absent-a",
            "target": "absent-b",
            "label": "Rivaux",
            "summary": "Une relation qui ne peut pas être canonique.",
            "desire": 0,
            "trust": 0,
            "anger": 0,
            "fear": 0,
            "attachment": 0,
            "toxicity": 0,
        }
    ]

    with pytest.raises(ValidationError, match="unknown character"):
        BibleExchangeDocument.model_validate(payload)


def test_portable_fields_follow_project_bible_canonical_fields() -> None:
    internal_fields = set(ProjectBible.model_fields) - {"revision", "updated_at", "changes"}

    assert set(PortableProjectBible.model_fields) == internal_fields
