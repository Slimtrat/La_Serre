import { afterEach, describe, expect, it, vi } from "vitest";

import { decodeProductionCockpit, productionApi } from "@features/production/api";
import type { ShotProductionState } from "@features/production/model";

const artifact = (kind: "keyframe" | "video" | "voice", overrides = {}) => ({
  kind,
  required: kind !== "keyframe",
  present: true,
  approved: true,
  source: "generated",
  url: `/media/${kind}`,
  sha256: `${kind}-sha`,
  provenance: { model: "local-model", workflow: "active-profile", seed: 42 },
  stale: false,
  ...overrides,
});

afterEach(() => vi.unstubAllGlobals());

describe("decodeProductionCockpit", () => {
  it("preserves backend completeness, capabilities, actions, queue errors, and master readiness", () => {
    const snapshot = decodeProductionCockpit({
      schema_version: 1,
      episode: { id: "S01E001", title: "Episode one" },
      revision: "revision-1",
      capabilities: { image: true, video: true, voice: false, manual_import: true },
      readiness: { total_shots: 1, complete_shots: 1, assemblable: true },
      master: {
        available: true,
        status: "FINAL",
        release_eligible: true,
        url: "/api/episode-media/S01E001/episode.mp4",
        manifest_url: "/api/episode-media/S01E001/episode-generation.json",
        job: { id: "job-1", status: "FINAL", message: "Ready", progress: { percent: 100 } },
      },
      shots: [{
        id: "S01E001-S01",
        index: 1,
        duration: 5,
        shot: { id: "S01E001-S01", action: "The character opens the door." },
        status: "complete",
        stale: false,
        artifacts: { keyframe: artifact("keyframe"), video: artifact("video"), voice: artifact("voice", { required: false }) },
        blockers: [],
        next_actions: [
          { code: "REROLL_VIDEO", label: "Reroll video", method: "POST", target: "/enqueue", enabled: true, body: { kind: "video" } },
          { code: "RESTORE_RUN", label: "Restore this version", method: "POST", target: "/api/history/S01E001-S01/run-old/restore" },
        ],
        queue_items: [{ id: "queue-1", shot_id: "S01E001-S01", kind: "video", status: "failed", message: "Engine failed", progress: 32, error: "timeout" }],
        history: [{ id: "run-old", current: false, status: "GENERATED", created_at: "2026-09-30T10:00:00Z", media: { video: "/history/clip.mp4" } }],
      }],
      blockers: [],
      next_actions: [],
    });

    expect(snapshot.capabilities).toEqual({ manualImport: true, keyframeGeneration: true, videoGeneration: true, voiceGeneration: false });
    expect(snapshot.shots[0]?.readiness).toBe("complete");
    expect(snapshot.shots[0]?.actions).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: "reroll", artifact: "video" }),
      expect.objectContaining({ kind: "restore", runId: "run-old" }),
    ]));
    expect(snapshot.shots[0]?.queueItems[0]).toEqual(expect.objectContaining({ id: "queue-1", error: "timeout" }));
    expect(snapshot.master).toEqual(expect.objectContaining({ canAssemble: true, exists: true, releaseEligible: true, videoUrl: "/api/episode-media/S01E001/episode.mp4", jobProgress: 100 }));
  });

  it("keeps a queued card queued and exposes the backend blocker instead of guessing from URLs", () => {
    const snapshot = decodeProductionCockpit({
      episode: { id: "S01E001" },
      capabilities: { image: false, video: false, voice: false, manual_import: true },
      readiness: { total_shots: 1, complete_shots: 0, assemblable: false },
      master: { available: false },
      shots: [{
        id: "S01E001-S01", index: 1, duration: 4, shot: { id: "S01E001-S01" }, status: "queued",
        artifacts: {
          keyframe: artifact("keyframe", { present: false, approved: false, url: null }),
          video: artifact("video", { present: false, approved: false, url: null }),
          voice: artifact("voice", { required: false, present: false, approved: false, url: null }),
        },
        blockers: [{ code: "VIDEO_RUNTIME_UNAVAILABLE", message: "Import a video or open setup.", resolutions: [{ code: "OPEN_SETUP", label: "Open setup", method: "GET", target: "#/settings" }] }],
        next_actions: [],
        queue_items: [], history: [],
      }],
    });
    expect(snapshot.shots[0]).toEqual(expect.objectContaining({ readiness: "queued", blocker: "Import a video or open setup." }));
    expect(snapshot.shots[0]?.actions[0]).toEqual(expect.objectContaining({ kind: "setup" }));
  });

  it("uses guarded cockpit mutations for rerolls, confirmed imports, and assembly", async () => {
    const fetch = vi.fn().mockImplementation(async () => new Response("{}", { status: 202, headers: { "Content-Type": "application/json" } }));
    vi.stubGlobal("fetch", fetch);
    const shot = { id: "S01E001-S01" } as ShotProductionState;
    await productionApi.enqueue(shot, "keyframe", true);
    await productionApi.importAsset(
      "S01E001-S01",
      "video",
      new File(["video"], "clip.mp4", { type: "video/mp4" }),
      true,
    );
    await productionApi.assemble("S01E001", { allowStills: false, force: false, width: 1080, height: 1920, fps: 24, tts: "auto" });
    const firstCall = fetch.mock.calls[0];
    const secondCall = fetch.mock.calls[1];
    const thirdCall = fetch.mock.calls[2];
    if (!firstCall || !secondCall || !thirdCall) throw new Error("Expected three guarded API calls");
    expect(firstCall[0]).toBe("/api/episodes/S01E001/production-cockpit/shots/S01E001-S01/enqueue");
    expect(JSON.parse(String((firstCall[1] as RequestInit).body))).toEqual(expect.objectContaining({ kind: "keyframe", confirm_replace_approved: true }));
    expect(String(secondCall[0])).toContain("/api/assets/S01E001-S01/video?");
    expect(String(secondCall[0])).toContain("confirm_replace_approved=true");
    expect(thirdCall[0]).toBe("/api/episodes/S01E001/production-cockpit/assemble");
  });
});
