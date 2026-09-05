from __future__ import annotations

import hashlib
import json
import threading
from datetime import UTC, datetime
from pathlib import Path
from typing import TypeVar

from pydantic import ValidationError

from engine.director.models import (
    Camera,
    Dialogue,
    DialoguePerformance,
    RenderSpec,
    Shot,
    ShotCharacter,
    VisualBeat,
)
from engine.narrative.episode_models import (
    Episode,
    EpisodeStatus,
    EpisodeStory,
    NarrativeProvenance,
)
from engine.narrative.ollama import OllamaClient
from engine.narrative.workflow_models import (
    DirectorBrief,
    DirectorStage,
    EpisodeBreakdownCandidate,
    EpisodeDraftCandidate,
    GeneralValidation,
    ScreenwriterPlan,
    ScreenwriterStage,
    SeriesNarrativeWorkflow,
    StageStatus,
    StrictWorkflowModel,
    ValidatorStage,
)
from engine.production.artifacts import write_text_atomic
from engine.world.bible import BibleRegistry
from engine.world.catalog import EpisodeCatalog
from engine.world.models import ProjectBible

StructuredT = TypeVar("StructuredT", bound=StrictWorkflowModel)


class NarrativeWorkflowRegistry:
    """Atomic persistence and explicit human gates for series authoring."""

    _lock = threading.RLock()

    def __init__(self, private_root: Path) -> None:
        self.path = private_root.resolve() / "world" / "narrative-workflow.json"

    def load(self) -> SeriesNarrativeWorkflow:
        with self._lock:
            if not self.path.is_file():
                return SeriesNarrativeWorkflow()
            return SeriesNarrativeWorkflow.model_validate_json(
                self.path.read_text(encoding="utf-8")
            )

    def put_director(
        self,
        content: DirectorBrief,
        provenance: NarrativeProvenance,
    ) -> SeriesNarrativeWorkflow:
        current = self.load()
        updated = current.model_copy(
            update={
                "updated_at": datetime.now(UTC),
                "director": DirectorStage(
                    status=StageStatus.DRAFT,
                    content=content,
                    provenance=provenance,
                ),
                "screenwriter": ScreenwriterStage(),
                "validator": ValidatorStage(),
            }
        )
        return self._save(updated)

    def put_screenwriter(
        self,
        content: ScreenwriterPlan,
        provenance: NarrativeProvenance,
    ) -> SeriesNarrativeWorkflow:
        current = self.load()
        if current.director.status is not StageStatus.APPROVED:
            raise ValueError("Valide d’abord la direction de série")
        updated = current.model_copy(
            update={
                "updated_at": datetime.now(UTC),
                "screenwriter": ScreenwriterStage(
                    status=StageStatus.DRAFT,
                    content=content,
                    provenance=provenance,
                ),
                "validator": ValidatorStage(),
            }
        )
        return self._save(updated)

    def put_validator(
        self,
        content: GeneralValidation,
        provenance: NarrativeProvenance,
    ) -> SeriesNarrativeWorkflow:
        current = self.load()
        if current.screenwriter.status is not StageStatus.APPROVED:
            raise ValueError("Valide d’abord la proposition du scénariste")
        updated = current.model_copy(
            update={
                "updated_at": datetime.now(UTC),
                "validator": ValidatorStage(
                    status=StageStatus.DRAFT,
                    content=content,
                    provenance=provenance,
                ),
            }
        )
        return self._save(updated)

    def approve(self, stage: str, *, override_reason: str = "") -> SeriesNarrativeWorkflow:
        current = self.load()
        now = datetime.now(UTC)
        if stage == "director":
            if current.director.content is None:
                raise ValueError("La direction de série est vide")
            updated = current.model_copy(
                update={
                    "updated_at": now,
                    "director": current.director.model_copy(
                        update={"status": StageStatus.APPROVED, "approved_at": now}
                    ),
                }
            )
        elif stage == "screenwriter":
            if current.director.status is not StageStatus.APPROVED:
                raise ValueError("Valide d’abord la direction de série")
            if current.screenwriter.content is None:
                raise ValueError("La proposition du scénariste est vide")
            updated = current.model_copy(
                update={
                    "updated_at": now,
                    "screenwriter": current.screenwriter.model_copy(
                        update={"status": StageStatus.APPROVED, "approved_at": now}
                    ),
                }
            )
        elif stage == "validator":
            if current.validator.content is None:
                raise ValueError("Aucun rapport de validation n’est disponible")
            if current.validator.content.verdict == "fail" and len(override_reason.strip()) < 10:
                raise ValueError(
                    "Un rapport en échec exige une justification humaine d’au moins 10 caractères"
                )
            updated = current.model_copy(
                update={
                    "updated_at": now,
                    "validator": current.validator.model_copy(
                        update={
                            "status": StageStatus.APPROVED,
                            "approved_at": now,
                            "override_reason": override_reason.strip() or None,
                        }
                    ),
                }
            )
        else:
            raise ValueError(f"Unknown narrative stage: {stage}")
        return self._save(updated)

    def publish(self, catalog: EpisodeCatalog) -> tuple[SeriesNarrativeWorkflow, list[str]]:
        current = self.load()
        if current.validator.status is not StageStatus.APPROVED:
            raise ValueError("La validation générale doit être approuvée avant publication")
        assert current.screenwriter.content is not None
        created: list[str] = []
        existing = {item.id for item in catalog.list_episodes()}
        bible = BibleRegistry(catalog.root).load()
        canonical_characters = {item.id for item in bible.characters}
        canonical_locations = {item.id for item in bible.locations}
        provenance = current.screenwriter.provenance or NarrativeProvenance(
            stage="screenwriter", mode="manual"
        )
        for proposal in current.screenwriter.content.episodes:
            episode_id = f"S{proposal.season:02d}E{proposal.episode:03d}"
            if episode_id in existing:
                continue
            unknown = (set(proposal.character_ids) - canonical_characters) | (
                set(proposal.location_ids) - canonical_locations
            )
            if unknown:
                raise ValueError(
                    f"{episode_id} référence des éléments absents de la Bible : "
                    + ", ".join(sorted(unknown))
                )
            catalog.create(
                Episode(
                    id=episode_id,
                    season=proposal.season,
                    episode=proposal.episode,
                    title=proposal.title,
                    logline=proposal.logline,
                    duration_target=(
                        current.director.content.target_episode_duration
                        if current.director.content
                        else 45
                    ),
                    status=EpisodeStatus.WRITING,
                    characters=proposal.character_ids,
                    locations=proposal.location_ids,
                    story=EpisodeStory(
                        hook=proposal.logline,
                        setup=proposal.synopsis,
                        cliffhanger=proposal.cliffhanger,
                    ),
                    narrative_source=proposal.synopsis,
                    provenance=[provenance],
                )
            )
            created.append(episode_id)
        published = list(dict.fromkeys([*current.published_episode_ids, *created]))
        updated = current.model_copy(
            update={"updated_at": datetime.now(UTC), "published_episode_ids": published}
        )
        return self._save(updated), created

    def _save(self, workflow: SeriesNarrativeWorkflow) -> SeriesNarrativeWorkflow:
        with self._lock:
            write_text_atomic(self.path, workflow.model_dump_json(indent=2) + "\n")
        return workflow


