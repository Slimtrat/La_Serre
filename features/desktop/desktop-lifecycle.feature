@id:desktop-lifecycle @area:desktop @maturity:stable
@source:apps/desktop/lifecycle.py @source:apps/desktop/tray.py
@doc:docs/desktop-lifecycle.md
Feature: Native desktop lifecycle

  @python:tests/test_desktop_lifecycle.py
  Scenario: Keep the studio running in the background when supported
    Given the desktop runtime has a native tray
    When the creator chooses background close
    Then the window hides while the process stays alive and can be restored

  @python:tests/test_desktop_lifecycle.py
  Scenario: Persist an explicit quit preference safely
    Given the close-choice dialog is visible
    When the creator remembers a quit decision
    Then the preference is versioned and the window is destroyed only after resolution
