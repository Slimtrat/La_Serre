import {
  approveKeyframeApiProductionQueueShotsShotIdApprovePost,
  enqueueMissingApiProductionQueueBatchMissingPost,
  restoreGenerationApiHistoryShotIdRunIdRestorePost,
  retryApiProductionQueueItemsItemIdRetryPost,
} from "@/generated/openapi";
import { orvalFetch } from "@shared/api";

import type {
  ArtifactKind,
  ArtifactProvenance,
  AssembleEpisodeInput,
  EpisodeProductionApi,
  EpisodeProductionSnapshot,
  ProductionAction,
  ProductionActionKind,
  ProductionHistoryRun,
  ProductionQueueItem,
  ShotArtifact,
  ShotProductionState,
  ShotReadiness,
} from "./model";

type Json = Readonly<Record<string, unknown>>;

const record = (value: unknown): Json =>
  typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Json)
    : {};
const list = (value: unknown): readonly unknown[] =>
  Array.isArray(value) ? value : [];
const text = (value: unknown): string | null =>
  typeof value === "string" && value.trim() ? value : null;
const flag = (value: unknown, fallback = false): boolean =>
  typeof value === "boolean" ? value : fallback;
const amount = (value: unknown, fallback = 0): number =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

const ARTIFACT_KINDS = new Set<ArtifactKind>(["keyframe", "video", "voice"]);
const ACTION_KINDS = new Set<ProductionActionKind>([
  "generate", "reroll", "import", "approve", "restore", "retry", "setup",
]);
const READINESS = new Set<ShotReadiness>([
  "ready", "blocked", "stale", "queued", "running", "awaiting_approval", "failed", "complete", "missing",
]);

const ACTION_CODE: Readonly<Record<string, { kind: ProductionActionKind; artifact: ArtifactKind | null }>> = {
  APPROVE_KEYFRAME: { kind: "approve", artifact: "keyframe" },
  GENERATE_KEYFRAME: { kind: "generate", artifact: "keyframe" },
  GENERATE_VIDEO: { kind: "generate", artifact: "video" },
  GENERATE_VOICE: { kind: "generate", artifact: "voice" },
  REROLL_KEYFRAME: { kind: "reroll", artifact: "keyframe" },
  REROLL_VIDEO: { kind: "reroll", artifact: "video" },
  REROLL_VOICE: { kind: "reroll", artifact: "voice" },
  IMPORT_KEYFRAME: { kind: "import", artifact: "keyframe" },
  IMPORT_VIDEO: { kind: "import", artifact: "video" },
  IMPORT_VOICE: { kind: "import", artifact: "voice" },
  RESTORE_RUN: { kind: "restore", artifact: null },
  OPEN_SETUP: { kind: "setup", artifact: null },
};

function provenance(value: unknown, fallbackSource?: unknown): ArtifactProvenance {
  const source = record(value);
  return {
    source: text(source.source) ?? text(source.source_label) ?? text(fallbackSource),
    model: text(source.model),
    workflow: text(source.workflow),
    seed: typeof source.seed === "number" ? source.seed : null,
    revision: text(source.revision) ?? text(source.input_fingerprint),
  };
}

function artifact(kind: ArtifactKind, value: unknown): ShotArtifact {
  const source = record(value);
  return {
    kind,
    required: flag(source.required),
    present: flag(source.present, flag(source.exists)),
    approved: flag(source.approved),
    stale: flag(source.stale),
    url: text(source.url) ?? text(source.media_url),
    sha256: text(source.sha256),
    error: text(source.error),
    provenance: provenance(source.provenance, source.source),
  };
}

function action(value: unknown): ProductionAction | null {
  const source = typeof value === "string" ? { kind: value } : record(value);
  const code = text(source.code);
  const mapped = code ? ACTION_CODE[code] : undefined;
  const kind = mapped?.kind ?? text(source.kind) ?? text(source.id) ?? text(source.action);
  if (!kind || !ACTION_KINDS.has(kind as ProductionActionKind)) return null;
  const rawArtifact = text(source.artifact) ?? text(source.slot);
  const targetParts = text(source.target)?.split("/") ?? [];
  const restoreRunId = code === "RESTORE_RUN" ? targetParts.at(-2) ?? null : null;
  return {
    kind: kind as ProductionActionKind,
    artifact: mapped?.artifact ?? (rawArtifact && ARTIFACT_KINDS.has(rawArtifact as ArtifactKind)
      ? rawArtifact as ArtifactKind
      : null),
    enabled: flag(source.enabled, true),
    reason: text(source.reason) ?? text(source.message),
    queueItemId: text(source.queue_item_id) ?? text(source.item_id),
    runId: text(source.run_id) ?? restoreRunId,
  };
}

