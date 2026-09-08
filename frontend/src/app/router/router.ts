import {
  formatStudioRoute,
  parseStudioRoute,
  type KnownStudioRoute,
  type StudioRoute,
} from "./routes";

export interface StudioRouterNavigationOptions {
  readonly replace?: boolean;
}

export interface StudioRouter {
  getSnapshot(): StudioRoute;
  navigate(
    route: KnownStudioRoute,
    options?: StudioRouterNavigationOptions,
  ): void;
  subscribe(listener: () => void): () => void;
}

export interface StudioRouterHost {
  readonly location: { hash: string };
  readonly history: {
    pushState(data: unknown, unused: string, url?: string | URL | null): void;
    replaceState(data: unknown, unused: string, url?: string | URL | null): void;
  };
  addEventListener(type: "hashchange" | "popstate", listener: () => void): void;
  removeEventListener(type: "hashchange" | "popstate", listener: () => void): void;
}

/** Small external store suitable for React useSyncExternalStore. */
export function createStudioRouter(host: StudioRouterHost): StudioRouter {
  const listeners = new Set<() => void>();
  let lastHash: string | undefined;
  let lastSnapshot: StudioRoute | undefined;

  const getSnapshot = () => {
    const hash = host.location.hash;
    if (lastSnapshot === undefined || hash !== lastHash) {
      lastHash = hash;
      lastSnapshot = parseStudioRoute(hash || "#/create");
    }
    return lastSnapshot;
  };
  const notify = () => {
    lastHash = undefined;
    listeners.forEach((listener) => { listener(); });
  };

  host.addEventListener("hashchange", notify);
  host.addEventListener("popstate", notify);

  return {
    getSnapshot,
    navigate(route, options = {}) {
      const href = formatStudioRoute(route);
      const current = getSnapshot();
      const currentHref =
        current.kind === "not-found" ? undefined : formatStudioRoute(current);
      if (href === currentHref) return;

      if (options.replace) host.history.replaceState(null, "", href);
      else host.history.pushState(null, "", href);
      notify();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}


