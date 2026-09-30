@id:character-casting @area:casting @maturity:beta
@source:apps/api/casting_generator.py @source:apps/api/casting_routes.py
@doc:docs/casting-board.md
Feature: Character casting and visual masters

  @frontend:frontend/tests/features/casting/CastingBoard.test.tsx @browser:tests/browser/guided_casting_integration.mjs
  Scenario: Compare generated casting candidates with provenance
    Given a canonical character needs a visual identity
    When the creator opens the casting board
    Then candidates expose their source and generation provenance for comparison

  @frontend:frontend/tests/features/casting/CastingBoard.test.tsx @python:tests/test_casting_generator.py
  Scenario: Promote a candidate only with explicit approval
    Given one or more visual candidates exist
    When the creator explicitly approves a candidate
    Then it becomes the character master and the affected production scope is reported
