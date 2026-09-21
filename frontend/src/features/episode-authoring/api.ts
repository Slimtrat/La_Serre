import {
  approveEpisodeApiEpisodesEpisodeIdApprovePost,
  applyEpisodeDraftApiEpisodesEpisodeIdDraftApplyPost,
  generateEpisodeBreakdownApiEpisodesEpisodeIdBreakdownGeneratePost,
  generateEpisodeDraftApiEpisodesEpisodeIdDraftGeneratePost,
  getEpisodeApiEpisodesEpisodeIdGet,
  reviewEpisodeApiEpisodesEpisodeIdReviewPost,
  updateEpisodeApiEpisodesEpisodeIdPut,
} from "@/generated/openapi";
import { orvalFetch } from "@shared/api";

import type {
  CandidateProvenance, EpisodeAuthoringApi, EpisodeBreakdownCandidate,
  EpisodeDraftCandidate, EpisodeEntity, EpisodeFormatOutput, EpisodeRecord, EpisodeShot,
  EpisodeSnapshot, EpisodeStory, GeneratedCandidate, ReviewReport, ShotBlueprint,
} from "./model";

type Json = Record<string, unknown>;
const object = (value: unknown): Json => value !== null && typeof value === "object" && !Array.isArray(value) ? value as Json : {};
const string = (value: unknown, fallback = "") => typeof value === "string" ? value : fallback;
const number = (value: unknown, fallback = 0) => typeof value === "number" && Number.isFinite(value) ? value : fallback;
const list = (value: unknown): unknown[] => Array.isArray(value) ? value : [];
const strings = (value: unknown): string[] => list(value).filter((item): item is string => typeof item === "string");
const required = (value: unknown, label: string): string => {
  if (typeof value !== "string" || !value.trim()) throw new Error(`Invalid episode response: missing ${label}`);
  return value;
};
const positiveInteger = (value: unknown, label: string): number => {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1) throw new Error(`Invalid episode response: missing ${label}`);
  return value;
};

function formatOutput(value: unknown): EpisodeFormatOutput {
  const source = object(value);
  const output = {
    shot_count_min: positiveInteger(source.shot_count_min, "format_output.shot_count_min"),
    shot_count_max: positiveInteger(source.shot_count_max, "format_output.shot_count_max"),
    duration_seconds_min: positiveInteger(source.duration_seconds_min, "format_output.duration_seconds_min"),
    duration_seconds_max: positiveInteger(source.duration_seconds_max, "format_output.duration_seconds_max"),
  };
  if (output.shot_count_min > output.shot_count_max || output.duration_seconds_min > output.duration_seconds_max) {
    throw new Error("Invalid episode response: reversed format_output bounds");
  }
  return output;
}

function story(value: unknown): EpisodeStory {
  const source = object(value);
  return { hook: string(source.hook), setup: string(source.setup), conflict: string(source.conflict), reveal: string(source.reveal), cliffhanger: string(source.cliffhanger) };
}

function entity(value: unknown): EpisodeEntity {
  const source = object(value);
  return { id: string(source.id), name: string(source.name, string(source.id)) };
}

function shot(value: unknown): EpisodeShot {
  const source = object(value);
  const camera = object(source.camera);
  const dialogue = source.dialogue == null ? null : object(source.dialogue);
  const performance = object(dialogue?.performance);
  return {
    id: string(source.id), duration: number(source.duration), location: string(source.location),
    characters: list(source.characters).map(entity),
    camera: { shot_type: string(camera.shot_type), movement: string(camera.movement), lens: string(camera.lens, "50mm") },
    action: string(source.action),
    dialogue: dialogue ? { speaker: string(dialogue.speaker), text: string(dialogue.text), mode: string(dialogue.mode, "on_screen"), performance: dialogue.performance ? { intention: string(performance.intention), emotion: string(performance.emotion) } : null } : null,
    lighting: string(source.lighting), mood: string(source.mood), style: strings(source.style),
  };
}

export function decodeEpisodeSnapshot(value: unknown): EpisodeSnapshot {
  const packageSource = object(value);
  const source = object(packageSource.episode ?? value);
  const episode: EpisodeRecord = {
    id: required(source.id, "episode.id"), title: string(source.title), logline: string(source.logline),
    narrative_source: string(source.narrative_source), story: story(source.story), status: string(source.status, "idea"),
    duration_target: number(source.duration_target, 30), characters: strings(source.characters), locations: strings(source.locations),
    shot_order: strings(source.shot_order), shot_sources: Object.fromEntries(Object.entries(object(source.shot_sources)).filter((entry): entry is [string, string] => typeof entry[1] === "string")),
  };
  return {
    episode, characters: list(packageSource.characters).map(entity), locations: list(packageSource.locations).map(entity),
    shots: list(packageSource.shots).map(shot),
    breakdown_fingerprint: typeof packageSource.breakdown_fingerprint === "string" ? packageSource.breakdown_fingerprint
      : typeof source.breakdown_fingerprint === "string" ? source.breakdown_fingerprint : null,
    format_output: formatOutput(packageSource.format_output),
  };
}

