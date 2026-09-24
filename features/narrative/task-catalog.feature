@id:narrative-task-catalog @area:narrative @maturity:beta
@source:engine/narrative/tasks/catalog.py @source:engine/narrative/tasks/provider.py
@doc:docs/narrative-task-specs.md
Feature: Versioned narrative task specifications

  @python:tests/test_narrative_tasks.py
  Scenario: Resolve a task with a versioned contract
    Given narrative task specifications are registered in the catalog
    When a workflow resolves a named task version
    Then its input, output, and provider contract is deterministic

  @python:tests/test_narrative_tasks.py
  Scenario: Validate structured provider output
    Given a narrative provider returns a candidate payload
    When the task parses the response
    Then malformed or incomplete structured output is rejected