class OllamaNarrativeAuthor:
    def __init__(self, client: OllamaClient) -> None:
        self.client = client

    async def director(
        self,
        source: str,
        *,
        bible: ProjectBible,
        model: str,
        custom_prompt: str = "",
    ) -> DirectorBrief:
        return await self._generate(
            DirectorBrief,
            model=model,
            system=(
                "Tu es le showrunner d’une série courte. Transforme l’intention en brief "
                "actionnable. La Bible fournie est l’autorité éditoriale : préserve son humour, "
                "son rythme, ses silences, ses contradictions intentionnelles et ses limites. "
                "N’invente aucune contrainte absente et ne déduis jamais la personnalité depuis "
                "l’apparence d’un personnage."
            ),
            user=_context(source, custom_prompt, bible),
        )

    async def screenwriter(
        self,
        brief: DirectorBrief,
        *,
        bible: ProjectBible,
        model: str,
        custom_prompt: str = "",
    ) -> ScreenwriterPlan:
        return await self._generate(
            ScreenwriterPlan,
            model=model,
            system=(
                "Tu es le scénariste en chef. Propose une progression concrète, des épisodes "
                "distincts et des cliffhangers. Les character_ids et location_ids doivent venir "
                "strictement de la Bible. Ses règles de ton et de dialogue sont prioritaires. "
                "Préserve les silences et contradictions utiles; personnalité, comportement et "
                "apparence restent des dimensions séparées."
            ),
            user=_context(brief.model_dump_json(indent=2), custom_prompt, bible),
        )

    async def validate_series(
        self,
        brief: DirectorBrief,
        plan: ScreenwriterPlan,
        *,
        bible: ProjectBible,
        model: str,
        custom_prompt: str = "",
    ) -> GeneralValidation:
        return await self._generate(
            GeneralValidation,
            model=model,
            system=(
                "Tu es le validateur général. Cherche contradictions de Bible, répétitions, "
                "chronologie, évolution, durée et cohérence des personnages. Tu n’édites rien : "
                "tu rends un verdict explicable. Ne signale pas comme erreur une contradiction "
                "ou un silence explicitement prévu par la Bible éditoriale."
            ),
            user=_context(
                json.dumps(
                    {
                        "director": brief.model_dump(mode="json"),
                        "plan": plan.model_dump(mode="json"),
                    },
                    ensure_ascii=False,
                    indent=2,
                ),
                custom_prompt,
                bible,
            ),
        )

    async def episode_draft(
        self,
        episode: Episode,
        *,
        bible: ProjectBible,
        model: str,
        custom_prompt: str = "",
    ) -> EpisodeDraftCandidate:
        return await self._generate(
            EpisodeDraftCandidate,
            model=model,
            system=(
                "Tu écris un épisode court prêt à relire. Respecte la Bible et les identifiants "
                "canoniques. Reproduis ses règles d’humour, de rythme, de silence et de "
                "contradiction sans importer le ton d’une autre série. Retourne uniquement une "
                "proposition : l’humain décidera de l’appliquer."
            ),
            user=_context(episode.model_dump_json(indent=2), custom_prompt, bible),
        )

    async def breakdown(
        self,
        episode: Episode,
        *,
        bible: ProjectBible,
        model: str,
        custom_prompt: str = "",
    ) -> EpisodeBreakdownCandidate:
        return await self._generate(
            EpisodeBreakdownCandidate,
            model=model,
            system=(
                "Tu découpes l’épisode en plans de 1 à 12 secondes. Chaque plan doit faire avancer "
                "l’action, utiliser seulement des IDs canoniques, et décrire caméra, lumière "
                "et jeu. Distingue mode=on_screen (locuteur visible), mode=off_screen (personnage "
                "canonique hors cadre) et mode=voice_over (narration superposée aux images). Un "
                "plan de voix off peut ne contenir aucun personnage visible. Préserve les silences "
                "et le ton définis par la Bible."
            ),
            user=_context(episode.model_dump_json(indent=2), custom_prompt, bible),
        )

    async def _generate(
        self,
        contract: type[StructuredT],
        *,
        model: str,
        system: str,
        user: str,
    ) -> StructuredT:
        errors: list[str] = []
        for attempt in range(1, 4):
            messages = [
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ]
            if errors:
                messages.append(
                    {
                        "role": "user",
                        "content": "Corrige strictement ces erreurs de contrat : " + errors[-1],
                    }
                )
            try:
                raw = await self.client.chat_structured(
                    model,
                    messages,
                    contract.ollama_schema(),
                )
                return contract.model_validate_json(raw)
            except (ValidationError, ValueError) as exc:
                errors.append(f"essai {attempt}: {exc}")
        raise ValueError("La proposition ne respecte pas le contrat après 3 essais : " + errors[-1])


