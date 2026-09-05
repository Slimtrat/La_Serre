from __future__ import annotations

import hashlib
import json
import math
import shutil
import struct
import subprocess
import threading
import wave
from collections.abc import Callable, Sequence
from datetime import UTC, datetime
from pathlib import Path
from typing import Any, Literal, cast

from engine.production.artifacts import write_text_atomic

DemoStage = Literal["story", "plan", "frames", "sound", "video"]
STAGES: tuple[DemoStage, ...] = ("story", "plan", "frames", "sound", "video")
MEDIA_TYPES = {
    "frame-1.bmp": "image/bmp",
    "frame-2.bmp": "image/bmp",
    "frame-3.bmp": "image/bmp",
    "ambience.wav": "audio/wav",
    "subtitles.srt": "application/x-subrip",
    "demo.mp4": "video/mp4",
}
_GENERATED_CONTENT_UNSET = object()


class DemoPipeline:
    """Persistent, dependency-aware zero-GPU production walkthrough."""

    def __init__(
        self,
        output_provider: Callable[[], Path],
        *,
        ffmpeg_resolver: Callable[[], str | None] | None = None,
        command_runner: Callable[[Sequence[str]], None] | None = None,
    ) -> None:
        self._output_provider = output_provider
        self._ffmpeg_resolver = ffmpeg_resolver or (lambda: shutil.which("ffmpeg"))
        self._command_runner = command_runner or self._run_command
        self._lock = threading.RLock()

    def listing(self, *, locale: str = "fr") -> dict[str, Any]:
        with self._lock:
            return self._public(self._load(locale))

    def imagine(
        self,
        stage: DemoStage,
        *,
        instruction: str = "",
        locale: str = "fr",
        generated_content: object = _GENERATED_CONTENT_UNSET,
        provenance: dict[str, object] | None = None,
    ) -> dict[str, Any]:
        with self._lock:
            state = self._load(locale)
            index = STAGES.index(stage)
            if index and self._stage(state, STAGES[index - 1])["status"] != "approved":
                raise ValueError("Valide d’abord l’étape précédente.")
            self._invalidate_from(state, index)
            current = self._stage(state, stage)
            current["status"] = "generating"
            current["attempts"] = int(current.get("attempts", 0)) + 1
            current["feedback"] = ""
            self._record(state, stage, "generating", "L’atelier léger prépare une proposition.")
            self._save(state)
            try:
                if generated_content is _GENERATED_CONTENT_UNSET:
                    content, assets = self._generate(stage, state, instruction.strip())
                else:
                    content, assets = generated_content, []
            except Exception:
                current["status"] = "failed"
                self._record(state, stage, "failed", "La proposition n’a pas pu être produite.")
                self._save(state)
                raise
            current["content"] = content
            current["assets"] = assets
            current["provenance"] = provenance or self._local_provenance(stage)
            current["status"] = "generated"
            self._record(state, stage, "generated", "Proposition prête pour contrôle humain.")
            self._touch(state)
            self._save(state)
            return self._public(state)

    def approve(self, stage: DemoStage, *, locale: str = "fr") -> dict[str, Any]:
        with self._lock:
            state = self._load(locale)
            current = self._stage(state, stage)
            if current["status"] != "generated":
                raise ValueError("Génère une proposition avant de la valider.")
            current["status"] = "approved"
            current["feedback"] = ""
            index = STAGES.index(stage)
            if index + 1 < len(STAGES):
                self._stage(state, STAGES[index + 1])["status"] = "ready"
            self._record(state, stage, "approved", "Étape validée. Le maillon suivant est ouvert.")
            self._touch(state)
            self._save(state)
            return self._public(state)

    def reject(
        self,
        stage: DemoStage,
        *,
        feedback: str = "",
        locale: str = "fr",
    ) -> dict[str, Any]:
        with self._lock:
            state = self._load(locale)
            current = self._stage(state, stage)
            if current["status"] not in {"generated", "approved"}:
                raise ValueError("Il n’y a pas encore de proposition à refuser.")
            current["status"] = "rejected"
            current["feedback"] = feedback.strip()[:500]
            self._invalidate_from(state, STAGES.index(stage) + 1, unlock_first=False)
            self._record(
                state,
                stage,
                "rejected",
                current["feedback"] or "Proposition refusée : cette étape peut être régénérée.",
            )
            self._touch(state)
            self._save(state)
            return self._public(state)

    def reset(self, *, locale: str = "fr") -> dict[str, Any]:
        with self._lock:
            root = self._root()
            if root.is_dir():
                for path in root.rglob("*"):
                    if path.is_file():
                        path.unlink()
                for path in sorted(root.rglob("*"), reverse=True):
                    if path.is_dir():
                        path.rmdir()
                root.rmdir()
            state = self._fresh(locale)
            self._save(state)
            return self._public(state)

    def media_path(self, filename: str) -> Path:
        if filename not in MEDIA_TYPES:
            raise FileNotFoundError(filename)
        return self._media_root() / filename

    def _generate(
        self, stage: DemoStage, state: dict[str, Any], instruction: str
    ) -> tuple[Any, list[dict[str, str]]]:
        if stage == "story":
            return self._story(instruction, str(state["locale"])), []
        if stage == "plan":
            return self._plan(state), []
        if stage == "frames":
            return self._frames(state)
        if stage == "sound":
            return self._sound(state)
        return self._video(state)

    @staticmethod
    def _story(instruction: str, locale: str) -> str:
        if locale == "en":
            seed = instruction or "Belladonna steals a forbidden seed from Aconite at midnight"
            return (
                f"{seed.rstrip('.')}. The greenhouse locks behind them. The seed beats like a tiny "
                "heart; each pulse reveals a memory neither of them admits sharing. "
                "Belladonna offers "
                "a bargain, Aconite smiles, and the roots begin climbing toward their hands."
            )
        seed = instruction or "Belladone vole une graine interdite à Aconit, à minuit"
        return (
            f"{seed.rstrip('.')}. La serre se verrouille derrière elles. La graine bat comme un "
            "cœur minuscule ; chaque pulsation révèle un souvenir qu’aucune n’avoue partager. "
            "Belladone propose un marché, Aconit sourit, et les racines remontent vers leurs mains."
        )

    def _plan(self, state: dict[str, Any]) -> list[dict[str, object]]:
        story = str(self._stage(state, "story").get("content") or "")
        belladone = "Belladone" if "bellad" in story.lower() else "L’inconnue"
        aconit = "Aconit" if "aconit" in story.lower() else "Son adversaire"
        if state["locale"] == "en":
            return [
                {
                    "title": "The theft",
                    "action": "A black seed glows in a locked greenhouse.",
                    "dialogue": f"{belladone}: It only bites liars.",
                    "duration": 1.8,
                },
                {
                    "title": "The bargain",
                    "action": "A root curls around both wrists.",
                    "dialogue": f"{aconit}: Then stop smiling.",
                    "duration": 1.8,
                },
                {
                    "title": "The choice",
                    "action": "They pull together; the seed opens like an eye.",
                    "dialogue": f"{belladone}: Too late.",
                    "duration": 1.8,
                },
            ]
        return [
            {
                "title": "Le vol",
                "action": "Une graine noire pulse dans la serre verrouillée.",
                "dialogue": f"{belladone} — Elle ne mord que les menteuses.",
                "duration": 1.8,
            },
            {
                "title": "Le marché",
                "action": "Une racine enlace leurs deux poignets.",
                "dialogue": f"{aconit} — Alors cesse de sourire.",
                "duration": 1.8,
            },
            {
                "title": "Le choix",
                "action": "Elles tirent ensemble ; la graine s’ouvre comme un œil.",
                "dialogue": f"{belladone} — Trop tard.",
                "duration": 1.8,
            },
        ]

    def _frames(
        self, state: dict[str, Any]
    ) -> tuple[list[dict[str, object]], list[dict[str, str]]]:
        plan = self._stage(state, "plan").get("content")
        if not isinstance(plan, list) or len(plan) != 3:
            raise ValueError("Le découpage validé doit contenir trois temps.")
        media = self._media_root()
        media.mkdir(parents=True, exist_ok=True)
        seed = str(self._stage(state, "story").get("content") or "demo")
        assets: list[dict[str, str]] = []
        descriptions: list[dict[str, object]] = []
        for index, beat in enumerate(plan, start=1):
            filename = f"frame-{index}.bmp"
            self._write_bmp(media / filename, index=index, seed=seed)
            assets.append({"filename": filename, "kind": "image", "label": f"Pose {index}"})
            descriptions.append({"index": index, **dict(beat)})
        return descriptions, assets

    def _sound(self, state: dict[str, Any]) -> tuple[dict[str, object], list[dict[str, str]]]:
        destination = self._media_root() / "ambience.wav"
        destination.parent.mkdir(parents=True, exist_ok=True)
        self._write_ambience(destination)
        copy = (
            "Low-cost nocturnal pulse, glass harmonics and three tension accents."
            if state["locale"] == "en"
            else "Pulsation nocturne légère, harmoniques de verre et trois accents de tension."
        )
        return {"description": copy, "duration": 4.9}, [
            {"filename": "ambience.wav", "kind": "audio", "label": "Ambiance"}
        ]

    def _video(self, state: dict[str, Any]) -> tuple[dict[str, object], list[dict[str, str]]]:
        ffmpeg = self._ffmpeg_resolver()
        if not ffmpeg:
            raise RuntimeError("FFmpeg est requis pour assembler la mini-vidéo.")
        media = self._media_root()
        subtitle_path = media / "subtitles.srt"
        self._write_subtitles(state, subtitle_path)
        destination = media / "demo.mp4"
        command = self._video_command(ffmpeg, media, destination, subtitle_path)
        self._command_runner(command)
        if not destination.is_file() or destination.stat().st_size == 0:
            raise RuntimeError("FFmpeg n’a produit aucune mini-vidéo.")
        content = {
            "duration": 4.9,
            "resolution": "480 × 270",
            "fps": 12,
            "mode": "0 GPU · aperçu économique",
        }
        assets = [
            {"filename": "demo.mp4", "kind": "video", "label": "Mini-vidéo"},
            {"filename": "subtitles.srt", "kind": "subtitle", "label": "Sous-titres"},
        ]
        return content, assets

    @staticmethod
    def _video_command(ffmpeg: str, media: Path, destination: Path, subtitles: Path) -> list[str]:
        command = [ffmpeg, "-hide_banner", "-loglevel", "error", "-y"]
        for index in range(1, 4):
            command.extend(
                [
                    "-loop",
                    "1",
                    "-framerate",
                    "12",
                    "-t",
                    "1.8",
                    "-i",
                    str(media / f"frame-{index}.bmp"),
                ]
            )
        command.extend(["-i", str(media / "ambience.wav"), "-f", "srt", "-i", str(subtitles)])
        filters = []
        for index in range(3):
            direction = "zoom+0.004" if index != 1 else "zoom+0.003"
            filters.append(
                f"[{index}:v]scale=480:270,zoompan=z='min({direction},1.08)':"
                "x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=22:s=480x270:fps=12,"
                f"trim=duration=1.8,setpts=PTS-STARTPTS[v{index}]"
            )
        filters.extend(
            [
                "[v0][v1]xfade=transition=fade:duration=0.25:offset=1.55[x1]",
                "[x1][v2]xfade=transition=fade:duration=0.25:offset=3.1,format=yuv420p[vout]",
            ]
        )
        command.extend(
            [
                "-filter_complex",
                ";".join(filters),
                "-map",
                "[vout]",
                "-map",
                "3:a:0",
                "-map",
                "4:0",
                "-t",
                "4.9",
                "-r",
                "12",
                "-c:v",
                "libx264",
                "-preset",
                "ultrafast",
                "-crf",
                "34",
                "-c:a",
                "aac",
                "-b:a",
                "64k",
                "-c:s",
                "mov_text",
                "-metadata:s:s:0",
                "language=fra",
                "-movflags",
                "+faststart",
                str(destination),
            ]
        )
        return command

    @staticmethod
    def _run_command(command: Sequence[str]) -> None:
        completed = subprocess.run(command, capture_output=True, text=True, timeout=30, check=False)
        if completed.returncode:
            detail = (completed.stderr or completed.stdout or "erreur FFmpeg").strip()
            raise RuntimeError(f"Assemblage de la démo impossible : {detail[-800:]}")

    @staticmethod
    def _write_ambience(path: Path) -> None:
        rate = 22_050
        duration = 4.9
        frames = bytearray()
        total = int(rate * duration)
        for sample in range(total):
            time = sample / rate
            envelope = min(1.0, time / 0.25, (duration - time) / 0.35)
            pulse = 0.55 + 0.45 * math.sin(2 * math.pi * 1.3 * time)
            value = envelope * (
                0.13 * math.sin(2 * math.pi * 110 * time)
                + 0.06 * math.sin(2 * math.pi * 164.81 * time)
                + 0.025 * pulse * math.sin(2 * math.pi * 659.25 * time)
            )
            frames.extend(struct.pack("<h", int(max(-1, min(1, value)) * 32767)))
        with wave.open(str(path), "wb") as target:
            target.setnchannels(1)
            target.setsampwidth(2)
            target.setframerate(rate)
            target.writeframes(frames)

    @staticmethod
    def _write_bmp(path: Path, *, index: int, seed: str) -> None:
        width, height = 480, 270
        digest = hashlib.sha256(f"{seed}:{index}".encode()).digest()
        pixels = bytearray(width * height * 3)

        def put(x: int, y: int, color: tuple[int, int, int]) -> None:
            if 0 <= x < width and 0 <= y < height:
                offset = ((height - 1 - y) * width + x) * 3
                pixels[offset : offset + 3] = bytes((color[2], color[1], color[0]))

        def circle(cx: int, cy: int, radius: int, color: tuple[int, int, int]) -> None:
            for y in range(cy - radius, cy + radius + 1):
                span = int(math.sqrt(max(0, radius * radius - (y - cy) ** 2)))
                for x in range(cx - span, cx + span + 1):
                    put(x, y, color)

        for y in range(height):
            for x in range(width):
                glow = max(0, 70 - int(math.hypot(x - 245, y - 135) / 2.4))
                put(x, y, (18 + glow // 3, 8 + glow // 5, 28 + glow // 2))
        # Persistent fantasy frame.
        for inset, color in ((7, (104, 73, 91)), (11, (42, 88, 58)), (15, (130, 94, 119))):
            for x in range(inset, width - inset):
                put(x, inset, color)
                put(x, height - 1 - inset, color)
            for y in range(inset, height - inset):
                put(inset, y, color)
                put(width - 1 - inset, y, color)
        for star in range(34):
            x = 24 + (digest[star % len(digest)] * (star + 17)) % (width - 48)
            y = 24 + (digest[(star + 7) % len(digest)] * (star + 11)) % (height - 48)
            put(x, y, (181, 121, 211))
            put(x + 1, y, (219, 181, 236))
        left = 128 + index * 15
        right = 352 - index * 13
        circle(left, 112, 30, (61, 28, 73))
        circle(right, 108, 29, (26, 35, 79))
        for y in range(140, 235):
            half = max(15, (y - 125) // 3)
            for x in range(left - half, left + half):
                put(x, y, (50, 24, 62))
            for x in range(right - half, right + half):
                put(x, y, (22, 31, 67))
        seed_x = 240 + (index - 2) * 7
        circle(seed_x, 148 - index * 5, 17 + index * 2, (42, 8, 48))
        circle(seed_x - 3, 143 - index * 5, 7, (158, 50, 183))
        for step in range(70):
            x = seed_x + int(math.sin(step / 8 + index) * (12 + step / 4))
            y = 166 + step
            circle(x, y, 2, (53, 94 + step // 3, 58))
        header = struct.pack("<2sIHHI", b"BM", 54 + len(pixels), 0, 0, 54)
        info = struct.pack(
            "<IIIHHIIIIII", 40, width, height, 1, 24, 0, len(pixels), 2835, 2835, 0, 0
        )
        path.write_bytes(header + info + pixels)

    def _write_subtitles(self, state: dict[str, Any], path: Path) -> None:
        plan = self._stage(state, "plan").get("content")
        if not isinstance(plan, list):
            raise ValueError("Découpage de démonstration introuvable.")
        starts = (0.15, 1.7, 3.25)
        ends = (1.5, 3.05, 4.75)
        chunks = []
        for index, beat in enumerate(plan[:3]):
            dialogue = str(beat.get("dialogue", "")) if isinstance(beat, dict) else ""
            timing = f"{self._srt_time(starts[index])} --> {self._srt_time(ends[index])}"
            chunks.append(f"{index + 1}\n{timing}\n{dialogue}\n")
        path.write_text("\n".join(chunks), encoding="utf-8")

    @staticmethod
    def _srt_time(seconds: float) -> str:
        millis = round(seconds * 1000)
        return f"00:00:{millis // 1000:02d},{millis % 1000:03d}"

    def _fresh(self, locale: str) -> dict[str, Any]:
        now = datetime.now(UTC).isoformat()
        return {
            "id": "express-demo",
            "version": 2,
            "locale": "en" if locale == "en" else "fr",
            "mode": "zero-gpu",
            "created_at": now,
            "updated_at": now,
            "stages": [
                {
                    "id": stage,
                    "status": "ready" if index == 0 else "locked",
                    "attempts": 0,
                    "content": None,
                    "assets": [],
                    "feedback": "",
                    "provenance": None,
                }
                for index, stage in enumerate(STAGES)
            ],
            "events": [],
        }

    def _load(self, locale: str) -> dict[str, Any]:
        path = self._state_path()
        if not path.is_file():
            return self._fresh(locale)
        try:
            value = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, ValueError):
            return self._fresh(locale)
        if not isinstance(value, dict) or value.get("version") != 2:
            return self._fresh(locale)
        value["locale"] = "en" if locale == "en" else "fr"
        return value

    def _save(self, state: dict[str, Any]) -> None:
        self._root().mkdir(parents=True, exist_ok=True)
        write_text_atomic(
            self._state_path(), json.dumps(state, ensure_ascii=False, indent=2) + "\n"
        )

    def _public(self, state: dict[str, Any]) -> dict[str, Any]:
        copy = cast(dict[str, Any], json.loads(json.dumps(state)))
        revision = str(state.get("updated_at", "")).replace(":", "")
        for stage in copy["stages"]:
            for asset in stage.get("assets", []):
                asset["url"] = f"/api/demo/media/{asset['filename']}?v={revision}"
        copy["complete"] = all(stage["status"] == "approved" for stage in copy["stages"])
        copy["ffmpeg_ready"] = self._ffmpeg_resolver() is not None
        return copy

    def _invalidate_from(
        self, state: dict[str, Any], start: int, *, unlock_first: bool = True
    ) -> None:
        for index in range(start, len(STAGES)):
            stage = self._stage(state, STAGES[index])
            for asset in stage.get("assets", []):
                filename = asset.get("filename") if isinstance(asset, dict) else None
                if filename in MEDIA_TYPES:
                    (self._media_root() / str(filename)).unlink(missing_ok=True)
            stage["status"] = "ready" if unlock_first and index == start else "locked"
            stage["content"] = None
            stage["assets"] = []
            stage["feedback"] = ""
            stage["provenance"] = None

    @staticmethod
    def _stage(state: dict[str, Any], stage: DemoStage) -> dict[str, Any]:
        return next(item for item in state["stages"] if item["id"] == stage)

    @staticmethod
    def _record(state: dict[str, Any], stage: DemoStage, status: str, message: str) -> None:
        state["events"].append(
            {
                "timestamp": datetime.now(UTC).isoformat(),
                "stage": stage,
                "status": status,
                "message": message,
            }
        )
        state["events"] = state["events"][-100:]

    @staticmethod
    def _touch(state: dict[str, Any]) -> None:
        state["updated_at"] = datetime.now(UTC).isoformat()

    @staticmethod
    def _local_provenance(stage: DemoStage) -> dict[str, object]:
        providers = {
            "story": ("studio-template", "Gabarit narratif local"),
            "plan": ("studio-rules", "Découpage déterministe local"),
            "frames": ("studio-renderer", "Illustration procédurale locale"),
            "sound": ("studio-synth", "Synthèse sonore procédurale"),
            "video": ("ffmpeg", "Assemblage vidéo local"),
        }
        provider, label = providers[stage]
        return {
            "provider": provider,
            "label": label,
            "mode": "preview",
            "real_ai": False,
            "generated_at": datetime.now(UTC).isoformat(),
        }

    def _root(self) -> Path:
        return self._output_provider().resolve() / ".studio" / "express-demo"

    def _media_root(self) -> Path:
        return self._root() / "media"

    def _state_path(self) -> Path:
        return self._root() / "state.json"
