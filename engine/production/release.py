from __future__ import annotations

import hashlib
import json
import shutil
import string
import subprocess
import tempfile
import uuid
from collections.abc import Callable
from datetime import UTC, datetime
from pathlib import Path
from typing import Literal

from PIL import Image, ImageOps
from pydantic import BaseModel, ConfigDict, Field, model_validator

from engine.media.ffmpeg import FFmpegToolchain
from engine.narrative.episode_models import Episode
from engine.production.artifacts import sha256_file, write_text_atomic
from engine.world.catalog import EpisodeCatalog

RELEASE_FILENAMES = frozenset(
    {"reel.mp4", "cover.png", "subtitles.srt", "caption.txt", "release.json"}
)
DEFAULT_CAPTION_TEMPLATE = "{title}\n\n{logline}\n\n#Tentafruit #LaSerre"
SUPPORTED_CAPTION_FIELDS = frozenset({"episode_id", "title", "logline", "duration"})


class ReleaseModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class SafeArea(ReleaseModel):
    unit: Literal["px"] = "px"
    top: int = Field(default=240, ge=0)
    right: int = Field(default=180, ge=0)
    bottom: int = Field(default=420, ge=0)
    left: int = Field(default=90, ge=0)


class RenderProfile(ReleaseModel):
    id: Literal["tentafruit-reel-v1"] = "tentafruit-reel-v1"
    name: str = "Tentafruit Reel"
    width: Literal[1080] = 1080
    height: Literal[1920] = 1920
    fps: Literal[24] = 24
    aspect_ratio: Literal["9:16"] = "9:16"
    container: Literal["mp4"] = "mp4"
    video_codec: Literal["h264"] = "h264"
    min_duration: float = 30.0
    max_duration: float = 60.0
    safe_area: SafeArea = Field(default_factory=SafeArea)

    @model_validator(mode="after")
    def safe_area_fits_canvas(self) -> RenderProfile:
        if self.safe_area.left + self.safe_area.right >= self.width:
            raise ValueError("Horizontal safe area must leave a visible canvas")
        if self.safe_area.top + self.safe_area.bottom >= self.height:
            raise ValueError("Vertical safe area must leave a visible canvas")
        return self


class ReleaseSource(ReleaseModel):
    revision: str = Field(pattern=r"^[0-9a-f]{64}$")
    master_sha256: str = Field(pattern=r"^[0-9a-f]{64}$")
    manifest_sha256: str = Field(pattern=r"^[0-9a-f]{64}$")
    episode_sha256: str = Field(pattern=r"^[0-9a-f]{64}$")
    subtitles_sha256: str = Field(pattern=r"^[0-9a-f]{64}$")
    duration: float = Field(gt=0)
    width: int = Field(gt=0)
    height: int = Field(gt=0)
    fps: float = Field(gt=0)
    format: str
    video_codec: str
    audio_codec: str
    verified_at: datetime


class ReleaseReel(ReleaseModel):
    source_revision: str = Field(pattern=r"^[0-9a-f]{64}$")
    path: str
    url: str
    sha256: str = Field(pattern=r"^[0-9a-f]{64}$")
    duration: float = Field(gt=0)
    width: int = Field(gt=0)
    height: int = Field(gt=0)
    fps: float = Field(gt=0)
    video_codec: str
    audio_codec: str
    renderer: Literal["ffmpeg"] = "ffmpeg"
    rendered_at: datetime


class ReleaseCover(ReleaseModel):
    shot_id: str = Field(pattern=r"^S\d{2}E\d{3}-S\d{2}$")
    source_sha256: str = Field(pattern=r"^[0-9a-f]{64}$")
    source_path: str
    path: str
    url: str


class ReleaseExportFile(ReleaseModel):
    filename: str
    sha256: str = Field(pattern=r"^[0-9a-f]{64}$")
    bytes: int = Field(ge=0)
    url: str


class ReleaseExport(ReleaseModel):
    id: str
    created_at: datetime
    path: str
    files: list[ReleaseExportFile]


