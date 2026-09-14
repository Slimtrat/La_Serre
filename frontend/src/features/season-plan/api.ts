import {
  createSeasonPlanItemApiSeasonPlanItemsPost, deleteSeasonPlanItemApiSeasonPlanItemsItemIdDelete,
  duplicateSeasonPlanItemApiSeasonPlanItemsItemIdDuplicatePost, getSeasonPlanApiSeasonPlanGet,
  materializeSeasonPlanItemApiSeasonPlanItemsItemIdMaterializePost, reorderSeasonPlanApiSeasonPlanOrderPut,
  restoreSeasonPlanItemApiSeasonPlanItemsItemIdRestorePost, updateSeasonPlanItemApiSeasonPlanItemsItemIdPut,
  type SeasonPlanSnapshot as ApiSeasonPlanSnapshot,
} from "@/generated/openapi";
import { ApiError, orvalFetch } from "@shared/api";

import type { AcceptSeasonProposalPayload, DeleteSeasonPlanItemPayload, GenerateSeasonProposalPayload, ReorderSeasonPlanPayload, RevisionPayload, SaveSeasonPlanItemPayload, SeasonPlanProposal, SeasonPlanSnapshot, SeasonProposalItem, UpdateSeasonProposalPayload } from "./model";

/** Injected boundary. The concrete OpenAPI adapter is owned by the application shell. */
export interface SeasonPlanApi {
  getPlan(): Promise<SeasonPlanSnapshot>;
  createItem(payload: SaveSeasonPlanItemPayload): Promise<SeasonPlanSnapshot>;
  updateItem(itemId: string, payload: SaveSeasonPlanItemPayload): Promise<SeasonPlanSnapshot>;
  validateItem(itemId: string, payload: RevisionPayload): Promise<SeasonPlanSnapshot>;
  duplicateItem(itemId: string, payload: RevisionPayload): Promise<SeasonPlanSnapshot>;
  deleteItem(itemId: string, payload: DeleteSeasonPlanItemPayload): Promise<SeasonPlanSnapshot>;
  restoreItem(itemId: string, payload: RevisionPayload): Promise<SeasonPlanSnapshot>;
  reorder(payload: ReorderSeasonPlanPayload): Promise<SeasonPlanSnapshot>;
  materializeItem(itemId: string, payload: RevisionPayload): Promise<SeasonPlanSnapshot>;
  getProposal(): Promise<SeasonPlanProposal | null>;
  generateProposal(payload: GenerateSeasonProposalPayload): Promise<SeasonPlanProposal>;
  updateProposal(payload: UpdateSeasonProposalPayload): Promise<SeasonPlanProposal>;
  acceptProposal(payload: AcceptSeasonProposalPayload): Promise<SeasonPlanSnapshot>;
}

type JsonRecord = Record<string, unknown>;
const record = (value: unknown): JsonRecord => value && typeof value === "object" ? value as JsonRecord : {};
const text = (value: unknown, fallback = "") => typeof value === "string" ? value : fallback;
const number = (value: unknown, fallback = 0) => typeof value === "number" ? value : fallback;
const strings = (value: unknown) => Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];

function decodeProposalItem(value: unknown, index: number): SeasonProposalItem {
  const source = record(value);
  return {
    id: text(source.id, `proposal-item-${index + 1}`), position: number(source.position, index + 1), season: number(source.season, 1),
    title: text(source.title), logline: text(source.logline), synopsis: text(source.synopsis), cliffhanger: text(source.cliffhanger),
    hook: text(source.hook), conflict: text(source.conflict), relationship_shift: text(source.relationship_shift ?? source.relationship_stake),
    relationship_ids: strings(source.relationship_ids), secret_id: typeof source.secret_id === "string" ? source.secret_id : null,
    character_ids: strings(source.character_ids), location_ids: strings(source.location_ids),
    manually_edited_fields: strings(source.manually_edited_fields),
  };
}

function decodeProposal(value: unknown): SeasonPlanProposal {
  const source = record(value); const provenance = record(source.provenance); const validation = record(source.validation);
  return {
    id: text(source.id, "current"), revision: number(source.revision), base_plan_revision: number(source.base_plan_revision),
    source_fingerprint: text(source.source_fingerprint), current_source_fingerprint: text(source.current_source_fingerprint),
    stale: source.stale === true,
    provenance: {
      task_id: text(provenance.task_id, "unknown"), task_version: typeof provenance.task_version === "number" || typeof provenance.task_version === "string" ? String(provenance.task_version) : "unknown",
      model: text(provenance.model, "unknown"), input_fingerprint: text(provenance.input_fingerprint ?? source.source_fingerprint, "unknown"),
    },
    validation: {
      valid: validation.valid !== false,
      issues: Array.isArray(validation.issues) ? validation.issues.map((value) => { const issue = record(value); return { code: text(issue.code), item_id: typeof issue.item_id === "string" ? issue.item_id : null, field: typeof issue.field === "string" ? issue.field : null, message: text(issue.message) }; }) : [],
    },
    items: Array.isArray(source.items) ? source.items.map(decodeProposalItem) : [],
  };
}

