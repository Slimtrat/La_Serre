@id:project-management @area:projects @maturity:stable
@source:apps/api/projects.py @source:apps/api/project_storage_routes.py
@doc:docs/architecture.md
Feature: Isolated project management

  @python:tests/test_projects.py
  Scenario: Create and select an isolated project
    Given the creator needs a separate production workspace
    When a project is created and selected
    Then its content and runtime state remain isolated from other projects

  @python:tests/test_project_storage.py
  Scenario: Remove a project without risking unrelated files
    Given a project is no longer needed
    When the creator removes it from the studio
    Then only the validated project directory can be deleted
