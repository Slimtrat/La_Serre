@id:episode-music @area:audio @maturity:beta
@source:engine/audio/score.py @source:apps/api/episode_music_routes.py
@doc:docs/hybrid-pipeline.md
Feature: Episode score generation and import

  @python:tests/test_episode_music_routes.py
  Scenario: Generate or import an episode score
    Given an episode needs background music
    When the creator generates a score or imports an existing track
    Then the track is stored as an episode music asset

  @python:tests/test_episode_music_routes.py
  Scenario: Record music usage rights
    Given a music asset may have external licensing constraints
    When its rights metadata is saved
    Then the production record retains the declared usage rights
