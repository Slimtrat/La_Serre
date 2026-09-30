export type ProductionLocale = "fr" | "en";
export type ArtifactKind = "keyframe" | "video" | "voice";
export type ShotReadiness =
  | "ready"
  | "blocked"
  | "stale"
  | "running"
  | "queued"
  | "awaiting_approval"
  | "failed"
  | "complete"
  | "missing";
export type ProductionActionKind =
  | "generate"
  | "reroll"
  | "import"
  | "approve"
  | "restore"
  | "retry"
  | "setup";

export interface ArtifactProvenance {
  readonly source: string | null;
  readonly model: string | null;
  readonly workflow: string | null;
  readonly seed: number | null;
  readonly revision: string | null;
}

export interface ShotArtifact {
  readonly kind: ArtifactKind;
  readonly required: boolean;
  readonly present: boolean;
  readonly approved: boolean;
  readonly stale: boolean;
  readonly url: string | null;
  readonly sha256: string | null;
  readonly error: string | null;
  readonly provenance: ArtifactProvenance;
}

export interface ProductionAction {
  readonly kind: ProductionActionKind;
  readonly artifact: ArtifactKind | null;
  readonly enabled: boolean;
  readonly reason: string | null;
  readonly queueItemId: string | null;
  readonly runId: string | null;
}

export interface ProductionQueueItem {
  readonly id: string;
  readonly shotId: string;
  readonly kind: ArtifactKind | "music";
  readonly status: string;
  readonly message: string;
  readonly progress: number;
  readonly error: string | null;
}

export interface ProductionHistoryRun {
  readonly id: string;
  readonly current: boolean;
  readonly status: string | null;
  readonly createdAt: string | null;
  readonly keyframeUrl: string | null;
  readonly videoUrl: string | null;
  readonly audioUrl: string | null;
}

export interface ShotProductionState {
  readonly id: string;
  readonly position: number;
  readonly title: string;
  readonly action: string;
  readonly durationSeconds: number | null;
  readonly readiness: ShotReadiness;
  readonly blocker: string | null;
  readonly nextAction: string | null;
  readonly previewUrl: string | null;
  readonly previewKind: "image" | "video" | null;
  readonly stale: boolean;
  readonly error: string | null;
  readonly artifacts: readonly ShotArtifact[];
  readonly actions: readonly ProductionAction[];
  readonly queueItems: readonly ProductionQueueItem[];
  readonly history: readonly ProductionHistoryRun[];
  /** Canonical backend payload, forwarded unchanged when one shot is queued. */
  readonly payload: Readonly<Record<string, unknown>>;
}

export interface ProductionCapabilities {
  readonly manualImport: boolean;
  readonly keyframeGeneration: boolean;
  readonly videoGeneration: boolean;
  readonly voiceGeneration: boolean;
}

export interface EpisodeMasterState {
  readonly canAssemble: boolean;
  readonly blocker: string | null;
  readonly exists: boolean;
  readonly status: string | null;
  readonly releaseEligible: boolean;
  readonly videoUrl: string | null;
  readonly manifestUrl: string | null;
  readonly subtitlesUrl: string | null;
  readonly jobId: string | null;
  readonly jobStatus: string | null;
  readonly jobMessage: string | null;
  readonly jobProgress: number;
}

export interface EpisodeProductionSnapshot {
  readonly episode: { readonly id: string; readonly title: string };
  readonly capabilities: ProductionCapabilities;
  readonly shots: readonly ShotProductionState[];
  readonly master: EpisodeMasterState;
  readonly queue: {
    readonly paused: boolean;
    readonly recovered: boolean;
    readonly progress: number;
  };
  readonly completedShots: number;
  readonly totalShots: number;
}

export interface AssembleEpisodeInput {
  readonly allowStills: boolean;
  readonly force: boolean;
  readonly width: number;
  readonly height: number;
  readonly fps: number;
  readonly tts: "auto" | "edge" | "sapi" | "none";
}

export interface EpisodeProductionApi {
  get(episodeId: string): Promise<EpisodeProductionSnapshot>;
  produceMissing(episodeId: string): Promise<unknown>;
  enqueue(shot: ShotProductionState, artifact: ArtifactKind, force: boolean): Promise<unknown>;
  approve(shotId: string): Promise<unknown>;
  retry(queueItemId: string): Promise<unknown>;
  restore(shotId: string, runId: string): Promise<unknown>;
  importAsset(
    shotId: string,
    artifact: ArtifactKind,
    file: File,
    confirmReplaceApproved: boolean,
  ): Promise<unknown>;
  assemble(episodeId: string, input: AssembleEpisodeInput): Promise<unknown>;
}
