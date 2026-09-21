import { beforeEach, describe, expect, it, vi } from "vitest";

const calls = vi.hoisted(() => ({
  get: vi.fn(), update: vi.fn(), draft: vi.fn(), applyDraft: vi.fn(),
  review: vi.fn(), approve: vi.fn(), breakdown: vi.fn(), fetch: vi.fn(),
}));

vi.mock("@/generated/openapi", () => ({
  getEpisodeApiEpisodesEpisodeIdGet: calls.get,
  updateEpisodeApiEpisodesEpisodeIdPut: calls.update,
  generateEpisodeDraftApiEpisodesEpisodeIdDraftGeneratePost: calls.draft,
  applyEpisodeDraftApiEpisodesEpisodeIdDraftApplyPost: calls.applyDraft,
  reviewEpisodeApiEpisodesEpisodeIdReviewPost: calls.review,
  approveEpisodeApiEpisodesEpisodeIdApprovePost: calls.approve,
  generateEpisodeBreakdownApiEpisodesEpisodeIdBreakdownGeneratePost: calls.breakdown,
}));
vi.mock("@shared/api", () => ({ orvalFetch: calls.fetch }));

import { decodeEpisodeSnapshot, decodeReviewReport, episodeAuthoringApi } from "@/features/episode-authoring/api";
import { editableBreakdown } from "@/features/episode-authoring/model";

const packageResult = {
  breakdown_fingerprint: "b".repeat(64),
  format_output: { shot_count_min: 2, shot_count_max: 12, duration_seconds_min: 20, duration_seconds_max: 90 },
  episode: {
    id: "S01E001", title: "First", logline: "A story", narrative_source: "The complete story",
    status: "breakdown", duration_target: 8,
    story: { hook: "Hook", setup: "Setup", conflict: "Conflict", reveal: "Reveal", cliffhanger: "End" },
    characters: ["fritz"], locations: ["farm"], shot_order: ["S01E001-S01"],
    shot_sources: { "S01E001-S01": "Fritz waters the garden at dawn." },
  },
  characters: [{ id: "fritz", name: "Fritz" }],
  locations: [{ id: "farm", name: "Farm" }],
  shots: [{ id: "S01E001-S01", duration: 8, location: "farm", characters: [{ id: "fritz", name: "Fritz" }],
    camera: { shot_type: "wide", movement: "static", lens: "50mm" }, action: "Fritz waters the garden",
    dialogue: null, lighting: "dawn", mood: "warm", style: ["storybook"] }],
};

beforeEach(() => {
  calls.get.mockResolvedValue(packageResult);
  calls.fetch.mockResolvedValue(packageResult);
});

describe("episode authoring adapter", () => {
  it("decodes the canonical package and reconstructs an editable breakdown", () => {
    const snapshot = decodeEpisodeSnapshot(packageResult);
    expect(snapshot.characters[0]?.name).toBe("Fritz");
    expect(snapshot.breakdown_fingerprint).toBe("b".repeat(64));
    expect(snapshot.format_output).toEqual({ shot_count_min: 2, shot_count_max: 12, duration_seconds_min: 20, duration_seconds_max: 90 });
    expect(editableBreakdown(snapshot).shots[0]).toMatchObject({
      source_text: "Fritz waters the garden at dawn.", location_id: "farm", camera_movement: "static",
      character_ids: ["fritz"], style: ["storybook"],
    });
  });

  it("rejects a malformed episode and invalid review instead of silently applying defaults", () => {
    expect(() => decodeEpisodeSnapshot({ episode: { title: "Missing id" } })).toThrow(/episode.id/);
    expect(() => decodeEpisodeSnapshot({ ...packageResult, format_output: { ...packageResult.format_output, shot_count_min: 20 } })).toThrow(/format_output/);
    expect(() => decodeEpisodeSnapshot({ ...packageResult, format_output: undefined })).toThrow(/format_output/);
    expect(() => decodeReviewReport({ status: "unknown" })).toThrow(/review/);
  });

  it("preserves generated draft provenance when applying a candidate", async () => {
    const candidate = { title: "First", logline: "Long enough story", narrative_source: "A sufficiently long narrative source.",
      story: packageResult.episode.story, character_ids: ["fritz"], location_ids: ["farm"] };
    calls.draft.mockResolvedValue({ candidate, model: "model-a", execution: { task_id: "episode.draft", task_version: 3,
      model: "model-a", input_fingerprint: "a".repeat(64) } });
    const generated = await episodeAuthoringApi.generateDraft("S01E001", { prompt: "Gentle", source_text: "A source" });
    await episodeAuthoringApi.applyDraft("S01E001", generated.candidate, generated.provenance);
    expect(calls.applyDraft).toHaveBeenCalledWith("S01E001", expect.objectContaining({
      mode: "ai", model: "model-a", prompt: "Gentle", task_id: "episode.draft", task_version: 3,
      input_fingerprint: "a".repeat(64), candidate,
    }));
  });

  it("requests format enforcement for edited breakdowns", async () => {
    const candidate = editableBreakdown(decodeEpisodeSnapshot(packageResult));
    await episodeAuthoringApi.applyBreakdown("S01E001", candidate, undefined, "b".repeat(64));
    const [url, options] = calls.fetch.mock.calls[0] as [string, { body: string }];
    expect(url).toBe("/api/episodes/S01E001/breakdown/apply");
    expect(JSON.parse(options.body)).toMatchObject({ mode: "manual", enforce_format: true,
      expected_breakdown_fingerprint: "b".repeat(64),
      candidate: { shots: [{ source_text: "Fritz waters the garden at dawn." }] } });
    expect(calls.get).toHaveBeenCalledWith("S01E001");
  });
});
