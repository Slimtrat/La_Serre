from __future__ import annotations

import asyncio
import hashlib
import json
import re
import uuid
from collections.abc import Callable
from datetime import UTC, datetime
from pathlib import Path
from typing import Any, Literal

import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, ConfigDict, Field, model_validator

from apps.api.notifications import NotificationLevel, StudioNotificationLog
from engine.config import Settings
from engine.director.models import Shot
from engine.narrative.coherence import (
    AIReviewerResult,
    CoherenceFinding,
    CoherenceFocus,
    CoherenceReport,
    CoherenceScope,
    FindingSeverity,
    OllamaCoherenceCommittee,
    RuleBasedCoherenceValidator,
)
from engine.narrative.episode_models import EpisodePackage
from engine.narrative.ollama import OllamaClient
from engine.production.artifacts import write_text_atomic
from engine.world.bible import BibleRegistry
from engine.world.catalog import EpisodeCatalog
from engine.world.models import ProjectBible

EPISODE_ID = re.compile(r"^S\d{2}E\d{3}$")
SHOT_ID = re.compile(r"^S\d{2}E\d{3}-S\d{2}$")
REPORT_ID = re.compile(r"^[a-f0-9]{32}$")
AIStatus = Literal["complete", "skipped", "unavailable", "failed"]


class _StrictRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")


class CoherenceReviewRequest(_StrictRequest):
    scope: CoherenceScope
    subject_id: str = Field(min_length=1, max_length=32)
    focus: CoherenceFocus = "all"
    source_text: str = Field(default="", max_length=50_000)
    shot: dict[str, Any] | None = None
    model: str | None = Field(default=None, min_length=1, max_length=200)
    use_ai: bool = True

    @model_validator(mode="after")
    def subject_matches_scope(self) -> CoherenceReviewRequest:
        valid = (
            (self.scope == "series" and self.subject_id == "series")
            or (self.scope == "episode" and EPISODE_ID.fullmatch(self.subject_id))
            or (self.scope == "shot" and SHOT_ID.fullmatch(self.subject_id))
        )
        if not valid:
            raise ValueError("subject_id does not match the validation scope")
        return self


class CoherenceApprovalRequest(_StrictRequest):
    override_reason: str | None = Field(default=None, min_length=10, max_length=1000)


class CoherenceReportStore:
    def __init__(self, output_root: Path) -> None:
        self.root = output_root.resolve() / ".studio" / "coherence"

    def save(self, report: CoherenceReport) -> CoherenceReport:
        content = report.model_dump_json(indent=2) + "\n"
        write_text_atomic(self.root / "reports" / f"{report.id}.json", content)
        write_text_atomic(self._latest_path(report.scope, report.subject_id), content)
        return report

    def latest(self, scope: CoherenceScope, subject_id: str) -> CoherenceReport | None:
        path = self._latest_path(scope, subject_id)
        if not path.is_file():
            return None
        return CoherenceReport.model_validate_json(path.read_text(encoding="utf-8"))

    def approve(
        self,
        report_id: str,
        *,
        override_reason: str | None,
        current_bible_revision: int | None = None,
    ) -> CoherenceReport:
        if not REPORT_ID.fullmatch(report_id):
            raise KeyError(report_id)
        path = self.root / "reports" / f"{report_id}.json"
        if not path.is_file():
            raise KeyError(report_id)
        report = CoherenceReport.model_validate_json(path.read_text(encoding="utf-8"))
        latest = self.latest(report.scope, report.subject_id)
        if latest is None or latest.id != report.id:
            raise ValueError(
                "Ce rapport est obsolète : un contrôle plus récent doit être validé."
            )
        if (
            current_bible_revision is not None
            and report.bible_revision != current_bible_revision
        ):
            raise ValueError(
                "Ce rapport est obsolète : le canon a changé depuis le contrôle."
            )
        normalized_reason = override_reason.strip() if override_reason else None
        if normalized_reason and len(normalized_reason) < 10:
            raise ValueError("La dérogation doit contenir au moins 10 caractères utiles.")
        blockers = [
            finding for finding in report.findings if finding.severity == FindingSeverity.BLOCKER
        ]
        if blockers and not normalized_reason:
            raise ValueError(
                "Ce rapport contient des incohérences bloquantes. "
                "Corrige-les ou documente explicitement la dérogation."
            )
        approved = report.model_copy(
            update={
                "approved_at": datetime.now(UTC),
                "approved_by": "human",
                "override_reason": normalized_reason,
            }
        )
        content = approved.model_dump_json(indent=2) + "\n"
        write_text_atomic(path, content)
        write_text_atomic(self._latest_path(approved.scope, approved.subject_id), content)
        return approved

    def _latest_path(self, scope: CoherenceScope, subject_id: str) -> Path:
        return self.root / "latest" / f"{scope}-{subject_id}.json"


