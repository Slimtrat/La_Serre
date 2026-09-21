import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { EpisodeAuthoring } from "@features/episode-authoring/EpisodeAuthoring";
import type { EpisodeSnapshot, ReviewReport } from "@features/episode-authoring/model";

const api = vi.hoisted(() => ({
  get: vi.fn(), update: vi.fn(), generateDraft: vi.fn(), applyDraft: vi.fn(), review: vi.fn(), approve: vi.fn(), generateBreakdown: vi.fn(), applyBreakdown: vi.fn(),
}));
vi.mock("@features/episode-authoring/api", () => ({ episodeAuthoringApi: api }));

const story = { hook: "Une surprise", setup: "La serre dort", conflict: "Le fruit disparaît", reveal: "Le chien l'a caché", cliffhanger: "Un bruit dehors" };
const shot = (index: number) => ({
  id: `shot-${index}`, duration: 5, location: "place-1", characters: [{ id: "person-1", name: "Chita" }],
  camera: { shot_type: "plan moyen", movement: "fixe", lens: "50mm" }, action: `Action visible ${index}`,
  dialogue: null, lighting: "jour", mood: "joyeux", style: ["dessin"],
});
const snapshot = (status = "writing", count = 0): EpisodeSnapshot => ({
  format_output: { shot_count_min: 6, shot_count_max: 10, duration_seconds_min: 30, duration_seconds_max: 60 },
  episode: {
    id: "S01E001", title: "Chita et les pâtes", logline: "Chita protège son dîner des voleurs.",
    narrative_source: "Chita découvre ses pâtes et les protège courageusement.", story, status, duration_target: 30,
    characters: ["person-1"], locations: ["place-1"], shot_order: Array.from({ length: count }, (_, i) => `shot-${i}`),
    shot_sources: Object.fromEntries(Array.from({ length: count }, (_, i) => [`shot-${i}`, `Action narrative ${i}`])),
  },
  characters: [{ id: "person-1", name: "Chita" }], locations: [{ id: "place-1", name: "La cuisine" }],
  shots: Array.from({ length: count }, (_, i) => shot(i)), breakdown_fingerprint: count ? "fingerprint-1" : null,
});
const passReport: ReviewReport = { episode_id: "S01E001", created_at: "2026-09-21T10:00:00Z", fingerprint: "review-1", status: "pass", can_approve: true, findings: [] };

function renderAuthoring(initialTab: "script" | "storyboard" | "coherence" = "script") {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(<QueryClientProvider client={client}><EpisodeAuthoring episodeId="S01E001" projectId="project-1" locale="fr" initialTab={initialTab} /></QueryClientProvider>);
}

beforeEach(() => {
  vi.clearAllMocks();
  api.get.mockResolvedValue(snapshot());
  api.update.mockResolvedValue(snapshot());
  api.applyDraft.mockResolvedValue(snapshot("review"));
  api.review.mockResolvedValue(passReport);
  api.approve.mockResolvedValue(snapshot("approved"));
  api.applyBreakdown.mockResolvedValue(snapshot("breakdown", 6));
});
afterEach(() => cleanup());

