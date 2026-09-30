@id:relationship-board @area:relationships @maturity:beta
@source:apps/api/relationship_board_routes.py @source:engine/world/models.py
@doc:docs/relationship-board.md
Feature: Directional relationships and secrets

  @python:tests/test_relationship_board.py @frontend:frontend/tests/features/relationships/RelationshipBoard.test.tsx
  Scenario: Edit each direction of a relationship independently
    Given two canonical characters have a relationship
    When the creator changes trust, conflict, or affection in one direction
    Then the revisioned relationship keeps the reverse direction independent

  @python:tests/test_relationship_board.py @frontend:frontend/tests/features/relationships/RelationshipBoard.test.tsx
  Scenario: Preview a secret summary without mutating canon
    Given explicit secret knowledge exists between characters
    When an AI-assisted summary is requested
    Then the result remains a non-canonical candidate until human confirmation
