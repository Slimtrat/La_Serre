from __future__ import annotations

import argparse
import sys
from pathlib import Path

from engine.audio.speech import WindowsSapiSpeechSynthesizer
from engine.media.ffmpeg import FFmpegToolchain
from engine.production.episode_pipeline import EpisodePipeline, EpisodePipelineOptions


def parser() -> argparse.ArgumentParser:
    result = argparse.ArgumentParser(
        description=(
            "Assemble un épisode complet avec voix, mixage, sous-titres "
            "et validation FFmpeg"
        )
    )
    result.add_argument("episode", help="Identifiant canonique, par exemple S01E001")
    result.add_argument("--private-dir", type=Path, default=Path(".private"))
    result.add_argument("--output-dir", type=Path, default=Path("output"))
    result.add_argument("--audio-plan", type=Path)
    result.add_argument("--subtitles", type=Path)
    result.add_argument("--music", type=Path)
    result.add_argument("--ambience", type=Path)
    result.add_argument("--tts", choices=("auto", "sapi", "none"), default="auto")
    result.add_argument("--allow-stills", action="store_true")
    result.add_argument("--width", type=int, default=576)
    result.add_argument("--height", type=int, default=1024)
    result.add_argument("--fps", type=int, default=24)
    result.add_argument("--ffmpeg", type=Path)
    result.add_argument("--ffprobe", type=Path)
    result.add_argument("--force", action="store_true")
    return result


def main() -> None:
    args = parser().parse_args()
    tts_enabled = args.tts != "none"
    speech = None
    if args.tts == "sapi" or (args.tts == "auto" and sys.platform == "win32"):
        speech = WindowsSapiSpeechSynthesizer()
    media = FFmpegToolchain(args.ffmpeg, args.ffprobe)
    result = EpisodePipeline(media, speech).run(
        EpisodePipelineOptions(
            episode_id=args.episode,
            private_root=args.private_dir,
            output_root=args.output_dir,
            audio_plan=args.audio_plan,
            subtitles=args.subtitles,
            music=args.music,
            ambience=args.ambience,
            width=args.width,
            height=args.height,
            fps=args.fps,
            tts_enabled=tts_enabled,
            allow_stills=args.allow_stills,
            force=args.force,
        )
    )
    print(f"Épisode final : {result.video}")
    print(f"Manifeste : {result.manifest}")
    print(f"Durée vérifiée : {result.duration:.2f}s")


if __name__ == "__main__":
    main()
