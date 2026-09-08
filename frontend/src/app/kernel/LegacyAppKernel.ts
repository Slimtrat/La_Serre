import type {
  ActiveContext,
  ActivityHandle,
  ActivityUpdate,
  AppKernel,
  NavigationTarget,
  NotificationInput,
} from "./contracts";
import {
  LegacyBridge,
  type LegacyHost,
  type LegacyWorkspaceView,
} from "@shared/legacy";

const EMPTY_CONTEXT: ActiveContext = {
  projectId: null,
  seriesId: null,
  episodeId: null,
  shotId: null,
};

interface ExternalStore<T> {
  getSnapshot(): T;
  setSnapshot(snapshot: T): void;
  subscribe(listener: () => void): () => void;
}

function createStore<T>(
  initial: T,
  equals: (left: T, right: T) => boolean,
): ExternalStore<T> {
  let snapshot = initial;
  const listeners = new Set<() => void>();

  return {
    getSnapshot: () => snapshot,
    setSnapshot: (next) => {
      if (equals(snapshot, next)) return;
      snapshot = next;
      listeners.forEach((listener) => listener());
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

function sameContext(left: ActiveContext, right: ActiveContext): boolean {
  return (
    left.projectId === right.projectId &&
    left.seriesId === right.seriesId &&
    left.episodeId === right.episodeId &&
    left.shotId === right.shotId
  );
}

function messageOf(notification: NotificationInput): string {
  return notification.message
    ? notification.title + " · " + notification.message
    : notification.title;
}

function legacyActivityStatus(status: string): string {
  return (
    {
      running: "GENERATING",
      succeeded: "COMPLETED",
      failed: "FAILED",
      cancelled: "CANCELLED",
    }[status] ?? status
  );
}

export interface LegacyAppKernelRuntime {
  readonly kernel: AppKernel;
  start(): Promise<void>;
  dispose(): void;
}

export interface LegacyAppKernelOptions {
  readonly bridge?: LegacyBridge;
  readonly host?: LegacyHost;
}

export function createLegacyAppKernel(
  options: LegacyAppKernelOptions = {},
): LegacyAppKernelRuntime {
  const bridge = options.bridge ?? new LegacyBridge({ host: options.host });
  const context = createStore<ActiveContext>(EMPTY_CONTEXT, sameContext);
  let started = false;
  let lifecycle = 0;
  let sequence = 0;
  let unsubscribeBridge: Array<() => void> = [];

  const patchContext = (patch: Partial<ActiveContext>) => {
    context.setSnapshot({ ...context.getSnapshot(), ...patch });
  };

  const createId = () => {
    sequence += 1;
    return "kernel-" + Date.now() + "-" + sequence;
  };

  const kernel: AppKernel = {
    activeContext: {
      getSnapshot: context.getSnapshot,
      subscribe: context.subscribe,
      selectProject: (projectId) => {
        if (projectId === null) {
          context.setSnapshot(EMPTY_CONTEXT);
          return;
        }
        bridge.dispatch({ type: "project.activate", projectId });
      },
      selectSeries: (seriesId) =>
        patchContext({ seriesId, episodeId: null, shotId: null }),
      selectEpisode: (episodeId) => {
        if (episodeId === null) {
          patchContext({ episodeId: null, shotId: null });
          return;
        }
        bridge.dispatch({ type: "episode.select", episodeId });
      },
      selectShot: (shotId) => patchContext({ shotId }),
    },
    navigation: {
      navigate: (target: NavigationTarget) => {
        bridge.dispatch({
          type: "workspace.show",
          view: target.view as LegacyWorkspaceView,
        });
      },
    },
    notifications: {
      notify: (notification) => {
        bridge.dispatch({
          type: "studio.notify",
          message: messageOf(notification),
          level: notification.level,
        });
        return createId();
      },
    },
    runtime: {
      environment: import.meta.env.DEV ? "development" : "production",
      capabilities: {
        filesystem: true,
        generation: true,
        export: true,
      },
      now: () => new Date(),
      createId,
      reportError: (error) => {
        const message = error instanceof Error ? error.message : String(error);
        bridge.dispatch({ type: "notifications.capture-error", message });
      },
    },
    activity: {
      start: (activity) => {
        const id = createId();
        const publish = (update: ActivityUpdate & { status: string }) => {
          bridge.dispatch({
            type: "activity.publish",
            payload: {
              id,
              kind: activity.kind,
              title: activity.label,
              context: activity.context,
              ...update,
              status: legacyActivityStatus(update.status),
            },
          });
        };
        publish({ status: "running" });
        const handle: ActivityHandle = {
          id,
          update: (update) =>
            publish({ status: update.status ?? "running", ...update }),
          finish: (status = "succeeded") => publish({ status }),
        };
        return handle;
      },
    },
  };

  const bindBridge = () => {
    unsubscribeBridge = [
      bridge.subscribe("projectChanged", ({ projectId }) => {
        context.setSnapshot({
          projectId,
          seriesId: null,
          episodeId: null,
          shotId: null,
        });
      }),
      bridge.subscribe("episodeLoaded", ({ episodeId, seriesId }) => {
        patchContext({ seriesId, episodeId, shotId: null });
      }),
      bridge.subscribe("episodeCleared", () => {
        patchContext({ seriesId: null, episodeId: null, shotId: null });
      }),
      bridge.subscribe("shotSelected", ({ episodeId, shotId }) => {
        patchContext({ episodeId, shotId });
      }),
    ];
  };

  return {
    kernel,
    async start() {
      if (started) return;
      started = true;
      lifecycle += 1;
      const currentLifecycle = lifecycle;
      bindBridge();
      bridge.start();

      try {
        const snapshot = await bridge.initialSnapshot();
        if (!started || lifecycle !== currentLifecycle) return;
        context.setSnapshot({
          projectId: snapshot.project.projectId,
          seriesId: snapshot.episode.seriesId,
          episodeId: snapshot.episode.episodeId,
          shotId: null,
        });
      } catch (error) {
        if (started && lifecycle === currentLifecycle)
          kernel.runtime.reportError(error);
      }
    },
    dispose() {
      if (!started) return;
      started = false;
      lifecycle += 1;
      unsubscribeBridge.forEach((unsubscribe) => unsubscribe());
      unsubscribeBridge = [];
      bridge.dispose();
    },
  };
}
