@id:canonical-bible @area:world @maturity:stable
@source:engine/world/bible.py @source:engine/world/catalog.py
@doc:docs/architecture.md
Feature: Canonical story Bible

  @python:tests/test_bible.py
  Scenario: Keep identities and relationships internally consistent
    Given a project has canonical characters and locations
    When the Bible is validated and persisted
    Then duplicate identities and invalid relationship references are rejected

  @python:tests/test_bible.py
  Scenario: Detect generated artifacts affected by a canon change
    Given generated artifacts depend on the current Bible revision
    When canonical character data changes
    Then the dependent artifacts are reported as stale
