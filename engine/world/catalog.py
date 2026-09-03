from __future__ import annotations

import re
from pathlib import Path
from typing import TypeVar

from pydantic import BaseModel

from engine.director.models import Shot, ShotCharacter
from engine.narrative.episode_models import Episode, EpisodePackage, EpisodeSummary
from engine.world.models import CharacterProfile, LocationProfile

ModelT = TypeVar("ModelT", bound=BaseModel)
EPISODE_ID = re.compile(r"^S\d{2}E\d{3}$")


class EpisodeCatalog:
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
        if not EPISODE_ID.fullmatch(episode_id):
            raise ValueError(f"Invalid episode id: {episode_id}")
        season = episode_id[1:3]
        episode_dir = self.root / "episodes" / f"season-{season}" / episode_id
        episode = self._load_model(episode_dir / "episode.json", Episode)
        if episode.id != episode_id:
            raise ValueError(f"Episode file contains {episode.id}, expected {episode_id}")

        characters = [
            self._load_model(
                self.root / "world" / "characters" / character_id / "character.json",
                CharacterProfile,
            )
            for character_id in episode.characters
        ]
        locations = [
            self._load_model(
                self.root / "world" / "locations" / location_id / "location.json",
                LocationProfile,
            )
            for location_id in episode.locations
        ]
        shots = [
            self._load_model(episode_dir / "shots" / f"{shot_id}.json", Shot)
            for shot_id in episode.shot_order
        ]
        self._validate_package(episode, characters, locations, shots)
        return EpisodePackage(
            episode=episode,
            characters=characters,
            locations=locations,
            shots=shots,
        )

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
        if abs(duration - episode.duration_target) > 0.01:
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
