export type ReleaseLocale = "fr" | "en";
export type ReleaseStatus = "draft" | "approved" | "exported" | "stale" | "missing";

export interface ReleaseAsset {
  readonly kind: "master" | "cover" | "subtitles" | "caption" | "manifest";
  readonly url: string | null;
  readonly filename: string | null;
  readonly sha256: string | null;
  readonly valid: boolean;
}

export interface ReleaseCoverOption {
  readonly shotId: string;
  readonly url: string | null;
  readonly sha256: string | null;
}

export interface ReleaseProvenance {
  readonly source: string;
  readonly revision: string | null;
  readonly sha256: string | null;
  readonly createdAt: string | null;
}

export interface ReleaseExport {
  readonly id: string;
  readonly version: number | null;
  readonly createdAt: string | null;
  readonly directory: string | null;
  readonly links: Readonly<Record<string, string>>;
}

export interface ReleaseCandidateSnapshot {
  readonly episode: { readonly id: string; readonly title: string };
  readonly id: string | null;
  readonly revision: number;
  readonly version: number | null;
  readonly status: ReleaseStatus;
  readonly stale: boolean;
  readonly staleReason: string | null;
  readonly technical: {
    readonly ready: boolean;
    readonly verified: boolean;
    readonly width: number | null;
    readonly height: number | null;
    readonly durationSeconds: number | null;
    readonly fps: number | null;
    readonly safeAreaSubtitles: boolean;
    readonly blockers: readonly string[];
  };
  readonly approval: {
    readonly approved: boolean;
    readonly approvedAt: string | null;
    readonly approvedBy: string | null;
    readonly note: string | null;
  };
  readonly caption: string;
  readonly renderedCaption: string;
  readonly selectedCoverShotId: string | null;
  readonly selectedCoverUrl: string | null;
  readonly coverOptions: readonly ReleaseCoverOption[];
  readonly assets: readonly ReleaseAsset[];
  readonly provenance: readonly ReleaseProvenance[];
  readonly exports: readonly ReleaseExport[];
  readonly canRefresh: boolean;
  readonly canApprove: boolean;
  readonly canExport: boolean;
}

export interface ReleaseCandidateUpdate {
  readonly captionTemplate: string;
  readonly coverShotId: string | null;
  readonly expectedRevision: number;
}

export interface ReleaseCandidateApi {
  get(episodeId: string): Promise<ReleaseCandidateSnapshot>;
  createOrRefresh(episodeId: string): Promise<unknown>;
  update(episodeId: string, input: ReleaseCandidateUpdate): Promise<unknown>;
  approve(episodeId: string, expectedRevision: number): Promise<unknown>;
  exportPack(episodeId: string, expectedRevision: number): Promise<unknown>;
}
