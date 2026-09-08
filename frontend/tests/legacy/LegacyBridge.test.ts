// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  LegacyBridge,
  type LegacyBridgeLogger,
  type LegacyHost,
} from "../../src/shared/legacy/LegacyBridge";

const bridges: LegacyBridge[] = [];

function setup() {
  const logger: LegacyBridgeLogger = { warn: vi.fn() };
  const host = new EventTarget() as LegacyHost;
  host.SerreWorkspace = {
    show: vi.fn(),
    current: vi.fn(() => "guided" as const),
  };
  host.SerreStudio = { notify: vi.fn() };
  host.SerreProjects = {
    ready: Promise.resolve(),
    current: vi.fn(() => ({})),
    activate: vi.fn(),
  };
  host.SerreEpisode = { refresh: vi.fn(), current: vi.fn(() => null) };
  host.SerreNotifications = { captureError: vi.fn() };
  host.SerreRuntimeManager = {
    refresh: vi.fn(),
    prepareAll: vi.fn(),
    control: vi.fn(),
    showLogs: vi.fn(),
    current: vi.fn(() => ({})),
  };
  host.SerreActivity = {
    openLog: vi.fn(),
    close: vi.fn(),
    current: vi.fn(() => null),
  };
  const bridge = new LegacyBridge({ host, development: true, logger });
  bridges.push(bridge);
  return { bridge, host, logger };
}

afterEach(() => {
  for (const bridge of bridges.splice(0)) bridge.dispose();
});

describe("LegacyBridge initial hydration", () => {
  it("attend les projets et lit les snapshots sans exposer les globals", async () => {
    const { bridge, host } = setup();
    host.SerreProjects = {
      ready: Promise.resolve(),
      current: vi.fn(() => ({ active_id: "garden" })),
      activate: vi.fn(),
    };
    host.SerreEpisode = {
      refresh: vi.fn(),
      current: vi.fn(() => ({
        episode: { id: "S01E002", series_id: "S01" },
      })),
    };
    host.SerreRuntimeManager = {
      refresh: vi.fn(),
      prepareAll: vi.fn(),
      control: vi.fn(),
      showLogs: vi.fn(),
      current: vi.fn(() => ({
        enabled: true,
        services: [{ name: "ollama", state: "ready" }],
      })),
    };

    await expect(bridge.initialSnapshot()).resolves.toMatchObject({
      workspace: { view: "guided" },
      project: { projectId: "garden" },
      episode: { episodeId: "S01E002", seriesId: "S01" },
      runtime: { enabled: true },
    });
  });
});

describe("LegacyBridge event mapping", () => {
  it("maps exact workspace views and rejects unknown views", () => {
    const { bridge, host } = setup();
    const listener = vi.fn();
    bridge.subscribe("workspaceChanged", listener);
    bridge.start();
    host.dispatchEvent(
      new CustomEvent("studio:workspace-changed", {
        detail: { view: "outputs" },
      }),
    );
    host.dispatchEvent(
      new CustomEvent("studio:workspace-changed", {
        detail: { view: "unknown" },
      }),
    );
    expect(listener).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ view: "outputs" }),
    );
    expect(listener).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ view: null }),
    );
  });
  it("maps project, episode and shot context without duplicate DOM subscriptions", () => {
    const { bridge, host, logger } = setup();
    const projects = vi.fn();
    const episodes = vi.fn();
    const shots = vi.fn();
    bridge.subscribe("projectChanged", projects);
    bridge.subscribe("episodeLoaded", episodes);
    bridge.subscribe("shotSelected", shots);

    bridge.start().start();
    host.dispatchEvent(
      new CustomEvent("studio:project-changed", {
        detail: { active_id: "garden" },
      }),
    );
    host.dispatchEvent(
      new CustomEvent("studio:episode-loaded", {
        detail: { episode: { id: "S01E002", series_id: "S01" }, shots: [] },
      }),
    );
    host.dispatchEvent(
      new CustomEvent("studio:shot-selected", {
        detail: {
          episode: { id: "S01E002" },
          shot: { shot_id: "S01E002-S03" },
          index: 3,
        },
      }),
    );

    expect(projects).toHaveBeenCalledOnce();
    expect(projects).toHaveBeenCalledWith(
      expect.objectContaining({ projectId: "garden" }),
    );
    expect(episodes).toHaveBeenCalledWith(
      expect.objectContaining({ episodeId: "S01E002", seriesId: "S01" }),
    );
    expect(shots).toHaveBeenCalledWith(
      expect.objectContaining({
        episodeId: "S01E002",
        shotId: "S01E002-S03",
        index: 3,
      }),
    );
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining("Duplicate"),
      undefined,
    );
  });

  it("maps runtime, preparation and activity events", () => {
    const { bridge, host } = setup();
    const runtime = vi.fn();
    const preparation = vi.fn();
    const activity = vi.fn();
    bridge.subscribe("runtimeChanged", runtime);
    bridge.subscribe("runtimePreparation", preparation);
    bridge.subscribe("activityChanged", activity);
    bridge.start();

    host.dispatchEvent(
      new CustomEvent("studio:runtime", {
        detail: {
          enabled: true,
          services: [{ name: "ollama", state: "ready" }],
        },
      }),
    );
    host.dispatchEvent(
      new CustomEvent("studio:runtime-preparation", {
        detail: {
          status: "GENERATING",
          message: "Starting",
          progress: { percent: 25 },
        },
      }),
    );
    host.dispatchEvent(
      new CustomEvent("studio:narrative-job", {
        detail: { id: "job-1", status: "RUNNING" },
      }),
    );

    expect(runtime).toHaveBeenCalledWith(
      expect.objectContaining({
        enabled: true,
        services: [expect.objectContaining({ name: "ollama" })],
      }),
    );
    expect(preparation).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "GENERATING",
        message: "Starting",
        progress: { percent: 25 },
      }),
    );
    expect(activity).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceEvent: "studio:narrative-job",
        payload: expect.objectContaining({ id: "job-1" }),
      }),
    );
  });

  it("removes every DOM subscription on dispose", () => {
    const { bridge, host } = setup();
    const listener = vi.fn();
    bridge.subscribe("projectChanged", listener);
    bridge.start();
    expect(bridge.subscriptionCount).toBeGreaterThan(0);

    bridge.dispose();
    host.dispatchEvent(
      new CustomEvent("studio:project-changed", {
        detail: { active_id: "ignored" },
      }),
    );

    expect(listener).not.toHaveBeenCalled();
    expect(bridge.subscriptionCount).toBe(0);
  });

  it("replaces the active bridge on the same host during HMR", () => {
    const { bridge: first, host, logger } = setup();
    const oldListener = vi.fn();
    first.subscribe("projectChanged", oldListener);
    first.start();

    const replacement = new LegacyBridge({ host, development: true, logger });
    bridges.push(replacement);
    const newListener = vi.fn();
    replacement.subscribe("projectChanged", newListener);
    replacement.start();
    host.dispatchEvent(
      new CustomEvent("studio:project-changed", {
        detail: { active_id: "next" },
      }),
    );

    expect(oldListener).not.toHaveBeenCalled();
    expect(newListener).toHaveBeenCalledOnce();
    expect(first.subscriptionCount).toBe(0);
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining("HMR"),
      undefined,
    );
  });
});

