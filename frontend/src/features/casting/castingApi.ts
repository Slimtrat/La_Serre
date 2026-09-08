import { orvalFetch } from "@shared/api";

export type VariantKind = "portrait" | "full_body" | "expression";
export type VariantStatus = "candidate" | "approved" | "rejected";

export interface VisualVariant {
  id: string;
  character_id: string;
  kind: VariantKind;
  status: VariantStatus;
  media_url: string;
  permanent_identity: string;
  outfit: string;
  transient_state: string;
  provenance: {
    source: "generated" | "imported";
    source_label: string;
    model: string | null;
    workflow: string | null;
    seed: number | null;
    license: string;
    revision: string | null;
  };
}

export interface CharacterIdentity {
  character_id: string;
  active_master_id: string | null;
  variants: VisualVariant[];
}

export interface CastingBoardPayload {
  revision: number;
  characters: CharacterIdentity[];
}

export interface GateResult {
  board: CastingBoardPayload;
  affected?: { shot_ids: string[]; rendered_shot_ids: string[] };
  regeneration_started?: boolean;
}

export const getCasting = () =>
  orvalFetch<CastingBoardPayload>("/api/casting", { method: "GET" });

export function importVariant(
  characterId: string,
  revision: number,
  input: {
    file: File;
    kind: VariantKind;
    permanentIdentity: string;
    outfit: string;
    transientState: string;
    license: string;
  },
) {
  const params = new URLSearchParams({
    expected_revision: String(revision),
    kind: input.kind,
    permanent_identity: input.permanentIdentity,
    outfit: input.outfit,
    transient_state: input.transientState,
    license: input.license,
    source_label: input.file.name,
  });
  return orvalFetch<{ board: CastingBoardPayload; variant: VisualVariant }>(
    `/api/casting/${encodeURIComponent(characterId)}/variants/import?${params}`,
    {
      method: "POST",
      body: input.file,
      headers: { "Content-Type": input.file.type },
    },
  );
}

export function generateVariant(
  characterId: string,
  input: {
    expected_revision: number;
    kind: VariantKind;
    permanent_identity: string;
    outfit: string;
    transient_state: string;
    prompt: string;
    model: string;
    workflow: string;
    seed: number;
    license: string;
  },
) {
  return orvalFetch<{ board: CastingBoardPayload; variant: VisualVariant }>(
    `/api/casting/${encodeURIComponent(characterId)}/variants/generate`,
    {
      method: "POST",
      body: JSON.stringify(input),
      headers: { "Content-Type": "application/json" },
    },
  );
}

export function reviewVariant(
  action: "approve" | "reject" | "restore",
  characterId: string,
  variantId: string,
  revision: number,
) {
  return orvalFetch<GateResult>(
    `/api/casting/${encodeURIComponent(characterId)}/variants/${encodeURIComponent(variantId)}/${action}`,
    {
      method: "POST",
      body: JSON.stringify({ expected_revision: revision }),
      headers: { "Content-Type": "application/json" },
    },
  );
}