function queueItem(value: unknown): ProductionQueueItem | null {
  const source = record(value);
  const id = text(source.id);
  const shotId = text(source.shot_id);
  const kind = text(source.kind);
  if (!id || !shotId || !kind || ![...ARTIFACT_KINDS, "music"].includes(kind)) return null;
  return {
    id,
    shotId,
    kind: kind as ProductionQueueItem["kind"],
    status: text(source.status) ?? "unknown",
    message: text(source.message) ?? "",
    progress: Math.min(100, Math.max(0, amount(source.progress))),
    error: text(source.error),
  };
}

function historyRun(value: unknown): ProductionHistoryRun | null {
  const source = record(value);
  const id = text(source.id);
  if (!id) return null;
  const media = record(source.media);
  return {
    id,
    current: flag(source.current),
    status: text(source.status),
    createdAt: text(source.created_at) ?? text(source.archived_at),
    keyframeUrl: text(media.keyframe),
    videoUrl: text(media.video),
    audioUrl: text(media.audio),
  };
}

function decodeShot(value: unknown, index: number, allQueueItems: readonly ProductionQueueItem[]): ShotProductionState {
  const source = record(value);
  const shot = record(source.shot);
  const id = text(source.id) ?? text(source.shot_id) ?? text(shot.id);
  if (!id) throw new Error("Invalid production cockpit response: shot id is missing");
  const artifactsRecord = record(source.artifacts);
  const artifacts = (["keyframe", "video", "voice"] as const).map((kind) =>
    artifact(kind, artifactsRecord[kind] ?? source[kind]),
  );
  const readiness = text(source.readiness) ?? text(source.status) ?? "missing";
  const preview = record(source.preview);
  const video = artifacts.find((item) => item.kind === "video");
  const keyframe = artifacts.find((item) => item.kind === "keyframe");
  const previewUrl = text(preview.url) ?? video?.url ?? keyframe?.url ?? null;
  const previewKind = text(preview.kind) === "video" || (!text(preview.kind) && video?.url)
    ? "video"
    : previewUrl ? "image" : null;
  const sourceQueue = list(source.queue_items).map(queueItem).filter((item): item is ProductionQueueItem => item !== null);
  const sourceHistory = list(source.history).map(historyRun).filter((item): item is ProductionHistoryRun => item !== null);
  const blockerActions = list(source.blockers).flatMap((item) => list(record(item).resolutions));
  return {
    id,
    position: amount(source.position, amount(source.index, index + 1)),
    title: text(source.title) ?? `Shot ${index + 1}`,
    action: text(source.action) ?? text(shot.action) ?? "",
    durationSeconds: typeof source.duration === "number"
      ? source.duration
      : typeof shot.duration === "number" ? shot.duration : null,
    readiness: READINESS.has(readiness as ShotReadiness) ? readiness as ShotReadiness : "blocked",
    blocker: text(source.blocker) ?? text(record(list(source.blockers)[0]).message),
    nextAction: text(source.next_action) ?? text(record(source.primary_action).label) ?? text(record(list(source.next_actions)[0]).label),
    previewUrl,
    previewKind,
    stale: flag(source.stale) || artifacts.some((item) => item.stale),
    error: text(source.error) ?? sourceQueue.find((item) => item.error)?.error ?? null,
    artifacts,
    actions: [...list(source.next_actions ?? source.actions), ...blockerActions].map(action).filter((item): item is ProductionAction => item !== null),
    queueItems: sourceQueue.length ? sourceQueue : allQueueItems.filter((item) => item.shotId === id),
    history: sourceHistory,
    payload: Object.keys(shot).length ? shot : record(source.payload),
  };
}

