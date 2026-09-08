import { describe, expect, it } from "vitest";

import {
  createStudioRouter,
  studioRoute,
  type StudioRouterHost,
} from "../../src/app/router";

function createHost(initialHash = "#/create") {
  const listeners = new Map<string, Set<() => void>>();
  const location = { hash: initialHash };
  const written: Array<{ mode: "push" | "replace"; href: string }> = [];
  const write = (mode: "push" | "replace", url?: string | URL | null) => {
    const href = String(url ?? "");
    location.hash = href;
    written.push({ mode, href });
  };
  const host: StudioRouterHost = {
    location,
    history: {
      pushState: (_data, _unused, url) => write("push", url),
      replaceState: (_data, _unused, url) => write("replace", url),
    },
    addEventListener: (type, listener) => {
      const group = listeners.get(type) ?? new Set();
      group.add(listener);
      listeners.set(type, group);
    },
    removeEventListener: (type, listener) => listeners.get(type)?.delete(listener),
  };

  return {
    host,
    written,
    dispatch: (type: "hashchange" | "popstate") => {
      listeners.get(type)?.forEach((listener) => {
        listener();
      });
    },
  };
}

describe("Studio router store", () => {
  it("navigates, supports replacement and notifies subscribers", () => {
    const browser = createHost();
    const router = createStudioRouter(browser.host);
    let notifications = 0;
    const unsubscribe = router.subscribe(() => {
      notifications += 1;
    });

    router.navigate(studioRoute("results", { projectId: "garden" }));
    router.navigate(studioRoute("settings"), { replace: true });

    expect(browser.written).toEqual([
      { mode: "push", href: "#/results?project=garden" },
      { mode: "replace", href: "#/settings" },
    ]);
    expect(router.getSnapshot()).toEqual(studioRoute("settings"));
    expect(notifications).toBe(2);
    unsubscribe();
  });

  it("restores the same route from a browser history event", () => {
    const browser = createHost("#/produce?project=garden&episode=pilot");
    const router = createStudioRouter(browser.host);
    let notifications = 0;
    router.subscribe(() => {
      notifications += 1;
    });

    expect(router.getSnapshot()).toEqual(
      studioRoute("produce", { projectId: "garden", episodeId: "pilot" }),
    );
    browser.host.location.hash = "#/advanced/graph?project=garden";
    browser.dispatch("popstate");

    expect(router.getSnapshot()).toEqual(
      studioRoute("graph", { projectId: "garden" }),
    );
    expect(notifications).toBe(1);
  });
});


