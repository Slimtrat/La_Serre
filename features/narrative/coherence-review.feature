@id:coherence-review @area:quality @maturity:beta
@source:engine/narrative/coherence.py @source:apps/api/coherence_routes.py
@doc:docs/narrative-coherence.md
Feature: Narrative coherence review

  @python:tests/test_coherence.py
  Scenario: Review narrative subjects against deterministic canon rules
    Given a character, episode, or shot has a known source revision
    When a coherence review is requested
    Then rule findings are persisted with their reviewed scope and fingerprint

  @python:tests/test_coherence.py
  Scenario: Prevent stale or blocking reports from being silently approved
    Given a coherence report contains blockers or its Bible revision is obsolete
    When approval is attempted
    Then an explicit justified override is required and superseded reports remain unapprovable