class ReleaseTransition(ReleaseModel):
    revision: int = Field(ge=1)
    action: Literal["created", "refreshed", "edited", "approved", "exported", "stale"]
    from_state: Literal["draft", "approved", "exported", "stale"] | None = None
    to_state: Literal["draft", "approved", "exported", "stale"]
    at: datetime


class ReleaseCandidate(ReleaseModel):
    schema_version: Literal[1] = 1
    id: str
    episode_id: str = Field(pattern=r"^S\d{2}E\d{3}$")
    revision: int = Field(ge=1)
    state: Literal["draft", "approved", "exported", "stale"]
    render_profile: RenderProfile
    source: ReleaseSource
    reel: ReleaseReel
    cover: ReleaseCover
    caption_template: str = Field(min_length=1, max_length=5000)
    caption: str = Field(min_length=1, max_length=5000)
    master_url: str
    source_master_url: str
    subtitles_url: str
    stale_reasons: list[str] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime
    approved_at: datetime | None = None
    exported_at: datetime | None = None
    export: ReleaseExport | None = None
    exports: list[ReleaseExport] = Field(default_factory=list)
    transitions: list[ReleaseTransition] = Field(default_factory=list)


class ReleaseCandidateCreate(ReleaseModel):
    cover_shot_id: str | None = Field(default=None, pattern=r"^S\d{2}E\d{3}-S\d{2}$")
    caption_template: str | None = Field(default=None, min_length=1, max_length=5000)


class ReleaseCandidateEdit(ReleaseModel):
    expected_revision: int = Field(ge=1)
    cover_shot_id: str | None = Field(default=None, pattern=r"^S\d{2}E\d{3}-S\d{2}$")
    caption_template: str | None = Field(default=None, min_length=1, max_length=5000)


class ReleaseCandidateCommand(ReleaseModel):
    expected_revision: int = Field(ge=1)


class ReleaseRevisionConflictError(ValueError):
    """The candidate changed after a client loaded it."""


Probe = Callable[[Path], dict[str, object]]
Renderer = Callable[[Path, Path, RenderProfile], None]


