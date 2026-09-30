@id:shot-generation @area:generation @maturity:experimental
@source:engine/production/shot_pipeline.py @source:engine/generation/comfy/executor.py
@doc:docs/comfyui.md
Feature: Traceable shot generation

  @python:tests/test_shot_pipeline.py
  Scenario: Generate a keyframe and clip with provenance
    Given a shot has resolved direction and generation profiles
    When the local image and video engines complete the shot pipeline
    Then keyframe and clip artifacts are written with traceable generation records

  @python:tests/test_shot_pipeline.py
  Scenario: Preserve separate character references in a multi-character shot
    Given several characters have approved visual masters
    When the shot workflow is assembled
    Then each master is mapped to a separate reference input
