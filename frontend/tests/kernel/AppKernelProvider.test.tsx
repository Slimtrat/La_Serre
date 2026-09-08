// @vitest-environment jsdom

import { act, render, screen } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import {
  AppKernelProvider,
  type ActiveContext,
  type AppKernel,
  useActiveContext,
  useActivity,
  useNavigation,
  useNotifications,
  useRuntime,
} from "../../src/app/kernel";

function createKernel(): AppKernel {
  const snapshot = {
    projectId: "project-1",
    seriesId: "series-1",
    episodeId: "episode-1",
    shotId: null,
  } as const;

  return {
    activeContext: {
      getSnapshot: () => snapshot,
      subscribe: vi.fn(() => vi.fn()),
      selectProject: vi.fn(),
      selectSeries: vi.fn(),
      selectEpisode: vi.fn(),
      selectShot: vi.fn(),
    },
    navigation: { navigate: vi.fn() },
    notifications: { notify: vi.fn(() => "notification-1") },
    runtime: {
      environment: "test",
      capabilities: { filesystem: false, generation: true, export: true },
      now: () => new Date("2026-01-02T03:04:05.000Z"),
      createId: () => "runtime-id",
      reportError: vi.fn(),
    },
    activity: {
      start: vi.fn(() => ({
        id: "activity-1",
        update: vi.fn(),
        finish: vi.fn(),
      })),
    },
  };
}

describe("AppKernelProvider", () => {
  it("exposes the active context snapshot", () => {
    const kernel = createKernel();

    function Consumer() {
      const context = useActiveContext();
      return <span>{`${context.projectId}/${context.episodeId}`}</span>;
    }

    expect(
      renderToStaticMarkup(
        <AppKernelProvider kernel={kernel}>
          <Consumer />
        </AppKernelProvider>,
      ),
    ).toBe("<span>project-1/episode-1</span>");
  });

  it("exposes only the injected application ports", () => {
    const kernel = createKernel();
    let captured: readonly unknown[] = [];

    function Consumer() {
      captured = [
        useNavigation(),
        useNotifications(),
        useRuntime(),
        useActivity(),
      ];
      return null;
    }

    renderToStaticMarkup(
      <AppKernelProvider kernel={kernel}>
        <Consumer />
      </AppKernelProvider>,
    );

    expect(captured).toEqual([
      kernel.navigation,
      kernel.notifications,
      kernel.runtime,
      kernel.activity,
    ]);
  });

  it("fails fast when a hook is used outside the provider", () => {
    function Consumer() {
      useNavigation();
      return null;
    }

    expect(() => renderToStaticMarkup(<Consumer />)).toThrowError(
      "AppKernelProvider is missing from the React tree.",
    );
  });

  it("keeps nested providers isolated instead of relying on a singleton", () => {
    const outer = createKernel();
    const inner = createKernel();
    inner.activeContext.selectEpisode("episode-inner");
    const seen: AppKernel["navigation"][] = [];

    function Consumer() {
      seen.push(useNavigation());
      return null;
    }

    renderToStaticMarkup(
      <AppKernelProvider kernel={outer}>
        <Consumer />
        <AppKernelProvider kernel={inner}>
          <Consumer />
        </AppKernelProvider>
      </AppKernelProvider>,
    );

    expect(seen).toEqual([outer.navigation, inner.navigation]);
  });
  it("publishes context updates and unsubscribes when the consumer unmounts", () => {
    const listeners = new Set<() => void>();
    const unsubscribe = vi.fn((listener: () => void) =>
      listeners.delete(listener),
    );
    let snapshot: ActiveContext = {
      projectId: "project-1",
      seriesId: "series-1",
      episodeId: "episode-1",
      shotId: null,
    };
    const kernel: AppKernel = {
      ...createKernel(),
      activeContext: {
        getSnapshot: () => snapshot,
        subscribe: vi.fn((listener) => {
          listeners.add(listener);
          return () => unsubscribe(listener);
        }),
        selectProject: vi.fn(),
        selectSeries: vi.fn(),
        selectEpisode: (episodeId) => {
          snapshot = { ...snapshot, episodeId };
          listeners.forEach((listener) => {
            listener();
          });
        },
        selectShot: vi.fn(),
      },
    };

    function Consumer() {
      const { episodeId } = useActiveContext();
      return <output>{episodeId}</output>;
    }

    const view = render(
      <AppKernelProvider kernel={kernel}>
        <Consumer />
      </AppKernelProvider>,
    );

    expect(screen.getByText("episode-1")).toBeTruthy();
    expect(listeners.size).toBe(1);

    act(() => kernel.activeContext.selectEpisode("episode-2"));

    expect(screen.getByText("episode-2")).toBeTruthy();

    view.unmount();

    expect(unsubscribe).toHaveBeenCalledOnce();
    expect(listeners.size).toBe(0);
  });
});
