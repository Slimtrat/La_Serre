import { orvalFetch } from "@shared/api";

import type { ContinuityApi, ContinuityCategory, ContinuityEvidence, ContinuityImpactItem, ContinuityImpactReport, ContinuitySeverity, EpisodeContinuitySnapshot, EpisodeDeltaChange, EpisodeStateDeltaProposal, SeriesStateEntry } from "./model";

type Json = Record<string, unknown>;
const record = (value: unknown): Json => value && typeof value === "object" ? value as Json : {};
const text = (value: unknown, fallback = "") => typeof value === "string" ? value : fallback;
const number = (value: unknown, fallback = 0) => typeof value === "number" ? value : fallback;
const array = (value: unknown) => Array.isArray(value) ? value : [];
const category = (value: unknown): ContinuityCategory => ["fact", "knowledge", "secret", "relationship", "objective", "visual", "thread"].includes(text(value)) ? text(value) as ContinuityCategory : "fact";
const severity = (value: unknown): ContinuitySeverity => ["blocker", "warning", "suggestion"].includes(text(value)) ? text(value) as ContinuitySeverity : "warning";

function evidence(value: unknown): ContinuityEvidence {
  const source = record(value); const sourceType = text(source.source_type);
  return {
    source_id: text(source.source_id ?? source.id ?? source.reference), source_type: ["episode", "delta", "bible", "season_plan"].includes(sourceType) ? sourceType as ContinuityEvidence["source_type"] : text(source.source) === "bible" ? "bible" : "episode",
    label: text(source.label ?? source.reference), excerpt: text(source.excerpt ?? source.reason),
  };
}
function stateEntry(value: unknown, index: number): SeriesStateEntry {
  const source = record(value);
  return { id: text(source.id, `state-${index}`), category: category(source.category), subject_id: text(source.subject_id), label: text(source.label), value: text(source.value), evidence: array(source.evidence).map(evidence) };
}
function change(value: unknown, index: number): EpisodeDeltaChange {
  const source = record(value); const operation = text(source.operation);
  return {
    id: text(source.id, `change-${index}`), category: category(source.category),
    operation: ["add", "update", "remove", "resolve"].includes(operation) ? operation as EpisodeDeltaChange["operation"] : "update",
    subject_id: text(source.subject_id), label: text(source.label), before: typeof source.before === "string" ? source.before : null,
    after: typeof source.after === "string" ? source.after : null, evidence: array(source.evidence ?? source.causes).map(evidence),
  };
}
function stateEntries(input: Json): readonly SeriesStateEntry[] {
  const direct = input.entries ?? input.facts;
  if (Array.isArray(direct)) return direct.map(stateEntry);
  const state = record(input.state ?? input);
  const categories: readonly [string, ContinuityCategory][] = [
    ["facts", "fact"], ["knowledge", "knowledge"], ["revealed_secrets", "secret"], ["relationships", "relationship"],
    ["objectives", "objective"], ["object_states", "visual"], ["visual_states", "visual"], ["open_threads", "thread"], ["resolved_threads", "thread"],
  ];
  return categories.flatMap(([key, kind]) => Object.entries(record(state[key])).map(([entryKey, value], index) => ({
    id: `${key}-${entryKey}-${index}`, category: kind, subject_id: entryKey, label: entryKey,
    value: typeof value === "string" ? value : JSON.stringify(value), evidence: [],
  })));
}
function deltaChanges(source: Json): readonly EpisodeDeltaChange[] {
  if (Array.isArray(source.changes)) return source.changes.map(change);
  const delta = record(source.delta); const allEvidence = array(delta.evidence).map(evidence);
  const evidenceById = new Map(allEvidence.map((item) => [item.source_id, item]));
  const categories: readonly [string, ContinuityCategory, EpisodeDeltaChange["operation"]][] = [
    ["facts", "fact", "update"], ["knowledge", "knowledge", "add"], ["secrets_revealed", "secret", "add"],
    ["relationships", "relationship", "update"], ["objectives", "objective", "update"], ["object_states", "visual", "update"],
    ["visual_states", "visual", "update"], ["threads_opened", "thread", "add"], ["threads_resolved", "thread", "resolve"],
  ];
  return categories.flatMap(([key, kind, operation]) => array(delta[key]).map((value, index) => {
    const mutation = record(value); const mutationKey = text(mutation.key ?? mutation.fact_id ?? mutation.objective_id, `${key}-${index}`);
    const subject = text(mutation.character_id ?? mutation.subject_id, mutationKey);
    return {
      id: `${key}-${subject}-${mutationKey}`, category: kind, operation, subject_id: subject, label: mutationKey,
      before: null, after: text(mutation.value ?? mutation.description ?? mutation.status),
      evidence: array(mutation.evidence_ids).map((id) => evidenceById.get(text(id))).filter((item): item is ContinuityEvidence => item !== undefined),
    };
  }));
}
function proposal(value: unknown): EpisodeStateDeltaProposal | null {
  if (!value) return null;
  const source = record(value); const provenance = record(source.provenance); const status = text(source.status);
  return {
    id: text(source.id), episode_id: text(source.episode_id), revision: number(source.revision),
    source_fingerprint: text(source.source_fingerprint), current_source_fingerprint: text(source.current_source_fingerprint ?? source.source_fingerprint),
    stale: source.stale === true, status: ["approved", "refused"].includes(status) ? status as "approved" | "refused" : "proposed",
    changes: deltaChanges(source),
    findings: array(source.findings).map((value) => {
      const finding = record(value);
      return { code: text(finding.code), severity: severity(finding.severity), message: text(finding.message), cause_ids: array(finding.cause_ids).map((item) => text(item)).filter(Boolean) };
    }),
    provenance: { task_id: text(provenance.task_id, "continuity_delta"), task_version: text(provenance.task_version, "unknown"), model: text(provenance.model, "manual"), source_fingerprint: text(provenance.source_fingerprint ?? source.source_fingerprint) },
  };
}
function impactItem(value: unknown): ContinuityImpactItem {
  const source = record(value); const causes = array(source.causes).map((value) => record(value));
  const changedFields = array(source.changed_fields).map((item) => text(item)).filter(Boolean);
  return {
    season_item_id: text(source.season_item_id), episode_id: typeof source.episode_id === "string" ? source.episode_id : null,
    title: text(source.title, text(source.season_item_id)), severity: severity(source.severity),
    reasons: array(source.reasons).map((item) => text(item)).filter(Boolean).concat(changedFields.length ? [`Changed: ${changedFields.join(", ")}`] : [], causes.map((cause) => `${text(cause.type, "cause")}: ${text(cause.id)}`)),
    evidence: array(source.evidence).map(evidence).concat(causes.map((cause) => ({ source_id: text(cause.id), source_type: "delta" as const, label: text(cause.type, "cause"), excerpt: "" }))),
  };
}
function impactReport(value: unknown): ContinuityImpactReport {
  const report = record(value); const reportTrigger = text(report.trigger ?? record(report.cause).type);
  return { trigger: reportTrigger.includes("reorder") ? "reorder" : reportTrigger === "source_edit" ? "source_edit" : "delta", generated_at: text(report.generated_at), affected_items: array(report.affected_items ?? report.items).map(impactItem) };
}
function decode(value: unknown): EpisodeContinuitySnapshot {
  const source = record(value); const input = record(source.input_state ?? source.state_before); const report = source.impact_report ? record(source.impact_report) : null;
  const decodedProposal = proposal(source.proposal);
  const currentFingerprint = text(source.current_source_fingerprint ?? source.source_fingerprint);
  return {
    episode_id: text(source.episode_id), revision: number(source.revision), source_fingerprint: currentFingerprint,
    input_state: { revision: number(input.revision ?? source.revision), before_episode_id: text(input.before_episode_id ?? source.episode_id), entries: stateEntries(input) },
    proposal: decodedProposal ? { ...decodedProposal, current_source_fingerprint: decodedProposal.current_source_fingerprint || currentFingerprint } : null,
    impact_report: report ? impactReport(report) : null,
  };
}
const endpoint = (episodeId: string) => `/api/continuity/episodes/${encodeURIComponent(episodeId)}`;
const command = <T,>(url: string, body?: unknown) => orvalFetch<T>(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });

export const continuityApi: ContinuityApi = {
  async getEpisodeContinuity(episodeId) {
    const [snapshot, impact] = await Promise.all([
      orvalFetch<unknown>(endpoint(episodeId), { method: "GET" }),
      orvalFetch<unknown>(`/api/continuity/impact?episode_id=${encodeURIComponent(episodeId)}`, { method: "GET" }),
    ]);
    return decode({ ...record(snapshot), impact_report: impact });
  },
  async generateDelta(episodeId) { return decode(await command<unknown>(`${endpoint(episodeId)}/proposal/generate`)); },
  async approveDelta(episodeId, proposalId, payload) { return decode(await command<unknown>(`${endpoint(episodeId)}/proposals/${encodeURIComponent(proposalId)}/approve`, payload)); },
  async refuseDelta(episodeId, proposalId, payload) { return decode(await command<unknown>(`${endpoint(episodeId)}/proposals/${encodeURIComponent(proposalId)}/refuse`, payload)); },
  async previewReorder(payload) { return impactReport(await command<unknown>("/api/continuity/impact/reorder", { expected_plan_revision: payload.expected_plan_revision, item_ids: [...payload.item_ids] })); },
};
