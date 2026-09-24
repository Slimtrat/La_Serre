@id:season-planning @area:narrative @maturity:stable
@source:engine/narrative/season_plan.py @source:apps/api/season_routes.py
@doc:docs/season-plan.md
Feature: Revisioned season planning

  @python:tests/test_season_plan.py @frontend:frontend/tests/features/season-plan/SeasonPlanBoard.test.tsx
  Scenario: Create, reorder, duplicate, and materialize episodes
    Given a season plan has a current revision
    When the creator edits its ordered episode cards
    Then stable episode identities survive reordering and materialization

  @python:tests/test_season_plan.py @frontend:frontend/tests/features/season-plan/SeasonPlanBoard.test.tsx
  Scenario: Support a one-episode season
    Given the creator wants a singleton production
    When a one-item season plan is created and materialized
    Then the episode persists and reloads as a valid season

  @frontend:frontend/tests/features/season-plan/SeasonPlanBoard.test.tsx
  Scenario: Keep AI season proposals outside canon until acceptance
    Given an AI proposal was generated from a known plan revision
    When the creator reviews the proposal diff
    Then stale proposals are blocked and accepted proposals require an explicit decision
