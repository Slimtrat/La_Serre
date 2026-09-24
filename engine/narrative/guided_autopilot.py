from __future__ import annotations

import json
import re
import threading
import unicodedata
from datetime import UTC, datetime
from pathlib import Path
from typing import Literal
from uuid import uuid4

from pydantic import BaseModel, ConfigDict, Field

from engine.config import Settings
from engine.generation.comfy.workflow_templates import WorkflowTemplateCatalogue
from engine.narrative.episode_models import Episode, EpisodeStatus, EpisodeStory
from engine.narrative.guided_authoring import GuidedAuthoringRegistry, GuidedProjectBrief
from engine.narrative.narrative_workflow import OllamaNarrativeAuthor
from engine.narrative.ollama import OllamaClient
from engine.narrative.story_contract import compile_story_contract, reconcile_storyboard
from engine.narrative.visual_gate import build_visual_proof_gate
from engine.production.artifacts import write_text_atomic
from engine.world.bible import BibleRegistry

AutopilotStageStatus = Literal["pending", "running", "completed", "failed"]
AutopilotRunStatus = Literal["queued", "running", "completed", "failed"]


class _AutopilotModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class GuidedAutopilotStage(_AutopilotModel):
    id: Literal[
        "direction",
        "architecture",
        "episode",
        "storyboard",
        "visual_pipeline",
    ]
    label: str
    status: AutopilotStageStatus = "pending"
    summary: str = ""
    candidate: dict[str, object] | None = None
    error: str | None = None
    started_at: datetime | None = None
    completed_at: datetime | None = None


class GuidedAutopilotRun(_AutopilotModel):
    id: str = Field(pattern=r"^[a-f0-9]{32}$")
    base_revision: int = Field(ge=0)
    status: AutopilotRunStatus = "queued"
    model: str | None = None
    locale: Literal["fr", "en"] = "fr"
    custom_prompt: str = ""
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    stages: list[GuidedAutopilotStage] = Field(default_factory=list)


def _default_stages() -> list[GuidedAutopilotStage]:
    return [
        GuidedAutopilotStage(id="direction", label="Direction éditoriale"),
        GuidedAutopilotStage(id="architecture", label="Architecture de série"),
        GuidedAutopilotStage(id="episode", label="Scénario du premier épisode"),
        GuidedAutopilotStage(id="storyboard", label="Storyboard en plans"),
        GuidedAutopilotStage(id="visual_pipeline", label="Chaîne visuelle"),
    ]


class GuidedAutopilotRegistry:
    _lock = threading.RLock()

    def __init__(self, private_root: Path) -> None:
        self.root = private_root.resolve() / ".guided" / "autopilot-runs"

    def create(
        self,
        *,
        base_revision: int,
        locale: Literal["fr", "en"],
        model: str | None,
        custom_prompt: str,
    ) -> GuidedAutopilotRun:
        run = GuidedAutopilotRun(
            id=uuid4().hex,
            base_revision=base_revision,
            locale=locale,
            model=model,
            custom_prompt=custom_prompt,
            stages=_default_stages(),
        )
        return self.save(run)

    def get(self, run_id: str) -> GuidedAutopilotRun:
        if not run_id or any(value not in "0123456789abcdef" for value in run_id):
            raise KeyError(run_id)
        path = self.root / f"{run_id}.json"
        if not path.is_file():
            raise KeyError(run_id)
        return GuidedAutopilotRun.model_validate_json(path.read_text(encoding="utf-8"))

    def latest(self) -> GuidedAutopilotRun | None:
        if not self.root.is_dir():
            return None
        paths = sorted(self.root.glob("*.json"), key=lambda path: path.stat().st_mtime)
        return self.get(paths[-1].stem) if paths else None

    def save(self, run: GuidedAutopilotRun) -> GuidedAutopilotRun:
        with self._lock:
            updated = run.model_copy(update={"updated_at": datetime.now(UTC)})
            write_text_atomic(
                self.root / f"{updated.id}.json",
                updated.model_dump_json(indent=2) + "\n",
            )
            return updated

    def start_stage(self, run_id: str, stage_id: str) -> GuidedAutopilotRun:
        return self._update_stage(run_id, stage_id, status="running")

    def complete_stage(
        self,
        run_id: str,
        stage_id: str,
        candidate: dict[str, object],
        summary: str,
    ) -> GuidedAutopilotRun:
        return self._update_stage(
            run_id,
            stage_id,
            status="completed",
            candidate=candidate,
            summary=summary,
        )

    def fail_stage(self, run_id: str, stage_id: str, error: str) -> GuidedAutopilotRun:
        return self._update_stage(run_id, stage_id, status="failed", error=error)

    def _update_stage(
        self,
        run_id: str,
        stage_id: str,
        *,
        status: AutopilotStageStatus,
        candidate: dict[str, object] | None = None,
        summary: str = "",
        error: str | None = None,
    ) -> GuidedAutopilotRun:
        with self._lock:
            run = self.get(run_id)
            now = datetime.now(UTC)
            stages = [
                stage.model_copy(
                    update={
                        "status": status,
                        "candidate": candidate if candidate is not None else stage.candidate,
                        "summary": summary or stage.summary,
                        "error": error,
                        "started_at": now if status == "running" else stage.started_at,
                        "completed_at": now if status in {"completed", "failed"} else None,
                    }
                )
                if stage.id == stage_id
                else stage
                for stage in run.stages
            ]
            run_status: AutopilotRunStatus = "running"
            if status == "failed":
                run_status = "failed"
            elif all(stage.status == "completed" for stage in stages):
                run_status = "completed"
            return self.save(run.model_copy(update={"status": run_status, "stages": stages}))


