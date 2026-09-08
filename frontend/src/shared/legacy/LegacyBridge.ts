type UnknownRecord = Readonly<Record<string, unknown>>;

export type LegacyWorkspaceView =
  | "guided"
  | "graph"
  | "plan"
  | "outputs"
  | "bible"
  | "settings";

export interface LegacyWorkspaceChanged {
  readonly view: LegacyWorkspaceView | null;
  readonly payload: UnknownRecord;
}

export interface LegacyProjectChanged {
  readonly projectId: string | null;
  readonly payload: UnknownRecord;
}

export interface LegacyEpisodeLoaded {
  readonly episodeId: string | null;
  readonly seriesId: string | null;
  readonly payload: UnknownRecord;
}

export interface LegacyShotSelected {
  readonly episodeId: string | null;
  readonly shotId: string | null;
  readonly index: number | null;
  readonly payload: UnknownRecord;
}

export interface LegacyRuntimeChanged {
  readonly enabled: boolean | null;
  readonly services: readonly UnknownRecord[];
  readonly payload: UnknownRecord;
}

export interface LegacyRuntimePreparation {
  readonly status: string | null;
  readonly message: string | null;
  readonly progress: UnknownRecord | null;
  readonly payload: UnknownRecord;
}

export interface LegacyActivityChanged {
  readonly sourceEvent: LegacyActivityEventName;
  readonly payload: UnknownRecord;
}

export interface LegacyBridgeEventMap {
  workspaceChanged: LegacyWorkspaceChanged;
  projectChanged: LegacyProjectChanged;
  episodeLoaded: LegacyEpisodeLoaded;
  episodeCleared: undefined;
  shotSelected: LegacyShotSelected;
  runtimeChanged: LegacyRuntimeChanged;
  runtimePreparation: LegacyRuntimePreparation;
  activityChanged: LegacyActivityChanged;
}

export interface LegacyInitialSnapshot {
  readonly workspace: LegacyWorkspaceChanged;
  readonly project: LegacyProjectChanged;
  readonly episode: LegacyEpisodeLoaded;
  readonly runtime: LegacyRuntimeChanged;
  readonly activity: UnknownRecord | null;
}

export type LegacyCommand =
  | { readonly type: "workspace.show"; readonly view: LegacyWorkspaceView }
  | {
      readonly type: "studio.notify";
      readonly message: string;
      readonly level?: "info" | "success" | "warning" | "error";
    }
  | { readonly type: "project.activate"; readonly projectId: string }
  | { readonly type: "episode.select"; readonly episodeId: string }
  | { readonly type: "notifications.capture-error"; readonly message: string }
  | { readonly type: "runtime.refresh" }
  | { readonly type: "runtime.prepare" }
  | {
      readonly type: "runtime.control";
      readonly service: string;
      readonly action: "start" | "stop" | "restart";
    }
  | { readonly type: "runtime.show-logs"; readonly service: string }
  | { readonly type: "activity.open-log" }
  | { readonly type: "activity.close" }
  | { readonly type: "activity.publish"; readonly payload: UnknownRecord };

export interface UnknownLegacyCommand {
  readonly type: string;
  readonly [key: string]: unknown;
}

export interface LegacyBridgeLogger {
  warn(message: string, context?: unknown): void;
}

export interface LegacyHost extends EventTarget {
  SerreWorkspace?: {
    show(view: LegacyWorkspaceView): unknown;
    current(): LegacyWorkspaceView | null;
  };
  SerreStudio?: { notify(message: string, error?: boolean): unknown };
  SerreProjects?: {
    readonly ready: Promise<unknown>;
    current(): UnknownRecord;
    activate(projectId: string): unknown;
  };
  SerreEpisode?: {
    refresh(preferredEpisodeId?: string): unknown;
    current(): UnknownRecord | null;
  };
  SerreNotifications?: { captureError(message: string): unknown };
  SerreRuntimeManager?: {
    refresh(): unknown;
    prepareAll(): unknown;
    control(service: string, action: "start" | "stop" | "restart"): unknown;
    showLogs(service: string): unknown;
    current(): UnknownRecord;
  };
  SerreActivity?: {
    openLog(): unknown;
    close(): unknown;
    current(): UnknownRecord | null;
  };
}