class ReleaseCandidateService:
    """Build and export a human-approved, reproducible social release pack."""

    def __init__(
        self,
        catalog: EpisodeCatalog | Callable[[], EpisodeCatalog],
        output_root: Path | Callable[[], Path],
        *,
        probe: Probe | None = None,
        renderer: Renderer | None = None,
        profile: RenderProfile | None = None,
    ) -> None:
        self._catalog_provider: Callable[[], EpisodeCatalog]
        if isinstance(catalog, EpisodeCatalog):
            self._catalog_provider = lambda: catalog
        else:
            self._catalog_provider = catalog
        self._output_provider: Callable[[], Path]
        if isinstance(output_root, Path):
            self._output_provider = lambda: output_root
        else:
            self._output_provider = output_root
        self.probe = probe or self._ffprobe
        self.renderer = renderer or self._render_with_ffmpeg
        self.profile = profile or RenderProfile()

    @property
    def catalog(self) -> EpisodeCatalog:
        return self._catalog_provider()

    @property
    def output_root(self) -> Path:
        return self._output_provider().resolve()

    def get(self, episode_id: str) -> ReleaseCandidate:
        candidate = self._load(episode_id)
        reasons = self._stale_reasons(candidate)
        if reasons and (candidate.state != "stale" or candidate.stale_reasons != reasons):
            candidate = self._transition(candidate, "stale", "stale", stale_reasons=reasons)
            self._save(candidate)
        return candidate

    def create_or_refresh(
        self,
        episode_id: str,
        request: ReleaseCandidateCreate,
    ) -> ReleaseCandidate:
        package = self.catalog.load(episode_id)
        existing = self._load_optional(episode_id)
        caption_template = (
            request.caption_template
            or (existing.caption_template if existing else DEFAULT_CAPTION_TEMPLATE)
        )
        self._validate_caption_template(caption_template)
        shot_id = request.cover_shot_id or (existing.cover.shot_id if existing else None)
        if shot_id is None:
            shot_id = self._first_cover_shot(package.episode.shot_order)
        if shot_id not in package.episode.shot_order:
            raise ValueError(f"Cover shot {shot_id} does not belong to {episode_id}")

        source, subtitles = self._validated_source(episode_id)
        reel = self._prepare_reel(episode_id, source.revision)
        cover = self._prepare_cover(episode_id, shot_id)
        self._prepare_subtitles(episode_id, subtitles)
        caption = self._render_caption(caption_template, package.episode)
        now = datetime.now(UTC)
        if existing is None:
            candidate = ReleaseCandidate(
                id=f"release_{uuid.uuid4().hex}",
                episode_id=episode_id,
                revision=1,
                state="draft",
                render_profile=self.profile,
                source=source,
                reel=reel,
                cover=cover,
                caption_template=caption_template,
                caption=caption,
                master_url=self._candidate_media_url(episode_id, "reel.mp4"),
                source_master_url=f"/api/episode-media/{episode_id}/episode.mp4",
                subtitles_url=self._candidate_media_url(episode_id, "subtitles.srt"),
                stale_reasons=[],
                created_at=now,
                updated_at=now,
                transitions=[
                    ReleaseTransition(
                        revision=1,
                        action="created",
                        to_state="draft",
                        at=now,
                    )
                ],
            )
        else:
            candidate = self._transition(
                existing,
                "draft",
                "refreshed",
                source=source,
                reel=reel,
                cover=cover,
                caption_template=caption_template,
                caption=caption,
                stale_reasons=[],
                approved_at=None,
                exported_at=None,
                export=None,
            )
        self._save(candidate)
        return candidate

    def edit(self, episode_id: str, request: ReleaseCandidateEdit) -> ReleaseCandidate:
        candidate = self.get(episode_id)
        self._expect_revision(candidate, request.expected_revision)
        package = self.catalog.load(episode_id)
        template = request.caption_template or candidate.caption_template
        self._validate_caption_template(template)
        cover = candidate.cover
        if request.cover_shot_id is not None:
            if request.cover_shot_id not in package.episode.shot_order:
                raise ValueError(
                    f"Cover shot {request.cover_shot_id} does not belong to {episode_id}"
                )
            cover = self._prepare_cover(episode_id, request.cover_shot_id)
        next_state: Literal["draft", "stale"] = (
            "stale" if candidate.state == "stale" else "draft"
        )
        updated = self._transition(
            candidate,
            next_state,
            "edited",
            cover=cover,
            caption_template=template,
            caption=self._render_caption(template, package.episode),
            stale_reasons=candidate.stale_reasons if next_state == "stale" else [],
            approved_at=None,
            exported_at=None,
            export=None,
        )
        self._save(updated)
        return updated

    def approve(
        self,
        episode_id: str,
        request: ReleaseCandidateCommand,
    ) -> ReleaseCandidate:
        candidate = self.get(episode_id)
        self._expect_revision(candidate, request.expected_revision)
        if candidate.state == "stale":
            raise PermissionError("Refresh stale release sources before approval")
        if candidate.state != "draft":
            raise PermissionError("Only a draft release candidate can be approved")
        approved = self._transition(
            candidate,
            "approved",
            "approved",
            approved_at=datetime.now(UTC),
        )
        self._save(approved)
        return approved

    def export(
        self,
        episode_id: str,
        request: ReleaseCandidateCommand,
    ) -> ReleaseCandidate:
        candidate = self.get(episode_id)
        self._expect_revision(candidate, request.expected_revision)
        if candidate.state != "approved":
            raise PermissionError("Human approval is required before export")
        export_id = f"release-{datetime.now(UTC).strftime('%Y%m%dT%H%M%SZ')}-{uuid.uuid4().hex[:8]}"
        exports_root = self._release_root(episode_id) / "exports"
        exports_root.mkdir(parents=True, exist_ok=True)
        destination = exports_root / export_id
        now = datetime.now(UTC)
        next_revision = candidate.revision + 1
        with tempfile.TemporaryDirectory(prefix=".release-export-", dir=exports_root) as raw:
            workspace = Path(raw)
            self._copy(self._reel_path(episode_id), workspace / "reel.mp4")
            self._copy(self._cover_path(episode_id), workspace / "cover.png")
            self._copy(self._subtitles_path(episode_id), workspace / "subtitles.srt")
            write_text_atomic(workspace / "caption.txt", candidate.caption.rstrip() + "\n")
            files = self._export_files(episode_id, export_id, workspace, include_release=False)
            exported = ReleaseExport(
                id=export_id,
                created_at=now,
                path=str(destination),
                files=files,
            )
            release_record = candidate.model_copy(
                update={
                    "revision": next_revision,
                    "state": "exported",
                    "updated_at": now,
                    "exported_at": now,
                    "export": exported,
                    "exports": [*candidate.exports, exported],
                    "transitions": [
                        *candidate.transitions,
                        ReleaseTransition(
                            revision=next_revision,
                            action="exported",
                            from_state=candidate.state,
                            to_state="exported",
                            at=now,
                        ),
                    ],
                }
            )
            write_text_atomic(
                workspace / "release.json",
                release_record.model_dump_json(indent=2) + "\n",
            )
            exported = exported.model_copy(
                update={
                    "files": self._export_files(
                        episode_id, export_id, workspace, include_release=True
                    )
                }
            )
            final = release_record.model_copy(
                update={
                    "export": exported,
                    "exports": [*candidate.exports, exported],
                }
            )
            workspace.replace(destination)
        self._save(final)
        return final

    def candidate_media(self, episode_id: str, filename: str) -> Path:
        if filename not in {"reel.mp4", "cover.png", "subtitles.srt"}:
            raise FileNotFoundError(filename)
        self.get(episode_id)
        path = self._release_root(episode_id) / filename
        if not path.is_file():
            raise FileNotFoundError(path)
        return path

    def export_file(self, episode_id: str, export_id: str, filename: str) -> Path:
        if filename not in RELEASE_FILENAMES or Path(export_id).name != export_id:
            raise FileNotFoundError(filename)
        candidate = self.get(episode_id)
        known_ids = {item.id for item in candidate.exports}
        if export_id not in known_ids:
            # Older immutable packs remain downloadable after a refresh.
            release_record = self._release_root(episode_id) / "exports" / export_id / "release.json"
            if not release_record.is_file():
                raise FileNotFoundError(export_id)
        path = self._release_root(episode_id) / "exports" / export_id / filename
        if not path.is_file():
            raise FileNotFoundError(path)
        return path

    def _validated_source(self, episode_id: str) -> tuple[ReleaseSource, Path | None]:
        episode_path = self.catalog.episode_dir(episode_id) / "episode.json"
        master = self._master_path(episode_id)
        manifest_path = self.output_root / episode_id / "episode-generation.json"
        if not master.is_file() or not manifest_path.is_file():
            raise FileNotFoundError("A FINAL episode master and manifest are required")
        if master.stat().st_size <= 0:
            raise ValueError("Episode master is empty")
        if manifest_path.stat().st_size <= 0:
            raise ValueError("Episode master manifest is empty")
        manifest_raw = json.loads(manifest_path.read_text(encoding="utf-8"))
        if not isinstance(manifest_raw, dict) or manifest_raw.get("status") != "FINAL":
            raise ValueError("Only a FINAL episode master can become a release candidate")
        quality = manifest_raw.get("quality")
        if isinstance(quality, dict) and quality.get("release_eligible") is False:
            raise ValueError("Episode master manifest marks the artifact as release-ineligible")
        outputs = manifest_raw.get("outputs")
        if isinstance(outputs, list):
            master_output = next(
                (
                    item
                    for item in outputs
                    if isinstance(item, dict)
                    and Path(str(item.get("path", ""))).name == "episode.mp4"
                ),
                None,
            )
            if isinstance(master_output, dict):
                expected_sha = master_output.get("sha256")
                if isinstance(expected_sha, str) and sha256_file(master) != expected_sha:
                    raise ValueError("Episode master no longer matches its FINAL manifest")
        probe = self.probe(master)
        duration, width, height, fps, video_codec, audio_codec, format_name = (
            self._technical_values(probe)
        )
        supported_resolutions = {(576, 1024), (self.profile.width, self.profile.height)}
        if (width, height) not in supported_resolutions:
            raise ValueError(
                "Master must use a supported 9:16 resolution "
                f"(576x1024 or {self.profile.width}x{self.profile.height}); "
                f"got {width}x{height}"
            )
        if video_codec != self.profile.video_codec:
            raise ValueError(f"Master video codec must be {self.profile.video_codec}")
        if "mp4" not in format_name and "mov" not in format_name:
            raise ValueError("Master container must be MP4")
        if not audio_codec:
            raise ValueError("Master must contain an audio stream")
        if not self.profile.min_duration <= duration <= self.profile.max_duration:
            raise ValueError(
                "Master duration must be "
                f"{self.profile.min_duration:g}-{self.profile.max_duration:g}s"
            )
        episode = self.catalog.get(episode_id)
        if abs(duration - episode.duration_target) > 0.75:
            raise ValueError(
                f"Master duration {duration:.2f}s differs from episode target "
                f"{episode.duration_target:.2f}s"
            )
        if abs(fps - self.profile.fps) > 0.05:
            raise ValueError(f"Master frame rate must be {self.profile.fps} fps")

        subtitles = self._source_subtitles(episode_id)
        if subtitles is not None and subtitles.stat().st_size <= 0:
            raise ValueError("Episode subtitles are empty")
        subtitles_payload = (
            subtitles.read_bytes() if subtitles else self._generated_subtitles(episode_id).encode()
        )
        parts = {
            "master_sha256": sha256_file(master),
            "manifest_sha256": sha256_file(manifest_path),
            "episode_sha256": sha256_file(episode_path),
            "subtitles_sha256": hashlib.sha256(subtitles_payload).hexdigest(),
        }
        revision = hashlib.sha256(
            json.dumps(parts, sort_keys=True, separators=(",", ":")).encode()
        ).hexdigest()
        return (
            ReleaseSource(
                revision=revision,
                **parts,
                duration=duration,
                width=width,
                height=height,
                fps=fps,
                format=format_name,
                video_codec=video_codec,
                audio_codec=audio_codec,
                verified_at=datetime.now(UTC),
            ),
            subtitles,
        )

    @staticmethod
    def _technical_values(
        probe: dict[str, object],
    ) -> tuple[float, int, int, float, str, str, str]:
        format_data = probe.get("format")
        streams = probe.get("streams")
        if not isinstance(format_data, dict) or not isinstance(streams, list):
            raise ValueError("ffprobe did not return format and stream metadata")
        video = next(
            (
                item
                for item in streams
                if isinstance(item, dict) and item.get("codec_type") == "video"
            ),
            None,
        )
        audio = next(
            (
                item
                for item in streams
                if isinstance(item, dict) and item.get("codec_type") == "audio"
            ),
            None,
        )
        if not isinstance(video, dict):
            raise ValueError("Master must contain a video stream")
        raw_rate = str(video.get("avg_frame_rate") or video.get("r_frame_rate") or "0/1")
        try:
            numerator, denominator = raw_rate.split("/", 1)
            fps = float(numerator) / float(denominator)
        except (ValueError, ZeroDivisionError) as exc:
            raise ValueError("Master frame rate is invalid") from exc
        try:
            duration = float(format_data["duration"])
            width = int(video["width"])
            height = int(video["height"])
        except (KeyError, TypeError, ValueError) as exc:
            raise ValueError("Master duration or dimensions are missing") from exc
        return (
            duration,
            width,
            height,
            fps,
            str(video.get("codec_name") or ""),
            str(audio.get("codec_name") or "") if isinstance(audio, dict) else "",
            str(format_data.get("format_name") or ""),
        )

    def _stale_reasons(self, candidate: ReleaseCandidate) -> list[str]:
        reasons: list[str] = []
        paths = {
            "master_changed": (
                self._master_path(candidate.episode_id),
                candidate.source.master_sha256,
            ),
            "manifest_changed": (
                self.output_root / candidate.episode_id / "episode-generation.json",
                candidate.source.manifest_sha256,
            ),
            "episode_changed": (
                self.catalog.episode_dir(candidate.episode_id) / "episode.json",
                candidate.source.episode_sha256,
            ),
            "cover_source_changed": (
                Path(candidate.cover.source_path),
                candidate.cover.source_sha256,
            ),
            "release_reel_changed": (
                Path(candidate.reel.path),
                candidate.reel.sha256,
            ),
        }
        for reason, (path, expected) in paths.items():
            if not path.is_file() or sha256_file(path) != expected:
                reasons.append(reason)
        source_subtitles = self._source_subtitles(candidate.episode_id)
        current_subtitles = (
            source_subtitles.read_bytes()
            if source_subtitles
            else self._generated_subtitles(candidate.episode_id).encode()
        )
        if hashlib.sha256(current_subtitles).hexdigest() != candidate.source.subtitles_sha256:
            reasons.append("subtitles_changed")
        return reasons

    def _prepare_reel(self, episode_id: str, source_revision: str) -> ReleaseReel:
        destination = self._reel_path(episode_id)
        destination.parent.mkdir(parents=True, exist_ok=True)
        with tempfile.TemporaryDirectory(prefix=".release-reel-", dir=destination.parent) as raw:
            rendered = Path(raw) / "reel.mp4"
            self.renderer(self._master_path(episode_id), rendered, self.profile)
            if not rendered.is_file() or rendered.stat().st_size <= 0:
                raise RuntimeError("Release renderer did not produce a reel")
            probe = self.probe(rendered)
            duration, width, height, fps, video_codec, audio_codec, format_name = (
                self._technical_values(probe)
            )
            if width != self.profile.width or height != self.profile.height:
                raise RuntimeError(
                    "Rendered reel does not match the release profile: "
                    f"{width}x{height}"
                )
            if video_codec != self.profile.video_codec:
                raise RuntimeError(
                    f"Rendered reel codec is {video_codec or 'missing'}, expected h264"
                )
            if not audio_codec:
                raise RuntimeError("Rendered reel does not contain audio")
            if "mp4" not in format_name and "mov" not in format_name:
                raise RuntimeError("Rendered reel container is not MP4")
            if abs(fps - self.profile.fps) > 0.05:
                raise RuntimeError(
                    f"Rendered reel frame rate is {fps:g}, expected {self.profile.fps}"
                )
            if not self.profile.min_duration <= duration <= self.profile.max_duration:
                raise RuntimeError("Rendered reel duration is outside the release profile")
            target = self.catalog.get(episode_id).duration_target
            if abs(duration - target) > 0.75:
                raise RuntimeError(
                    f"Rendered reel duration {duration:.2f}s differs from target {target:.2f}s"
                )
            rendered.replace(destination)
        return ReleaseReel(
            source_revision=source_revision,
            path=str(destination),
            url=self._candidate_media_url(episode_id, "reel.mp4"),
            sha256=sha256_file(destination),
            duration=duration,
            width=width,
            height=height,
            fps=fps,
            video_codec=video_codec,
            audio_codec=audio_codec,
            rendered_at=datetime.now(UTC),
        )

    def _prepare_cover(self, episode_id: str, shot_id: str) -> ReleaseCover:
        source = self._keyframe_source(shot_id)
        if source is None:
            raise FileNotFoundError(f"Keyframe is missing for {shot_id}")
        destination = self._cover_path(episode_id)
        destination.parent.mkdir(parents=True, exist_ok=True)
        with Image.open(source) as image:
            fitted = ImageOps.fit(
                image.convert("RGB"),
                (self.profile.width, self.profile.height),
                method=Image.Resampling.LANCZOS,
                centering=(0.5, 0.5),
            )
            temporary = destination.with_suffix(".tmp.png")
            fitted.save(temporary, format="PNG", optimize=True)
            temporary.replace(destination)
        return ReleaseCover(
            shot_id=shot_id,
            source_sha256=sha256_file(source),
            source_path=str(source.resolve()),
            path=str(destination),
            url=self._candidate_media_url(episode_id, "cover.png"),
        )

    def _prepare_subtitles(self, episode_id: str, source: Path | None) -> None:
        destination = self._subtitles_path(episode_id)
        destination.parent.mkdir(parents=True, exist_ok=True)
        if source is not None:
            self._copy(source, destination)
        else:
            write_text_atomic(destination, self._generated_subtitles(episode_id))

    def _generated_subtitles(self, episode_id: str) -> str:
        package = self.catalog.load(episode_id)
        cues: list[str] = []
        elapsed = 0.0
        index = 1
        for shot in package.shots:
            dialogues = shot.dialogues
            if dialogues:
                slice_duration = shot.duration / len(dialogues)
                for offset, dialogue in enumerate(dialogues):
                    start = elapsed + offset * slice_duration
                    end = elapsed + (offset + 1) * slice_duration
                    cues.append(
                        f"{index}\n{self._srt_time(start)} --> {self._srt_time(end)}\n"
                        f"{' '.join(dialogue.text.split())}\n"
                    )
                    index += 1
            elapsed += shot.duration
        if not cues:
            cues.append(
                f"1\n{self._srt_time(0)} --> {self._srt_time(package.episode.duration_target)}\n"
                f"{package.episode.title}\n"
            )
        return "\n".join(cues)

    @staticmethod
    def _srt_time(seconds: float) -> str:
        milliseconds = max(0, round(seconds * 1000))
        hours, remainder = divmod(milliseconds, 3_600_000)
        minutes, remainder = divmod(remainder, 60_000)
        secs, millis = divmod(remainder, 1000)
        return f"{hours:02d}:{minutes:02d}:{secs:02d},{millis:03d}"

    @staticmethod
    def _validate_caption_template(template: str) -> None:
        try:
            fields = {
                name
                for _, name, _, _ in string.Formatter().parse(template)
                if name is not None
            }
        except ValueError as exc:
            raise ValueError("Caption template contains invalid braces") from exc
        unknown = fields - SUPPORTED_CAPTION_FIELDS
        if unknown:
            raise ValueError(f"Unsupported caption fields: {', '.join(sorted(unknown))}")

    @staticmethod
    def _render_caption(template: str, episode: Episode) -> str:
        values = {
            "episode_id": episode.id,
            "title": episode.title,
            "logline": episode.logline,
            "duration": f"{episode.duration_target:g}",
        }
        caption = template.format_map(values).strip()
        if not caption:
            raise ValueError("Rendered caption cannot be empty")
        return caption

    def _transition(
        self,
        candidate: ReleaseCandidate,
        state: Literal["draft", "approved", "exported", "stale"],
        action: Literal["refreshed", "edited", "approved", "exported", "stale"],
        **updates: object,
    ) -> ReleaseCandidate:
        now = datetime.now(UTC)
        revision = candidate.revision + 1
        return candidate.model_copy(
            update={
                **updates,
                "revision": revision,
                "state": state,
                "updated_at": now,
                "transitions": [
                    *candidate.transitions,
                    ReleaseTransition(
                        revision=revision,
                        action=action,
                        from_state=candidate.state,
                        to_state=state,
                        at=now,
                    ),
                ],
            }
        )

    @staticmethod
    def _expect_revision(candidate: ReleaseCandidate, expected: int) -> None:
        if candidate.revision != expected:
            raise ReleaseRevisionConflictError(
                f"Release candidate revision is {candidate.revision}, expected {expected}"
            )

    def _first_cover_shot(self, shot_ids: list[str]) -> str:
        for shot_id in shot_ids:
            if self._keyframe_source(shot_id) is not None:
                return shot_id
        raise FileNotFoundError("No episode keyframe is available for the release cover")

    def _keyframe_source(self, shot_id: str) -> Path | None:
        generated = self.output_root / shot_id / "keyframe.png"
        if generated.is_file() and generated.stat().st_size > 0:
            return generated
        imports = self.output_root / shot_id / "imports"
        manifest = imports / "assets.json"
        try:
            raw = json.loads(manifest.read_text(encoding="utf-8"))
        except (OSError, ValueError):
            return None
        record = raw.get("keyframe") if isinstance(raw, dict) else None
        filename = record.get("filename") if isinstance(record, dict) else None
        if not isinstance(filename, str) or Path(filename).name != filename:
            return None
        imported = imports / filename
        return imported if imported.is_file() and imported.stat().st_size > 0 else None

    def _source_subtitles(self, episode_id: str) -> Path | None:
        generated = self.output_root / episode_id / "subtitles.fr.srt"
        if generated.is_file():
            return generated
        authored = self.catalog.episode_dir(episode_id) / "subtitles.fr.srt"
        return authored if authored.is_file() else None

    def _load(self, episode_id: str) -> ReleaseCandidate:
        path = self._candidate_path(episode_id)
        if not path.is_file():
            raise FileNotFoundError(path)
        return ReleaseCandidate.model_validate_json(path.read_text(encoding="utf-8"))

    def _load_optional(self, episode_id: str) -> ReleaseCandidate | None:
        try:
            return self._load(episode_id)
        except FileNotFoundError:
            return None

    def _save(self, candidate: ReleaseCandidate) -> None:
        write_text_atomic(
            self._candidate_path(candidate.episode_id),
            candidate.model_dump_json(indent=2) + "\n",
        )

    def _export_files(
        self,
        episode_id: str,
        export_id: str,
        root: Path,
        *,
        include_release: bool,
    ) -> list[ReleaseExportFile]:
        names = ["reel.mp4", "cover.png", "subtitles.srt", "caption.txt"]
        if include_release:
            names.append("release.json")
        return [
            ReleaseExportFile(
                filename=name,
                sha256=sha256_file(root / name),
                bytes=(root / name).stat().st_size,
                url=self._export_url(episode_id, export_id, name),
            )
            for name in names
        ]

    @staticmethod
    def _copy(source: Path, destination: Path) -> None:
        destination.parent.mkdir(parents=True, exist_ok=True)
        temporary = destination.with_suffix(destination.suffix + ".tmp")
        shutil.copyfile(source, temporary)
        temporary.replace(destination)

    @staticmethod
    def _ffprobe(path: Path) -> dict[str, object]:
        return FFmpegToolchain().probe(path)

    @staticmethod
    def _render_with_ffmpeg(
        source: Path,
        destination: Path,
        profile: RenderProfile,
    ) -> None:
        toolchain = FFmpegToolchain()
        destination.parent.mkdir(parents=True, exist_ok=True)
        completed = subprocess.run(  # noqa: S603
            [
                toolchain.ffmpeg,
                "-nostdin",
                "-hide_banner",
                "-loglevel",
                "error",
                "-y",
                "-i",
                str(source),
                "-map",
                "0:v:0",
                "-map",
                "0:a:0",
                "-vf",
                (
                    f"scale={profile.width}:{profile.height}:flags=lanczos,"
                    "setsar=1"
                ),
                "-r",
                str(profile.fps),
                "-c:v",
                "libx264",
                "-preset",
                "veryfast",
                "-crf",
                "18",
                "-pix_fmt",
                "yuv420p",
                "-c:a",
                "aac",
                "-b:a",
                "192k",
                "-ar",
                "48000",
                "-movflags",
                "+faststart",
                "-map_metadata",
                "-1",
                "-metadata",
                "creation_time=1970-01-01T00:00:00Z",
                str(destination),
            ],
            capture_output=True,
            text=True,
            check=False,
        )
        if completed.returncode != 0:
            detail = completed.stderr.strip() or "unknown FFmpeg error"
            raise RuntimeError(f"Unable to render release reel: {detail}")

    def _release_root(self, episode_id: str) -> Path:
        self.catalog.get(episode_id)
        return self.output_root / episode_id / "release"

    def _candidate_path(self, episode_id: str) -> Path:
        return self._release_root(episode_id) / "release-candidate.json"

    def _cover_path(self, episode_id: str) -> Path:
        return self._release_root(episode_id) / "cover.png"

    def _subtitles_path(self, episode_id: str) -> Path:
        return self._release_root(episode_id) / "subtitles.srt"

    def _reel_path(self, episode_id: str) -> Path:
        return self._release_root(episode_id) / "reel.mp4"

    def _master_path(self, episode_id: str) -> Path:
        return self.output_root / episode_id / "episode.mp4"

    @staticmethod
    def _candidate_media_url(episode_id: str, filename: str) -> str:
        return f"/api/episodes/{episode_id}/release-candidate/media/{filename}"

    @staticmethod
    def _export_url(episode_id: str, export_id: str, filename: str) -> str:
        return (
            f"/api/episodes/{episode_id}/release-candidate/exports/"
            f"{export_id}/{filename}"
        )
