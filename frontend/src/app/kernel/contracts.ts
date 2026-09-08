export interface ActiveContext {
  readonly projectId: string | null;
  readonly seriesId: string | null;
  readonly episodeId: string | null;
  readonly shotId: string | null;
}

export type ActiveContextListener = () => void;

/** The single source of truth for the user's current workspace selection. */
export interface ActiveContextPort {
  getSnapshot(): ActiveContext;
  subscribe(listener: ActiveContextListener): () => void;
  selectProject(projectId: string | null): void;
  selectSeries(seriesId: string | null): void;
  selectEpisode(episodeId: string | null): void;
  selectShot(shotId: string | null): void;
}

export type WorkspaceView =
  | "guided"
  | "graph"
  | "plan"
  | "outputs"
  | "bible"
  | "settings";

export type NavigationTarget = {
  readonly kind: "workspace";
  readonly view: WorkspaceView;
};
export interface NavigationOptions {
  readonly replace?: boolean;
  readonly focus?: boolean;
}

export interface NavigationPort {
  navigate(target: NavigationTarget, options?: NavigationOptions): void;
}

export type NotificationLevel = "info" | "success" | "warning" | "error";

export interface NotificationInput {
  readonly level: NotificationLevel;
  readonly title: string;
  readonly message?: string;
  readonly persistent?: boolean;
  readonly deduplicationKey?: string;
}

export interface NotificationPort {
  notify(notification: NotificationInput): string;
}

export type RuntimeEnvironment = "development" | "test" | "production";

export interface RuntimeCapabilities {
  readonly filesystem: boolean;
  readonly generation: boolean;
  readonly export: boolean;
}

export interface RuntimePort {
  readonly environment: RuntimeEnvironment;
  readonly capabilities: RuntimeCapabilities;
  now(): Date;
  createId(): string;
  reportError(
    error: unknown,
    context?: Readonly<Record<string, unknown>>,
  ): void;
}

export type ActivityStatus = "running" | "succeeded" | "failed" | "cancelled";

export interface ActivityInput {
  readonly kind: string;
  readonly label: string;
  readonly context?: Readonly<Record<string, unknown>>;
}

export interface ActivityUpdate {
  readonly status?: ActivityStatus;
  readonly progress?: number;
  readonly message?: string;
}

export interface ActivityHandle {
  readonly id: string;
  update(update: ActivityUpdate): void;
  finish(status?: Exclude<ActivityStatus, "running">): void;
}

export interface ActivityPort {
  start(activity: ActivityInput): ActivityHandle;
}

/** Explicit application boundary. Adapters are supplied by the composition root. */
export interface AppKernel {
  readonly activeContext: ActiveContextPort;
  readonly navigation: NavigationPort;
  readonly notifications: NotificationPort;
  readonly runtime: RuntimePort;
  readonly activity: ActivityPort;
}