export interface LegacyBridgeOptions {
  readonly host?: LegacyHost;
  readonly development?: boolean;
  readonly logger?: LegacyBridgeLogger;
}

type BridgeListener<Key extends keyof LegacyBridgeEventMap> = (
  payload: LegacyBridgeEventMap[Key],
) => void;

type LegacyActivityEventName =
  | "studio:job"
  | "studio:episode-job"
  | "studio:stage-job"
  | "studio:narrative-job"
  | "studio:demo-job";

type LegacyEventName =
  | "studio:workspace-changed"
  | "studio:project-changed"
  | "studio:episode-loaded"
  | "studio:episode-cleared"
  | "studio:shot-selected"
  | "studio:runtime"
  | "studio:runtime-preparation"
  | LegacyActivityEventName;

const LEGACY_EVENT_NAMES: readonly LegacyEventName[] = [
  "studio:workspace-changed",
  "studio:project-changed",
  "studio:episode-loaded",
  "studio:episode-cleared",
  "studio:shot-selected",
  "studio:runtime",
  "studio:runtime-preparation",
  "studio:job",
  "studio:episode-job",
  "studio:stage-job",
  "studio:narrative-job",
  "studio:demo-job",
];

const activeBridges = new WeakMap<EventTarget, LegacyBridge>();

function defaultHost(): LegacyHost {
  if (typeof window === "undefined") {
    throw new Error(
      "LegacyBridge requires a browser window or an injected host.",
    );
  }
  return window as unknown as LegacyHost;
}

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function record(value: unknown): UnknownRecord {
  return isRecord(value) ? value : {};
}

function nullableString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function nestedRecord(source: UnknownRecord, key: string): UnknownRecord {
  return record(source[key]);
}

function isActivityEvent(
  name: LegacyEventName,
): name is LegacyActivityEventName {
  return (
    name === "studio:job" ||
    name === "studio:episode-job" ||
    name === "studio:stage-job" ||
    name === "studio:narrative-job" ||
    name === "studio:demo-job"
  );
}

/**
 * The only adapter allowed to know about `studio:*` events and `window.Serre*`.
 * Durable state still belongs to the API; this bridge only supports migration.
 */
export class LegacyBridge {
  readonly #host: LegacyHost;
  readonly #development: boolean;
  readonly #logger: LegacyBridgeLogger;
  readonly #listeners = new Map<
    keyof LegacyBridgeEventMap,
    Set<(payload: never) => void>
  >();
  readonly #domListeners = new Map<LegacyEventName, EventListener>();
  #started = false;

  constructor(options: LegacyBridgeOptions = {}) {
    this.#host = options.host ?? defaultHost();
    this.#development = options.development ?? import.meta.env.DEV;
    this.#logger = options.logger ?? console;
  }

