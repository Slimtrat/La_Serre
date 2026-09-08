from __future__ import annotations

import asyncio
import json
from pathlib import Path
from typing import cast

import httpx

from apps.api.main import create_app
from apps.api.projects import ProjectRegistry
from engine.config import Settings
from engine.templates import (
    TENTAFRUIT_TEMPLATE_ID,
    ProjectTemplateCatalog,
    SeriesFormatProfile,
)
from engine.world.catalog import EpisodeCatalog
from engine.world.models import ProjectBible


def make_registry(tmp_path: Path) -> ProjectRegistry:
    return ProjectRegistry(
        Settings(
            _env_file=None,
            private_content_dir=tmp_path / "private",
            output_dir=tmp_path / "output",
        ),
        config_path=tmp_path / "config" / "projects.json",
        projects_root=tmp_path / "projects",
    )


def test_tentafruit_template_is_versioned_valid_and_task_ready() -> None:
    template = ProjectTemplateCatalog().get(TENTAFRUIT_TEMPLATE_ID)
    persisted_profile = SeriesFormatProfile.model_validate_json(
        Path("starter_catalog/series-format.json").read_text(encoding="utf-8")
    )

    assert template.version == 1
    assert persisted_profile == template.format_profile
    assert template.format_profile.output.duration_seconds_min == 30
    assert template.format_profile.output.duration_seconds_max == 60
    assert template.format_profile.output.shot_count_min == 6
    assert template.format_profile.output.shot_count_max == 10
    assert template.format_profile.output.aspect_ratio == "9:16"
    context = template.format_profile.task_context()
    assert context["required_beats"] == [
        "hook immédiat",
        "conflit relationnel",
        "bascule dramatique ou comique",
        "cliffhanger",
    ]
    assert "propriété tierce" in template.originality_notice


def test_template_instantiates_empty_project_without_private_media(tmp_path: Path) -> None:
    projects = make_registry(tmp_path)

    project = projects.create(
        "Ma série",
        template_id=TENTAFRUIT_TEMPLATE_ID,
    )

    work = Path(project.private_content_dir)
    assert project.template_id == TENTAFRUIT_TEMPLATE_ID
    assert not list((work / "episodes").glob("season-*/S*/episode.json"))
    profile = SeriesFormatProfile.model_validate_json(
        (work / "series-format.json").read_text(encoding="utf-8")
    )
    assert profile.id == TENTAFRUIT_TEMPLATE_ID
    assert not list(work.rglob("*.png"))
    assert not list(work.rglob("*.wav"))
    assert not list(work.rglob("*.mp4"))


def test_template_example_contains_valid_bible_and_episode_package(tmp_path: Path) -> None:
    projects = make_registry(tmp_path)

    project = projects.create(
        "Avec exemple",
        clone_content=False,
        template_id=TENTAFRUIT_TEMPLATE_ID,
        include_example_content=True,
    )
    work = Path(project.private_content_dir)
    bible = ProjectBible.model_validate_json(
        (work / "world" / "bible.json").read_text(encoding="utf-8")
    )
    package = EpisodeCatalog(work).load("S01E001")

    assert len(bible.relationships) >= 2
    assert bible.art_direction.summary
    assert bible.tone.dialogue_rules
    assert bible.world_rules
    assert len(package.shots) == 10
    assert package.episode.duration_target == 50
    assert not (work / "project-templates").exists()


def test_legacy_projects_get_custom_profile_without_overwriting_content(
    tmp_path: Path,
) -> None:
    projects = make_registry(tmp_path)
    project = projects.create("Projet 0.2.13", clone_content=False)
    work = Path(project.private_content_dir)
    profile_path = work / "series-format.json"
    custom = projects.format_profile().model_copy(update={"name": "Mon format conservé"})
    profile_path.write_text(custom.model_dump_json(indent=2) + "\n", encoding="utf-8")
    payload = json.loads(projects.config_path.read_text(encoding="utf-8"))
    payload["version"] = 3
    for item in payload["projects"]:
        item.pop("template_id", None)
    projects.config_path.write_text(json.dumps(payload), encoding="utf-8")

    reloaded = make_registry(tmp_path)
    listing = cast(list[dict[str, object]], reloaded.listing()["projects"])
    legacy = next(item for item in listing if item["id"] == project.id)

    assert legacy["template_id"] == "custom"
    assert cast(dict[str, object], legacy["format_profile"])["name"] == "Mon format conservé"
    assert "Mon format conservé" in profile_path.read_text(encoding="utf-8")
    discovery = next(item for item in listing if item["id"] == "default")
    assert discovery["template_id"] == TENTAFRUIT_TEMPLATE_ID


async def test_api_creates_tentafruit_project_with_or_without_example(
    tmp_path: Path,
) -> None:
    app = create_app(
        Settings(
            _env_file=None,
            private_content_dir=tmp_path / "private",
            output_dir=tmp_path / "output",
        )
    )
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        templates = await client.get("/api/project-templates")
        empty_response = await client.post(
            "/api/projects",
            json={"name": "Vide", "template_id": TENTAFRUIT_TEMPLATE_ID},
        )
        example_response = await client.post(
            "/api/projects",
            json={
                "name": "Exemple",
                "template_id": TENTAFRUIT_TEMPLATE_ID,
                "include_example_content": True,
            },
        )

    assert templates.status_code == 200
    assert TENTAFRUIT_TEMPLATE_ID in {item["id"] for item in templates.json()["templates"]}
    assert empty_response.status_code == 201
    assert example_response.status_code == 201
    projects = example_response.json()["projects"]
    empty = next(item for item in projects if item["name"] == "Vide")
    example = next(item for item in projects if item["name"] == "Exemple")
    assert empty["format_profile"]["version"] == 1
    empty_episodes = await asyncio.to_thread(
        lambda: list(Path(empty["work_dir"]).glob("episodes/season-*/S*/episode.json"))
    )
    example_exists = await asyncio.to_thread(
        (Path(example["work_dir"]) / "episodes/season-01/S01E001/episode.json").is_file
    )
    assert not empty_episodes
    assert example_exists
