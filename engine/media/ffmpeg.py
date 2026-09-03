from __future__ import annotations

import json
import shutil
import subprocess
from dataclasses import dataclass
from pathlib import Path
from typing import Literal, Protocol


@dataclass(frozen=True, slots=True)
class SegmentInput:
    shot_id: str
    visual: Path
    visual_kind: Literal["video", "image"]
    duration: float
    audio: Path | None = None
    audio_offset: float = 0.35
    audio_gain_db: float = 0
    overlay: Path | None = None
    caption: str | None = None
    caption_position: str = "center"


@dataclass(frozen=True, slots=True)
class AssemblyRequest:
    segments: list[SegmentInput]
    output: Path
    width: int
    height: int
    fps: int
    subtitles: Path | None = None
    music: Path | None = None
    ambience: Path | None = None
    music_gain_db: float = -22
    ambience_gain_db: float = -28
    caption_font: Path | None = None
    burn_subtitles: bool = True

    @property
    def duration(self) -> float:
        return sum(segment.duration for segment in self.segments)


class MediaToolchain(Protocol):
    name: str

    def duration(self, path: Path) -> float: ...

    def assemble(self, request: AssemblyRequest) -> None: ...

    def verify(
        self,
        path: Path,
        *,
        duration: float,
        width: int,
        height: int,
    ) -> dict[str, object]: ...

    def version(self) -> str: ...


