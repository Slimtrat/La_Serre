@id:guided-studio-journey @area:studio @maturity:beta
@source:apps/api/studio_snapshot.py @source:apps/api/studio_routes.py
@doc:docs/studio-journey-snapshot.md
Feature: Evidence-based guided studio journey

  @python:tests/test_studio_snapshot.py @frontend:frontend/tests/features/guided-journey/GuidedJourney.test.tsx
  Scenario: Resume at the first incomplete production stage
    Given a project has persisted narrative and production state
    When the guided journey snapshot is loaded
    Then it reports every stage and selects the first actionable incomplete stage

  @python:tests/test_studio_snapshot.py
  Scenario: Never infer engine capability from reachability alone
    Given ComfyUI responds but model and workflow capability evidence is absent
    When runtime readiness is evaluated
    Then image and video generation remain locked while manual import stays available

  @python:tests/test_studio_snapshot.py
  Scenario: Keep non-final masters out of release readiness
    Given an animatic or unverified generated clip exists
    When release readiness is computed
    Then the episode is not reported as a release-ready final master
