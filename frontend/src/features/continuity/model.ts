export type ContinuitySeverity = "blocker" | "warning" | "suggestion";
export type ContinuityCategory = "fact" | "knowledge" | "secret" | "relationship" | "objective" | "visual" | "thread";

export interface ContinuityEvidence {
  readonly source_id: string;
  readonly source_type: "episode" | "delta" | "bible" | "season_plan";
  readonly label: string;
  readonly excerpt: string;
}

export interface SeriesStateEntry {
  readonly id: string;
  readonly category: ContinuityCategory;
  readonly subject_id: string;
  readonly label: string;
  readonly value: string;
  readonly evidence: readonly ContinuityEvidence[];
}

export interface SeriesStateSnapshot {
  readonly revision: number;
  readonly before_episode_id: string;
  readonly entries: readonly SeriesStateEntry[];
}

export interface EpisodeDeltaChange {
  readonly id: string;
  readonly category: ContinuityCategory;
  readonly operation: "add" | "update" | "remove" | "resolve";
  readonly subject_id: string;
  readonly label: string;
  readonly before: string | null;
  readonly after: string | null;
  readonly evidence: readonly ContinuityEvidence[];
}

export interface EpisodeStateDeltaProposal {
  readonly id: string;
  readonly episode_id: string;
  readonly revision: number;
  readonly source_fingerprint: string;
  readonly current_source_fingerprint: string;
  readonly stale: boolean;
  readonly status: "proposed" | "approved" | "refused";
  readonly changes: readonly EpisodeDeltaChange[];
  readonly provenance: {
    readonly task_id: string;
    readonly task_version: string;
    readonly model: string;
    readonly source_fingerprint: string;
  };
}

export interface ContinuityImpactItem {
  readonly season_item_id: string;
  readonly episode_id: string | null;
  readonly title: string;
  readonly severity: ContinuitySeverity;
  readonly reasons: readonly string[];
  readonly evidence: readonly ContinuityEvidence[];
}

export interface ContinuityImpactReport {
  readonly trigger: "delta" | "reorder" | "source_edit";
  readonly generated_at: string;
  readonly affected_items: readonly ContinuityImpactItem[];
}

export interface EpisodeContinuitySnapshot {
  readonly episode_id: string;
  readonly revision: number;
  readonly source_fingerprint: string;
  readonly input_state: SeriesStateSnapshot;
  readonly proposal: EpisodeStateDeltaProposal | null;
  readonly impact_report: ContinuityImpactReport | null;
}

export interface ContinuityDecisionPayload {
  readonly expected_revision: number;
  readonly expected_source_fingerprint: string;
}

export interface ContinuityApi {
  getEpisodeContinuity(episodeId: string): Promise<EpisodeContinuitySnapshot>;
  generateDelta(episodeId: string): Promise<EpisodeContinuitySnapshot>;
  approveDelta(episodeId: string, proposalId: string, payload: ContinuityDecisionPayload): Promise<EpisodeContinuitySnapshot>;
  refuseDelta(episodeId: string, proposalId: string, payload: { readonly expected_revision: number; readonly reason?: string }): Promise<EpisodeContinuitySnapshot>;
  previewReorder(payload: { readonly expected_plan_revision: number; readonly item_ids: readonly string[] }): Promise<ContinuityImpactReport>;
}