describe("LegacyBridge command mapping", () => {
  it("maps typed commands to their real legacy globals", () => {
    const { bridge, host } = setup();

    expect(bridge.dispatch({ type: "workspace.show", view: "outputs" })).toBe(
      true,
    );
    expect(
      bridge.dispatch({
        type: "studio.notify",
        message: "Broken",
        level: "error",
      }),
    ).toBe(true);
    expect(
      bridge.dispatch({ type: "project.activate", projectId: "garden" }),
    ).toBe(true);
    expect(
      bridge.dispatch({ type: "episode.select", episodeId: "S01E003" }),
    ).toBe(true);
    expect(
      bridge.dispatch({
        type: "notifications.capture-error",
        message: "Failure",
      }),
    ).toBe(true);
    expect(bridge.dispatch({ type: "runtime.refresh" })).toBe(true);
    expect(bridge.dispatch({ type: "runtime.prepare" })).toBe(true);
    expect(
      bridge.dispatch({
        type: "runtime.control",
        service: "ollama",
        action: "restart",
      }),
    ).toBe(true);
    expect(
      bridge.dispatch({ type: "runtime.show-logs", service: "comfyui" }),
    ).toBe(true);
    expect(bridge.dispatch({ type: "activity.open-log" })).toBe(true);
    expect(bridge.dispatch({ type: "activity.close" })).toBe(true);

    expect(host.SerreWorkspace?.show).toHaveBeenCalledWith("outputs");
    expect(host.SerreStudio?.notify).toHaveBeenCalledWith("Broken", true);
    expect(host.SerreProjects?.activate).toHaveBeenCalledWith("garden");
    expect(host.SerreEpisode?.refresh).toHaveBeenCalledWith("S01E003");
    expect(host.SerreNotifications?.captureError).toHaveBeenCalledWith(
      "Failure",
    );
    expect(host.SerreRuntimeManager?.refresh).toHaveBeenCalledOnce();
    expect(host.SerreRuntimeManager?.prepareAll).toHaveBeenCalledOnce();
    expect(host.SerreRuntimeManager?.control).toHaveBeenCalledWith(
      "ollama",
      "restart",
    );
    expect(host.SerreRuntimeManager?.showLogs).toHaveBeenCalledWith("comfyui");
    expect(host.SerreActivity?.openLog).toHaveBeenCalledOnce();
    expect(host.SerreActivity?.close).toHaveBeenCalledOnce();
  });

  it("publishes activity start, update and finish to the legacy activity event", () => {
    const { bridge } = setup();
    const listener = vi.fn();
    bridge.subscribe("activityChanged", listener);
    bridge.start();

    bridge.dispatch({
      type: "activity.publish",
      payload: { id: "react-1", status: "GENERATING" },
    });
    bridge.dispatch({
      type: "activity.publish",
      payload: {
        id: "react-1",
        status: "GENERATING",
        progress: { percent: 50 },
      },
    });
    bridge.dispatch({
      type: "activity.publish",
      payload: { id: "react-1", status: "COMPLETED" },
    });

    expect(listener).toHaveBeenCalledTimes(3);
    expect(listener).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        sourceEvent: "studio:stage-job",
        payload: expect.objectContaining({ status: "GENERATING" }),
      }),
    );
    expect(listener).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        payload: expect.objectContaining({ progress: { percent: 50 } }),
      }),
    );
    expect(listener).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        payload: expect.objectContaining({ status: "COMPLETED" }),
      }),
    );
  });

  it("traces unknown and unavailable commands only in development", () => {
    const { bridge, host, logger } = setup();
    expect(bridge.dispatch({ type: "mystery.command", payload: true })).toBe(
      false,
    );
    delete host.SerreWorkspace;
    expect(bridge.dispatch({ type: "workspace.show", view: "graph" })).toBe(
      false,
    );

    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining("Unknown"),
      expect.anything(),
    );
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining("unavailable"),
      undefined,
    );
  });

  it("traces bridge listener leaks and clears them during dispose", () => {
    const { bridge, logger } = setup();
    bridge.subscribe("episodeCleared", vi.fn());
    bridge.start();
    bridge.dispose();

    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining("still active"),
      undefined,
    );
  });
});
