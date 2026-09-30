import { ApiError, orvalFetch } from "@shared/api";

import type {
  ReleaseAsset,
  ReleaseCandidateApi,
  ReleaseCandidateSnapshot,
  ReleaseCandidateUpdate,
  ReleaseCoverOption,
  ReleaseExport,
  ReleaseProvenance,
  ReleaseStatus,
} from "./model";

type Json = Readonly<Record<string, unknown>>;

const record = (value: unknown): Json =>
  typeof value === "object" && value !== null && !Array.isArray(value) ? value as Json : {};
const list = (value: unknown): readonly unknown[] => Array.isArray(value) ? value : [];
const text = (value: unknown): string | null => typeof value === "string" && value.trim() ? value : null;
const flag = (value: unknown, fallback = false): boolean => typeof value === "boolean" ? value : fallback;
const amount = (value: unknown): number | null => typeof value === "number" && Number.isFinite(value) ? value : null;
const field = (source: Json, snake: string, camel: string) => source[snake] ?? source[camel];

const STATUSES = new Set<ReleaseStatus>(["draft", "approved", "exported", "stale", "missing"]);

function asset(value: unknown, fallbackKind?: ReleaseAsset["kind"]): ReleaseAsset | null {
  const source = typeof value === "string" ? { url: value } : record(value);
  const rawKind = text(source.kind) ?? fallbackKind;
  if (!rawKind || !["master", "cover", "subtitles", "caption", "manifest"].includes(rawKind)) return null;
  return {
    kind: rawKind as ReleaseAsset["kind"],
    url: text(source.url) ?? text(field(source, "download_url", "downloadUrl")),
    filename: text(source.filename) ?? text(source.name),
    sha256: text(source.sha256) ?? text(source.hash),
    valid: flag(source.valid, true),
  };
}

function provenance(value: unknown): ReleaseProvenance | null {
  const source = record(value);
  const label = text(source.source) ?? text(source.kind) ?? text(source.name);
  if (!label) return null;
  return {
    source: label,
    revision: text(source.revision) ?? text(field(source, "source_revision", "sourceRevision")),
    sha256: text(source.sha256) ?? text(source.hash),
    createdAt: text(field(source, "created_at", "createdAt")),
  };
}

function exportEntry(value: unknown, index: number): ReleaseExport | null {
  const source = record(value);
  const links = record(source.links ?? source.assets ?? source.files);
  const mappedLinks = Object.fromEntries(
    Object.entries(links).flatMap(([key, candidate]) => {
      const url = typeof candidate === "string" ? text(candidate) : text(record(candidate).url);
      return url ? [[key, url]] : [];
    }),
  );
  const fileLinks = Object.fromEntries(list(source.files).flatMap((candidate) => {
    const file = record(candidate);
    const filename = text(file.filename) ?? text(file.name);
    const url = text(file.url);
    return filename && url ? [[filename, url]] : [];
  }));
  const normalizedLinks = Object.keys(fileLinks).length ? fileLinks : mappedLinks;
  const id = text(source.id) ?? text(field(source, "export_id", "exportId")) ?? `export-${index + 1}`;
  return {
    id,
    version: amount(source.version),
    createdAt: text(field(source, "created_at", "createdAt")),
    directory: text(source.directory) ?? text(source.path),
    links: normalizedLinks,
  };
}

function coverOption(value: unknown): ReleaseCoverOption | null {
  const source = record(value);
  const shotId = text(field(source, "shot_id", "shotId"));
  if (!shotId) return null;
  return { shotId, url: text(source.url), sha256: text(source.sha256) ?? text(field(source, "source_sha256", "sourceSha256")) };
}

function missingCandidate(episodeId: string): ReleaseCandidateSnapshot {
  return {
    episode: { id: episodeId, title: episodeId }, id: null, revision: 0, version: null,
    status: "missing", stale: false, staleReason: null,
    technical: { ready: false, verified: false, width: null, height: null, durationSeconds: null, fps: null, safeAreaSubtitles: false, blockers: [] },
    approval: { approved: false, approvedAt: null, approvedBy: null, note: null },
    caption: "", renderedCaption: "", selectedCoverShotId: null, selectedCoverUrl: null, coverOptions: [], assets: [], provenance: [], exports: [],
    canRefresh: true, canApprove: false, canExport: false,
  };
}

