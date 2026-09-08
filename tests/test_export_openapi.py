from __future__ import annotations

import json
from pathlib import Path

import pytest

from tools.export_openapi import export_openapi, main, serialize_openapi


def test_export_contains_application_contract(tmp_path: Path) -> None:
    output = export_openapi(tmp_path / "contracts" / "openapi.json")

    schema = json.loads(output.read_text(encoding="utf-8"))

    assert schema["openapi"].startswith("3.")
    assert schema["info"]["title"] == "La Serre"
    assert schema["info"]["version"]
    assert schema["paths"]["/health"]["get"]
    assert schema["paths"]["/api/projects"]["get"]
    assert schema["components"]["schemas"]["ProjectCreateRequest"]


def test_export_is_stable_and_does_not_rewrite_unchanged_file(tmp_path: Path) -> None:
    output = tmp_path / "openapi.json"

    export_openapi(output)
    first_content = output.read_bytes()
    first_mtime = output.stat().st_mtime_ns
    export_openapi(output)

    assert output.read_bytes() == first_content
    assert output.stat().st_mtime_ns == first_mtime
    assert first_content.endswith(b"\n")


def test_serializer_orders_keys_recursively() -> None:
    first = {"paths": {"/z": {"post": {}}, "/a": {"get": {}}}, "openapi": "3.1.0"}
    second = {"openapi": "3.1.0", "paths": {"/a": {"get": {}}, "/z": {"post": {}}}}

    assert serialize_openapi(first) == serialize_openapi(second)


def test_cli_accepts_a_custom_output_path(
    tmp_path: Path, capsys: pytest.CaptureFixture[str]
) -> None:
    output = tmp_path / "custom" / "schema.json"

    main(["--output", str(output)])

    assert output.is_file()
    assert str(output) in capsys.readouterr().out
