import { cleanup, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { EpisodeProductionCockpit } from "@features/production";
import type { EpisodeProductionApi, EpisodeProductionSnapshot, ShotProductionState } from "@features/production/model";
import { renderWithStudio } from "../../../src/test";

const makeShot = (overrides: Partial<ShotProductionState> = {}): ShotProductionState => ({
  id: "S01E001-S01",
  position: 1,
  title: "Shot 1",
  action: "Hiva crosses the greenhouse.",
  durationSeconds: 5,
  readiness: "complete",
  blocker: null,
  nextAction: "Reroll video",
  previewUrl: "/api/media/S01E001-S01/clip.mp4",
  previewKind: "video",
  stale: false,
  error: null,
  artifacts: [
    { kind: "keyframe", required: false, present: true, approved: true, stale: false, url: "/keyframe.png", sha256: "keyframe-sha", error: null, provenance: { source: "generated", model: "sdxl", workflow: "keyframe-v1", seed: 42, revision: "r1" } },
    { kind: "video", required: true, present: true, approved: true, stale: false, url: "/clip.mp4", sha256: "video-sha", error: null, provenance: { source: "generated", model: "local-video", workflow: "video-v1", seed: 42, revision: "r1" } },
    { kind: "voice", required: false, present: false, approved: false, stale: false, url: null, sha256: null, error: null, provenance: { source: null, model: null, workflow: null, seed: null, revision: null } },
  ],
  actions: [{ kind: "reroll", artifact: "video", enabled: true, reason: null, queueItemId: null, runId: null }],
  queueItems: [],
  history: [{ id: "old-run", current: false, status: "GENERATED", createdAt: "2026-09-29", keyframeUrl: "/old.png", videoUrl: "/old.mp4", audioUrl: null }],
  payload: { id: "S01E001-S01" },
  ...overrides,
});

const makeSnapshot = (shots: readonly ShotProductionState[] = [makeShot()]): EpisodeProductionSnapshot => ({
  episode: { id: "S01E001", title: "Hiva's greenhouse" },
  capabilities: { manualImport: true, keyframeGeneration: true, videoGeneration: true, voiceGeneration: true },
  shots,
  master: { canAssemble: true, blocker: null, exists: false, status: null, releaseEligible: false, videoUrl: null, manifestUrl: null, subtitlesUrl: null, jobId: null, jobStatus: null, jobMessage: null, jobProgress: 0 },
  queue: { paused: false, recovered: false, progress: 0 },
  completedShots: shots.filter((shot) => shot.readiness === "complete").length,
  totalShots: shots.length,
});

function api(snapshot = makeSnapshot()): EpisodeProductionApi {
  return {
    get: vi.fn().mockResolvedValue(snapshot),
    produceMissing: vi.fn().mockResolvedValue({}),
    enqueue: vi.fn().mockResolvedValue({}),
    approve: vi.fn().mockResolvedValue({}),
    retry: vi.fn().mockResolvedValue({}),
    restore: vi.fn().mockResolvedValue({}),
    importAsset: vi.fn().mockResolvedValue({}),
    assemble: vi.fn().mockResolvedValue({}),
  };
}

beforeEach(() => vi.clearAllMocks());
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("EpisodeProductionCockpit", () => {
  it("shows per-shot media, provenance, readiness and aggregate actions without requiring the graph", async () => {
    const adapter = api();
    renderWithStudio(<EpisodeProductionCockpit api={adapter} episodeId="S01E001" locale="en" />);
    const root = await screen.findByRole("main");
    expect(root.hasAttribute("data-production-cockpit")).toBe(true);
    expect(root.querySelector('[data-production-readiness]')?.getAttribute("data-assemblable")).toBe("true");
    const card = root.querySelector('[data-shot-id="S01E001-S01"]');
    expect(card?.getAttribute("data-shot-status")).toBe("complete");
    if (!card) throw new Error("Shot card missing");
    fireEvent.click(within(card as HTMLElement).getByText("Provenance and versions"));
    expect(within(card as HTMLElement).getByText(/local-video/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Produce missing" }));
    await waitFor(() => expect(adapter.produceMissing).toHaveBeenCalledWith("S01E001"));
    expect(screen.queryByRole("button", { name: "Inspect pipeline" })).toBeNull();
  });

  it("retries one failed queue item while preserving inspection of the other cards", async () => {
    const failed = makeShot({
      id: "S01E001-S02", position: 2, title: "Shot 2", readiness: "failed", error: "Recoverable engine failure",
      actions: [],
      queueItems: [{ id: "queue-failed", shotId: "S01E001-S02", kind: "keyframe", status: "failed", message: "Failed", progress: 20, error: "Recoverable engine failure" }],
    });
    const adapter = api(makeSnapshot([makeShot(), failed]));
    renderWithStudio(<EpisodeProductionCockpit api={adapter} episodeId="S01E001" locale="en" />);
    expect(await screen.findByText("Recoverable engine failure")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Retry/ }));
    await waitFor(() => expect(adapter.retry).toHaveBeenCalledWith("queue-failed"));
    expect(document.querySelectorAll("[data-shot-id]")).toHaveLength(2);
  });

  it("requires confirmation before rerolling or restoring an approved source", async () => {
    const adapter = api();
    renderWithStudio(<EpisodeProductionCockpit api={adapter} episodeId="S01E001" locale="en" />);
    fireEvent.click(await screen.findByRole("button", { name: "Reroll video" }));
    expect(adapter.enqueue).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Create a new variant" }));
    await waitFor(() => expect(adapter.enqueue).toHaveBeenCalledWith(expect.objectContaining({ id: "S01E001-S01" }), "video", true));
    fireEvent.click(screen.getByText("Provenance and versions"));
    fireEvent.click(screen.getByRole("button", { name: "Restore" }));
    fireEvent.click(screen.getByRole("button", { name: "Create a new variant" }));
    await waitFor(() => expect(adapter.restore).toHaveBeenCalledWith("S01E001-S01", "old-run"));
  });

  it("forwards explicit confirmation when importing over an approved source", async () => {
    const adapter = api();
    const file = new window.File(["replacement"], "replacement.png", { type: "image/png" });
    class ImportFormData {
      get(name: string) {
        if (name === "artifact") return "keyframe";
        if (name === "file") return file;
        return null;
      }
    }
    vi.stubGlobal("FormData", ImportFormData);
    renderWithStudio(<EpisodeProductionCockpit api={adapter} episodeId="S01E001" locale="en" />);
    await screen.findByRole("main");
    const importForm = screen.getByRole("button", { name: "Import" }).closest("form");
    if (!importForm) throw new Error("Import form missing");
    fireEvent.submit(importForm);
    expect(adapter.importAsset).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Create a new variant" }));
    await waitFor(() => expect(adapter.importAsset).toHaveBeenCalledWith(
      "S01E001-S01",
      "keyframe",
      file,
      true,
    ));
  });

  it("offers setup and manual import when generation is blocked", async () => {
    const blocked = makeShot({
      readiness: "blocked", blocker: "Video runtime unavailable.", previewUrl: null, previewKind: null,
      actions: [{ kind: "setup", artifact: null, enabled: true, reason: null, queueItemId: null, runId: null }],
    });
    const adapter = api(makeSnapshot([blocked]));
    const openSetup = vi.fn();
    renderWithStudio(<EpisodeProductionCockpit api={adapter} episodeId="S01E001" locale="en" onOpenSetup={openSetup} />);
    fireEvent.click(await screen.findByRole("button", { name: "Open setup" }));
    expect(openSetup).toHaveBeenCalledOnce();
    expect(screen.getAllByText("Import")).not.toHaveLength(0);
  });
});
