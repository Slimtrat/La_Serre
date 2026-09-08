from __future__ import annotations

from enum import StrEnum

from engine.narrative.tasks.models import TaskKind, TaskRegistry, TaskSpec
from engine.narrative.workflow_models import (
    ContinuityDelta,
    DirectorBrief,
    EpisodeBreakdownCandidate,
    EpisodeDraftCandidate,
    GeneralValidation,
    ScreenwriterPlan,
)


class NarrativeTaskId(StrEnum):
    DIRECTOR = "narrative.director"
    SEASON_PLAN = "tentafruit.season-plan"
    SHORT_EPISODE = "tentafruit.short-episode"
    BREAKDOWN = "tentafruit.breakdown"
    CONTINUITY_DELTA = "tentafruit.continuity-delta"
    AUDIT = "tentafruit.audit"


DEFAULT_TASK_REGISTRY = TaskRegistry(
    (
        TaskSpec(
            task_id=NarrativeTaskId.DIRECTOR,
            version=1,
            kind=TaskKind.CREATIVE,
            objective=(
                "Tu es le showrunner d’une série courte. "
                "Transforme l’intention en brief actionnable."
            ),
            contract=DirectorBrief,
            required_context=("source", "custom_prompt", "bible"),
            rules=(
                "La Bible fournie est l’autorité éditoriale.",
                "Préserve humour, rythme, silences, contradictions intentionnelles et limites.",
                "N’invente aucune contrainte absente.",
                "Ne déduis jamais la personnalité depuis l’apparence d’un personnage.",
            ),
            inference_options={"temperature": 0.35},
        ),
        TaskSpec(
            task_id=NarrativeTaskId.SEASON_PLAN,
            version=1,
            kind=TaskKind.CREATIVE,
            objective=(
                "Tu es le scénariste en chef. Propose une progression concrète, "
                "des épisodes distincts et des cliffhangers."
            ),
            contract=ScreenwriterPlan,
            required_context=("source", "custom_prompt", "bible"),
            rules=(
                "Les character_ids et location_ids viennent strictement de la Bible.",
                "Les règles de ton et de dialogue de la Bible sont prioritaires.",
                "Préserve les silences et contradictions utiles.",
                "Personnalité, comportement et apparence restent séparés.",
            ),
            inference_options={"temperature": 0.5},
        ),
        TaskSpec(
            task_id=NarrativeTaskId.SHORT_EPISODE,
            version=1,
            kind=TaskKind.CREATIVE,
            objective="Tu écris un épisode court Tentafruit prêt à relire.",
            contract=EpisodeDraftCandidate,
            required_context=("source", "custom_prompt", "bible"),
            rules=(
                "Respecte la Bible et ses identifiants canoniques.",
                "Reproduis humour, rythme, silences et contradictions sans importer un autre ton.",
                "Retourne uniquement une proposition; l’humain décidera de l’appliquer.",
            ),
            inference_options={"temperature": 0.55},
        ),
        TaskSpec(
            task_id=NarrativeTaskId.BREAKDOWN,
            version=1,
            kind=TaskKind.FACTUAL,
            objective="Tu découpes l’épisode Tentafruit en plans de 1 à 12 secondes.",
            contract=EpisodeBreakdownCandidate,
            required_context=("source", "custom_prompt", "bible"),
            rules=(
                "Chaque plan fait avancer l’action et utilise seulement des IDs canoniques.",
                "Décris caméra, lumière et jeu.",
                "Distingue on_screen, off_screen et voice_over; "
                "une voix off peut être sans personnage visible.",
                "Préserve les silences et le ton définis par la Bible.",
            ),
            inference_options={"temperature": 0.2},
        ),
        TaskSpec(
            task_id=NarrativeTaskId.CONTINUITY_DELTA,
            version=1,
            kind=TaskKind.FACTUAL,
            objective=(
                "Compare l’état canonique avant et après l’épisode et décris uniquement "
                "les changements explicites."
            ),
            contract=ContinuityDelta,
            required_context=("before", "episode", "bible"),
            rules=(
                "N’invente aucun changement implicite.",
                "Utilise exclusivement des identifiants canoniques.",
                "Sépare relations, personnages et faits de monde.",
            ),
            inference_options={"temperature": 0.1},
        ),
        TaskSpec(
            task_id=NarrativeTaskId.AUDIT,
            version=1,
            kind=TaskKind.VALIDATION,
            objective=(
                "Tu es le validateur général Tentafruit. Cherche les écarts narratifs "
                "et rends un verdict explicable."
            ),
            contract=GeneralValidation,
            required_context=("source", "custom_prompt", "bible"),
            rules=(
                "Contrôle Bible, répétitions, chronologie, évolution, durée "
                "et cohérence des personnages.",
                "Tu n’édites et n’appliques rien.",
                "Ne signale pas comme erreur une contradiction ou un silence prévu par la Bible.",
            ),
            inference_options={"temperature": 0.1},
            allows_mutation=False,
        ),
    )
)