async def execute_guided_autopilot(run_id: str, settings: Settings) -> None:
    registry = GuidedAutopilotRegistry(settings.private_content_dir)
    run = registry.get(run_id)
    guided = GuidedAuthoringRegistry(settings.private_content_dir).load()
    if guided.revision != run.base_revision:
        registry.fail_stage(run_id, "direction", "Le projet a changé depuis le lancement.")
        return
    source = guided.brief.idea.strip()
    if len(source) < 10:
        registry.fail_stage(
            run_id,
            "direction",
            "Décris d’abord ton idée en au moins dix caractères.",
        )
        return
    bible = BibleRegistry(settings.private_content_dir).load()
    contract_source = guided.brief.episode_concept.strip() or source
    story_contract = compile_story_contract(contract_source)
    generation_prompt = _generation_prompt(guided.brief, run.custom_prompt)
    try:
        async with OllamaClient(str(settings.ollama_url)) as client:
            models = await client.list_models()
            installed = {item.name for item in models}
            selected = run.model or (
                settings.ollama_model if settings.ollama_model in installed else None
            )
            if selected is None:
                selected = next(
                    (
                        name
                        for name in sorted(installed)
                        if not any(marker in name.casefold() for marker in ("coder", "embed"))
                    ),
                    None,
                )
            if selected is None or selected not in installed:
                raise ValueError("Aucun modèle narratif Ollama n’est installé.")
            run = registry.save(run.model_copy(update={"status": "running", "model": selected}))
            author = OllamaNarrativeAuthor(client)

            registry.start_stage(run_id, "direction")
            direction = await author.director(
                _guided_source(guided.model_dump(mode="json")),
                bible=bible,
                model=selected,
                custom_prompt=generation_prompt,
            )
            registry.complete_stage(
                run_id,
                "direction",
                direction.model_dump(mode="json"),
                f"{direction.genre} · {direction.tone}",
            )

            registry.start_stage(run_id, "architecture")
            architecture = await author.screenwriter(
                direction,
                bible=bible,
                model=selected,
                custom_prompt=generation_prompt,
            )
            registry.complete_stage(
                run_id,
                "architecture",
                architecture.model_dump(mode="json"),
                f"{len(architecture.episodes)} épisode(s) proposé(s)",
            )

            proposal = architecture.episodes[0]
            episode = Episode(
                id=f"S{proposal.season:02d}E{proposal.episode:03d}",
                season=proposal.season,
                episode=proposal.episode,
                title=proposal.title,
                logline=proposal.logline,
                duration_target=direction.target_episode_duration,
                status=EpisodeStatus.WRITING,
                characters=_unique(proposal.character_ids),
                locations=_unique(proposal.location_ids),
                story=EpisodeStory(
                    hook=proposal.logline,
                    setup=proposal.synopsis,
                    cliffhanger=proposal.cliffhanger,
                ),
                narrative_source=proposal.synopsis,
            )
            registry.start_stage(run_id, "episode")
            episode_draft = await author.episode_draft(
                episode,
                bible=bible,
                model=selected,
                custom_prompt=generation_prompt,
                task_version=2,
            )
            if story_contract is not None:
                episode_draft = episode_draft.model_copy(
                    update={"narrative_source": story_contract.source}
                )
            registry.complete_stage(
                run_id,
                "episode",
                episode_draft.model_dump(mode="json"),
                episode_draft.logline,
            )

            episode = episode.model_copy(
                update={
                    "title": episode_draft.title,
                    "logline": episode_draft.logline,
                    "story": episode_draft.story,
                    "narrative_source": episode_draft.narrative_source,
                    "characters": _unique(episode_draft.character_ids),
                    "locations": _unique(episode_draft.location_ids),
                }
            )
            registry.start_stage(run_id, "storyboard")
            storyboard = await author.breakdown(
                episode,
                bible=bible,
                model=selected,
                custom_prompt=generation_prompt,
                task_version=2,
            )
            if story_contract is not None:
                storyboard = reconcile_storyboard(story_contract, storyboard)
            registry.complete_stage(
                run_id,
                "storyboard",
                storyboard.model_dump(mode="json"),
                f"{len(storyboard.shots)} plan(s) proposé(s)",
            )
            quality_issues = _production_quality_issues(
                guided.brief,
                episode_draft.narrative_source,
                storyboard,
            )
            for attempt in range(2, 4):
                if not quality_issues:
                    break
                repair_prompt = _repair_prompt(
                    generation_prompt,
                    quality_issues,
                    attempt,
                )
                registry.start_stage(run_id, "episode")
                episode_draft = await author.episode_draft(
                    episode,
                    bible=bible,
                    model=selected,
                    custom_prompt=repair_prompt,
                    task_version=2,
                )
                if story_contract is not None:
                    episode_draft = episode_draft.model_copy(
                        update={"narrative_source": story_contract.source}
                    )
                registry.complete_stage(
                    run_id,
                    "episode",
                    episode_draft.model_dump(mode="json"),
                    f"Réécriture qualité {attempt}/3 · {episode_draft.logline}",
                )
                episode = episode.model_copy(
                    update={
                        "title": episode_draft.title,
                        "logline": episode_draft.logline,
                        "story": episode_draft.story,
                        "narrative_source": episode_draft.narrative_source,
                        "characters": _unique(episode_draft.character_ids),
                        "locations": _unique(episode_draft.location_ids),
                    }
                )
                registry.start_stage(run_id, "storyboard")
                storyboard = await author.breakdown(
                    episode,
                    bible=bible,
                    model=selected,
                    custom_prompt=repair_prompt,
                    task_version=2,
                )
                if story_contract is not None:
                    storyboard = reconcile_storyboard(story_contract, storyboard)
                registry.complete_stage(
                    run_id,
                    "storyboard",
                    storyboard.model_dump(mode="json"),
                    f"Réécriture qualité {attempt}/3 · {len(storyboard.shots)} plan(s)",
                )
                quality_issues = _production_quality_issues(
                    guided.brief,
                    episode_draft.narrative_source,
                    storyboard,
                )
            if quality_issues:
                registry.fail_stage(
                    run_id,
                    "storyboard",
                    "Gate narrative refusée : " + " ".join(quality_issues),
                )
                return

            registry.start_stage(run_id, "visual_pipeline")
            templates = WorkflowTemplateCatalogue().build()
            visual_gate = build_visual_proof_gate(episode.id, storyboard)
            registry.complete_stage(
                run_id,
                "visual_pipeline",
                {
                    "continuity_chain": list(WorkflowTemplateCatalogue.chain),
                    "visual_gate": visual_gate.model_dump(mode="json"),
                    "recipes": [
                        {
                            "label": template.spec.label,
                            "receives": template.spec.receives,
                            "produces": template.spec.produces,
                        }
                        for template in templates
                    ],
                },
                f"{len(visual_gate.witnesses)} plans témoins sélectionnés · "
                "production complète verrouillée",
            )
    except Exception as exc:  # noqa: BLE001 - persisted boundary for background work
        current = registry.get(run_id)
        active = next(
            (stage for stage in current.stages if stage.status == "running"),
            next((stage for stage in current.stages if stage.status == "pending"), None),
        )
        if active is not None:
            registry.fail_stage(run_id, active.id, str(exc))


