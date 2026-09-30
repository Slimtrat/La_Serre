@id:continuity-consequences @area:continuity @maturity:beta
@source:engine/narrative/tasks/continuity_delta.py @source:apps/api/continuity_routes.py
@doc:docs/episode-continuity.md
Feature: Episode consequence proposals

  @python:tests/test_continuity_api.py @frontend:frontend/tests/features/continuity/EpisodeConsequencesPanel.test.tsx
  Scenario: Compare proposed consequences with the incoming world state
    Given an explicitly approved episode has continuity evidence
    When a consequence delta is proposed
    Then the creator can inspect its evidence and downstream reorder impact

  @python:tests/test_continuity_api.py @frontend:frontend/tests/features/continuity/EpisodeConsequencesPanel.test.tsx
  Scenario: Keep approval and refusal explicit and revisioned
    Given a current consequence proposal exists
    When the creator approves or refuses it
    Then the decision is recorded separately and stale sources cannot be approved
