@id:live-workflow-graph @area:observability @maturity:beta
@source:apps/api/workflow_graph.py @source:apps/api/graph_contract.py
@doc:docs/live-graph-observability.md
Feature: Live production workflow graph

  @python:tests/test_workflow_graph.py
  Scenario: Show real production nodes and bindings
    Given a project and episode have production state
    When the graph read model is requested
    Then it exposes real nodes, edges, bindings, and their current states

  @python:tests/test_studio_activity.py
  Scenario: Reflect active work in the graph
    Given a production operation emits studio activity
    When its lifecycle advances
    Then the graph can represent progress without treating ComfyUI as the user interface
