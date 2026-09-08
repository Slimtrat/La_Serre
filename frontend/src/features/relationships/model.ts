export type StudioLocale = "fr" | "en";

export interface RelationshipCharacter {
  readonly id: string;
  readonly name: string;
}

export interface EditProvenance {
  readonly source: "legacy" | "template" | "manual" | "import";
  readonly note: string;
}

export interface RelationshipState {
  readonly id: string;
  readonly source: string;
  readonly target: string;
  readonly label: string;
  readonly summary: string;
  readonly desire: number;
  readonly trust: number;
  readonly anger: number;
  readonly fear: number;
  readonly attachment: number;
  readonly jealousy: number;
  readonly toxicity: number;
  readonly provenance: EditProvenance;
}

export interface SecretState {
  readonly id: string;
  readonly owners: readonly string[];
  readonly known_by: readonly string[];
  readonly hidden_from: readonly string[];
  readonly summary: string;
  readonly severity: number;
  readonly created_episode: number;
  readonly revealed: boolean;
  readonly provenance: EditProvenance;
}

export interface BibleChange {
  readonly revision: number;
  readonly changed_at: string;
  readonly entity_type: string;
  readonly entity_id: string;
  readonly operation: "create" | "update" | "delete" | "replace";
}

export interface RelationshipImpact {
  readonly affected_episodes: readonly string[];
  readonly affected_shots: readonly string[];
  readonly artifact_count: number;
}

export interface RelationshipBoardSnapshot {
  readonly bible_revision: number;
  readonly updated_at: string;
  readonly characters: readonly RelationshipCharacter[];
  readonly relationships: readonly RelationshipState[];
  readonly secrets: readonly SecretState[];
  readonly history: readonly BibleChange[];
  readonly impact: RelationshipImpact;
}

export interface SummaryCandidate {
  readonly id: string;
  readonly base_revision: number;
  readonly status: "candidate";
  readonly summary: string;
  readonly relationship_ids: readonly string[];
  readonly secret_ids: readonly string[];
  readonly provenance: {
    readonly provider: "deterministic";
    readonly method: "relationship-board-v1";
    readonly canonical: false;
  };
}

export const RELATIONSHIP_AXES = [
  "desire",
  "trust",
  "anger",
  "fear",
  "attachment",
  "jealousy",
  "toxicity",
] as const;

export type RelationshipAxis = (typeof RELATIONSHIP_AXES)[number];

export function emptyRelationship(
  source: string,
  target: string,
): RelationshipState {
  return {
    id: `${source}-vers-${target}`,
    source,
    target,
    label: "",
    summary: "",
    desire: 0,
    trust: 0,
    anger: 0,
    fear: 0,
    attachment: 0,
    jealousy: 0,
    toxicity: 0,
    provenance: { source: "manual", note: "" },
  };
}

export function emptySecret(owner: string): SecretState {
  return {
    id: `secret-${Date.now()}`,
    owners: owner ? [owner] : [],
    known_by: owner ? [owner] : [],
    hidden_from: [],
    summary: "",
    severity: 0.5,
    created_episode: 1,
    revealed: false,
    provenance: { source: "manual", note: "" },
  };
}