def _guided_source(payload: dict[str, object]) -> str:
    return json.dumps(payload, ensure_ascii=False, indent=2, default=str)


def _unique(values: list[str]) -> list[str]:
    """Keep model order while removing duplicate canonical identifiers."""
    return list(dict.fromkeys(values))


def _production_quality_issues(
    brief: GuidedProjectBrief,
    narrative_source: str,
    storyboard: object,
) -> list[str]:
    """Reject lossy adaptations before any expensive visual generation."""
    from engine.narrative.workflow_models import EpisodeBreakdownCandidate

    breakdown = EpisodeBreakdownCandidate.model_validate(storyboard)
    source = brief.episode_concept.strip() or brief.idea.strip()
    issues: list[str] = []
    expected_shots = len(re.findall(r"(?m)^\s*\d+\.\s+\d", source))
    if expected_shots and len(breakdown.shots) != expected_shots:
        issues.append(
            f"{len(breakdown.shots)} plans produits au lieu des {expected_shots} imposés."
        )
    duration_match = re.search(r"\b(\d{2,3})\s*secondes\b", source, re.IGNORECASE)
    if duration_match:
        expected_duration = float(duration_match.group(1))
        actual_duration = sum(shot.duration for shot in breakdown.shots)
        if abs(actual_duration - expected_duration) > 1:
            issues.append(
                f"Durée proposée {actual_duration:g} s au lieu de {expected_duration:g} s."
            )
    minimum_length = min(2_000, round(len(source) * 0.35))
    if len(narrative_source.strip()) < minimum_length:
        issues.append(
            f"Scénario appauvri à {len(narrative_source.strip())} caractères "
            f"(minimum {minimum_length})."
        )
    required_dialogue = re.findall(r"[«“]([^»”]{3,})[»”]", source)
    if required_dialogue:
        rendered = _normalized_text(narrative_source)
        preserved = sum(
            _normalized_text(line) in rendered for line in required_dialogue
        )
        if preserved / len(required_dialogue) < 0.6:
            issues.append(
                f"Seulement {preserved}/{len(required_dialogue)} dialogues verrouillés conservés."
            )
    return issues


