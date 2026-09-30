# Episode production cockpit

The production cockpit is the operator-facing surface for turning an approved episode
breakdown into an assemblable episode. It presents the complete episode rather than
requiring users to manipulate workflow nodes or JSON files.

## Product contract

For an episode containing six to ten ordered shots, the cockpit must:

- show each shot, its expected media, existing physical artifacts, approval state,
  blockers, queue work, and relevant history;
- make the next valid actions explicit, including producing missing media, retrying one
  failed item, approving a keyframe, and assembling an eligible episode;
- preserve completed work and approvals when another shot fails or is retried;
- derive assembly readiness from the persisted episode, artifact, approval, and queue
  state instead of from optimistic client state;
- recover the same state after a browser reload and a backend process restart.

The canonical read model is `GET /api/episodes/{episode_id}/production-cockpit`. Mutations
use the action method, target, and body returned by that read model. This lets the backend
remain the authority for preconditions while the client stays a transparent operator
surface.

## Automated evidence boundary

`tests/browser/episode_production_cockpit.mjs` runs through the public Studio UI against a
real FastAPI process. It exercises the real episode catalog, production cockpit projection,
persistent production queue, generation manifests, approval hashes, and files stored below
the isolated output directory. It also opens the same project through a second FastAPI
process to prove that the state is read from disk rather than retained only in browser or
process memory.

Only the external generation-engine boundary is simulated. The test double implements the
small ComfyUI HTTP surface used by the application and writes deterministic placeholder
image/video responses. One request fails once so that the browser test can verify isolated
recovery. This is integration evidence for orchestration and persistence; it is not evidence
of image composition, animation, character consistency, audio naturalness, or any other
artistic property.

## Quality claims kept separate

Passing the cockpit scenario proves that work can be queued, inspected, approved, retried,
persisted, and brought to assembly readiness without losing unrelated work. A release claim
still requires generation with the intended local models and a human review of the rendered
episode. The feature-readiness report must therefore keep the cockpit at `beta` until the
real-engine golden path and its artistic review are repeatable.