def create_coherence_router(
    settings_provider: Callable[[], Settings],
    catalog_provider: Callable[[], EpisodeCatalog],
) -> APIRouter:
    router = APIRouter(prefix="/api/coherence", tags=["coherence"])

    @router.post("/review", response_model=CoherenceReport)
    async def review(payload: CoherenceReviewRequest) -> CoherenceReport:
        settings = settings_provider()
        bible = BibleRegistry(settings.private_content_dir).load()
        try:
            package, shot = _subject(catalog_provider(), payload)
        except FileNotFoundError as exc:
            raise HTTPException(status_code=404, detail="Contexte narratif introuvable") from exc
        except ValueError as exc:
            raise HTTPException(status_code=422, detail=str(exc)) from exc
        if (
            payload.scope == "shot"
            and not payload.source_text
            and package is not None
            and shot is not None
        ):
            payload = payload.model_copy(
                update={
                    "source_text": package.episode.shot_sources.get(
                        shot.id,
                        package.episode.narrative_source,
                    )
                }
            )

        deterministic = RuleBasedCoherenceValidator().validate(
            scope=payload.scope,
            bible=bible,
            package=package,
            shot=shot,
            source_text=payload.source_text,
            focus=payload.focus,
        )
        ai_status: AIStatus = "skipped"
        model: str | None = None
        reviewers: list[AIReviewerResult] = []
        ai_findings: list[CoherenceFinding] = []
        if payload.use_ai:
            try:
                async with OllamaClient(str(settings.ollama_url)) as client:
                    models = await client.list_models()
                    names = {item.name for item in models}
                    model = payload.model or (
                        settings.ollama_model if settings.ollama_model in names else None
                    )
                    model = model or (models[0].name if models else None)
                    if model is None or model not in names:
                        ai_status = "unavailable"
                    else:
                        committee = await OllamaCoherenceCommittee().review(
                            client,
                            model=model,
                            focus=payload.focus,
                            context=_committee_context(
                                payload,
                                bible=bible,
                                package=package,
                                shot=shot,
                            ),
                        )
                        reviewers = committee.reviews
                        ai_findings = [
                            finding.model_copy(
                                update={"validator": f"committee:{reviewer.reviewer}"}
                            )
                            for reviewer in reviewers
                            for finding in reviewer.findings
                        ]
                        ai_status = "complete"
            except httpx.HTTPError:
                ai_status = "unavailable"
            except (ValueError, OSError):
                ai_status = "failed"
        if ai_status in {"unavailable", "failed"}:
            ai_findings.append(
                CoherenceFinding(
                    code="ai_committee_unavailable",
                    validator="committee",
                    severity=FindingSeverity.WARNING,
                    title="Comité IA indisponible",
                    message=(
                        "Les règles déterministes ont été exécutées, mais les avis "
                        "sémantiques locaux n’ont pas pu être produits."
                    ),
                    recommendation="Lance Ollama et relance le contrôle avant le master.",
                    subject_path=payload.scope,
                )
            )

        report = _build_report(
            payload,
            bible=bible,
            package=package,
            shot=shot,
            deterministic=deterministic,
            ai_findings=ai_findings,
            reviewers=reviewers,
            ai_status=ai_status,
            model=model,
        )
        await asyncio.to_thread(CoherenceReportStore(settings.output_dir).save, report)
        level: NotificationLevel = (
            "error"
            if report.status == "fail"
            else "warning"
            if report.findings
            else "success"
        )
        await asyncio.to_thread(
            StudioNotificationLog(settings.output_dir).publish,
            level,
            "Cohérence narrative",
            report.summary,
            source="coherence",
            context={
                "scope": report.scope,
                "subject_id": report.subject_id,
                "report_id": report.id,
            },
        )
        return report

    @router.post("/reports/{report_id}/approve", response_model=CoherenceReport)
    async def approve(
        report_id: str,
        payload: CoherenceApprovalRequest,
    ) -> CoherenceReport:
        settings = settings_provider()
        bible_revision = BibleRegistry(settings.private_content_dir).load().revision
        try:
            report = await asyncio.to_thread(
                CoherenceReportStore(settings.output_dir).approve,
                report_id,
                override_reason=payload.override_reason,
                current_bible_revision=bible_revision,
            )
        except KeyError as exc:
            raise HTTPException(status_code=404, detail="Rapport de cohérence introuvable") from exc
        except ValueError as exc:
            raise HTTPException(status_code=409, detail=str(exc)) from exc
        await asyncio.to_thread(
            StudioNotificationLog(settings.output_dir).publish,
            "success" if report.override_reason is None else "warning",
            "Gate narrative validée",
            f"{report.subject_id} a été validé humainement.",
            source="coherence",
            context={"report_id": report.id, "override": bool(report.override_reason)},
        )
        return report

    @router.get("/{scope}/{subject_id}/latest", response_model=CoherenceReport | None)
    async def latest(
        scope: CoherenceScope,
        subject_id: str,
    ) -> CoherenceReport | None:
        if not _valid_subject(scope, subject_id):
            raise HTTPException(status_code=404, detail="Contexte narratif introuvable")
        settings = settings_provider()
        report = await asyncio.to_thread(
            CoherenceReportStore(settings.output_dir).latest,
            scope,
            subject_id,
        )
        return report

    return router