const proposalItems = (items: readonly SeasonProposalItem[]) => items.map((item, index) => ({ ...item, position: index + 1, character_ids: [...item.character_ids], location_ids: [...item.location_ids], relationship_ids: [...item.relationship_ids] }));

function decodePlan(source: ApiSeasonPlanSnapshot): SeasonPlanSnapshot {
  return {
    revision: source.revision,
    updated_at: source.updated_at,
    items: source.items.map((item) => ({
      id: item.id,
      position: item.position ?? 0,
      title: item.title,
      logline: item.logline ?? "",
      synopsis: item.synopsis ?? "",
      cliffhanger: item.cliffhanger ?? "",
      character_ids: item.character_ids ?? [],
      location_ids: item.location_ids ?? [],
      status: item.lifecycle === "obsolete" ? "obsolete" : item.production_state === "unmaterialized" ? (item.lifecycle ?? "draft") : item.production_state,
      episode_id: item.episode_id ?? null,
      deleted_at: item.deleted_at ?? null,
      provenance: item.provenance,
    })),
  };
}

export const seasonPlanApi: SeasonPlanApi = {
  async getPlan() { return decodePlan(await getSeasonPlanApiSeasonPlanGet()); },
  async createItem(payload) {
    const item = payload.item;
    return decodePlan(await createSeasonPlanItemApiSeasonPlanItemsPost({
      expected_revision: payload.expected_revision,
      season: 1,
      title: item.title || "Nouvel épisode",
      logline: item.logline || "Intention narrative à préciser.",
      synopsis: item.synopsis || "Synopsis de ce nouvel épisode à préciser dans le tableau.",
      cliffhanger: item.cliffhanger,
      character_ids: [...item.character_ids],
      location_ids: [...item.location_ids],
    }));
  },
  async updateItem(itemId, payload) {
    return decodePlan(await updateSeasonPlanItemApiSeasonPlanItemsItemIdPut(itemId, {
      expected_revision: payload.expected_revision,
      ...payload.item,
      character_ids: [...payload.item.character_ids],
      location_ids: [...payload.item.location_ids],
    }));
  },
  async validateItem(itemId, payload) { return decodePlan(await updateSeasonPlanItemApiSeasonPlanItemsItemIdPut(itemId, { ...payload, lifecycle: "validated" })); },
  async duplicateItem(itemId, payload) { return decodePlan(await duplicateSeasonPlanItemApiSeasonPlanItemsItemIdDuplicatePost(itemId, payload)); },
  async deleteItem(itemId, payload) { return decodePlan(await deleteSeasonPlanItemApiSeasonPlanItemsItemIdDelete(itemId, { expected_revision: payload.expected_revision, keep_produced_episode: payload.decision === "detach_keep_episode" })); },
  async restoreItem(itemId, payload) { return decodePlan(await restoreSeasonPlanItemApiSeasonPlanItemsItemIdRestorePost(itemId, payload)); },
  async reorder(payload) { return decodePlan(await reorderSeasonPlanApiSeasonPlanOrderPut({ expected_revision: payload.expected_revision, item_ids: [...payload.item_ids] })); },
  async materializeItem(itemId, payload) { return decodePlan(await materializeSeasonPlanItemApiSeasonPlanItemsItemIdMaterializePost(itemId, { ...payload, duration_target: 45 })); },
  async getProposal() {
    try { return decodeProposal(await orvalFetch<unknown>("/api/season-plan/proposal", { method: "GET" })); }
    catch (reason) { if (reason instanceof ApiError && reason.status === 404) return null; throw reason; }
  },
  async generateProposal(payload) { return decodeProposal(await orvalFetch<unknown>("/api/season-plan/proposal/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })); },
  async updateProposal(payload) { return decodeProposal(await orvalFetch<unknown>("/api/season-plan/proposal", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ expected_revision: payload.expected_revision, items: proposalItems(payload.items) }) })); },
  async acceptProposal(payload) { return decodePlan(await orvalFetch<ApiSeasonPlanSnapshot>("/api/season-plan/proposal/accept", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })); },
};