describe("EpisodeAuthoring", () => {
  it("keeps manual script edits human-controlled through review and approval", async () => {
    api.get.mockResolvedValueOnce(snapshot()).mockResolvedValueOnce(snapshot("review")).mockResolvedValueOnce(snapshot("approved"));
    renderAuthoring();
    fireEvent.change(await screen.findByRole("textbox", { name: "Scénario" }), { target: { value: "Chita sauve les pâtes avec une ruse aussi drôle qu'inattendue." } });
    fireEvent.click(screen.getByRole("button", { name: "Soumettre à relecture" }));
    await waitFor(() => expect(api.applyDraft).toHaveBeenCalledWith("S01E001", expect.objectContaining({ narrative_source: "Chita sauve les pâtes avec une ruse aussi drôle qu'inattendue." }), undefined));
    expect(api.generateDraft).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("tab", { name: "Cohérence" }));
    fireEvent.click(screen.getByRole("button", { name: "Relire le scénario" }));
    await screen.findByText("Aucun blocage");
    fireEvent.click(screen.getByRole("button", { name: "Approuver le scénario" }));
    await waitFor(() => expect(api.approve).toHaveBeenCalledWith("S01E001"));
    expect(api.generateBreakdown).not.toHaveBeenCalled();
    expect(screen.queryByText("person-1")).toBeNull();
    expect(screen.queryByText("place-1")).toBeNull();
  });

  it("prevents approval after an unsaved edit invalidates the coherence report", async () => {
    renderAuthoring("coherence");
    fireEvent.click(await screen.findByRole("button", { name: "Relire le scénario" }));
    await screen.findByText("Aucun blocage");
    fireEvent.click(screen.getByRole("tab", { name: "Scénario" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Promesse / logline" }), { target: { value: "Une nouvelle promesse narrative." } });
    fireEvent.click(screen.getByRole("tab", { name: "Cohérence" }));
    expect(screen.getByRole("button", { name: "Approuver le scénario" }).hasAttribute("disabled")).toBe(true);
    expect(screen.queryByText("Aucun blocage")).toBeNull();
  });

  it("enforces the shot budget, applies reordered cards, and restores them after reload", async () => {
    api.get.mockResolvedValueOnce(snapshot("approved", 6)).mockResolvedValueOnce(snapshot("breakdown", 6));
    const view = renderAuthoring("storyboard");
    await screen.findByText("Budget prêt");
    const cards = screen.getAllByRole("listitem").filter((element) => element.textContent?.includes("Plan "));
    fireEvent.click(within(cards[0]).getByRole("button", { name: "Retirer" }));
    expect(screen.getByText(/Il faut 6 à 10 plans/)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Appliquer le storyboard" }).hasAttribute("disabled")).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Ajouter un plan" }));
    expect(screen.getByText("Budget prêt")).toBeTruthy();
    const first = screen.getAllByRole("listitem").filter((element) => element.textContent?.includes("Plan "))[0];
    fireEvent.change(within(first).getByRole("textbox", { name: "Action narrative" }), { target: { value: "Chita retrouve ses pâtes" } });
    fireEvent.click(within(first).getByRole("button", { name: "↓ Descendre" }));
    fireEvent.click(screen.getByRole("button", { name: "Appliquer le storyboard" }));
    await waitFor(() => expect(api.applyBreakdown).toHaveBeenCalledWith("S01E001", expect.objectContaining({ shots: expect.arrayContaining([expect.objectContaining({ source_text: "Chita retrouve ses pâtes" })]) }), undefined, "fingerprint-1"));
    view.unmount();
    api.get.mockResolvedValue(snapshot("breakdown", 6));
    renderAuthoring("storyboard");
    expect(await screen.findByDisplayValue("Action narrative 0")).toBeTruthy();
    expect(screen.getByText("Budget prêt")).toBeTruthy();
    expect(screen.queryByText("shot-0")).toBeNull();
  });

  it("blocks an on-screen speaker until the character is included in the shot", async () => {
    const approved = snapshot("approved", 6);
    api.get.mockResolvedValue({ ...approved, shots: approved.shots.map((item) => ({ ...item, characters: [] })) });
    renderAuthoring("storyboard");
    await screen.findByText("Budget prêt");
    const first = screen.getAllByRole("listitem").filter((element) => element.textContent?.includes("Plan "))[0];
    fireEvent.click(within(first).getByText("Personnages, dialogue et direction visuelle"));
    fireEvent.change(within(first).getByRole("textbox", { name: "Dialogue" }), { target: { value: "Les pâtes sont à moi !" } });
    expect(screen.getByRole("button", { name: "Appliquer le storyboard" }).hasAttribute("disabled")).toBe(true);
    fireEvent.change(within(first).getByRole("combobox", { name: "Locuteur" }), { target: { value: "person-1" } });
    fireEvent.change(within(first).getByRole("combobox", { name: "Présence de la voix" }), { target: { value: "on_screen" } });
    expect(screen.getByRole("button", { name: "Appliquer le storyboard" }).hasAttribute("disabled")).toBe(true);
    fireEvent.click(within(first).getByRole("checkbox", { name: "Chita" }));
    expect(screen.queryByText(/Choisis un locuteur pour chaque dialogue/)).toBeNull();
    expect(screen.getByRole("button", { name: "Appliquer le storyboard" }).hasAttribute("disabled")).toBe(false);
  });
});