def build_shots(
    episode: Episode,
    candidate: EpisodeBreakdownCandidate,
    bible: ProjectBible,
) -> tuple[Episode, list[Shot]]:
    characters = {item.id: item for item in bible.characters}
    locations = {item.id: item for item in bible.locations}
    shots: list[Shot] = []
    sources: dict[str, str] = {}
    cast: list[str] = []
    sets: list[str] = []
    for index, blueprint in enumerate(candidate.shots, start=1):
        shot_id = f"{episode.id}-S{index:02d}"
        try:
            location = locations[blueprint.location_id]
            profiles = [characters[item] for item in blueprint.character_ids]
        except KeyError as exc:
            raise ValueError(
                f"Le découpage référence un élément absent de la Bible : {exc.args[0]}"
            ) from exc
        shot_characters = [
            ShotCharacter(
                id=profile.id,
                name=profile.name,
                emotion=(
                    blueprint.dialogue.emotion
                    if blueprint.dialogue and blueprint.dialogue.speaker_id == profile.id
                    else "intentional presence"
                ),
                position="composed for the shot",
                visual_description=profile.visual_description,
                wardrobe=profile.wardrobe,
                signature_details=profile.signature_details,
                reference_images=[],
            )
            for profile in profiles
        ]
        dialogue = None
        if blueprint.dialogue:
            if blueprint.dialogue.speaker_id not in characters:
                raise ValueError(
                    "Le découpage référence un locuteur absent de la Bible : "
                    f"{blueprint.dialogue.speaker_id}"
                )
            performance = None
            if blueprint.dialogue.intention and blueprint.dialogue.emotion:
                performance = DialoguePerformance(
                    intention=blueprint.dialogue.intention,
                    emotion=blueprint.dialogue.emotion,
                )
            dialogue = Dialogue(
                speaker=blueprint.dialogue.speaker_id,
                text=blueprint.dialogue.text,
                mode=blueprint.dialogue.mode,
                performance=performance,
            )
        seed = int.from_bytes(
            hashlib.blake2b(f"{shot_id}\n{blueprint.source_text}".encode(), digest_size=8).digest(),
            "big",
        ) & (2**63 - 1)
        shots.append(
            Shot(
                id=shot_id,
                duration=blueprint.duration,
                location=location.id,
                location_description=location.visual_description,
                characters=shot_characters,
                camera=Camera(
                    shot_type=blueprint.shot_type,
                    movement=blueprint.camera_movement,
                    lens=blueprint.lens,
                ),
                action=blueprint.action,
                visual_beats=[
                    VisualBeat(id="start", at=0, description=f"Départ : {blueprint.action}"),
                    VisualBeat(
                        id="middle", at=0.5, description=f"Évolution : {blueprint.source_text}"
                    ),
                    VisualBeat(id="end", at=1, description=f"Sortie : {blueprint.mood}"),
                ],
                dialogue=dialogue,
                lighting=blueprint.lighting,
                mood=blueprint.mood,
                style=blueprint.style,
                render=RenderSpec(seed=seed),
            )
        )
        sources[shot_id] = blueprint.source_text
        cast.extend(blueprint.character_ids)
        if blueprint.dialogue:
            cast.append(blueprint.dialogue.speaker_id)
        sets.append(blueprint.location_id)
    updated = episode.model_copy(
        update={
            "status": EpisodeStatus.BREAKDOWN,
            "duration_target": sum(shot.duration for shot in shots),
            "characters": list(dict.fromkeys(cast)),
            "locations": list(dict.fromkeys(sets)),
            "shot_order": [shot.id for shot in shots],
            "shot_sources": sources,
        }
    )
    return updated, shots


def _context(source: str, custom_prompt: str, bible: ProjectBible) -> str:
    return json.dumps(
        {
            "source": source,
            "custom_prompt": custom_prompt,
            "bible": bible.model_dump(mode="json"),
        },
        ensure_ascii=False,
        indent=2,
        default=str,
    )
