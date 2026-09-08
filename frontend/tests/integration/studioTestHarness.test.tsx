// @vitest-environment jsdom

import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { afterEach, describe, expect, it } from "vitest";

import { useActiveContext, useActiveContextPort } from "../../src/app/kernel";
import { ApiError } from "../../src/shared/api";
import {
  createMockApi,
  renderWithStudio,
  useStudioTestEnvironment,
} from "../../src/test";

afterEach(cleanup);

interface EpisodeSummary {
  readonly id: string;
  readonly title: string;
}

function EpisodeEditor() {
  const context = useActiveContext();
  const activeContext = useActiveContextPort();
  const { api, locale } = useStudioTestEnvironment();
  const queryClient = useQueryClient();
  const queryKey = ["episode", context.projectId, context.episodeId] as const;
  const episode = useQuery({
    queryKey,
    queryFn: () => api.request<EpisodeSummary>("episode.read", context),
  });
  const rename = useMutation({
    mutationFn: (title: string) =>
      api.request<EpisodeSummary>("episode.rename", {
        episodeId: context.episodeId,
        locale,
        title,
      }),
    onSuccess: (updated) => queryClient.setQueryData(queryKey, updated),
  });

  if (episode.error instanceof ApiError) {
    return <div role="alert">{episode.error.detail}</div>;
  }
  if (!episode.data) return <div role="status">Loading</div>;

  return (
    <section>
      <output>{`${locale}:${context.projectId}:${episode.data.title}`}</output>
      <button type="button" onClick={() => rename.mutate("New title")}>
        Rename
      </button>
      <button
        type="button"
        onClick={() => activeContext.selectEpisode("episode-2")}
      >
        Next
      </button>
    </section>
  );
}

describe("studio test harness", () => {
  it("provides project, episode and locale then updates a mutation without network", async () => {
    const api = createMockApi({
      "episode.read": (input: unknown) => {
        const context = input as { episodeId: string };
        return { id: context.episodeId, title: `Title ${context.episodeId}` };
      },
      "episode.rename": (input: unknown) => {
        const command = input as { episodeId: string; title: string };
        return { id: command.episodeId, title: command.title };
      },
    });

    renderWithStudio(<EpisodeEditor />, {
      api,
      context: { projectId: "project-7", episodeId: "episode-1" },
      locale: "en-GB",
    });

    expect(
      await screen.findByText("en-GB:project-7:Title episode-1"),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Rename" }));
    expect(await screen.findByText("en-GB:project-7:New title")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(
      await screen.findByText("en-GB:project-7:Title episode-2"),
    ).toBeTruthy();

    expect(api.calls.map(({ operation }) => operation)).toEqual([
      "episode.read",
      "episode.rename",
      "episode.read",
    ]);
    expect(api.calls[1]?.input).toEqual({
      episodeId: "episode-1",
      locale: "en-GB",
      title: "New title",
    });
  });

  it("surfaces a normalized API failure and never falls back to fetch", async () => {
    const originalFetch = globalThis.fetch;
    let fetchCalls = 0;
    globalThis.fetch = (() => {
      fetchCalls += 1;
      throw new Error("Unexpected network call");
    }) as typeof fetch;
    const api = createMockApi({
      "episode.read": new ApiError({
        status: 503,
        data: {
          code: "temporarily_unavailable",
          detail: "Service unavailable",
        },
      }),
    });

    try {
      renderWithStudio(<EpisodeEditor />, { api });
      await waitFor(() => {
        expect(screen.getByRole("alert").textContent).toBe(
          "Service unavailable",
        );
      });
      expect(fetchCalls).toBe(0);
      expect(api.calls).toHaveLength(1);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
