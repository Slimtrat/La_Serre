import { cleanup, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ReleaseCandidate } from "@features/release";
import type { ReleaseCandidateApi, ReleaseCandidateSnapshot } from "@features/release/model";
import { renderWithStudio } from "../../../src/test";

const snapshot = (overrides: Partial<ReleaseCandidateSnapshot> = {}): ReleaseCandidateSnapshot => ({
  episode: { id: "S01E001", title: "The greenhouse" },
  id: "release-S01E001", revision: 3, version: 1, status: "draft", stale: false, staleReason: null,
  technical: { ready: true, verified: true, width: 1080, height: 1920, durationSeconds: 50, fps: 24, safeAreaSubtitles: true, blockers: [] },
  approval: { approved: false, approvedAt: null, approvedBy: null, note: null },
  caption: "{title} wakes.", renderedCaption: "The greenhouse wakes.", selectedCoverShotId: "S01E001-S01", selectedCoverUrl: "/cover-1.png",
  coverOptions: [{ shotId: "S01E001-S01", url: "/cover-1.png", sha256: "cover-1" }, { shotId: "S01E001-S02", url: "/cover-2.png", sha256: "cover-2" }],
  assets: [
    { kind: "master", url: "/master.mp4", filename: "reel.mp4", sha256: "master-sha", valid: true },
    { kind: "cover", url: "/cover-1.png", filename: "cover.png", sha256: "cover-1", valid: true },
    { kind: "subtitles", url: "/subtitles.srt", filename: "subtitles.srt", sha256: "subs-sha", valid: true },
  ],
  provenance: [{ source: "master", revision: "source-r1", sha256: "master-sha", createdAt: "2026-09-30" }],
  exports: [{ id: "export-1", version: 1, createdAt: "2026-09-30", directory: "release/v1", links: { "reel.mp4": "/exports/export-1/reel.mp4", "release.json": "/exports/export-1/release.json" } }],
  canRefresh: true, canApprove: true, canExport: false,
  ...overrides,
});

function api(value = snapshot()): ReleaseCandidateApi {
  return {
    get: vi.fn().mockResolvedValue(value), createOrRefresh: vi.fn().mockResolvedValue({}), update: vi.fn().mockResolvedValue({}),
    approve: vi.fn().mockResolvedValue({}), exportPack: vi.fn().mockResolvedValue({}),
  };
}

afterEach(cleanup);

describe("ReleaseCandidate", () => {
  it("offers candidate creation after a clean 404 state", async () => {
    const adapter = api(snapshot({ id: null, revision: 0, status: "missing", canApprove: false, canExport: false, assets: [], exports: [] }));
    renderWithStudio(<ReleaseCandidate api={adapter} episodeId="S01E001" locale="en" />);
    const surface = await screen.findByRole("main");
    expect(surface.getAttribute("data-release-status")).toBe("missing");
    fireEvent.click(within(surface).getByRole("button", { name: "Create or refresh" }));
    await waitFor(() => expect(adapter.createOrRefresh).toHaveBeenCalledWith("S01E001"));
  });

  it("separates ffprobe readiness from human approval and exposes previews and immutable downloads", async () => {
    const adapter = api();
    renderWithStudio(<ReleaseCandidate api={adapter} episodeId="S01E001" locale="en" />);
    const surface = await screen.findByRole("main");
    expect(surface.querySelector('[data-release-technical-ready="true"]')).toBeTruthy();
    expect(surface.querySelector('[data-release-human-approved="false"]')).toBeTruthy();
    expect(screen.getByText(/does not judge the story/)).toBeTruthy();
    expect(screen.getByText("The greenhouse wakes.")).toBeTruthy();
    expect(screen.getByLabelText("Vertical master")).toBeTruthy();
    expect(screen.getByAltText("Cover").getAttribute("src")).toBe("/cover-1.png");
    expect(surface.querySelectorAll("[data-release-download]").length).toBeGreaterThanOrEqual(5);
    expect((screen.getByRole("button", { name: "Export release pack" }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Approve this version" }));
    await waitFor(() => expect(adapter.approve).toHaveBeenCalledWith("S01E001", 3));
  });

  it("updates the caption and selected cover with optimistic revision guards", async () => {
    const adapter = api();
    renderWithStudio(<ReleaseCandidate api={adapter} episodeId="S01E001" locale="en" />);
    const caption = await screen.findByRole("textbox", { name: "Publishing caption" });
    fireEvent.change(caption, { target: { value: "A stronger caption." } });
    fireEvent.click(screen.getByRole("button", { name: "Cover 2" }));
    fireEvent.click(screen.getByRole("button", { name: "Save caption and cover" }));
    await waitFor(() => expect(adapter.update).toHaveBeenCalledWith("S01E001", { captionTemplate: "A stronger caption.", coverShotId: "S01E001-S02", expectedRevision: 3 }));
  });

  it("marks stale approval explicitly and keeps export blocked", async () => {
    const adapter = api(snapshot({ status: "stale", stale: true, staleReason: "Master fingerprint changed.", approval: { approved: true, approvedAt: "2026-09-30", approvedBy: null, note: null }, canApprove: false, canExport: false }));
    renderWithStudio(<ReleaseCandidate api={adapter} episodeId="S01E001" locale="en" />);
    const alert = await screen.findByRole("alert");
    expect(alert.hasAttribute("data-release-stale")).toBe(true);
    expect(alert.textContent).toContain("Master fingerprint changed");
    expect((screen.getByRole("button", { name: "Export release pack" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("exports only a technically ready human-approved revision", async () => {
    const adapter = api(snapshot({ status: "approved", approval: { approved: true, approvedAt: "2026-09-30", approvedBy: "owner", note: null }, canApprove: false, canExport: true }));
    renderWithStudio(<ReleaseCandidate api={adapter} episodeId="S01E001" locale="en" />);
    fireEvent.click(await screen.findByRole("button", { name: "Export release pack" }));
    await waitFor(() => expect(adapter.exportPack).toHaveBeenCalledWith("S01E001", 3));
  });
});
