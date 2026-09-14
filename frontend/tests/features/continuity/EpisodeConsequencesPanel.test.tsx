import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { EpisodeConsequencesPanel, type ContinuityApi, type EpisodeContinuitySnapshot } from "@features/continuity";

const evidence = [{ source_id: "S01E001", source_type: "episode" as const, label: "Scène finale", excerpt: "Belladone surprend Aconit." }];
const snapshot = (overrides: Partial<EpisodeContinuitySnapshot> = {}): EpisodeContinuitySnapshot => ({
  episode_id: "S01E001", revision: 4, source_fingerprint: "source-a",
  input_state: { revision: 2, before_episode_id: "S01E001", entries: [{ id: "jealousy", category: "relationship", subject_id: "belladone", label: "Jalousie", value: "latente", evidence }] },
  proposal: {
    id: "delta-proposal-1", episode_id: "S01E001", revision: 1, source_fingerprint: "source-a", current_source_fingerprint: "source-a",
    stale: false, status: "proposed", provenance: { task_id: "continuity_delta", task_version: "1.0.0", model: "fake-ollama", source_fingerprint: "source-a" },
    changes: [{ id: "change-1", category: "relationship", operation: "update", subject_id: "belladone", label: "Jalousie de Belladone", before: "latente", after: "ouverte", evidence }],
  },
  impact_report: {
    trigger: "reorder", generated_at: "2026-09-14T12:00:00Z",
    affected_items: [{ season_item_id: "season-item-2", episode_id: "S01E002", title: "La confrontation", severity: "blocker", reasons: ["La confrontation précède désormais la jalousie."], evidence }],
  },
  ...overrides,
});

function api(overrides: Partial<ContinuityApi> = {}): ContinuityApi {
  const unchanged = async () => snapshot();
  const previewReorder = async () => {
    const report = snapshot().impact_report;
    if (!report) throw new Error("impact report fixture missing");
    return report;
  };
  return { getEpisodeContinuity: unchanged, generateDelta: unchanged, approveDelta: unchanged, refuseDelta: unchanged, previewReorder, ...overrides };
}
function renderPanel(value: ContinuityApi) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}><EpisodeConsequencesPanel api={value} episodeId="S01E001" locale="fr" /></QueryClientProvider>);
}
afterEach(cleanup);

describe("EpisodeConsequencesPanel", () => {
  it("compares input state and proposed delta with evidence and reorder impact", async () => {
    renderPanel(api());
    expect(await screen.findByRole("heading", { name: "État d’entrée" })).toBeTruthy();
    expect(screen.getAllByText("latente")).toHaveLength(2);
    expect(screen.getByText("ouverte")).toBeTruthy();
    expect(screen.getByText("Delta proposé — non appliqué")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Rapport d’impact du réordonnancement" })).toBeTruthy();
    expect(screen.getByText("La confrontation précède désormais la jalousie.")).toBeTruthy();
    expect(screen.getAllByText(/Preuves et causes/).length).toBeGreaterThan(0);
  });

  it("keeps approve and refusal as explicit distinct decisions", async () => {
    const baseProposal = snapshot().proposal;
    if (!baseProposal) throw new Error("proposal fixture missing");
    const approved = snapshot({ proposal: { ...baseProposal, status: "approved" } });
    const refused = snapshot({ proposal: { ...baseProposal, status: "refused" } });
    const approveDelta = vi.fn(async () => approved);
    const refuseDelta = vi.fn(async () => refused);
    const rendered = renderPanel(api({ approveDelta, refuseDelta }));
    await screen.findByText("Jalousie de Belladone");
    expect(approveDelta).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Approuver et appliquer" }));
    await waitFor(() => expect(approveDelta).toHaveBeenCalledWith("S01E001", "delta-proposal-1", { expected_revision: 4, expected_source_fingerprint: "source-a" }));

    rendered.unmount();
    renderPanel(api({ refuseDelta }));
    await screen.findByText("Jalousie de Belladone");
    fireEvent.change(screen.getByLabelText("Motif du refus"), { target: { value: "Cause insuffisante" } });
    fireEvent.click(screen.getByRole("button", { name: "Refuser sans appliquer" }));
    await waitFor(() => expect(refuseDelta).toHaveBeenCalledWith("S01E001", "delta-proposal-1", { expected_revision: 4, reason: "Cause insuffisante" }));
    expect(await screen.findByText("Delta refusé. Le canon reste inchangé.")).toBeTruthy();
  });

  it("blocks approval for a stale source while preserving re-evaluation", async () => {
    const baseProposal = snapshot().proposal;
    if (!baseProposal) throw new Error("proposal fixture missing");
    const stale = snapshot({ proposal: { ...baseProposal, stale: true, current_source_fingerprint: "source-b" } });
    const approveDelta = vi.fn(async () => snapshot());
    renderPanel(api({ getEpisodeContinuity: async () => stale, approveDelta }));
    expect(await screen.findByText("Cette proposition ne correspond plus à sa source et ne peut pas être approuvée.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Approuver et appliquer" }).hasAttribute("disabled")).toBe(true);
    expect(screen.getByRole("button", { name: "Réévaluer" }).hasAttribute("disabled")).toBe(false);
    expect(approveDelta).not.toHaveBeenCalled();
  });
});
