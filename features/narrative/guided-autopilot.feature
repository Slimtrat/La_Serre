@id:guided-story-autopilot @area:narrative @maturity:experimental
@source:engine/narrative/guided_autopilot.py @source:apps/api/guided_autopilot_routes.py
@doc:docs/frontend-guided-journey.md
Feature: Guided autonomous story development

  @python:tests/test_guided_autopilot.py
  Scenario: Preserve the locked story throughout autonomous stages
    Given a creator supplied and locked a source story
    When autonomous narrative stages generate successive candidates
    Then each stage receives the locked story and persists its own candidate

  @python:tests/test_guided_autopilot.py
  Scenario: Stop lossy output at a machine gate
    Given a generated breakdown omits required story information
    When the production gate evaluates the candidate
    Then the candidate is rejected and its failures are included in the repair prompt
