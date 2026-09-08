import { orvalFetch } from "@shared/api";

import type {
  RelationshipBoardSnapshot,
  RelationshipState,
  SecretState,
  StudioLocale,
  SummaryCandidate,
} from "./model";

const BOARD_URL = "/api/relationship-board";

export function getRelationshipBoard(): Promise<RelationshipBoardSnapshot> {
  return orvalFetch(BOARD_URL, { method: "GET" });
}

export function saveRelationship(
  revision: number,
  relationship: RelationshipState,
  note: string,
): Promise<RelationshipBoardSnapshot> {
  return orvalFetch(
    `${BOARD_URL}/relationships/${encodeURIComponent(relationship.id)}`,
    {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        expected_revision: revision,
        confirmed_by_user: true,
        note,
        relationship,
      }),
    },
  );
}

export function saveSecret(
  revision: number,
  secret: SecretState,
  note: string,
): Promise<RelationshipBoardSnapshot> {
  return orvalFetch(`${BOARD_URL}/secrets/${encodeURIComponent(secret.id)}`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      expected_revision: revision,
      confirmed_by_user: true,
      note,
      secret,
    }),
  });
}

export function createSummaryCandidate(
  revision: number,
  relationshipIds: readonly string[],
  secretIds: readonly string[],
  locale: StudioLocale,
): Promise<SummaryCandidate> {
  return orvalFetch(`${BOARD_URL}/summary-candidates`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      expected_revision: revision,
      relationship_ids: relationshipIds,
      secret_ids: secretIds,
      locale,
    }),
  });
}
