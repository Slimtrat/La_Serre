import { afterEach, describe, expect, it, vi } from "vitest";

import { decodeReleaseCandidate, releaseCandidateApi } from "@features/release/api";

afterEach(() => vi.unstubAllGlobals());

describe("release candidate adapter", () => {
  it("decodes the revisioned backend contract without equating technical readiness with approval", () => {
    const candidate = decodeReleaseCandidate({
      schema_version: 1,
      id: "release-S01E001",
      episode_id: "S01E001",
      revision: 4,
      state: "draft",
      render_profile: { id: "reel", name: "Reel", width: 1080, height: 1920, fps: 24, video_codec: "h264", min_duration: 30, max_duration: 60, safe_area: { top: 120, right: 80, bottom: 200, left: 80 } },
      source: { revision: "source-revision", master_sha256: "source-master-sha", manifest_sha256: "manifest-sha", episode_sha256: "episode-sha", duration: 50, width: 576, height: 1024, verified_at: "2026-09-30T10:00:00Z" },
      reel: { source_revision: "source-revision", url: "/api/episodes/S01E001/release-candidate/media/reel.mp4", sha256: "reel-sha", duration: 50, width: 1080, height: 1920, fps: 24, video_codec: "h264", audio_codec: "aac", rendered_at: "2026-09-30T10:01:00Z" },
      master_url: "/api/episodes/S01E001/release-candidate/media/reel.mp4",
      cover: { shot_id: "S01E001-S03", source_sha256: "cover-sha", url: "/api/cover.png" },
      caption_template: "A greenhouse wakes up.",
      caption: "A greenhouse wakes up. #tentafruit",
      subtitles_url: "/api/subtitles.srt",
      stale_reasons: [],
      technical: { ready: true, verified: true, safe_area_subtitles: true },
      exports: [{ id: "export-1", version: 1, created_at: "2026-09-30T11:00:00Z", directory: "release/v1", links: { "reel.mp4": "/api/episodes/S01E001/release-candidate/exports/export-1/reel.mp4" } }],
    });

    expect(candidate).toEqual(expect.objectContaining({ id: "release-S01E001", revision: 4, status: "draft", caption: "A greenhouse wakes up.", canApprove: true, canExport: false }));
    expect(candidate.technical).toEqual(expect.objectContaining({ ready: true, verified: true, width: 1080, height: 1920, durationSeconds: 50, fps: 24 }));
    expect(candidate.approval.approved).toBe(false);
    expect(candidate.selectedCoverShotId).toBe("S01E001-S03");
    expect(candidate.assets).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: "master", url: "/api/episodes/S01E001/release-candidate/media/reel.mp4", sha256: "reel-sha" }),
      expect.objectContaining({ kind: "subtitles", url: "/api/subtitles.srt" }),
    ]));
    expect(candidate.exports[0]?.links["reel.mp4"]).toContain("export-1/reel.mp4");
    expect(candidate.provenance).toEqual(expect.arrayContaining([
      expect.objectContaining({ source: "source master", sha256: "source-master-sha" }),
      expect.objectContaining({ source: "release reel", sha256: "reel-sha" }),
    ]));
  });

  it("normalizes a missing candidate and sends revision guards on every existing-candidate mutation", async () => {
    const fetch = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ detail: "Not found" }), { status: 404, headers: { "Content-Type": "application/json" } }))
      .mockImplementation(async () => new Response("{}", { status: 200, headers: { "Content-Type": "application/json" } }));
    vi.stubGlobal("fetch", fetch);

    expect((await releaseCandidateApi.get("S01E001")).status).toBe("missing");
    await releaseCandidateApi.createOrRefresh("S01E001");
    await releaseCandidateApi.update("S01E001", { captionTemplate: "New caption", coverShotId: "S01E001-S02", expectedRevision: 7 });
    await releaseCandidateApi.approve("S01E001", 8);
    await releaseCandidateApi.exportPack("S01E001", 9);

    expect(fetch.mock.calls.map((call) => call[0])).toEqual([
      "/api/episodes/S01E001/release-candidate",
      "/api/episodes/S01E001/release-candidate",
      "/api/episodes/S01E001/release-candidate",
      "/api/episodes/S01E001/release-candidate/approve",
      "/api/episodes/S01E001/release-candidate/export",
    ]);
    const createCall = fetch.mock.calls[1];
    const updateCall = fetch.mock.calls[2];
    const approveCall = fetch.mock.calls[3];
    const exportCall = fetch.mock.calls[4];
    if (!createCall || !updateCall || !approveCall || !exportCall) throw new Error("Expected all release mutations");
    expect(JSON.parse(String((createCall[1] as RequestInit).body))).toEqual({});
    expect(JSON.parse(String((updateCall[1] as RequestInit).body))).toEqual({ caption_template: "New caption", cover_shot_id: "S01E001-S02", expected_revision: 7 });
    expect(JSON.parse(String((approveCall[1] as RequestInit).body))).toEqual({ expected_revision: 8 });
    expect(JSON.parse(String((exportCall[1] as RequestInit).body))).toEqual({ expected_revision: 9 });
  });
});
