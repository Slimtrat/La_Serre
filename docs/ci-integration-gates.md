# CI integration gates and evidence

The `Windows desktop CI` workflow runs on every pull request targeting `develop` or `main`. It deliberately has no path filter, so a required check can never remain pending because a revision did not match a file pattern.

## Stable checks

| Check name | Evidence | Runs on |
| --- | --- | --- |
| `Frontend quality and build` | frontend linting, type checks, component tests, boundary tests, and bundle | every pull request |
| `Python quality and tests` | Ruff, mypy, OpenAPI drift, pytest, and mocked generation | every pull request |
| `Browser integration (FastAPI + persistence)` | real Edge, isolated FastAPI, temporary persistence, traces, and logs | every pull request |
| `Feature readiness report` | Gherkin feature catalog reconciled with Python, frontend, and browser evidence | every pull request, even after an upstream failure |
| `Build release candidates` | PyInstaller, version metadata, executable launch, API health, and React assets | dispatch, tag, or push to `main` |

The real GPU benchmark is not executed in GitHub Actions. It must remain explicitly reported as absent and must never be confused with the ComfyUI, TTS, or FFmpeg test doubles.

The persistent pull-request comment reads check runs for the current head SHA. It displays `queued`, `in_progress`, the actual conclusion, or `pending` when a check does not exist yet. `Feature readiness report` is listed directly, while release packaging is explicitly `skipped` on an ordinary pull request.

## Feature readiness report

Product capabilities are documented as English Gherkin files under `features/**/*.feature`. Each scenario links to its implementation or documentation and to one or more automated evidence sources. The report job waits for the frontend, Python, and browser jobs with `if: always()`, downloads all available evidence, and evaluates the catalog with:

```powershell
python -m tools.feature_report --features features `
  --python-junit artifacts/evidence/python/test-results.xml `
  --frontend-junit artifacts/evidence/frontend/frontend-test-results.xml `
  --browser-results artifacts/evidence/browser/browser-results.json `
  --gate "python=<quality-result>" `
  --gate "frontend=<frontend-result>" `
  --gate "browser=<browser-result>" `
  --markdown artifacts/feature-readiness/feature-readiness.md `
  --json artifacts/feature-readiness/feature-readiness.json `
  --strict
```

The generated Markdown is appended to the GitHub Actions step summary. Both Markdown and machine-readable JSON are uploaded even when readiness fails. Release packaging requires this check to succeed, so missing, failed, or unexecuted feature evidence cannot produce a release candidate.

## Browser harness

`python -m tools.run_browser_integration` chooses a free loopback port, starts the real FastAPI application with temporary private/output/download directories, waits for `/health`, runs each Node scenario with a maximum duration, and always stops the server. It publishes:

- `fastapi.log`;
- `playwright.log`;
- `browser-results.json`, consumed by the feature report;
- a Playwright trace;
- a full-page screenshot on failure.

The `guided_casting_integration.mjs` scenario neither routes nor replaces business APIs. It starts from an empty Bible, edits and promotes a character sheet, imports a real image, approves the master, and verifies persistence after reload. External engines are not called.

## Administrative state configured on September 14, 2026

The active `develop branch` and `main branch` rulesets require:

- a pull request, with no bypass actor;
- deletion and force-push protection;
- an up-to-date branch before merge (`strict_required_status_checks_policy`);
- the official GitHub Actions checks `Frontend quality and build`, `Python quality and tests`, and `Browser integration (FastAPI + persistence)`.

Each required check is bound to the official GitHub Actions application (`integration_id` 15368), so a same-named check emitted by another application cannot satisfy branch protection. `Feature readiness report` is an explicit release gate and should be added to the branch rulesets once the workflow has produced its first stable check run. `Build release candidates` is not required for ordinary pull requests because it is intentionally skipped outside release events.