  start(): this {
    if (this.#started) {
      this.#trace("Duplicate LegacyBridge subscription prevented.");
      return this;
    }

    const previous = activeBridges.get(this.#host);
    if (previous && previous !== this) {
      this.#trace("Replacing an active LegacyBridge subscription (HMR).");
      previous.#detachDomListeners();
    }

    for (const eventName of LEGACY_EVENT_NAMES) {
      const listener: EventListener = (event) =>
        this.#receive(eventName, event);
      this.#host.addEventListener(eventName, listener);
      this.#domListeners.set(eventName, listener);
    }
    activeBridges.set(this.#host, this);
    this.#started = true;
    return this;
  }

  subscribe<Key extends keyof LegacyBridgeEventMap>(
    eventName: Key,
    listener: BridgeListener<Key>,
  ): () => void {
    const listeners =
      this.#listeners.get(eventName) ?? new Set<(payload: never) => void>();
    const erasedListener = listener as (payload: never) => void;
    if (listeners.has(erasedListener)) {
      this.#trace(
        `Duplicate LegacyBridge listener prevented for "${eventName}".`,
      );
    } else {
      listeners.add(erasedListener);
      this.#listeners.set(eventName, listeners);
    }

    let subscribed = true;
    return () => {
      if (!subscribed) return;
      subscribed = false;
      listeners.delete(erasedListener);
      if (listeners.size === 0) this.#listeners.delete(eventName);
    };
  }

  async initialSnapshot(): Promise<LegacyInitialSnapshot> {
    await this.#host.SerreProjects?.ready;

    const projectPayload = record(this.#host.SerreProjects?.current());
    const episodePayload = record(this.#host.SerreEpisode?.current());
    const episode = nestedRecord(episodePayload, "episode");
    const runtimePayload = record(this.#host.SerreRuntimeManager?.current());
    const activity = this.#host.SerreActivity?.current();

    return {
      workspace: {
        view: this.#workspaceView(this.#host.SerreWorkspace?.current()),
        payload: {},
      },
      project: {
        projectId: nullableString(projectPayload.active_id),
        payload: projectPayload,
      },
      episode: {
        episodeId: nullableString(episode.id),
        seriesId: nullableString(episode.series_id),
        payload: episodePayload,
      },
      runtime: {
        enabled:
          typeof runtimePayload.enabled === "boolean"
            ? runtimePayload.enabled
            : null,
        services: Array.isArray(runtimePayload.services)
          ? runtimePayload.services.filter(isRecord)
          : [],
        payload: runtimePayload,
      },
      activity: isRecord(activity) ? activity : null,
    };
  }

  dispatch(command: LegacyCommand | UnknownLegacyCommand): boolean {
    switch (command.type) {
      case "workspace.show":
        return this.#invoke(
          command.type,
          this.#host.SerreWorkspace,
          this.#host.SerreWorkspace?.show,
          command.view,
        );
      case "studio.notify":
        return this.#invoke(
          command.type,
          this.#host.SerreStudio,
          this.#host.SerreStudio?.notify,
          command.message,
          command.level === "error",
        );
      case "project.activate":
        return this.#invoke(
          command.type,
          this.#host.SerreProjects,
          this.#host.SerreProjects?.activate,
          command.projectId,
        );
      case "episode.select":
        return this.#invoke(
          command.type,
          this.#host.SerreEpisode,
          this.#host.SerreEpisode?.refresh,
          command.episodeId,
        );
      case "notifications.capture-error":
        return this.#invoke(
          command.type,
          this.#host.SerreNotifications,
          this.#host.SerreNotifications?.captureError,
          command.message,
        );
      case "runtime.refresh":
        return this.#invoke(
          command.type,
          this.#host.SerreRuntimeManager,
          this.#host.SerreRuntimeManager?.refresh,
        );
      case "runtime.prepare":
        return this.#invoke(
          command.type,
          this.#host.SerreRuntimeManager,
          this.#host.SerreRuntimeManager?.prepareAll,
        );
      case "runtime.control":
        return this.#invoke(
          command.type,
          this.#host.SerreRuntimeManager,
          this.#host.SerreRuntimeManager?.control,
          command.service,
          command.action,
        );
      case "runtime.show-logs":
        return this.#invoke(
          command.type,
          this.#host.SerreRuntimeManager,
          this.#host.SerreRuntimeManager?.showLogs,
          command.service,
        );
      case "activity.open-log":
        return this.#invoke(
          command.type,
          this.#host.SerreActivity,
          this.#host.SerreActivity?.openLog,
        );
      case "activity.close":
        return this.#invoke(
          command.type,
          this.#host.SerreActivity,
          this.#host.SerreActivity?.close,
        );
      case "activity.publish":
        this.#host.dispatchEvent(
          new CustomEvent("studio:stage-job", { detail: command.payload }),
        );
        return true;
      default:
        this.#trace(`Unknown legacy command "${command.type}".`, command);
        return false;
    }
  }

  dispose(): void {
    this.#detachDomListeners();
    const leakedListeners = [...this.#listeners.values()].reduce(
      (total, listeners) => total + listeners.size,
      0,
    );
    if (leakedListeners > 0) {
      this.#trace(
        `LegacyBridge disposed with ${leakedListeners} subscription(s) still active.`,
      );
    }
    this.#listeners.clear();
  }

  get subscriptionCount(): number {
    return this.#domListeners.size;
  }

  #detachDomListeners(): void {
    for (const [eventName, listener] of this.#domListeners) {
      this.#host.removeEventListener(eventName, listener);
    }
    this.#domListeners.clear();
    this.#started = false;
    if (activeBridges.get(this.#host) === this)
      activeBridges.delete(this.#host);
  }

  #receive(eventName: LegacyEventName, event: Event): void {
    const detail = record(
      event instanceof CustomEvent ? event.detail : undefined,
    );
    if (isActivityEvent(eventName)) {
      this.#emit("activityChanged", {
        sourceEvent: eventName,
        payload: detail,
      });
      return;
    }

    switch (eventName) {
      case "studio:workspace-changed":
        this.#emit("workspaceChanged", {
          view: this.#workspaceView(detail.view),
          payload: detail,
        });
        break;
      case "studio:project-changed":
        this.#emit("projectChanged", {
          projectId: nullableString(detail.active_id),
          payload: detail,
        });
        break;
      case "studio:episode-loaded": {
        const episode = nestedRecord(detail, "episode");
        this.#emit("episodeLoaded", {
          episodeId: nullableString(episode.id),
          seriesId: nullableString(episode.series_id),
          payload: detail,
        });
        break;
      }
      case "studio:episode-cleared":
        this.#emit("episodeCleared", undefined);
        break;
      case "studio:shot-selected": {
        const episode = nestedRecord(detail, "episode");
        const shot = nestedRecord(detail, "shot");
        this.#emit("shotSelected", {
          episodeId: nullableString(episode.id),
          shotId: nullableString(shot.id) ?? nullableString(shot.shot_id),
          index: typeof detail.index === "number" ? detail.index : null,
          payload: detail,
        });
        break;
      }
      case "studio:runtime":
        this.#emit("runtimeChanged", {
          enabled: typeof detail.enabled === "boolean" ? detail.enabled : null,
          services: Array.isArray(detail.services)
            ? detail.services.filter(isRecord)
            : [],
          payload: detail,
        });
        break;
      case "studio:runtime-preparation":
        this.#emit("runtimePreparation", {
          status: nullableString(detail.status),
          message: nullableString(detail.message),
          progress: isRecord(detail.progress) ? detail.progress : null,
          payload: detail,
        });
        break;
    }
  }

  #emit<Key extends keyof LegacyBridgeEventMap>(
    eventName: Key,
    payload: LegacyBridgeEventMap[Key],
  ): void {
    for (const listener of this.#listeners.get(eventName) ?? []) {
      listener(payload as never);
    }
  }

  #workspaceView(value: unknown): LegacyWorkspaceView | null {
    return value === "guided" ||
      value === "graph" ||
      value === "plan" ||
      value === "outputs" ||
      value === "bible" ||
      value === "settings"
      ? value
      : null;
  }

  #invoke(
    commandName: string,
    receiver: unknown,
    target: ((...args: never[]) => unknown) | undefined,
    ...args: unknown[]
  ): boolean {
    if (!target) {
      this.#trace(`Legacy command "${commandName}" is unavailable.`);
      return false;
    }
    target.call(receiver, ...(args as never[]));
    return true;
  }

  #trace(message: string, context?: unknown): void {
    if (this.#development)
      this.#logger.warn(`[LegacyBridge] ${message}`, context);
  }
}