/** Decode a versioned backend contract without deriving readiness from media URLs. */
export function decodeProductionCockpit(value: unknown): EpisodeProductionSnapshot {
  const source = record(value);
  const episode = record(source.episode);
  const episodeId = text(episode.id) ?? text(source.episode_id);
  if (!episodeId) throw new Error("Invalid production cockpit response: episode id is missing");
  const capabilities = record(source.capabilities);
  const queue = record(source.queue);
  const allQueueItems = list(queue.items ?? source.queue_items)
    .map(queueItem)
    .filter((item): item is ProductionQueueItem => item !== null);
  const shots = list(source.shots).map((item, index) => decodeShot(item, index, allQueueItems));
  const readiness = record(source.readiness ?? source.production);
  const master = record(source.master);
  const job = record(source.active_job ?? master.job);
  const masterBlocker = text(record(list(source.blockers)[0]).message);
  const completedShots = amount(
    readiness.complete_shots,
    shots.filter((shot) => shot.readiness === "complete").length,
  );
  return {
    episode: { id: episodeId, title: text(episode.title) ?? episodeId },
    capabilities: {
      manualImport: flag(capabilities.manual_import, true),
      keyframeGeneration: flag(capabilities.keyframe_generation, flag(capabilities.image, flag(capabilities.image_video))),
      videoGeneration: flag(capabilities.video_generation, flag(capabilities.video, flag(capabilities.image_video))),
      voiceGeneration: flag(capabilities.voice_generation, flag(capabilities.voice)),
    },
    shots,
    master: {
      canAssemble: flag(master.can_assemble, flag(readiness.assemblable)),
      blocker: text(master.blocker) ?? text(readiness.blocker) ?? masterBlocker,
      exists: flag(master.exists, flag(master.available, flag(readiness.master_available))),
      status: text(master.status),
      releaseEligible: flag(master.release_eligible),
      videoUrl: text(master.video_url) ?? text(master.video) ?? text(master.url),
      manifestUrl: text(master.manifest_url) ?? text(master.manifest),
      subtitlesUrl: text(master.subtitles_url) ?? text(master.subtitles),
      jobId: text(job.id),
      jobStatus: text(job.status),
      jobMessage: text(job.message),
      jobProgress: Math.min(100, Math.max(0, amount(job.progress, amount(record(job.progress).percent)))),
    },
    queue: {
      paused: flag(queue.paused),
      recovered: flag(queue.recovered),
      progress: Math.min(100, Math.max(0, amount(record(queue.progress).percent, amount(queue.progress)))),
    },
    completedShots,
    totalShots: amount(readiness.total_shots, shots.length),
  };
}

export const productionApi: EpisodeProductionApi = {
  async get(episodeId) {
    return decodeProductionCockpit(await orvalFetch<unknown>(
      `/api/episodes/${encodeURIComponent(episodeId)}/production-cockpit`,
      { method: "GET" },
    ));
  },
  produceMissing(episodeId) {
    return enqueueMissingApiProductionQueueBatchMissingPost({ episode_id: episodeId, tts: "auto" });
  },
  enqueue(shot, artifactKind, force) {
    const episodeId = shot.id.split("-S")[0];
    return orvalFetch<unknown>(
      `/api/episodes/${encodeURIComponent(episodeId)}/production-cockpit/shots/${encodeURIComponent(shot.id)}/enqueue`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: artifactKind, priority: 0, tts: "auto", confirm_replace_approved: force }),
      },
    );
  },
  approve(shotId) {
    return approveKeyframeApiProductionQueueShotsShotIdApprovePost(shotId);
  },
  retry(queueItemId) {
    return retryApiProductionQueueItemsItemIdRetryPost(queueItemId);
  },
  restore(shotId, runId) {
    return restoreGenerationApiHistoryShotIdRunIdRestorePost(shotId, runId);
  },
  importAsset(shotId, artifactKind, file, confirmReplaceApproved) {
    const slot = artifactKind === "voice" ? "audio" : artifactKind;
    const params = new URLSearchParams({
      filename: file.name,
      confirm_replace_approved: String(confirmReplaceApproved),
    });
    return orvalFetch<unknown>(
      `/api/assets/${encodeURIComponent(shotId)}/${slot}?${params}`,
      { method: "PUT", body: file, headers: { "Content-Type": file.type || "application/octet-stream" } },
    );
  },
  assemble(episodeId, input: AssembleEpisodeInput) {
    return orvalFetch<unknown>(
      `/api/episodes/${encodeURIComponent(episodeId)}/production-cockpit/assemble`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ allow_stills: input.allowStills, force: input.force, width: input.width, height: input.height, fps: input.fps, tts: input.tts }),
      },
    );
  },
};
