from __future__ import annotations

from pathlib import Path

from pydantic import AnyHttpUrl, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    comfyui_url: AnyHttpUrl = AnyHttpUrl("http://127.0.0.1:8188")
    comfyui_timeout_seconds: float = Field(default=1800, gt=0)
    comfyui_poll_interval_seconds: float = Field(default=1, gt=0)
    keyframe_workflow_profile: Path | None = None
    video_workflow_profile: Path | None = None
    output_dir: Path = Path("output")
    default_video_backend: str = "ltx"
    llm_provider: str = "ollama"
    ollama_url: AnyHttpUrl = AnyHttpUrl("http://127.0.0.1:11434")
    ollama_model: str = ""

    @property
    def profiles_configured(self) -> bool:
        return bool(self.keyframe_workflow_profile and self.video_workflow_profile)
