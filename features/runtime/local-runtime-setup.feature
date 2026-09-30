@id:local-runtime-setup @area:runtime @maturity:beta
@source:engine/runtime/capability_packs.py @source:engine/runtime/pack_job.py
@doc:docs/tentafruit-local-pack.md @doc:docs/setup-wizard.md
Feature: Recoverable local AI runtime setup

  @python:tests/test_runtime_pack_install.py @frontend:frontend/tests/features/setup/SetupWizard.test.tsx
  Scenario: Install a capability pack safely and resume it
    Given the creator accepted required licenses and selected a destination
    When installation is paused, restarted, or resumed
    Then completed atomic steps are reused and partial downloads are not published

  @python:tests/test_runtime_pack_install.py
  Scenario: Fail before unsafe downloads or publication
    Given disk space, checksums, archives, and component smoke checks are validated
    When any safety check fails
    Then the exact component is reported and no corrupt artifact becomes installed

  @frontend:frontend/tests/features/setup/SetupWizard.test.tsx @browser:tests/browser/setup_wizard_smoke.mjs
  Scenario: Preserve manual creation when engines are unavailable
    Given local runtime diagnosis fails
    When the creator continues without engines
    Then the manual studio journey remains accessible with explicit limitations
