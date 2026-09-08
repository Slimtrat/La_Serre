import type {
  GuidedCharacterDraft,
  GuidedProjectBrief,
  JourneyStageSnapshot,
  StudioJourneySnapshot,
} from "@/generated/openapi";

export interface GuidedProposal {
  readonly id: string;
  readonly target: string;
  readonly baseRevision: number;
  readonly before: Readonly<Record<string, unknown>>;
  readonly after: Readonly<Record<string, unknown>>;
  readonly model: string;
  readonly status: "candidate" | "accepted" | "rejected";
}

export interface GuidedPayload {
  readonly revision: number;
  readonly brief: GuidedProjectBrief;
  readonly characters: readonly GuidedCharacterDraft[];
  readonly activeEpisodeId: string | null;
  readonly proposals: readonly GuidedProposal[];
}

type RecordValue = Readonly<Record<string, unknown>>;

function record(value: unknown): RecordValue {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as RecordValue)
    : {};
}

function string(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

export function decodeGuidedPayload(value: unknown): GuidedPayload {
  const root = record(value);
  const state = record(root.state);
  const brief = record(state.brief);
  const proposals = Array.isArray(root.proposals) ? root.proposals : [];
  return {
    revision: typeof state.revision === "number" ? state.revision : 0,
    activeEpisodeId: typeof state.active_episode_id === "string" ? state.active_episode_id : null,
    brief: {
      working_title: string(brief.working_title),
      idea: string(brief.idea),
      genre: string(brief.genre),
      tone: string(brief.tone),
      audience: string(brief.audience),
      episode_title: string(brief.episode_title),
      episode_concept: string(brief.episode_concept),
      locked_fields: stringArray(brief.locked_fields),
    },
    characters: Array.isArray(state.characters)
      ? state.characters.map((item) => record(item) as unknown as GuidedCharacterDraft)
      : [],
    proposals: proposals.flatMap((value) => {
      const item = record(value);
      const status = item.status;
      if (typeof item.id !== "string" || typeof item.target !== "string" || typeof item.base_revision !== "number" || (status !== "candidate" && status !== "accepted" && status !== "rejected")) return [];
      return [{
        id: item.id,
        target: item.target,
        baseRevision: item.base_revision,
        before: record(item.before),
        after: record(item.after),
        model: string(item.model),
        status,
      }];
    }),
  };
}

export function nextJourneyStage(snapshot: StudioJourneySnapshot): JourneyStageSnapshot {
  const stage =
    snapshot.stages.find(
      (candidate) => !["approved", "completed"].includes(candidate.status),
    ) ?? snapshot.stages.at(-1);
  if (!stage) throw new Error("Studio journey contains no stages");
  return stage;
}
