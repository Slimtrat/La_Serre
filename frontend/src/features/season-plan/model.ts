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

export const EMPTY_SEASON_PLAN_ITEM: SeasonPlanItemFields = {
  title: "", logline: "", synopsis: "", cliffhanger: "", character_ids: [], location_ids: [],
};

export function editableFields(item: SeasonPlanItem): SeasonPlanItemFields {
  return { title: item.title, logline: item.logline, synopsis: item.synopsis, cliffhanger: item.cliffhanger, character_ids: item.character_ids, location_ids: item.location_ids };
}
