@id:reel-release-candidate @area:production @maturity:beta
@source:engine/production/release.py @source:apps/api/release_candidate_routes.py @source:frontend/src/features/release/ReleaseCandidate.tsx
@doc:docs/reel-release-candidate.md
Feature: Validate and export an immutable Tentafruit Reel release candidate

  @python:tests/test_release_candidate.py
  Scenario: Reject an incomplete or technically invalid candidate
    Given an episode has no valid 9 by 16 work master or renderable release source
    When the release candidate readiness is evaluated
    Then technical validation reports the missing or invalid deliverables
    And the candidate cannot be approved or exported

  @browser:tests/browser/episode_release_candidate.mjs
  Scenario: Require an explicit human decision before exporting real files
    Given a complete candidate contains a probed 1080 by 1920 release Reel, cover, subtitles, caption, provenance, and safe-area metadata
    When the operator explicitly approves the release candidate and exports it
    Then the persisted candidate is exported through the real backend
    And every required pack file is downloadable and non-empty
    And the interface states that artistic quality remains a human judgement

  @browser:tests/browser/episode_release_candidate.mjs
  Scenario: Preserve an exported pack and invalidate approval after a source change
    Given an approved candidate has already been exported
    When a production source changes and the release candidate is opened after a backend restart
    Then the candidate is stale and requires a new human approval
    And the previously exported version remains unchanged
    And a later export uses a new version instead of overwriting it