function draft(value: unknown): EpisodeDraftCandidate {
  const source = object(value);
  return {
    title: required(source.title, "candidate.title"), logline: required(source.logline, "candidate.logline"),
    narrative_source: required(source.narrative_source, "candidate.narrative_source"), story: story(source.story),
    character_ids: strings(source.character_ids), location_ids: strings(source.location_ids),
  };
}

function blueprint(value: unknown): ShotBlueprint {
  const source = object(value);
  const dialogue = source.dialogue == null ? null : object(source.dialogue);
  return {
    source_text: required(source.source_text, "shot.source_text"), duration: number(source.duration),
    location_id: required(source.location_id, "shot.location_id"), character_ids: strings(source.character_ids),
    shot_type: required(source.shot_type, "shot.shot_type"), camera_movement: required(source.camera_movement, "shot.camera_movement"),
    lens: string(source.lens, "50mm"), action: required(source.action, "shot.action"),
    dialogue: dialogue ? { speaker_id: required(dialogue.speaker_id, "shot.dialogue.speaker_id"), text: required(dialogue.text, "shot.dialogue.text"), mode: string(dialogue.mode, "on_screen"), intention: string(dialogue.intention), emotion: string(dialogue.emotion) } : null,
    lighting: required(source.lighting, "shot.lighting"), mood: required(source.mood, "shot.mood"), style: strings(source.style),
  };
}

function breakdown(value: unknown): EpisodeBreakdownCandidate {
  const source = object(value);
  if (!Array.isArray(source.shots) || source.shots.length === 0) throw new Error("Invalid episode response: missing candidate.shots");
  return { shots: source.shots.map(blueprint) };
}

function generated<T>(value: unknown, decode: (candidate: unknown) => T, prompt: string): GeneratedCandidate<T> {
  const source = object(value);
  const execution = object(source.execution);
  return {
    candidate: decode(source.candidate),
    provenance: {
      model: string(execution.model, string(source.model)), task_id: typeof execution.task_id === "string" ? execution.task_id : null,
      task_version: typeof execution.task_version === "number" ? execution.task_version : null,
      input_fingerprint: typeof execution.input_fingerprint === "string" ? execution.input_fingerprint : null,
      prompt,
    },
  };
}

export function decodeReviewReport(value: unknown): ReviewReport {
  const source = object(value);
  const status = string(source.status);
  if (!["pass", "warning", "fail"].includes(status)) throw new Error("Invalid episode review response");
  return {
    episode_id: required(source.episode_id, "review.episode_id"), created_at: string(source.created_at),
    fingerprint: string(source.fingerprint), status: status as ReviewReport["status"], can_approve: source.can_approve === true,
    findings: list(source.findings).map((value) => {
      const item = object(value);
      return { severity: item.severity === "blocker" ? "blocker" as const : "warning" as const, title: string(item.title), recommendation: string(item.recommendation) };
    }),
  };
}

function provenanceFields(provenance?: CandidateProvenance) {
  return provenance ? {
    mode: "ai" as const, model: provenance.model || null, prompt: provenance.prompt,
    task_id: provenance.task_id, task_version: provenance.task_version, input_fingerprint: provenance.input_fingerprint,
  } : { mode: "manual" as const };
}

export const episodeAuthoringApi: EpisodeAuthoringApi = {
  async get(id) { return decodeEpisodeSnapshot(await getEpisodeApiEpisodesEpisodeIdGet(id)); },
  async update(id, patch) {
    await updateEpisodeApiEpisodesEpisodeIdPut(id, {
      ...patch, characters: patch.characters ? [...patch.characters] : undefined,
      locations: patch.locations ? [...patch.locations] : undefined,
    });
    return this.get(id);
  },
  async generateDraft(id, request) {
    const result = await generateEpisodeDraftApiEpisodesEpisodeIdDraftGeneratePost(id, request);
    return generated(result, draft, request.prompt ?? "");
  },
  async applyDraft(id, candidate, provenance) {
    await applyEpisodeDraftApiEpisodesEpisodeIdDraftApplyPost(id, {
      candidate: { ...candidate, story: { ...candidate.story }, character_ids: [...candidate.character_ids], location_ids: [...candidate.location_ids] },
      ...provenanceFields(provenance),
    });
    return this.get(id);
  },
  async review(id) { return decodeReviewReport(await reviewEpisodeApiEpisodesEpisodeIdReviewPost(id)); },
  async approve(id) { await approveEpisodeApiEpisodesEpisodeIdApprovePost(id); return this.get(id); },
  async generateBreakdown(id, request) {
    const result = await generateEpisodeBreakdownApiEpisodesEpisodeIdBreakdownGeneratePost(id, request);
    return generated(result, breakdown, request.prompt ?? "");
  },
  async applyBreakdown(id, candidate, provenance, expectedBreakdownFingerprint) {
    const payload = {
      candidate: { shots: candidate.shots.map((item) => ({ ...item, character_ids: [...item.character_ids], style: [...item.style], dialogue: item.dialogue ? { ...item.dialogue } : null })) },
      ...provenanceFields(provenance), enforce_format: true,
      expected_breakdown_fingerprint: expectedBreakdownFingerprint ?? null,
    };
    await orvalFetch<unknown>(`/api/episodes/${encodeURIComponent(id)}/breakdown/apply`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
    });
    return this.get(id);
  },
};
