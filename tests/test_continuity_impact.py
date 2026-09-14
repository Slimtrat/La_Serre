from engine.world.impact import ContinuityImpactAnalyzer


def test_continuity_impact_reports_only_changed_entries_with_evidence() -> None:
    before = {
        "entries": [
            {
                "season_plan_item_id": "season-item-a1",
                "episode_id": "S01E001",
                "state": {"facts": []},
                "applied_delta_ids": [],
            },
            {
                "season_plan_item_id": "season-item-b2",
                "episode_id": "S01E002",
                "state": {"facts": ["aconit-ignore"]},
                "applied_delta_ids": ["delta-a1"],
            },
            {
                "season_plan_item_id": "season-item-c3",
                "episode_id": "S01E003",
                "state": {"facts": ["stable"]},
                "applied_delta_ids": [],
            },
        ]
    }
    after = {
        "entries": [
            before["entries"][0],
            {
                "season_plan_item_id": "season-item-b2",
                "episode_id": "S01E002",
                "state": {"facts": ["belladone-sait"]},
                "applied_delta_ids": ["delta-revelation"],
            },
            before["entries"][2],
        ]
    }

    report = ContinuityImpactAnalyzer().compare(
        before,
        after,
        cause_type="season_reorder",
        cause_ids=["season-item-a1"],
    )

    assert report["affected_episode_ids"] == ["S01E002"]
    assert report["affected_count"] == 1
    affected = report["affected_items"][0]
    assert affected["changed_fields"] == ["facts"]
    assert affected["causes"] == [
        {"type": "season_reorder", "id": "season-item-a1"},
        {"type": "approved_delta", "id": "delta-a1"},
        {"type": "approved_delta", "id": "delta-revelation"},
    ]
    assert report["regeneration_scheduled"] is False


def test_continuity_impact_is_empty_for_an_equivalent_composition() -> None:
    composition = {
        "entries": [
            {
                "season_plan_item_id": "season-item-a1",
                "episode_id": "S01E001",
                "state": {"secrets": {}},
                "applied_delta_ids": [],
            }
        ]
    }

    report = ContinuityImpactAnalyzer().compare(
        composition,
        composition,
        cause_type="approved_delta",
        cause_ids=["delta-a1"],
    )

    assert report["affected_items"] == []
    assert report["affected_count"] == 0
