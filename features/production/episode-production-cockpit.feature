@id:episode-production-cockpit @area:production @maturity:beta
@source:apps/api/production_cockpit.py @source:frontend/src/features/production/EpisodeProductionCockpit.tsx
@doc:docs/production-cockpit.md
Feature: Operate episode production from one cockpit

  @browser:tests/browser/episode_production_cockpit.mjs
  Scenario: Recover one failed shot without discarding approved work
    Given an approved episode contains between six and ten ordered shots
    And one external engine request fails while the other shots keep progressing
    When the operator retries only the failed shot and approves each generated keyframe
    Then prior approvals remain valid and every shot becomes independently ready for animation

  @browser:tests/browser/episode_production_cockpit.mjs
  Scenario: Produce missing media and preserve the episode state across restart
    Given generated media and approvals are persisted by the production queue
    When the operator produces only missing work and opens the cockpit after a backend restart
    Then completed physical artifacts are still reported for each shot
    And the cockpit exposes an assembly action only when the episode is assemblable
