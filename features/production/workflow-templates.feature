@id:workflow-template-catalog @area:generation @maturity:stable
@source:engine/generation/comfy/workflow_templates.py @source:apps/api/workflow_template_routes.py
@doc:docs/workflow-templates.md
Feature: Validated generation workflow templates

  @python:tests/test_workflow_templates.py
  Scenario: Publish loadable image and continuity profiles
    Given the built-in workflow template catalog is available
    When profiles and their manifest are written
    Then each profile is loadable and the continuity chain is complete

  @python:tests/test_workflow_templates.py
  Scenario: Keep optional model requirements out of default readiness
    Given optional generation templates require additional models
    When default runtime readiness is calculated
    Then optional models do not make the standard path appear broken
