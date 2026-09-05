from __future__ import annotations

import re
import shutil
import threading
from datetime import UTC, datetime
from pathlib import Path
from typing import TypeVar

from pydantic import BaseModel

from engine.director.models import Shot, ShotCharacter
from engine.narrative.episode_models import Episode, EpisodePackage, EpisodeSummary
from engine.production.artifacts import write_text_atomic
from engine.world.bible import BibleRegistry
from engine.world.models import CharacterProfile, LocationProfile

ModelT = TypeVar("ModelT", bound=BaseModel)
EPISODE_ID = re.compile(r"^S\d{2}E\d{3}$")


class EpisodeCatalog:
    _lock = threading.RLock()

    def __init__(self, root: Path = Path(".private")) -> None:
        self.root = root.resolve()

    def list_episodes(self) -> list[EpisodeSummary]:
        summaries = []
        for path in sorted((self.root / "episodes").glob("season-*/S*/episode.json")):
            episode = self._load_model(path, Episode)
            summaries.append(
                EpisodeSummary(
                    id=episode.id,
                    title=episode.title,
                    logline=episode.logline,
                    duration_target=episode.duration_target,
                    status=episode.status,
                    shot_count=len(episode.shot_order),
                )
            )
        return summaries

    def load(self, episode_id: str) -> EpisodePackage:
        episode = self.get(episode_id)
        episode_dir = self.episode_dir(episode_id)
        registry = BibleRegistry(self.root)
        bible = registry.load()
        character_by_id = {character.id: character for character in bible.characters}
        location_by_id = {location.id: location for location in bible.locations}
        try:
            characters = [character_by_id[character_id] for character_id in episode.characters]
            locations = [location_by_id[location_id] for location_id in episode.locations]
        except KeyError as exc:
            raise ValueError(
                f"Episode references an unknown canonical entity: {exc.args[0]}"
            ) from exc
        shots = [
            self._load_model(episode_dir / "shots" / f"{shot_id}.json", Shot)
            for shot_id in episode.shot_order
        ]
        self._validate_package(episode, characters, locations, shots)
        shots = [registry.resolve_shot(shot) for shot in shots]
        return EpisodePackage(
            episode=episode,
            characters=characters,
            locations=locations,
            shots=shots,
        )

    def get(self, episode_id: str) -> Episode:
        if not EPISODE_ID.fullmatch(episode_id):
            raise ValueError(f"Invalid episode id: {episode_id}")
        episode = self._load_model(self.episode_dir(episode_id) / "episode.json", Episode)
        if episode.id != episode_id:
            raise ValueError(f"Episode file contains {episode.id}, expected {episode_id}")
        return episode

    def episode_dir(self, episode_id: str) -> Path:
        if not EPISODE_ID.fullmatch(episode_id):
            raise ValueError(f"Invalid episode id: {episode_id}")
        return self.root / "episodes" / f"season-{episode_id[1:3]}" / episode_id

    def next_episode_number(self, season: int) -> int:
        used = {
            summary.id
            for summary in self.list_episodes()
            if summary.id.startswith(f"S{season:02d}E")
        }
        for number in range(1, 1000):
            if f"S{season:02d}E{number:03d}" not in used:
                return number
        raise ValueError(f"Season {season} already contains 999 episodes")

    def create(self, episode: Episode) -> Episode:
        with self._lock:
            path = self.episode_dir(episode.id) / "episode.json"
            if path.exists():
                raise FileExistsError(episode.id)
            self._write_episode(path, episode)
        return episode

    def save(self, episode: Episode) -> Episode:
        with self._lock:
            path = self.episode_dir(episode.id) / "episode.json"
            if not path.is_file():
                raise FileNotFoundError(path)
            self._write_episode(path, episode)
        return episode

    def save_breakdown(self, episode: Episode, shots: list[Shot]) -> EpisodePackage:
        if [shot.id for shot in shots] != episode.shot_order:
            raise ValueError("Breakdown shots must exactly match episode.shot_order")
        with self._lock:
            episode_dir = self.episode_dir(episode.id)
            if not (episode_dir / "episode.json").is_file():
                raise FileNotFoundError(episode_dir / "episode.json")
            for shot in shots:
                write_text_atomic(
                    episode_dir / "shots" / f"{shot.id}.json",
                    shot.model_dump_json(indent=2) + "\n",
                )
            self._write_episode(episode_dir / "episode.json", episode)
        return self.load(episode.id)

    def delete(self, episode_id: str) -> Path:
        """Move an episode to the project trash so deletion remains recoverable."""
        with self._lock:
            source = self.episode_dir(episode_id)
            if not source.is_dir():
                raise FileNotFoundError(source)
            stamp = datetime.now(UTC).strftime("%Y%m%dT%H%M%SZ")
            destination = self.root / ".trash" / f"{episode_id}-{stamp}"
            destination.parent.mkdir(parents=True, exist_ok=True)
            shutil.move(str(source), str(destination))
            return destination

    @staticmethod
    def _write_episode(path: Path, episode: Episode) -> None:
        write_text_atomic(path, episode.model_dump_json(indent=2) + "\n")

    @staticmethod
    def _load_model(path: Path, model: type[ModelT]) -> ModelT:
        if not path.is_file():
            raise FileNotFoundError(path)
        return model.model_validate_json(path.read_text(encoding="utf-8"))

    @staticmethod
    def _validate_package(
        episode: Episode,
        characters: list[CharacterProfile],
        locations: list[LocationProfile],
        shots: list[Shot],
    ) -> None:
        character_by_id = {character.id: character for character in characters}
        location_by_id = {location.id: location for location in locations}
        if set(character_by_id) != set(episode.characters):
            raise ValueError("Loaded characters do not match the episode cast")
        if set(location_by_id) != set(episode.locations):
            raise ValueError("Loaded locations do not match the episode")
        if [shot.id for shot in shots] != episode.shot_order:
            raise ValueError("Loaded shots do not match shot_order")
        duration = sum(shot.duration for shot in shots)
        if shots and abs(duration - episode.duration_target) > 0.01:
            raise ValueError(
                f"Shot duration is {duration}s but episode target is {episode.duration_target}s"
            )
        for shot in shots:
            if shot.location not in location_by_id:
                raise ValueError(f"{shot.id} uses unknown location {shot.location}")
            location = location_by_id[shot.location]
            if shot.location_description != location.visual_description:
                raise ValueError(f"{shot.id} drifts from canonical location {location.id}")
            for character in shot.characters:
                EpisodeCatalog._validate_character(shot.id, character, character_by_id)

    @staticmethod
    def _validate_character(
        shot_id: str,
        shot_character: ShotCharacter,
        profiles: dict[str, CharacterProfile],
    ) -> None:
        profile = profiles.get(shot_character.id)
        if not profile:
            raise ValueError(f"{shot_id} uses unknown character {shot_character.id}")
        fields = {
            "name": profile.name,
            "visual_description": profile.visual_description,
            "wardrobe": profile.wardrobe,
            "signature_details": profile.signature_details,
        }
        for name, expected in fields.items():
            if getattr(shot_character, name) != expected:
                raise ValueError(f"{shot_id} drifts from {profile.id}.{name}")
