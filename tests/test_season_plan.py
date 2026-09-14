from __future__ import annotations

from pathlib import Path

import pytest
from pydantic import ValidationError

from engine.narrative.episode_models import (
    Episode,
    EpisodeStatus,
    NarrativeProvenance,
)
from engine.narrative.season_plan import (
    SeasonPlan,
    SeasonPlanItem,
    SeasonPlanLifecycle,
    SeasonPlanRegistry,
    SeasonPlanRevisionConflictError,
)
from engine.narrative.workflow_models import (
    ProposedEpisode,
    ScreenwriterPlan,
    ScreenwriterStage,
    SeriesNarrativeWorkflow,
    StageStatus,
)
from engine.world.catalog import EpisodeCatalog


def proposal(number: int = 1, *, title: str = "La graine noire") -> ProposedEpisode:
    return ProposedEpisode(
        season=1,
        episode=number,
        title=title,
        logline=f"Belladone découvre le secret dangereux de la graine numéro {number}.",
        synopsis=(
            f"Belladone dérobe la graine numéro {number}, puis la serre révèle "
            "qu’elle connaissait déjà chacun de ses désirs."
        ),
        cliffhanger="La graine prononce son nom.",
    )


def provenance() -> NarrativeProvenance:
    return NarrativeProvenance(
        stage="screenwriter",
        mode="manual",
        source_label="Test du plan de saison",
    )


def create_item(registry: SeasonPlanRegistry, number: int = 1) -> SeasonPlan:
    return registry.create(
        proposal(number),
        provenance(),
        expected_revision=registry.load().revision,
    )


def validate_item(registry: SeasonPlanRegistry, plan: SeasonPlan, item_id: str) -> SeasonPlan:
    return registry.update(
        item_id,
        {"lifecycle": SeasonPlanLifecycle.VALIDATED},
        expected_revision=plan.revision,
    )


def test_models_enforce_unique_ids_episode_links_and_contiguous_active_positions() -> None:
    first = SeasonPlanItem(
        id="season-item-a1",
        position=1,
        title="Premier",
        logline="Une première promesse narrative suffisamment développée.",
        synopsis="Une première histoire suffisamment longue pour respecter le contrat narratif.",
        provenance=provenance(),
    )
    singleton = SeasonPlan(items=[first])
    assert singleton.active_items == [first]

    with pytest.raises(ValidationError, match="positions must be contiguous"):
        SeasonPlan(items=[first.model_copy(update={"position": 2})])
    with pytest.raises(ValidationError, match="item ids must be unique"):
        SeasonPlan(items=[first, first])
    with pytest.raises(ValidationError, match="only one season item"):
        SeasonPlan(
            items=[
                first.model_copy(update={"episode_id": "S01E001"}),
                first.model_copy(
                    update={
                        "id": "season-item-b2",
                        "position": 2,
                        "episode_id": "S01E001",
                    }
                ),
            ]
        )


def test_create_update_duplicate_persist_and_reject_stale_revision(tmp_path: Path) -> None:
    registry = SeasonPlanRegistry(tmp_path)
    created = create_item(registry)
    item = created.active_items[0]
    assert item.id.startswith("season-item-")

    updated = registry.update(
        item.id,
        {"title": "La graine violette", "lifecycle": "validated"},
        expected_revision=created.revision,
    )
    duplicated = registry.duplicate(item.id, expected_revision=updated.revision)
    assert [entry.position for entry in duplicated.active_items] == [1, 2]
    assert duplicated.active_items[1].id != item.id
    assert duplicated.active_items[1].episode_id is None
    assert duplicated.active_items[1].lifecycle is SeasonPlanLifecycle.DRAFT
    assert SeasonPlanRegistry(tmp_path).load() == duplicated

    with pytest.raises(SeasonPlanRevisionConflictError) as conflict:
        registry.update(item.id, {"title": "Écriture périmée"}, expected_revision=created.revision)
    assert (conflict.value.expected, conflict.value.current) == (
        created.revision,
        duplicated.revision,
    )


def test_create_many_commits_the_reviewed_season_atomically(tmp_path: Path) -> None:
    registry = SeasonPlanRegistry(tmp_path)
    batch = [proposal(number) for number in range(1, 7)]
    accepted = registry.create_many(
        batch,
        [provenance() for _ in batch],
        expected_revision=0,
    )

    assert accepted.revision == 1
    assert [item.position for item in accepted.active_items] == list(range(1, 7))
    assert [item.title for item in accepted.active_items] == [
        item.title for item in batch
    ]
    assert SeasonPlanRegistry(tmp_path).load() == accepted

    before = (tmp_path / "world" / "season-plan.json").read_bytes()
    with pytest.raises(ValueError, match="Every season item requires provenance"):
        registry.create_many(batch, [provenance()], expected_revision=accepted.revision)
    assert (tmp_path / "world" / "season-plan.json").read_bytes() == before


def test_reorder_insert_and_reload_never_rename_materialized_episode_directory(
    tmp_path: Path,
) -> None:
    registry = SeasonPlanRegistry(tmp_path)
    first_plan = create_item(registry, 1)
    second_plan = registry.create(
        proposal(2, title="Deuxième"),
        provenance(),
        expected_revision=first_plan.revision,
    )
    first_id, second_id = [item.id for item in second_plan.active_items]
    catalog = EpisodeCatalog(tmp_path)
    second_plan = validate_item(registry, second_plan, first_id)
    materialized = registry.materialize(
        first_id,
        catalog,
        expected_revision=second_plan.revision,
    )
    episode_id = materialized.active_items[0].episode_id
    assert episode_id == "S01E001"
    episode_path = catalog.episode_dir(episode_id) / "episode.json"
    before = episode_path.read_bytes()

    reordered = registry.reorder(
        [second_id, first_id],
        expected_revision=materialized.revision,
    )
    reloaded = SeasonPlanRegistry(tmp_path).load()

    assert [item.id for item in reloaded.active_items] == [second_id, first_id]
    assert next(item for item in reordered.items if item.id == first_id).episode_id == episode_id
    assert episode_path.read_bytes() == before
    assert catalog.episode_dir(episode_id).is_dir()


