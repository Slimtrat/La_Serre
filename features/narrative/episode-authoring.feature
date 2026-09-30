@id:episode-authoring @area:narrative @maturity:beta
@source:engine/narrative/episode_models.py @source:apps/api/episode_routes.py
@doc:docs/narrative-authoring.md
Feature: Human-controlled episode authoring

  @python:tests/test_narrative_authoring.py @frontend:frontend/tests/features/episode-authoring/EpisodeAuthoring.test.tsx
  Scenario: Review and approve a script before breakdown
    Given an editable episode draft exists
    When the creator reviews and approves its current revision
    Then the approved script can be broken down without silently bypassing the review gate

  @frontend:frontend/tests/features/episode-authoring/EpisodeAuthoring.test.tsx @browser:tests/browser/episode_authoring_smoke.mjs
  Scenario: Enforce shot constraints in the episode editor
    Given an episode breakdown is open for editing
    When the creator reorders shots or assigns on-screen speakers
    Then the shot budget and character-presence constraints are enforced
