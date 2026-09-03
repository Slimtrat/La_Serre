from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from pydantic import AnyHttpUrl, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    comfyui_url: AnyHttpUrl = AnyHttpUrl("http://127.0.0.1:8188")
    comfyui_timeout_seconds: float = Field(default=1800, gt=0)
    comfyui_poll_interval_seconds: float = Field(default=1, gt=0)
    keyframe_workflow_profile: Path | None = Path("workflows/local/keyframe.profile.json")
    video_workflow_profile: Path | None = Path("workflows/local/video.profile.json")
    output_dir: Path = Path("output")
    private_content_dir: Path = Path(".private")
    comfyui_models_dir: Path | None = None
    downloads_dir: Path = Path.home() / "Downloads"
    default_video_backend: str = "ltx"
    llm_provider: str = "ollama"
    ollama_url: AnyHttpUrl = AnyHttpUrl("http://127.0.0.1:11434")
    ollama_model: str = ""

    @classmethod
    def load(cls, local_path: Path | None = None) -> Settings:
        """Load environment settings, then private Studio overrides."""
        base = cls()
        path = local_path or Path("workflows/local/studio-settings.json")
        if not path.is_file():
            return base
        raw: Any = json.loads(path.read_text(encoding="utf-8"))
        if not isinstance(raw, dict):
            raise ValueError(f"Local settings must be a JSON object: {path}")
        return cls.model_validate({**base.model_dump(mode="json"), **raw})

    def save_local(self, local_path: Path | None = None) -> Path:
        path = local_path or Path("workflows/local/studio-settings.json")
        path.parent.mkdir(parents=True, exist_ok=True)
        payload = {
            "comfyui_url": str(self.comfyui_url),
            "output_dir": str(self.output_dir),
            "private_content_dir": str(self.private_content_dir),
            "comfyui_models_dir": str(self.comfyui_models_dir) if self.comfyui_models_dir else None,
            "downloads_dir": str(self.downloads_dir),
            "keyframe_workflow_profile": str(self.keyframe_workflow_profile)
            if self.keyframe_workflow_profile
            else None,
            "video_workflow_profile": str(self.video_workflow_profile)
            if self.video_workflow_profile
            else None,
        }
        temporary = path.with_suffix(".tmp")
        temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
        temporary.replace(path)
        return path

    @property
    def profiles_configured(self) -> bool:
        return bool(
            self.keyframe_workflow_profile
            and self.keyframe_workflow_profile.is_file()
            and self.video_workflow_profile
            and self.video_workflow_profile.is_file()
        )