def test_soft_delete_compacts_positions_and_restore_can_reinsert(tmp_path: Path) -> None:
    registry = SeasonPlanRegistry(tmp_path)
    first = create_item(registry, 1)
    second = registry.create(proposal(2), provenance(), expected_revision=first.revision)
    third = registry.create(proposal(3), provenance(), expected_revision=second.revision)
    first_id, second_id, third_id = [item.id for item in third.active_items]

    deleted = registry.delete(second_id, expected_revision=third.revision)
    obsolete = next(item for item in deleted.items if item.id == second_id)
    assert [item.id for item in deleted.active_items] == [first_id, third_id]
    assert [item.position for item in deleted.active_items] == [1, 2]
    assert obsolete.lifecycle is SeasonPlanLifecycle.OBSOLETE
    assert obsolete.position is None
    assert obsolete.deleted_at is not None

    restored = registry.restore(second_id, expected_revision=deleted.revision, position=2)
    assert [item.id for item in restored.active_items] == [first_id, second_id, third_id]
    assert [item.position for item in restored.active_items] == [1, 2, 3]
    assert restored.active_items[1].lifecycle is SeasonPlanLifecycle.DRAFT
    assert restored.active_items[1].deleted_at is None


def test_lazy_migration_is_deterministic_idempotent_and_links_existing_publication(
    tmp_path: Path,
) -> None:
    catalog = EpisodeCatalog(tmp_path)
    catalog.create(
        Episode(
            id="S01E001",
            season=1,
            episode=1,
            title="Déjà produit",
            status=EpisodeStatus.WRITING,
        )
    )
    workflow = SeriesNarrativeWorkflow(
        screenwriter=ScreenwriterStage(
            status=StageStatus.APPROVED,
            content=ScreenwriterPlan(
                series_arc="Un arc narratif suffisamment détaillé pour la migration du projet.",
                episodes=[proposal(1), proposal(2)],
            ),
            provenance=provenance(),
        ),
        published_episode_ids=["S01E001", "S01E002"],
    )
    legacy_path = tmp_path / "world" / "narrative-workflow.json"
    legacy_path.parent.mkdir(parents=True)
    legacy_path.write_text(workflow.model_dump_json(indent=2), encoding="utf-8")

    registry = SeasonPlanRegistry(tmp_path)
    migrated = registry.load()
    ids = [item.id for item in migrated.active_items]
    assert [item.lifecycle for item in migrated.active_items] == [
        SeasonPlanLifecycle.VALIDATED,
        SeasonPlanLifecycle.VALIDATED,
    ]
    assert [item.episode_id for item in migrated.active_items] == ["S01E001", None]

    changed_legacy = workflow.model_copy(update={"published_episode_ids": []})
    legacy_path.write_text(changed_legacy.model_dump_json(indent=2), encoding="utf-8")
    assert [item.id for item in SeasonPlanRegistry(tmp_path).load().active_items] == ids
    assert legacy_path.read_text(encoding="utf-8") == changed_legacy.model_dump_json(indent=2)


def test_materialize_recovers_episode_created_before_plan_link(tmp_path: Path) -> None:
    registry = SeasonPlanRegistry(tmp_path)
    created = create_item(registry)
    item = created.active_items[0]
    created = validate_item(registry, created, item.id)
    catalog = EpisodeCatalog(tmp_path)
    catalog.create(
        Episode(
            id="S01E001",
            season=1,
            episode=1,
            title=item.title,
            status=EpisodeStatus.WRITING,
            season_plan_item_id=item.id,
        )
    )

    recovered = registry.materialize(
        item.id,
        catalog,
        expected_revision=created.revision,
    )
    assert recovered.active_items[0].episode_id == "S01E001"
    assert [episode.id for episode in catalog.list_episodes()] == ["S01E001"]


def test_singleton_plan_create_materialize_and_reload(tmp_path: Path) -> None:
    registry = SeasonPlanRegistry(tmp_path)
    created = create_item(registry)
    assert len(created.active_items) == 1
    created = validate_item(registry, created, created.active_items[0].id)

    materialized = registry.materialize(
        created.active_items[0].id,
        EpisodeCatalog(tmp_path),
        expected_revision=created.revision,
    )
    reloaded = SeasonPlanRegistry(tmp_path).load()
    assert len(reloaded.active_items) == 1
    assert reloaded == materialized
    assert reloaded.active_items[0].position == 1
    assert reloaded.active_items[0].episode_id == "S01E001"


def test_materialization_validates_bible_references_without_creating_episode(
    tmp_path: Path,
) -> None:
    registry = SeasonPlanRegistry(tmp_path)
    bad = proposal().model_copy(update={"character_ids": ["missing-character"]})
    created = registry.create(bad, provenance(), expected_revision=0)
    created = validate_item(registry, created, created.active_items[0].id)

    with pytest.raises(ValueError, match="absent from the Bible"):
        registry.materialize(
            created.active_items[0].id,
            EpisodeCatalog(tmp_path),
            expected_revision=created.revision,
        )
    assert EpisodeCatalog(tmp_path).list_episodes() == []
