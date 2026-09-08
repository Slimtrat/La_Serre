# Casting board and master visual identities

La Serre 0.2.13 stores the casting board inside the active project's private workspace at `world/visual-identities.json`. Image bytes are immutable files under `world/visual-identities/media/`; they are never committed to the application repository.

## Identity contract

A variant separates the character's permanent identity from outfit and transient state. Its status is `candidate`, `approved`, or `rejected`. Multiple historically approved variants may remain restorable, but `active_master_id` is the single master used for new shots.

Every variant records source, source label, model, workflow, seed, source revision, license, and SHA-256. Imports and generated images follow the same review lifecycle. Imports accept PNG, JPEG, and WebP up to 25 MiB.

## Compatibility and migration

The board is a versioned additive contract (`schema_version: 1`). An unversioned early board is read as version 1 without rewriting the source file; the next explicit mutation persists the version. Existing 0.2.13 `CharacterProfile.visual_references` remain resolved by the Bible for legacy shots. They are not silently promoted into masters because their license and human approval provenance are unknown.

## Human gate and propagation

Importing or generating creates a candidate only. `approve` and `restore` require an explicit request with the current board revision. A conflicting revision returns HTTP 409. Rejecting the active master is forbidden.

Changing a master returns the affected shot and rendered-shot identifiers with `regeneration_started: false`. Existing plans and renders are not silently changed. A later breakdown injects the active master's private reference path into each matching `ShotCharacter.reference_images`.

## Runtime capability

`POST /api/casting/{character_id}/variants/generate` uses an injected visual generator. If the installation has no casting generator, it returns 503 and explains that import remains available. It never records a candidate without real image bytes. This keeps the full approval workflow usable on CPU-only installations while allowing ComfyUI or another generator to be attached without changing the domain contract.

## API summary

- `GET /api/casting` and `GET /api/casting/{character_id}`
- `POST /api/casting/{character_id}/variants/import`
- `POST /api/casting/{character_id}/variants/generate`
- `POST /api/casting/{character_id}/variants/{variant_id}/approve`
- `POST /api/casting/{character_id}/variants/{variant_id}/reject`
- `POST /api/casting/{character_id}/variants/{variant_id}/restore`
- `GET /api/casting/{character_id}/variants/{variant_id}/content`

The React board is available in the Casting step of the guided creation route. It supports portrait, full-body, and expression candidates, side-by-side selection, provenance inspection, and explicit approval/restoration.
