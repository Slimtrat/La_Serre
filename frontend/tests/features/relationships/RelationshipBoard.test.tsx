import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { RelationshipBoard } from "@features/relationships";

const relationship = {
  id: "belladone-vers-aconit",
  source: "belladone",
  target: "aconit",
  label: "Désir nié",
  summary: "Belladone provoque Aconit tandis que leur confiance reste fragile.",
  desire: 72,
  trust: 46,
  anger: 24,
  fear: 58,
  attachment: 68,
  jealousy: 64,
  toxicity: 18,
  provenance: { source: "template", note: "Fixture" },
} as const;

const board = {
  bible_revision: 4,
  updated_at: "2026-09-08T12:00:00Z",
  characters: [
    { id: "belladone", name: "Belladone" },
    { id: "aconit", name: "Aconit" },
  ],
  relationships: [relationship],
  secrets: [
    {
      id: "seed",
      owners: ["aconit"],
      known_by: ["aconit"],
      hidden_from: ["belladone"],
      summary: "Aconit reconnaît le symbole ancien gravé sur la graine.",
      severity: 0.72,
      created_episode: 1,
      revealed: false,
      provenance: { source: "template", note: "Fixture" },
    },
  ],
  history: [
    {
      revision: 4,
      changed_at: "2026-09-08T12:00:00Z",
      entity_type: "relationship",
      entity_id: relationship.id,
      operation: "update",
    },
  ],
  impact: { affected_episodes: [], affected_shots: [], artifact_count: 0 },
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function renderBoard(advancedView?: React.ReactNode) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <RelationshipBoard advancedView={advancedView} locale="fr" />
    </QueryClientProvider>,
  );
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("RelationshipBoard", () => {
  it("edits the reverse direction with both numeric and slider controls", async () => {
    const fetchMock = vi.fn(
      async (_input: RequestInfo | URL, init?: RequestInit) => {
        if (init?.method === "PUT") {
          const request = JSON.parse(String(init.body)) as {
            confirmed_by_user: boolean;
            relationship: typeof relationship;
          };
          return json({
            ...board,
            bible_revision: 5,
            relationships: [...board.relationships, request.relationship],
            impact: {
              affected_episodes: ["S01E001"],
              affected_shots: ["S01E001-S01"],
              artifact_count: 1,
            },
          });
        }
        return json(board);
      },
    );
    vi.stubGlobal("fetch", fetchMock);
    renderBoard();

    fireEvent.click(
      await screen.findByRole("button", {
        name: "Choisir cette direction: Aconit → Belladone",
      }),
    );
    fireEvent.change(screen.getByLabelText("Dynamique"), {
      target: { value: "Méfiance protectrice" },
    });
    fireEvent.change(screen.getByLabelText("Résumé canonique"), {
      target: {
        value:
          "Aconit protège Belladone mais refuse encore de lui faire confiance.",
      },
    });
    fireEvent.change(screen.getByLabelText("Jalousie value"), {
      target: { value: "81" },
    });
    expect(screen.getByLabelText("Jalousie slider")).toHaveProperty(
      "value",
      "81",
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Enregistrer dans la Bible" }),
    );

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/relationship-board/relationships/aconit-vers-belladone",
        expect.objectContaining({ method: "PUT" }),
      );
    });
    const putCall = fetchMock.mock.calls.find(
      (call) => call[1]?.method === "PUT",
    );
    const payload = JSON.parse(String(putCall?.[1]?.body)) as {
      confirmed_by_user: boolean;
      relationship: { source: string; target: string; jealousy: number };
    };
    expect(payload.confirmed_by_user).toBe(true);
    expect(payload.relationship).toMatchObject({
      source: "aconit",
      target: "belladone",
      jealousy: 81,
    });
    expect(await screen.findByText("S01E001, S01E001-S01")).toBeTruthy();
  });

  it("shows explicit secret knowledge and generates a non-canonical preview", async () => {
    const fetchMock = vi.fn(
      async (_input: RequestInfo | URL, init?: RequestInit) => {
        if (init?.method === "POST") {
          return json({
            id: "relationship-summary-test",
            base_revision: 4,
            status: "candidate",
            summary: "Aconit cache à Belladone ce qu’elle sait de la graine.",
            relationship_ids: [],
            secret_ids: ["seed"],
            provenance: {
              provider: "deterministic",
              method: "relationship-board-v1",
              canonical: false,
            },
          });
        }
        return json(board);
      },
    );
    vi.stubGlobal("fetch", fetchMock);
    renderBoard();

    fireEvent.click(await screen.findByRole("tab", { name: "Secrets" }));
    expect(
      screen.getByDisplayValue(
        "Aconit reconnaît le symbole ancien gravé sur la graine.",
      ),
    ).toBeTruthy();
    expect(screen.getByRole("group", { name: "Détenteurs" })).toBeTruthy();
    expect(screen.getByRole("group", { name: "Au courant" })).toBeTruthy();
    expect(screen.getByRole("group", { name: "Tenu à l’écart" })).toBeTruthy();
    fireEvent.click(
      screen.getByRole("button", { name: "Générer un aperçu narratif" }),
    );

    expect(
      await screen.findByText("Aperçu candidat — non canonique"),
    ).toBeTruthy();
    expect(screen.getByText(/Aconit cache à Belladone/)).toBeTruthy();
    expect(fetchMock.mock.calls.some((call) => call[1]?.method === "PUT")).toBe(
      false,
    );
  });

  it("keeps the advanced legacy Bible reachable on demand", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => json(board)),
    );
    renderBoard(<div>Legacy Bible fixture</div>);

    expect(screen.queryByText("Legacy Bible fixture")).toBeNull();
    fireEvent.click(await screen.findByRole("tab", { name: "Bible avancée" }));
    expect(screen.getByText("Legacy Bible fixture")).toBeTruthy();
  });
});
