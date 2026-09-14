import type { DeleteSeasonPlanItemPayload, ReorderSeasonPlanPayload, RevisionPayload, SaveSeasonPlanItemPayload, SeasonPlanSnapshot } from "./model";

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
}

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
};
import {
  createSeasonPlanItemApiSeasonPlanItemsPost,
  deleteSeasonPlanItemApiSeasonPlanItemsItemIdDelete,
  duplicateSeasonPlanItemApiSeasonPlanItemsItemIdDuplicatePost,
  getSeasonPlanApiSeasonPlanGet,
  materializeSeasonPlanItemApiSeasonPlanItemsItemIdMaterializePost,
  reorderSeasonPlanApiSeasonPlanOrderPut,
  restoreSeasonPlanItemApiSeasonPlanItemsItemIdRestorePost,
  updateSeasonPlanItemApiSeasonPlanItemsItemIdPut,
  type SeasonPlanSnapshot as ApiSeasonPlanSnapshot,
} from "@/generated/openapi";
