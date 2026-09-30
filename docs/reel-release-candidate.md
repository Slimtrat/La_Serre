# Tentafruit Reel release candidate

The release candidate is the product boundary between a completed episode production and
a pack that an operator may publish manually. A rendered MP4, a completed production queue,
or a green automated test is not an approval to publish.

## Pack contract

An exported version is an immutable directory containing these non-empty files:

- `reel.mp4`: a release render probed as 1080 x 1920, with the expected duration and video format;
- `cover.png`: the selected or generated cover;
- `subtitles.srt`: the final subtitle track;
- `caption.txt`: an editable proposed caption;
- `release.json`: source revisions, checksums, generation provenance, render profile, safe-area
  metadata, technical checks, human approval, and export identity.

The Tentafruit Reel render profile keeps important visual content and subtitles inside its
configured safe areas. The manifest records the effective margins so that the check is
inspectable instead of being an undocumented rendering convention.

The production work master may remain at 576 x 1024. Candidate creation renders that source
deterministically to a separate 1080 x 1920 H.264 Reel with audio, then probes the rendered
file. The source master is preserved and remains visible in provenance; merely renaming a
work file cannot satisfy the release gate.

Export is append-only. Once a version is exported, a later export receives a new versioned
directory and never overwrites or mutates the earlier pack. If a contributing source changes
after approval, the candidate becomes stale and requires a new explicit approval. That does
not invalidate or rewrite the historical exported pack.

## Three distinct decisions

The product and its CI evidence deliberately keep these claims separate:

1. **Technical validation** is automated. It checks the real files, hashes, required pack
   contents, ffprobe dimensions and duration, source revision, and safe-area metadata.
2. **Publication approval** is a persisted human decision. The API and UI must reject export
   until an operator explicitly approves the current source revision. Production completion
   alone cannot create that decision.
3. **Artistic quality** is not certified by automation. Character consistency, animation,
   dialogue performance, music, pacing, comedy, and commercial suitability remain human
   review criteria. The release UI must say so plainly.

The caption is only a proposal and remains editable. This milestone performs no Instagram or
other social-network publication.

## Acceptance evidence

`tests/test_release_candidate.py` exercises the domain and media boundary with small local
FFmpeg/ffprobe fixtures. It proves that a renamed or empty file is not accepted, validates the
1080 x 1920 profile, safe-area metadata, required pack files, approval revision, stale state,
and immutable versioning. It downloads no model and does not contact an AI service.

`tests/browser/episode_release_candidate.mjs` drives the public React surface against the real
FastAPI application, filesystem persistence, and release exporter. It creates tiny media
fixtures locally with FFmpeg, keeps any external AI boundary deterministic, approves through
the UI, downloads every pack file, changes a source, restarts FastAPI, and confirms that the
old version is preserved while the current candidate is stale. This is release-workflow
evidence, not an artistic-quality score.