class FFmpegToolchain:
    name = "ffmpeg"

    def __init__(self, ffmpeg: str | Path | None = None, ffprobe: str | Path | None = None) -> None:
        self.ffmpeg = self._resolve(ffmpeg, "ffmpeg")
        self.ffprobe = self._resolve(ffprobe, "ffprobe")

    @staticmethod
    def _resolve(value: str | Path | None, executable: str) -> str:
        resolved = str(value) if value else shutil.which(executable)
        if not resolved:
            raise RuntimeError(
                f"{executable} est introuvable. Installe FFmpeg ou passe --{executable}."
            )
        return resolved

    def version(self) -> str:
        completed = self._run([self.ffmpeg, "-version"])
        return completed.stdout.splitlines()[0].strip()

    def probe(self, path: Path) -> dict[str, object]:
        completed = self._run(
            [
                self.ffprobe,
                "-v",
                "error",
                "-show_streams",
                "-show_format",
                "-of",
                "json",
                str(path),
            ]
        )
        value = json.loads(completed.stdout)
        if not isinstance(value, dict):
            raise RuntimeError(f"ffprobe a renvoyé une réponse invalide pour {path}")
        return value

    def duration(self, path: Path) -> float:
        payload = self.probe(path)
        raw = payload.get("format")
        if not isinstance(raw, dict) or raw.get("duration") is None:
            raise RuntimeError(f"Durée média introuvable : {path}")
        return float(raw["duration"])

    def assemble(self, request: AssemblyRequest) -> None:
        if not request.segments:
            raise ValueError("Impossible de monter un épisode sans plans")
        request.output.parent.mkdir(parents=True, exist_ok=True)
        self._run(self.build_command(request))
        if not request.output.is_file() or request.output.stat().st_size == 0:
            raise RuntimeError("FFmpeg n'a produit aucun épisode")

    def build_command(self, request: AssemblyRequest) -> list[str]:
        command = [self.ffmpeg, "-hide_banner", "-loglevel", "error", "-y"]
        visual_indices: list[int] = []
        audio_indices: list[int | None] = []
        overlay_indices: list[int | None] = []
        input_index = 0
        for segment in request.segments:
            if segment.visual_kind == "image":
                command.extend(
                    [
                        "-loop",
                        "1",
                        "-framerate",
                        str(request.fps),
                        "-t",
                        self._number(segment.duration),
                    ]
                )
            command.extend(["-i", str(segment.visual)])
            visual_indices.append(input_index)
            input_index += 1
            if segment.audio:
                command.extend(["-i", str(segment.audio)])
                audio_indices.append(input_index)
                input_index += 1
            else:
                audio_indices.append(None)
            if segment.overlay:
                command.extend(
                    [
                        "-loop",
                        "1",
                        "-framerate",
                        str(request.fps),
                        "-t",
                        self._number(segment.duration),
                        "-i",
                        str(segment.overlay),
                    ]
                )
                overlay_indices.append(input_index)
                input_index += 1
            else:
                overlay_indices.append(None)

        music_index = self._looping_input(command, request.music, input_index)
        if music_index is not None:
            input_index += 1
        ambience_index = self._looping_input(command, request.ambience, input_index)
        if ambience_index is not None:
            input_index += 1
        subtitle_index: int | None = None
        if request.subtitles:
            command.extend(["-i", str(request.subtitles)])
            subtitle_index = input_index

        filters: list[str] = []
        concat_inputs: list[str] = []
        for position, segment in enumerate(request.segments):
            duration = self._number(segment.duration)
            visual_index = visual_indices[position]
            base_label = f"vbase{position}"
            filters.append(
                f"[{visual_index}:v:0]"
                f"scale={request.width}:{request.height}:force_original_aspect_ratio=decrease,"
                f"pad={request.width}:{request.height}:(ow-iw)/2:(oh-ih)/2:color=black,"
                f"fps={request.fps},tpad=stop_mode=clone:stop_duration={duration},"
                f"trim=duration={duration},setpts=PTS-STARTPTS,format=rgba[{base_label}]"
            )
            overlay_index = overlay_indices[position]
            current_label = base_label
            if overlay_index is not None:
                filters.append(
                    f"[{overlay_index}:v:0]scale={request.width}:{request.height},format=rgba[ov{position}]"
                )
                filters.append(
                    f"[{base_label}][ov{position}]overlay=0:0:format=auto[vframed{position}]"
                )
                current_label = f"vframed{position}"
            if segment.caption:
                y = {
                    "top": "h*0.18",
                    "center": "(h-text_h)/2",
                    "bottom": "h*0.72",
                }.get(segment.caption_position, "(h-text_h)/2")
                drawtext = self._drawtext_text(segment.caption)
                font = self._drawtext_path(
                    request.caption_font or self._default_caption_font()
                )
                filters.append(
                    f"[{current_label}]drawtext=fontfile='{font}':text='{drawtext}':"
                    "fontcolor=0xE9C2D6:fontsize=34:line_spacing=10:"
                    "box=1:boxcolor=0x08050BCC:boxborderw=18:"
                    f"x=(w-text_w)/2:y={y},format=yuv420p[v{position}]"
                )
            else:
                filters.append(f"[{current_label}]format=yuv420p[v{position}]")
            audio_index = audio_indices[position]
            if audio_index is None:
                filters.append(
                    f"anullsrc=r=48000:cl=stereo:d={duration},asetpts=N/SR/TB[a{position}]"
                )
            else:
                delay = max(0, round(segment.audio_offset * 1000))
                filters.append(
                    f"[{audio_index}:a:0]aresample=48000,"
                    "aformat=sample_fmts=fltp:channel_layouts=stereo,"
                    f"volume={self._number(segment.audio_gain_db)}dB,adelay={delay}|{delay},"
                    f"apad,atrim=duration={duration},asetpts=N/SR/TB[a{position}]"
                )
            concat_inputs.append(f"[v{position}][a{position}]")
        filters.append(
            "".join(concat_inputs)
            + f"concat=n={len(request.segments)}:v=1:a=1[episode_video][dialogue]"
        )
        episode_video_label = "episode_video"
        if request.subtitles and request.burn_subtitles:
            subtitle_path = self._drawtext_path(request.subtitles)
            font_path = request.caption_font or self._default_caption_font()
            fonts_dir = self._drawtext_path(font_path.parent)
            filters.append(
                f"[episode_video]subtitles=filename='{subtitle_path}':fontsdir='{fonts_dir}':"
                "force_style='FontName=Georgia,FontSize=20,PrimaryColour=&H00E9C2D6,"
                "OutlineColour=&H00100816,BorderStyle=1,Outline=2,Shadow=1,"
                "Alignment=2,MarginV=54'[episode_video_burned]"
            )
            episode_video_label = "episode_video_burned"

        mix_inputs: list[str]
        if music_index is not None:
            filters.append("[dialogue]asplit=2[dialogue_mix][dialogue_sidechain]")
            filters.append(
                f"[{music_index}:a:0]aresample=48000,"
                f"volume={self._number(request.music_gain_db)}dB,"
                f"atrim=duration={self._number(request.duration)}[music]"
            )
            filters.append(
                "[music][dialogue_sidechain]sidechaincompress="
                "threshold=0.015:ratio=8:attack=15:release=450[music_ducked]"
            )
            mix_inputs = ["[dialogue_mix]", "[music_ducked]"]
        else:
            mix_inputs = ["[dialogue]"]
        if ambience_index is not None:
            filters.append(
                f"[{ambience_index}:a:0]aresample=48000,"
                f"volume={self._number(request.ambience_gain_db)}dB,"
                f"atrim=duration={self._number(request.duration)}[ambience]"
            )
            mix_inputs.append("[ambience]")
        if len(mix_inputs) == 1:
            filters.append("[dialogue]alimiter=limit=0.95[episode_audio]")
        else:
            filters.append(
                "".join(mix_inputs)
                + f"amix=inputs={len(mix_inputs)}:duration=longest:normalize=0,"
                "alimiter=limit=0.95[episode_audio]"
            )

        command.extend(
            [
                "-filter_complex",
                ";".join(filters),
                "-map",
                f"[{episode_video_label}]",
                "-map",
                "[episode_audio]",
            ]
        )
        if subtitle_index is not None:
            command.extend(["-map", f"{subtitle_index}:s:0"])
        command.extend(
            [
                "-c:v",
                "libx264",
                "-preset",
                "medium",
                "-crf",
                "18",
                "-pix_fmt",
                "yuv420p",
                "-c:a",
                "aac",
                "-b:a",
                "192k",
            ]
        )
        if subtitle_index is not None:
            command.extend(["-c:s", "mov_text", "-metadata:s:s:0", "language=fra"])
        command.extend(
            [
                "-movflags",
                "+faststart",
                "-t",
                self._number(request.duration),
                str(request.output),
            ]
        )
        return command

    def verify(
        self,
        path: Path,
        *,
        duration: float,
        width: int,
        height: int,
    ) -> dict[str, object]:
        payload = self.probe(path)
        streams = payload.get("streams")
        if not isinstance(streams, list):
            raise RuntimeError("ffprobe ne trouve aucun flux dans l'épisode")
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
        if not isinstance(video, dict) or not isinstance(audio, dict):
            raise RuntimeError("L'épisode final doit contenir une piste vidéo et une piste audio")
        if int(video.get("width", 0)) != width or int(video.get("height", 0)) != height:
            raise RuntimeError(
                f"Format final inattendu : {video.get('width')}x{video.get('height')}"
            )
        actual_duration = self.duration(path)
        if abs(actual_duration - duration) > 0.3:
            raise RuntimeError(
                f"Durée finale inattendue : {actual_duration:.3f}s au lieu de {duration:.3f}s"
            )
        return {
            "duration": actual_duration,
            "width": width,
            "height": height,
            "video_codec": video.get("codec_name"),
            "audio_codec": audio.get("codec_name"),
            "has_subtitles": any(
                isinstance(item, dict) and item.get("codec_type") == "subtitle" for item in streams
            ),
        }

    @staticmethod
    def _looping_input(command: list[str], path: Path | None, index: int) -> int | None:
        if path is None:
            return None
        command.extend(["-stream_loop", "-1", "-i", str(path)])
        return index

    @staticmethod
    def _number(value: float) -> str:
        return f"{value:.6f}".rstrip("0").rstrip(".")

    @staticmethod
    def _drawtext_text(value: str) -> str:
        return (
            value.replace("\\", r"\\")
            .replace("'", r"\'")
            .replace(":", r"\:")
            .replace("%", r"\%")
            .replace(",", r"\,")
            .replace("\n", r"\n")
        )

    @staticmethod
    def _drawtext_path(path: Path) -> str:
        return path.as_posix().replace("\\", r"\\").replace(":", r"\:").replace("'", r"\'")

    @staticmethod
    def _default_caption_font() -> Path:
        candidates = (
            Path("C:/Windows/Fonts/georgiab.ttf"),
            Path("C:/Windows/Fonts/georgia.ttf"),
            Path("/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf"),
            Path("/System/Library/Fonts/Supplemental/Georgia.ttf"),
        )
        for candidate in candidates:
            if candidate.is_file():
                return candidate
        raise RuntimeError(
            "Police de carton introuvable. Configure AssemblyRequest.caption_font."
        )

    @staticmethod
    def _run(command: list[str]) -> subprocess.CompletedProcess[str]:
        completed = subprocess.run(
            command,
            check=False,
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
        )
        if completed.returncode != 0:
            detail = (completed.stderr or completed.stdout or "erreur FFmpeg inconnue").strip()
            raise RuntimeError(f"Commande média échouée : {detail[-3000:]}")
        return completed
