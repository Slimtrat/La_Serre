@id:episode-assembly @area:production @maturity:experimental
@source:engine/production/episode_pipeline.py @source:engine/media/ffmpeg.py
@doc:docs/episode-production-contract.md
Feature: Quality-gated episode assembly

  @python:tests/test_episode_pipeline.py
  Scenario: Distinguish animatics, previews, and final masters
    Given an episode contains a mixture of verified and fallback visual media
    When its shots are assembled
    Then the manifest reports ANIMATIC, PREVIEW, or FINAL according to actual evidence

  @python:tests/test_episode_pipeline.py
  Scenario: Reject unsafe dialogue timing and frozen final video
    Given dialogue and visual streams have measurable durations
    When overlaps, excessive time fitting, or a nearly frozen final master are detected
    Then final delivery is blocked instead of hiding the quality failure