/** Decode the release contract while preserving backend-owned readiness decisions. */
export function decodeReleaseCandidate(value: unknown): ReleaseCandidateSnapshot {
  const source = record(value);
  const candidate = record(source.candidate ?? source.release_candidate ?? source.releaseCandidate ?? source);
  const episode = record(source.episode ?? candidate.episode);
  const episodeId = text(episode.id) ?? text(field(candidate, "episode_id", "episodeId"));
  if (!episodeId) throw new Error("Invalid release candidate response: episode id is missing");
  const technical = record(candidate.technical ?? candidate.technical_readiness ?? candidate.technicalReadiness ?? candidate.readiness);
  const profile = record(candidate.render_profile ?? candidate.renderProfile);
  const sourceMedia = record(candidate.source);
  const reel = record(candidate.reel);
  const finalMedia = Object.keys(reel).length ? reel : sourceMedia;
  const approval = record(candidate.approval ?? candidate.human_approval ?? candidate.humanApproval);
  const assetsRecord = record(candidate.assets ?? candidate.outputs);
  const conventionalAssets = ([
    ["master", assetsRecord.master ?? candidate.master ?? { url: candidate.master_url ?? candidate.masterUrl ?? `/api/episode-media/${encodeURIComponent(episodeId)}/episode.mp4`, sha256: reel.sha256 ?? sourceMedia.master_sha256 ?? sourceMedia.masterSha256 }],
    ["cover", assetsRecord.cover ?? candidate.cover],
    ["subtitles", assetsRecord.subtitles ?? candidate.subtitles ?? candidate.subtitles_url ?? candidate.subtitlesUrl],
    ["caption", assetsRecord.caption ?? candidate.caption_file ?? candidate.captionFile],
    ["manifest", assetsRecord.manifest ?? candidate.release_json ?? candidate.releaseJson],
  ] as const).map(([kind, item]) => asset(item, kind)).filter((item): item is ReleaseAsset => item !== null);
  const explicitAssets = list(candidate.asset_list ?? candidate.assetList).map((item) => asset(item)).filter((item): item is ReleaseAsset => item !== null);
  const assets = explicitAssets.length ? explicitAssets : conventionalAssets;
  const currentCover = record(candidate.cover);
  const covers = list(candidate.cover_options ?? candidate.coverOptions).map(coverOption).filter((item): item is ReleaseCoverOption => item !== null);
  const selectedCover = coverOption(currentCover);
  const blockers = list(technical.blockers ?? candidate.blockers).flatMap((item) => {
    if (typeof item === "string") return item.trim() ? [item] : [];
    const message = text(record(item).message) ?? text(record(item).label);
    return message ? [message] : [];
  });
  const state = text(candidate.state) ?? text(candidate.status);
  const stale = flag(candidate.stale) || state?.toLowerCase() === "stale";
  const rawStatus = (state ?? (stale ? "stale" : "draft")).toLowerCase();
  const status = STATUSES.has(rawStatus as ReleaseStatus) ? rawStatus as ReleaseStatus : "draft";
  const duration = amount(field(finalMedia, "duration_seconds", "durationSeconds") ?? finalMedia.duration);
  const width = amount(finalMedia.width);
  const height = amount(finalMedia.height);
  const minDuration = amount(profile.min_duration ?? profile.minDuration);
  const maxDuration = amount(profile.max_duration ?? profile.maxDuration);
  const expectedFps = amount(profile.fps);
  const sourceConforms = width === amount(profile.width) && height === amount(profile.height)
    && duration !== null && (minDuration === null || duration >= minDuration) && (maxDuration === null || duration <= maxDuration)
    && (expectedFps === null || amount(finalMedia.fps) === expectedFps)
    && (!text(profile.video_codec) || text(finalMedia.video_codec) === text(profile.video_codec))
    && Boolean(text(finalMedia.audio_codec))
    && Boolean(text(field(finalMedia, "rendered_at", "renderedAt")) ?? text(field(finalMedia, "verified_at", "verifiedAt")));
  const technicalReady = flag(technical.ready, flag(candidate.technically_ready, flag(candidate.technicallyReady, sourceConforms && !stale)));
  const approved = flag(approval.approved, flag(candidate.approved, ["approved", "exported"].includes(status)));
  const actions = record(candidate.actions);
  const provenanceItems = list(candidate.provenance).map(provenance).filter((item): item is ReleaseProvenance => item !== null);
  if (!provenanceItems.length && Object.keys(sourceMedia).length) {
    provenanceItems.push({
      source: "source master",
      revision: text(sourceMedia.revision),
      sha256: text(field(sourceMedia, "master_sha256", "masterSha256")),
      createdAt: text(field(sourceMedia, "verified_at", "verifiedAt")),
    });
    if (Object.keys(reel).length) provenanceItems.push({
      source: "release reel",
      revision: text(field(reel, "source_revision", "sourceRevision")),
      sha256: text(reel.sha256),
      createdAt: text(field(reel, "rendered_at", "renderedAt")),
    });
    if (selectedCover) provenanceItems.push({ source: "cover", revision: selectedCover.shotId, sha256: selectedCover.sha256, createdAt: null });
  }
  return {
    episode: { id: episodeId, title: text(episode.title) ?? episodeId },
    id: text(candidate.id),
    revision: amount(candidate.revision) ?? 0,
    version: amount(candidate.version),
    status,
    stale,
    staleReason: text(field(candidate, "stale_reason", "staleReason")) ?? (list(candidate.stale_reasons ?? candidate.staleReasons).map(text).filter((item): item is string => item !== null).join(" · ") || null),
    technical: {
      ready: technicalReady,
      verified: flag(technical.verified, technicalReady),
      width: amount(technical.width ?? finalMedia.width),
      height: amount(technical.height ?? finalMedia.height),
      durationSeconds: amount(field(technical, "duration_seconds", "durationSeconds") ?? finalMedia.duration),
      fps: amount(technical.fps ?? finalMedia.fps ?? profile.fps),
      safeAreaSubtitles: flag(field(technical, "safe_area_subtitles", "safeAreaSubtitles"), Boolean(text(field(candidate, "subtitles_url", "subtitlesUrl")))),
      blockers,
    },
    approval: {
      approved,
      approvedAt: text(field(approval, "approved_at", "approvedAt")) ?? text(field(candidate, "approved_at", "approvedAt")),
      approvedBy: text(field(approval, "approved_by", "approvedBy")),
      note: text(approval.note),
    },
    caption: text(field(candidate, "caption_template", "captionTemplate")) ?? text(candidate.caption) ?? "",
    renderedCaption: text(candidate.caption) ?? text(field(candidate, "caption_template", "captionTemplate")) ?? "",
    selectedCoverShotId: selectedCover?.shotId ?? text(field(candidate, "cover_shot_id", "coverShotId")),
    selectedCoverUrl: selectedCover?.url ?? text(field(candidate, "cover_url", "coverUrl")) ?? assets.find((item) => item.kind === "cover")?.url ?? null,
    coverOptions: covers.length ? covers : selectedCover ? [selectedCover] : [],
    assets,
    provenance: provenanceItems,
    exports: list(candidate.exports ?? candidate.export_history ?? candidate.exportHistory ?? (candidate.export ? [candidate.export] : [])).map(exportEntry).filter((item): item is ReleaseExport => item !== null),
    canRefresh: flag(actions.can_refresh, flag(actions.canRefresh, true)),
    canApprove: flag(actions.can_approve, flag(actions.canApprove, technicalReady && !stale && status === "draft")),
    canExport: flag(actions.can_export, flag(actions.canExport, technicalReady && status === "approved")),
  };
}

const endpoint = (episodeId: string) =>
  `/api/episodes/${encodeURIComponent(episodeId)}/release-candidate`;

export const releaseCandidateApi: ReleaseCandidateApi = {
  async get(episodeId) {
    try {
      return decodeReleaseCandidate(await orvalFetch<unknown>(endpoint(episodeId), { method: "GET" }));
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) return missingCandidate(episodeId);
      throw error;
    }
  },
  createOrRefresh(episodeId) {
    return orvalFetch<unknown>(endpoint(episodeId), {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}),
    });
  },
  update(episodeId, input: ReleaseCandidateUpdate) {
    return orvalFetch<unknown>(endpoint(episodeId), {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ caption_template: input.captionTemplate, cover_shot_id: input.coverShotId, expected_revision: input.expectedRevision }),
    });
  },
  approve(episodeId, expectedRevision) {
    return orvalFetch<unknown>(`${endpoint(episodeId)}/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ expected_revision: expectedRevision }),
    });
  },
  exportPack(episodeId, expectedRevision) {
    return orvalFetch<unknown>(`${endpoint(episodeId)}/export`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ expected_revision: expectedRevision }),
    });
  },
};