def _normalized_text(value: str) -> str:
    decomposed = unicodedata.normalize("NFKD", value.casefold())
    without_accents = "".join(
        character for character in decomposed if not unicodedata.combining(character)
    )
    return " ".join(re.sub(r"[^a-z0-9]+", " ", without_accents).split())


def _repair_prompt(base_prompt: str, issues: list[str], attempt: int) -> str:
    failures = " ".join(f"- {issue}" for issue in issues)
    return (
        f"{base_prompt}\n\nRÉÉCRITURE OBLIGATOIRE {attempt}/3. "
        "La proposition précédente a été refusée par la gate de production. "
        f"Corrige tous les défauts sans appauvrir la source verrouillée : {failures} "
        "Ne discute pas le diagnostic ; rends directement un candidat conforme au schéma."
    )


def _generation_prompt(brief: GuidedProjectBrief, custom_prompt: str) -> str:
    language = brief.language
    names = {"fr": "français", "de": "allemand", "en": "anglais"}
    name = names.get(language, f"la langue de code ISO 639-1 {language}")
    directive = (
        f"Contrainte de langue prioritaire : rédige tous les contenus narratifs et éditoriaux "
        f"générés en {name} (code {language}), à chaque étape. "
        "Conserve les identifiants techniques canoniques inchangés."
    )
    metadata = {
        "source_example_id": brief.source_example_id,
        "learning_goals": brief.learning_goals,
        "continuity_notes": brief.continuity_notes,
    }
    metadata_directive = (
        "Métadonnées du brief à respecter à chaque étape : "
        + json.dumps(metadata, ensure_ascii=False)
        + ". Les objectifs pédagogiques guident le niveau et la progression du récit. "
        "Les notes de continuité contraignent les scènes et les personnages. "
        "L’identifiant d’exemple indique la provenance du brief, pas un élément de fiction."
    )
    source_contract = (
        "SOURCE NARRATIVE VERROUILLÉE — elle doit être relue et respectée intégralement "
        "à chaque étape, même si la sortie d’une étape précédente la résume ou l’appauvrit. "
        "Les dialogues, événements, durées, nombre de plans et règles explicitement indiqués "
        "dans cette source sont des contraintes de production, pas des suggestions.\n\n"
        f"IDÉE / SOURCE PRINCIPALE :\n{brief.idea.strip()}\n\n"
        f"CONCEPT D’ÉPISODE :\n{brief.episode_concept.strip()}"
    )
    return "\n\n".join(
        part
        for part in (
            custom_prompt.strip(),
            directive,
            metadata_directive,
            source_contract,
        )
        if part
    )
