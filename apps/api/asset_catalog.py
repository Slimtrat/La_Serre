from __future__ import annotations

import hashlib
import json
import mimetypes
import os
import re
import shutil
import threading
from dataclasses import asdict
from datetime import UTC, datetime
from pathlib import Path
from typing import Any, cast

from apps.api.assets import ASSET_ID, SHOT_ID, SLOT_RULES, AssetRecord, AssetSlot
from engine.production.artifacts import write_text_atomic

EPISODE_ID = re.compile(r"S\d{2}E\d{3}")
SHOT_IN_PATH = re.compile(r"S\d{2}E\d{3}-S\d{2}")
CATALOG_SUFFIXES = set().union(*(rule[0] for rule in SLOT_RULES.values())) | {
    ".srt",
}
_LOCK = threading.RLock()


class ProjectAssetCatalog:
    """Persistent index joining generated, imported and canonical project assets."""

    def __init__(self, output_root: Path, work_root: Path | None = None) -> None:
        self.output_root = output_root.resolve()
        self.work_root = work_root.resolve() if work_root is not None else None
        self.catalog_root = self.output_root / ".studio" / "assets"
        self.catalog_path = self.catalog_root / "catalog.json"
        self.blob_root = self.catalog_root / "files"

    def listing(
        self,
        *,
        query: str | None = None,
        kind: str | None = None,
        character: str | None = None,
        location: str | None = None,
        episode: str | None = None,
        status: str | None = None,
    ) -> dict[str, object]:
        with _LOCK:
            payload = self._refresh()
        records = [self._public(item) for item in payload["assets"].values()]
        records.sort(key=lambda item: str(item["updated_at"]), reverse=True)
        needle = (query or "").strip().casefold()
        items = [
            item
            for item in records
            if (not kind or item["kind"] == kind)
            and (
                not character
                or character in cast(list[str], item["characters"])
            )
            and (
                not location
                or location in cast(list[str], item["locations"])
            )
            and (not episode or episode in cast(list[str], item["episodes"]))
            and (not status or status in cast(list[str], item["statuses"]))
            and (not needle or needle in self._search_text(item))
        ]
        return {
            "items": items,
            "total": len(items),
            "indexed_total": len(records),
            "updated_at": payload["updated_at"],
            "facets": self._facets(records),
        }

    def get(self, asset_id: str, *, refresh: bool = True) -> dict[str, object]:
        self._validate_asset_id(asset_id)
        with _LOCK:
            payload = self._refresh() if refresh else self._read()
        item = payload["assets"].get(asset_id)
        if not isinstance(item, dict):
            raise FileNotFoundError(asset_id)
        return self._public(item)

    def content_path(self, asset_id: str, *, refresh: bool = True) -> Path:
        item = self.get(asset_id, refresh=refresh)
        for location in cast(list[dict[str, str]], item.get("files", [])):
            candidate = self._resolve(location)
            if candidate is not None and candidate.is_file():
                return candidate
        raise FileNotFoundError(asset_id)

    def reuse(self, shot_id: str, slot: AssetSlot, asset_id: str) -> AssetRecord:
        if not SHOT_ID.fullmatch(shot_id):
            raise ValueError("Identifiant de plan invalide")
        with _LOCK:
            item = self.get(asset_id)
            if slot not in cast(list[str], item["compatible_slots"]):
                raise ValueError(
                    f"L’asset {asset_id} n’est pas compatible avec le slot {slot}"
                )
            source = self._preferred_content_path(item)
            suffix = source.suffix.lower()
            allowed, maximum = SLOT_RULES[slot]
            if suffix not in allowed:
                raise ValueError(f"Extension {suffix} refusée pour le slot {slot}")
            if source.stat().st_size > maximum:
                raise ValueError(
                    f"Le fichier dépasse la limite de {maximum // (1024 * 1024)} Mo"
                )
            imports = self.output_root / shot_id / "imports"
            imports.mkdir(parents=True, exist_ok=True)
            destination = imports / f"{slot}{suffix}"
            manifest_path = imports / "assets.json"
            manifest = self._read_mapping(manifest_path)
            previous = manifest.get(slot)
            self._link_or_copy(source, destination)
            if isinstance(previous, dict) and isinstance(previous.get("filename"), str):
                previous_path = imports / str(previous["filename"])
                if previous_path != destination:
                    previous_path.unlink(missing_ok=True)
            record = AssetRecord(
                slot=slot,
                source="reuse",
                filename=destination.name,
                media_type=str(item.get("media_type") or self._media_type(source)),
                bytes=source.stat().st_size,
                sha256=str(item["sha256"]),
                updated_at=datetime.now(UTC).isoformat(),
                provider=cast(str | None, item.get("provider")),
                model=cast(str | None, item.get("model")),
                asset_id=asset_id,
                origin_asset_id=asset_id,
            )
            manifest[slot] = asdict(record)
            write_text_atomic(
                manifest_path,
                json.dumps(manifest, ensure_ascii=False, indent=2) + "\n",
            )
            self._refresh()
            return record

    def _refresh(self) -> dict[str, Any]:
        previous = self._read()
        previous_assets = cast(dict[str, dict[str, Any]], previous["assets"])
        old_fingerprints = cast(dict[str, dict[str, Any]], previous["fingerprints"])
        fingerprints: dict[str, dict[str, Any]] = {}
        assets: dict[str, dict[str, Any]] = {}
        bindings = self._bindings()
        contexts = self._shot_contexts()
        candidates: list[tuple[str, Path, Path]] = []
        for root_name, root in self._roots():
            if root.is_dir():
                candidates.extend(
                    (root_name, root, path)
                    for path in root.rglob("*")
                    if self._is_candidate(root_name, root, path)
                )
        for root_name, root, path in candidates:
            try:
                relative = path.relative_to(root).as_posix()
                stat = path.stat()
            except (OSError, ValueError):
                continue
            key = f"{root_name}:{relative}"
            old = old_fingerprints.get(key, {})
            digest = (
                str(old["sha256"])
                if old.get("size") == stat.st_size
                and old.get("mtime_ns") == stat.st_mtime_ns
                and isinstance(old.get("sha256"), str)
                else self._sha256(path)
            )
            fingerprints[key] = {
                "size": stat.st_size,
                "mtime_ns": stat.st_mtime_ns,
                "sha256": digest,
            }
            asset_id = f"asset-{digest}"
            metadata = self._metadata(root_name, relative, path, bindings, contexts)
            item = assets.setdefault(
                asset_id,
                self._new_item(
                    asset_id, digest, path, metadata, previous_assets.get(asset_id, {})
                ),
            )
            self._merge(item, root_name, relative, path, metadata)
        self._preserve_blobs(assets)
        payload: dict[str, Any] = {
            "version": 1,
            "updated_at": datetime.now(UTC).isoformat(),
            "assets": assets,
            "fingerprints": fingerprints,
        }
        self._write(payload)
        return payload

    def _preserve_blobs(self, assets: dict[str, dict[str, Any]]) -> None:
        """Keep one content-addressed copy so a later slot overwrite loses nothing."""
        for item in assets.values():
            files = cast(list[dict[str, str]], item["files"])
            if any(
                entry["root"] == "output"
                and entry["path"].startswith(".studio/assets/files/")
                for entry in files
            ):
                continue
            source = next(
                (
                    candidate
                    for entry in files
                    if (candidate := self._resolve(entry)) is not None
                    and candidate.is_file()
                ),
                None,
            )
            if source is None:
                continue
            blob = self.blob_root / f"{item['sha256']}{source.suffix.lower()}"
            try:
                self._link_or_copy(source, blob)
            except OSError:
                continue
            files.insert(
                0,
                {
                    "root": "output",
                    "path": blob.relative_to(self.output_root).as_posix(),
                },
            )

    def _metadata(
        self,
        root_name: str,
        relative: str,
        path: Path,
        bindings: dict[str, dict[str, Any]],
        contexts: dict[str, dict[str, list[str]]],
    ) -> dict[str, Any]:
        episode_match = EPISODE_ID.search(relative)
        shot_match = SHOT_IN_PATH.search(relative)
        episode = episode_match.group(0) if episode_match else None
        shot_id = shot_match.group(0) if shot_match else None
        binding = bindings.get(relative, {}) if root_name == "output" else {}
        context = contexts.get(shot_id or "", {})
        source = str(binding.get("source") or ("work" if root_name == "work" else "model"))
        if root_name == "work":
            status = "reference"
        elif relative.startswith(".history/"):
            status = "archived"
        elif binding:
            status = {
                "manual": "imported",
                "model": "generated",
                "reuse": "reused",
            }.get(source, source)
        elif relative.startswith(".studio/assets/files/"):
            status = "library"
        else:
            status = "generated"
        characters = list(context.get("characters", []))
        locations = list(context.get("locations", []))
        parts = Path(relative).parts
        if root_name == "work" and "characters" in parts:
            index = parts.index("characters")
            if len(parts) > index + 1:
                characters.append(parts[index + 1])
        if root_name == "work" and "locations" in parts:
            index = parts.index("locations")
            if len(parts) > index + 1:
                locations.append(parts[index + 1])
        links: list[dict[str, str]] = []
        if binding and shot_id:
            links.append(
                {
                    "shot_id": shot_id,
                    "episode_id": shot_id.rsplit("-S", 1)[0],
                    "slot": str(binding.get("slot", "")),
                }
            )
        return {
            "kind": self._kind(root_name, relative, path),
            "source": source,
            "status": status,
            "provider": binding.get("provider"),
            "model": binding.get("model"),
            "origin_asset_id": binding.get("origin_asset_id"),
            "episodes": [episode] if episode else [],
            "shots": [shot_id] if shot_id else [],
            "characters": sorted(set(characters)),
            "locations": sorted(set(locations)),
            "bindings": links,
        }

    def _new_item(
        self,
        asset_id: str,
        digest: str,
        path: Path,
        metadata: dict[str, Any],
        old: dict[str, Any],
    ) -> dict[str, Any]:
        return {
            "id": asset_id,
            "name": old.get("name") or path.name,
            "kind": metadata["kind"],
            "media_type": self._media_type(path),
            "bytes": path.stat().st_size,
            "sha256": digest,
            "updated_at": datetime.fromtimestamp(path.stat().st_mtime, UTC).isoformat(),
            "source": old.get("source") or metadata["source"],
            "sources": [],
            "status": old.get("status") or metadata["status"],
            "statuses": [],
            "provider": old.get("provider") or metadata.get("provider"),
            "model": old.get("model") or metadata.get("model"),
            "origin_asset_id": old.get("origin_asset_id") or metadata.get("origin_asset_id"),
            "episodes": [],
            "shots": [],
            "characters": [],
            "locations": [],
            "bindings": [],
            "files": [],
        }

    @staticmethod
    def _merge(
        item: dict[str, Any],
        root_name: str,
        relative: str,
        path: Path,
        metadata: dict[str, Any],
    ) -> None:
        updated = datetime.fromtimestamp(path.stat().st_mtime, UTC).isoformat()
        item["bytes"] = max(int(item.get("bytes", 0)), path.stat().st_size)
        item["updated_at"] = max(str(item.get("updated_at", "")), updated)
        if metadata["kind"] in {"character", "background"}:
            item["kind"] = metadata["kind"]
        for plural, value in (("sources", metadata["source"]), ("statuses", metadata["status"])):
            if value not in item[plural]:
                item[plural].append(value)
        for field in ("episodes", "shots", "characters", "locations", "bindings"):
            for value in metadata[field]:
                if value not in item[field]:
                    item[field].append(value)
        location = {"root": root_name, "path": relative}
        if location not in item["files"]:
            item["files"].append(location)
        if (
            not relative.startswith(".studio/assets/files/")
            and re.fullmatch(r"[a-f0-9]{64}\.[a-z0-9]+", str(item.get("name", "")))
        ):
            item["name"] = path.name
        for field in ("provider", "model", "origin_asset_id"):
            if metadata.get(field) and not item.get(field):
                item[field] = metadata[field]

    def _public(self, item: dict[str, Any]) -> dict[str, object]:
        asset_id = str(item["id"])
        compatible = self._compatible_slots(item)
        return {
            **item,
            "compatible_slots": compatible,
            "previewable": item["kind"]
            in {
                "image",
                "video",
                "audio",
                "text",
                "character",
                "background",
                "data",
            },
            "content_url": f"/api/asset-catalog/{asset_id}/content",
            "usage_count": len(item["bindings"]),
            "provenance": {
                "source": item["source"],
                "provider": item.get("provider"),
                "model": item.get("model"),
                "origin_asset_id": item.get("origin_asset_id"),
                "files": item["files"],
            },
        }

    @staticmethod
    def _compatible_slots(item: dict[str, Any]) -> list[str]:
        kind = item["kind"]
        paths = [Path(entry["path"]) for entry in item["files"]]
        suffixes = {path.suffix.lower() for path in paths}
        compatible: list[str] = []
        if suffixes & SLOT_RULES["keyframe"][0] and kind == "image":
            compatible.append("keyframe")
        if suffixes & SLOT_RULES["video"][0] and kind == "video":
            compatible.append("video")
        if suffixes & SLOT_RULES["audio"][0] and kind == "audio":
            compatible.append("audio")
        if suffixes & SLOT_RULES["story"][0] and kind == "text":
            compatible.append("story")
        if kind == "data" and any(
            SHOT_ID.fullmatch(path.stem) or path.name == "shot.json" for path in paths
        ):
            compatible.append("shot")
        return compatible

    def _bindings(self) -> dict[str, dict[str, Any]]:
        result: dict[str, dict[str, Any]] = {}
        if not self.output_root.is_dir():
            return result
        for manifest_path in self.output_root.glob("S??E???-S??/imports/assets.json"):
            shot_id = manifest_path.parent.parent.name
            for slot, raw in self._read_mapping(manifest_path).items():
                if isinstance(raw, dict) and isinstance(raw.get("filename"), str):
                    relative = (Path(shot_id) / "imports" / raw["filename"]).as_posix()
                    result[relative] = {**raw, "slot": slot}
        return result

    def _shot_contexts(self) -> dict[str, dict[str, list[str]]]:
        result: dict[str, dict[str, list[str]]] = {}
        if self.work_root is None or not self.work_root.is_dir():
            return result
        for path in self.work_root.rglob("S??E???-S??.json"):
            if not SHOT_ID.fullmatch(path.stem):
                continue
            payload = self._read_mapping(path)
            characters = []
            raw_characters = payload.get("characters", [])
            if isinstance(raw_characters, list):
                for raw in raw_characters:
                    value = raw.get("id") or raw.get("name") if isinstance(raw, dict) else raw
                    if isinstance(value, str) and value:
                        characters.append(value)
            raw_location = payload.get("location")
            location = (
                raw_location.get("id") or raw_location.get("name")
                if isinstance(raw_location, dict)
                else raw_location
            )
            result[path.stem] = {
                "characters": sorted(set(characters)),
                "locations": [location] if isinstance(location, str) and location else [],
            }
        return result

    def _facets(self, items: list[dict[str, object]]) -> dict[str, object]:
        labels = self._labels()

        def collect(field: str) -> list[dict[str, object]]:
            counts: dict[str, int] = {}
            for item in items:
                raw = item.get(field, [])
                entries = raw if isinstance(raw, list) else [raw]
                for value in entries:
                    if isinstance(value, str) and value:
                        counts[value] = counts.get(value, 0) + 1
            return [
                {"value": value, "label": labels.get(value, value), "count": count}
                for value, count in sorted(counts.items())
            ]

        return {
            "kinds": collect("kind"),
            "characters": collect("characters"),
            "locations": collect("locations"),
            "episodes": collect("episodes"),
            "statuses": collect("statuses"),
        }

    def _labels(self) -> dict[str, str]:
        labels: dict[str, str] = {}
        if self.work_root is None:
            return labels
        for filename in ("character.json", "location.json"):
            for path in self.work_root.rglob(filename):
                payload = self._read_mapping(path)
                if payload.get("id") and payload.get("name"):
                    labels[str(payload["id"])] = str(payload["name"])
        return labels

    def _roots(self) -> list[tuple[str, Path]]:
        roots = [("output", self.output_root)]
        if self.work_root is not None and self.work_root != self.output_root:
            roots.append(("work", self.work_root))
        return roots

    def _is_candidate(self, root_name: str, root: Path, path: Path) -> bool:
        if not path.is_file() or path.suffix.lower() not in CATALOG_SUFFIXES:
            return False
        try:
            path.resolve().relative_to(root)
            relative = path.relative_to(root)
        except (OSError, ValueError):
            return False
        if path == self.catalog_path or path.name == "assets.json":
            return False
        if root_name == "output":
            return relative.parts[:2] != (".studio", "logs")
        allowed = {"episodes", "characters", "locations", "references"}
        return bool(set(part.casefold() for part in relative.parts) & allowed)

    @staticmethod
    def _kind(root_name: str, relative: str, path: Path) -> str:
        parts = Path(relative).parts
        if root_name == "work" and "characters" in parts and path.name == "character.json":
            return "character"
        if root_name == "work" and "locations" in parts and path.name == "location.json":
            return "background"
        suffix = path.suffix.lower()
        if suffix in SLOT_RULES["keyframe"][0]:
            return "image"
        if suffix in SLOT_RULES["video"][0]:
            return "video"
        if suffix in SLOT_RULES["audio"][0]:
            return "audio"
        if suffix in {".txt", ".md", ".srt"}:
            return "text"
        return "data" if suffix == ".json" else "file"

    def _preferred_content_path(self, item: dict[str, object]) -> Path:
        files = cast(list[dict[str, str]], item["files"])
        ordered = sorted(
            files,
            key=lambda entry: 0
            if entry["path"].startswith(".studio/assets/files/")
            else 1,
        )
        for entry in ordered:
            path = self._resolve(entry)
            if path is not None and path.is_file():
                return path
        raise FileNotFoundError(str(item["id"]))

    def _resolve(self, location: dict[str, str]) -> Path | None:
        root = self.output_root if location.get("root") == "output" else self.work_root
        if root is None or location.get("root") not in {"output", "work"}:
            return None
        try:
            candidate = (root / location["path"]).resolve()
            candidate.relative_to(root)
        except (KeyError, OSError, ValueError):
            return None
        return candidate

    def _read(self) -> dict[str, Any]:
        payload = self._read_mapping(self.catalog_path)
        if payload.get("version") != 1:
            payload = {}
        if not isinstance(payload.get("assets"), dict):
            payload["assets"] = {}
        if not isinstance(payload.get("fingerprints"), dict):
            payload["fingerprints"] = {}
        return payload

    def _write(self, payload: dict[str, Any]) -> None:
        self.catalog_path.parent.mkdir(parents=True, exist_ok=True)
        write_text_atomic(
            self.catalog_path,
            json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
        )

    @staticmethod
    def _read_mapping(path: Path) -> dict[str, Any]:
        if not path.is_file():
            return {}
        try:
            payload = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, ValueError):
            return {}
        return payload if isinstance(payload, dict) else {}

    @staticmethod
    def _link_or_copy(source: Path, destination: Path) -> None:
        destination.parent.mkdir(parents=True, exist_ok=True)
        if source.resolve() == destination.resolve():
            return
        temporary = destination.with_name(destination.name + ".asset-link.tmp")
        temporary.unlink(missing_ok=True)
        try:
            os.link(source, temporary)
        except OSError:
            shutil.copy2(source, temporary)
        temporary.replace(destination)

    @staticmethod
    def _sha256(path: Path) -> str:
        digest = hashlib.sha256()
        with path.open("rb") as handle:
            for chunk in iter(lambda: handle.read(1024 * 1024), b""):
                digest.update(chunk)
        return digest.hexdigest()

    @staticmethod
    def _media_type(path: Path) -> str:
        return mimetypes.guess_type(path.name)[0] or "application/octet-stream"

    @staticmethod
    def _search_text(item: dict[str, object]) -> str:
        return " ".join(
            [
                str(item["name"]),
                str(item["kind"]),
                *cast(list[str], item["characters"]),
                *cast(list[str], item["locations"]),
                *cast(list[str], item["episodes"]),
                *cast(list[str], item["shots"]),
            ]
        ).casefold()

    @staticmethod
    def _validate_asset_id(asset_id: str) -> None:
        if not ASSET_ID.fullmatch(asset_id):
            raise ValueError("Identifiant d’asset invalide")
