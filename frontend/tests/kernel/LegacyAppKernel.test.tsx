// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  AppKernelProvider,
  createLegacyAppKernel,
  useActiveContextPort,
  useNavigation,
  useNotifications,
} from "../../src/app/kernel";
import type { LegacyHost } from "../../src/shared/legacy";

function createHost(): LegacyHost {
  const host = new EventTarget() as LegacyHost;
  host.SerreWorkspace = {
    show: vi.fn(),
    current: () => "guided",
  };
  host.SerreStudio = { notify: vi.fn() };
  host.SerreProjects = {
    ready: Promise.resolve(),
    current: () => ({ active_id: "project-initial" }),
    activate: vi.fn(),
  };
  host.SerreEpisode = {
    refresh: vi.fn(),
    current: () => ({
      episode: { id: "episode-initial", series_id: "series-initial" },
    }),
  };
  host.SerreNotifications = { captureError: vi.fn() };
  host.SerreRuntimeManager = {
    refresh: vi.fn(),
    prepareAll: vi.fn(),
    control: vi.fn(),
    showLogs: vi.fn(),
    current: () => ({ enabled: true, services: [] }),
  };
  host.SerreActivity = {
    openLog: vi.fn(),
    close: vi.fn(),
    current: () => null,
  };
  return host;
}

describe("createLegacyAppKernel", () => {
  it("hydrate le contexte puis déduplique un changement de projet historique", async () => {
    const host = createHost();
    const runtime = createLegacyAppKernel({ host });
    await runtime.start();

    expect(runtime.kernel.activeContext.getSnapshot()).toMatchObject({
      projectId: "project-initial",
      seriesId: "series-initial",
      episodeId: "episode-initial",
    });

    const listener = vi.fn();
    const unsubscribe = runtime.kernel.activeContext.subscribe(listener);
    const event = () =>
      host.dispatchEvent(
        new CustomEvent("studio:project-changed", {
          detail: { active_id: "project-next" },
        }),
      );

    event();
    event();

    expect(listener).toHaveBeenCalledOnce();
    expect(runtime.kernel.activeContext.getSnapshot()).toEqual({
      projectId: "project-next",
      seriesId: null,
      episodeId: null,
      shotId: null,
    });

    unsubscribe();
    runtime.dispose();
  });

  it("permet à un composant React de naviguer, notifier et sélectionner sans global", async () => {
    const host = createHost();
    const runtime = createLegacyAppKernel({ host });
    await runtime.start();

    function Feature() {
      const context = useActiveContextPort();
      const navigation = useNavigation();
      const notifications = useNotifications();
      return (
        <>
          <button
            onClick={() =>
              navigation.navigate({ kind: "workspace", view: "bible" })
            }
          >
            Naviguer
          </button>
          <button
            onClick={() =>
              notifications.notify({
                level: "success",
                title: "Épisode",
                message: "prêt",
              })
            }
          >
            Notifier
          </button>
          <button onClick={() => context.selectEpisode("episode-next")}>
            Sélectionner
          </button>
        </>
      );
    }

    render(
      <AppKernelProvider kernel={runtime.kernel}>
        <Feature />
      </AppKernelProvider>,
    );

    fireEvent.click(screen.getByText("Naviguer"));
    fireEvent.click(screen.getByText("Notifier"));
    fireEvent.click(screen.getByText("Sélectionner"));

    expect(host.SerreWorkspace?.show).toHaveBeenCalledWith("bible");
    expect(host.SerreStudio?.notify).toHaveBeenCalledWith(
      "Épisode · prêt",
      false,
    );
    expect(host.SerreEpisode?.refresh).toHaveBeenCalledWith("episode-next");

    runtime.dispose();
  });

  it("libère le bridge et ignore les événements après démontage", async () => {
    const host = createHost();
    const runtime = createLegacyAppKernel({ host });
    await runtime.start();
    const listener = vi.fn();
    runtime.kernel.activeContext.subscribe(listener);

    runtime.dispose();
    host.dispatchEvent(
      new CustomEvent("studio:project-changed", {
        detail: { active_id: "ignored" },
      }),
    );

    expect(listener).not.toHaveBeenCalled();
    expect(runtime.kernel.activeContext.getSnapshot().projectId).toBe(
      "project-initial",
    );
  });
  it("publie le cycle d’une activité React dans la surface historique", async () => {
    const host = createHost();
    const events: string[] = [];
    host.addEventListener("studio:stage-job", (event) => {
      const detail = (event as CustomEvent<{ status: string }>).detail;
      events.push(detail.status);
    });
    const runtime = createLegacyAppKernel({ host });
    await runtime.start();

    const activity = runtime.kernel.activity.start({
      kind: "generation",
      label: "Génération locale",
    });
    activity.update({ progress: 50 });
    activity.finish();

    expect(events).toEqual(["GENERATING", "GENERATING", "COMPLETED"]);
    runtime.dispose();
  });
});