def _subject(
    catalog: EpisodeCatalog,
    payload: CoherenceReviewRequest,
) -> tuple[EpisodePackage | None, Shot | None]:
    if payload.scope == "series":
        return None, None
    episode_id = payload.subject_id if payload.scope == "episode" else payload.subject_id[:-4]
    package = catalog.load(episode_id)
    if payload.scope == "episode":
        return package, None
    shot = Shot.model_validate(payload.shot) if payload.shot is not None else next(
        (item for item in package.shots if item.id == payload.subject_id),
        None,
    )
    if shot is None:
        raise FileNotFoundError(payload.subject_id)
    if shot.id != payload.subject_id:
        raise ValueError("Le plan fourni ne correspond pas au nœud sélectionné")
    return package, shot


def _committee_context(
    payload: CoherenceReviewRequest,
    *,
    bible: ProjectBible,
    package: EpisodePackage | None,
    shot: Shot | None,
) -> dict[str, Any]:
    bible_payload = bible.model_dump(mode="json")
    bible_payload.pop("changes", None)
    context: dict[str, Any] = {
        "scope": payload.scope,
        "subject_id": payload.subject_id,
        "focus": payload.focus,
        "bible": bible_payload,
    }
    if package is not None:
        context["episode"] = package.episode.model_dump(mode="json")
        context["shots"] = [item.model_dump(mode="json") for item in package.shots]
    if shot is not None:
        context["shot"] = shot.model_dump(mode="json")
    if payload.source_text:
        context["current_source_text"] = payload.source_text
    return context


def _build_report(
    payload: CoherenceReviewRequest,
    *,
    bible: ProjectBible,
    package: EpisodePackage | None,
    shot: Shot | None,
    deterministic: list[CoherenceFinding],
    ai_findings: list[CoherenceFinding],
    reviewers: list[AIReviewerResult],
    ai_status: AIStatus,
    model: str | None,
) -> CoherenceReport:
    findings = [*deterministic, *ai_findings]
    blockers = sum(item.severity == FindingSeverity.BLOCKER for item in findings)
    warnings = sum(item.severity == FindingSeverity.WARNING for item in findings)
    if blockers:
        status = "fail"
        summary = f"{blockers} incohérence(s) bloquante(s) · {warnings} avertissement(s)."
    elif warnings:
        status = "incomplete" if ai_status in {"unavailable", "failed"} else "warning"
        summary = f"Aucun blocage · {warnings} point(s) à vérifier humainement."
    else:
        status = "pass"
        summary = "Le dossier est cohérent selon les règles et validateurs disponibles."
    fingerprint_payload = {
        "scope": payload.scope,
        "subject_id": payload.subject_id,
        "focus": payload.focus,
        "source_text": payload.source_text,
        "bible_revision": bible.revision,
        "episode": package.episode.model_dump(mode="json") if package else None,
        "shots": (
            [item.model_dump(mode="json") for item in package.shots]
            if package
            else None
        ),
        "shot": shot.model_dump(mode="json") if shot else None,
    }
    fingerprint = hashlib.sha256(
        json.dumps(
            fingerprint_payload,
            ensure_ascii=False,
            sort_keys=True,
            separators=(",", ":"),
        ).encode("utf-8")
    ).hexdigest()
    return CoherenceReport(
        id=uuid.uuid4().hex,
        scope=payload.scope,
        subject_id=payload.subject_id,
        focus=payload.focus,
        bible_revision=bible.revision,
        content_fingerprint=fingerprint,
        status=status,
        can_approve=blockers == 0,
        ai_status=ai_status,
        model=model,
        summary=summary,
        findings=findings,
        reviewers=reviewers,
    )


def _valid_subject(scope: CoherenceScope, subject_id: str) -> bool:
    return bool(
        (scope == "series" and subject_id == "series")
        or (scope == "episode" and EPISODE_ID.fullmatch(subject_id))
        or (scope == "shot" and SHOT_ID.fullmatch(subject_id))
    )
