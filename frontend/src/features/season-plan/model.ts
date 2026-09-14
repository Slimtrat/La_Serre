export type SeasonPlanStatus = "draft" | "validated" | "materialized" | "produced" | "obsolete";

export interface SeasonPlanItemFields {
  readonly title: string;
  readonly logline: string;
  readonly synopsis: string;
  readonly cliffhanger: string;
  readonly character_ids: readonly string[];
  readonly location_ids: readonly string[];
}

export interface SeasonPlanItem extends SeasonPlanItemFields {
  readonly id: string;
  readonly position: number;
  readonly status: SeasonPlanStatus;
  readonly episode_id: string | null;
  readonly deleted_at: string | null;
  readonly provenance?: unknown;
}

export interface SeasonPlanSnapshot {
  readonly revision: number;
  readonly updated_at: string;
  readonly items: readonly SeasonPlanItem[];
}

export interface RevisionPayload { readonly expected_revision: number; }
export interface SaveSeasonPlanItemPayload extends RevisionPayload { readonly item: SeasonPlanItemFields; }
export interface ReorderSeasonPlanPayload extends RevisionPayload { readonly item_ids: readonly string[]; }
export interface DeleteSeasonPlanItemPayload extends RevisionPayload { readonly decision?: "detach_keep_episode"; }

export interface SeasonProposalItemFields extends SeasonPlanItemFields {
  readonly hook: string;
  readonly conflict: string;
  readonly relationship_shift: string;
  readonly relationship_ids: readonly string[];
  readonly secret_id: string | null;
}

export interface SeasonProposalItem extends SeasonProposalItemFields {
  readonly id: string;
  readonly position: number;
  readonly season: number;
  readonly manually_edited_fields: readonly string[];
}

export interface SeasonProposalIssue {
  readonly code: string;
  readonly item_id: string | null;
  readonly field: string | null;
  readonly message: string;
}

export interface SeasonPlanProposal {
  readonly id: string;
  readonly revision: number;
  readonly base_plan_revision: number;
  readonly source_fingerprint: string;
  readonly current_source_fingerprint: string;
  readonly stale: boolean;
  readonly provenance: { readonly task_id: string; readonly task_version: string; readonly model: string; readonly input_fingerprint: string; };
  readonly validation: { readonly valid: boolean; readonly issues: readonly SeasonProposalIssue[]; };
  readonly items: readonly SeasonProposalItem[];
}

export interface GenerateSeasonProposalPayload { readonly episode_count: number; readonly model?: string; readonly custom_prompt?: string; }
export interface UpdateSeasonProposalPayload extends RevisionPayload { readonly items: readonly SeasonProposalItem[]; }
export interface AcceptSeasonProposalPayload extends RevisionPayload { readonly expected_plan_revision: number; }

export const EMPTY_SEASON_PLAN_ITEM: SeasonPlanItemFields = {
  title: "", logline: "", synopsis: "", cliffhanger: "", character_ids: [], location_ids: [],
};

export const EMPTY_SEASON_PROPOSAL_ITEM: SeasonProposalItemFields = {
  ...EMPTY_SEASON_PLAN_ITEM, hook: "", conflict: "", relationship_shift: "", relationship_ids: [], secret_id: null,
};

export function editableFields(item: SeasonPlanItem): SeasonPlanItemFields {
  return { title: item.title, logline: item.logline, synopsis: item.synopsis, cliffhanger: item.cliffhanger, character_ids: item.character_ids, location_ids: item.location_ids };
}
