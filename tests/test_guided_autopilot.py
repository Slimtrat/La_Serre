from __future__ import annotations

from pathlib import Path
from types import SimpleNamespace

from engine.config import Settings
from engine.narrative.episode_models import EpisodeStory
from engine.narrative.guided_authoring import (
    GuidedAuthoringRegistry,
    GuidedProjectBrief,
)
from engine.narrative.guided_autopilot import (
    GuidedAutopilotRegistry,
    execute_guided_autopilot,
)
from engine.narrative.workflow_models import (
    DirectorBrief,
    EpisodeBreakdownCandidate,
    EpisodeDraftCandidate,
    ProposedEpisode,
    ScreenwriterPlan,
    ShotBlueprint,
)


class _FakeClient:
    def __init__(self, _url: str) -> None:
        pass

    async def __aenter__(self) -> _FakeClient:
        return self

    async def __aexit__(self, *_args: object) -> None:
        pass

    async def list_models(self) -> list[SimpleNamespace]:
        return [SimpleNamespace(name="story:local")]


class _FakeAuthor:
    calls: list[str] = []

    def __init__(self, _client: object) -> None:
        pass

    async def director(self, *_args: object, **_kwargs: object) -> DirectorBrief:
        self.calls.append("direction")
        return DirectorBrief(
            concept="Une dispute minuscule devient un drame de télévision.",
            genre="Comédie de reportage",
            tone="Gravité absurde et silences gênants",
            visual_direction="Cuisine ordinaire filmée comme une affaire d’État",
        )

    async def screenwriter(self, *_args: object, **_kwargs: object) -> ScreenwriterPlan:
        self.calls.append("architecture")
        return ScreenwriterPlan(
            series_arc="Des voisins dramatisent chaque problème banal jusqu’à se réconcilier.",
            episodes=[
                ProposedEpisode(
                    episode=1,
                    title="Le grille-pain",
                    logline="Un grille-pain cassé divise tout un immeuble pendant le dîner.",
                    synopsis=(
                        "Une panne ordinaire déclenche témoignages, silences et accusations "
                        "contradictoires dans une petite cuisine."
                    ),
                )
            ],
        )

    async def episode_draft(
        self, *_args: object, **_kwargs: object
    ) -> EpisodeDraftCandidate:
        self.calls.append("episode")
        return EpisodeDraftCandidate(
            title="Le grille-pain",
            logline="Un grille-pain cassé divise tout un immeuble pendant le dîner.",
            story=EpisodeStory(
                hook="Le pain ne remonte pas.",
                setup="Tout le monde accuse tout le monde.",
                conflict="Les versions se contredisent.",
                reveal="Il était débranché.",
                cliffhanger="La bouilloire s’éteint.",
            ),
            narrative_source=(
                "La narratrice décrit la panne avec gravité, puis laisse un long silence."
            ),
        )

    async def breakdown(
        self, *_args: object, **_kwargs: object
    ) -> EpisodeBreakdownCandidate:
        self.calls.append("storyboard")
        return EpisodeBreakdownCandidate(
            shots=[
                ShotBlueprint(
                    source_text="Le grille-pain reste immobile pendant un long silence pesant.",
                    duration=4,
                    location_id="kitchen",
                    character_ids=[],
                    shot_type="insert",
                    camera_movement="slow push-in",
                    action="Le grille-pain reste immobile.",
                    lighting="néon froid",
                    mood="gravité absurde",
                    style=["reportage télévisé"],
                )
            ]
        )


async def test_autopilot_persists_each_successive_candidate(
    tmp_path: Path,
    monkeypatch: object,
) -> None:
    settings = Settings(
        _env_file=None,
        private_content_dir=tmp_path / "private",
        output_dir=tmp_path / "output",
        ollama_model="story:local",
    )
    guided_registry = GuidedAuthoringRegistry(settings.private_content_dir)
    guided_registry.save(
        guided_registry.load().model_copy(
            update={
                "brief": GuidedProjectBrief(
                    idea="Une dispute de voisinage devient une affaire nationale.",
                )
            }
        ),
        expected_revision=0,
    )
    registry = GuidedAutopilotRegistry(settings.private_content_dir)
    run = registry.create(
        base_revision=1,
        locale="fr",
        model="story:local",
        custom_prompt="",
    )
    monkeypatch.setattr(  # type: ignore[attr-defined]
        "engine.narrative.guided_autopilot.OllamaClient", _FakeClient
    )
    monkeypatch.setattr(  # type: ignore[attr-defined]
        "engine.narrative.guided_autopilot.OllamaNarrativeAuthor", _FakeAuthor
    )
    _FakeAuthor.calls = []

    await execute_guided_autopilot(run.id, settings)

    completed = registry.get(run.id)
    assert completed.status == "completed"
    assert [stage.status for stage in completed.stages] == ["completed"] * 5
    assert _FakeAuthor.calls == ["direction", "architecture", "episode", "storyboard"]
    assert completed.stages[-1].candidate is not None
    assert len(completed.stages[-1].candidate["continuity_chain"]) == 4
