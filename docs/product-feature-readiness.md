# Product feature readiness

La Serre keeps its product inventory as English Gherkin contracts under `features/`.
These files are living documentation, but they are also validated inputs to CI: a feature
cannot appear green merely because its description exists.

## Contract

Each `.feature` file declares one product capability:

```gherkin
@id:episode-production @area:production @maturity:stable
@source:engine/production/episode_pipeline.py
@doc:docs/episode-production-contract.md
Feature: Release-safe episode assembly

  @python:tests/test_episode_pipeline.py
  Scenario: A still image can only produce an animatic
    Given an approved story with one still image
    When the episode is assembled
    Then the result is marked ANIMATIC and cannot be released
```

Required feature tags are `id`, `area`, and `maturity`. `source` and `doc` tags point to
versioned implementation and documentation files. Every scenario must use Given/When/Then
and declare at least one automated evidence tag:

- `python:<path>` for a pytest file found in the Python JUnit report;
- `frontend:<path>` for a Vitest file found in the frontend JUnit report;
- `browser:<path>` for a Playwright scenario found in `browser-results.json`.

## Status rules

The report has four explicit states:

- `verified`: all declared files exist and every scenario has passing evidence;
- `failed`: at least one observed test or browser scenario failed;
- `not_run`: the evidence exists in the repository but was not observed for this revision;
- `missing`: a declared source, document, or evidence file does not exist.

`python -m tools.feature_report` writes both Markdown and JSON. CI publishes the Markdown in
the job summary and keeps both formats as artifacts. Strict mode fails when any feature is not
verified, so the matrix is an enforcement gate rather than a manually maintained progress bar.

## Adding a feature

Add or update the implementation, automated test, documentation, and `.feature` contract in
the same pull request. Do not point a scenario at a broad test suite that does not exercise its
behavior. External GPU quality remains a documented limitation and must never be represented as
verified by mocked engines.
