import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SeasonPlanBoard, type SeasonPlanApi, type SeasonPlanItem, type SeasonPlanProposal, type SeasonPlanSnapshot } from "@features/season-plan";

const items: readonly SeasonPlanItem[] = [
  { id: "spi-first", position: 0, title: "La graine", logline: "Une graine réveille la serre.", synopsis: "Belladone découvre une graine qui bouleverse l’équilibre.", cliffhanger: "La graine prononce son nom.", character_ids: ["belladone"], location_ids: ["serre"], status: "draft", episode_id: null, deleted_at: null },
  { id: "spi-second", position: 1, title: "Les racines", logline: "Aconit suit les racines.", synopsis: "Les racines conduisent Aconit sous la serre.", cliffhanger: "Une porte s’ouvre.", character_ids: ["aconit"], location_ids: ["serre"], status: "produced", episode_id: "S01E001", deleted_at: null },
];
const snapshot = (revision = 3, nextItems = items): SeasonPlanSnapshot => ({ revision, updated_at: "2026-09-14T10:00:00Z", items: nextItems });
const proposal = (overrides: Partial<SeasonPlanProposal> = {}): SeasonPlanProposal => ({
  id: "season-proposal-a1", revision: 2, base_plan_revision: 3,
  source_fingerprint: "1234567890abcdef", current_source_fingerprint: "1234567890abcdef", stale: false,
  provenance: { task_id: "tentafruit_series_plan", task_version: "1.0.0", model: "fake-ollama", input_fingerprint: "1234567890abcdef" },
  validation: { valid: true, issues: [] },
  items: Array.from({ length: 6 }, (_, index) => ({
    id: `proposal-item-${index}`, position: index + 1, season: 1, title: index === 0 ? "La graine noire" : `Épisode IA ${index + 1}`,
    hook: `Hook ${index + 1}`, conflict: `Conflit ${index + 1}`, relationship_shift: `Bascule ${index + 1}`,
    relationship_ids: [`relation-${index}`], secret_id: null, cliffhanger: `Cliffhanger ${index + 1}`,
    logline: `Promesse ${index + 1}`, synopsis: `Synopsis ${index + 1}`, character_ids: ["belladone"], location_ids: ["serre"],
    manually_edited_fields: [],
  })),
  ...overrides,
});

function api(overrides: Partial<SeasonPlanApi> = {}): SeasonPlanApi {
  const unchanged = async () => snapshot(4);
  return {
    getPlan: async () => snapshot(), createItem: unchanged, updateItem: unchanged, validateItem: unchanged,
    duplicateItem: unchanged, deleteItem: unchanged, restoreItem: unchanged,
    reorder: unchanged, materializeItem: unchanged, getProposal: async () => null,
    generateProposal: async () => proposal(), updateProposal: async () => proposal(), acceptProposal: unchanged, ...overrides,
  };
}

function renderBoard(value: SeasonPlanApi) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(<QueryClientProvider client={client}><SeasonPlanBoard api={value} locale="fr" /></QueryClientProvider>);
}

afterEach(() => cleanup());

describe("SeasonPlanBoard", () => {
  it("opens a materialized episode from its season card without exposing its technical ID", async () => {
    const onOpenEpisode = vi.fn();
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={client}><SeasonPlanBoard api={api()} locale="fr" onOpenEpisode={onOpenEpisode} /></QueryClientProvider>);
    const card = (await screen.findByDisplayValue("Les racines")).closest("[data-season-item-id]");
    expect(card).toBeTruthy();
    fireEvent.click(within(card as HTMLElement).getByRole("button", { name: "Écrire l’épisode" }));
    expect(onOpenEpisode).toHaveBeenCalledWith("S01E001");
    expect(within(card as HTMLElement).getByText("S01E001").closest("details")?.open).toBe(false);
  });

  it("edits a stable item while keeping the production code in advanced details", async () => {
    const updateItem = vi.fn(async () => snapshot(4));
    renderBoard(api({ updateItem }));

    const title = await screen.findByDisplayValue("La graine");
    fireEvent.change(title, { target: { value: "La graine noire" } });
    fireEvent.click(screen.getAllByRole("button", { name: "Enregistrer" })[0]);

    await waitFor(() => expect(updateItem).toHaveBeenCalledWith("spi-first", expect.objectContaining({
      expected_revision: 3,
      item: expect.objectContaining({ title: "La graine noire", character_ids: ["belladone"] }),
    })));
    const details = screen.getAllByText("Détails avancés")[1].closest("details");
    expect(details?.hasAttribute("open")).toBe(false);
    fireEvent.click(screen.getAllByText("Détails avancés")[1]);
    expect(screen.getByText("S01E001")).toBeTruthy();
  });

  it("reorders with Arrow keys, announces the move and restores focus", async () => {
    const reordered = [
      { ...items[1], position: 0 },
      { ...items[0], position: 1 },
    ];
    const reorder = vi.fn(async () => snapshot(4, reordered));
    renderBoard(api({ reorder }));

    const handle = await screen.findByRole("button", { name: "Déplacer l’intention: La graine" });
    handle.focus();
    fireEvent.keyDown(handle, { key: "ArrowDown" });

    await waitFor(() => expect(reorder).toHaveBeenCalledWith({ expected_revision: 3, item_ids: ["spi-second", "spi-first"] }));
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole("button", { name: "Déplacer l’intention: La graine" })));
    expect(screen.getByText("Épisode 2: La graine")).toBeTruthy();
  });

  it("requires an explicit keep-files decision for produced items", async () => {
    const deleted = items.map((item) => item.id === "spi-second" ? { ...item, deleted_at: "2026-09-14T11:00:00Z" } : item);
    const deleteItem = vi.fn(async () => snapshot(4, deleted));
    renderBoard(api({ deleteItem }));

    await screen.findByDisplayValue("Les racines");
    fireEvent.click(screen.getAllByRole("button", { name: "Retirer du plan" })[1]);
    expect(screen.getByRole("dialog", { name: "Retirer un épisode produit ?" })).toBeTruthy();
    expect(deleteItem).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Retirer en conservant l’épisode" }));

    await waitFor(() => expect(deleteItem).toHaveBeenCalledWith("spi-second", {
      expected_revision: 3,
      decision: "detach_keep_episode",
    }));
    expect(await screen.findByRole("button", { name: "Restaurer" })).toBeTruthy();
  });

  it("creates, duplicates, materializes and restores through revisioned commands", async () => {
    const removed = { ...items[0], deleted_at: "2026-09-14T11:00:00Z" };
    const validatedItems = [{ ...items[0], status: "validated" as const }, items[1]];
    const createItem = vi.fn(async () => snapshot(4, validatedItems));
    const duplicateItem = vi.fn(async () => snapshot(4, validatedItems));
    const materializeItem = vi.fn(async () => snapshot(4));
    const restoreItem = vi.fn(async () => snapshot(4, [removed]));
    const boardApi = api({ createItem, duplicateItem, materializeItem });
    const rendered = renderBoard(boardApi);

    await screen.findByDisplayValue("La graine");
    fireEvent.click(screen.getByRole("button", { name: "Ajouter une intention" }));
    await waitFor(() => expect(createItem).toHaveBeenCalledWith({ expected_revision: 3, item: expect.any(Object) }));
    fireEvent.click(screen.getAllByRole("button", { name: "Dupliquer" })[0]);
    await waitFor(() => expect(duplicateItem).toHaveBeenCalledWith("spi-first", { expected_revision: 4 }));
    fireEvent.click(screen.getAllByRole("button", { name: "Créer l’épisode" })[0]);
    await waitFor(() => expect(materializeItem).toHaveBeenCalledWith("spi-first", { expected_revision: 4 }));

    rendered.unmount();
    renderBoard(api({ getPlan: async () => snapshot(5, [removed]), restoreItem }));
    fireEvent.click(await screen.findByRole("button", { name: "Restaurer" }));
    await waitFor(() => expect(restoreItem).toHaveBeenCalledWith("spi-first", { expected_revision: 5 }));
  });

  it("keeps an AI proposal isolated, exposes its diff and requires explicit acceptance", async () => {
    const generated = proposal();
    const generateProposal = vi.fn(async () => generated);
    const updateProposal = vi.fn(async ({ items: nextItems }: Parameters<SeasonPlanApi["updateProposal"]>[0]) => proposal({
      revision: 3,
      items: nextItems.map((item, index) => ({ ...item, id: `saved-${index}`, position: index + 1, manually_edited_fields: index === 0 ? ["title"] : [] })),
    }));
    const acceptProposal = vi.fn(async () => snapshot(4));
    renderBoard(api({ generateProposal, updateProposal, acceptProposal }));

    expect(await screen.findByText("Aucune proposition active. Le plan actuel reste inchangé.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Générer" }));
    await waitFor(() => expect(generateProposal).toHaveBeenCalledWith({ episode_count: 6 }));
    await screen.findByDisplayValue("La graine noire");
    expect(screen.getByText((_, element) => element?.tagName === "SPAN" && element.textContent === "Avant : La graine")).toBeTruthy();
    expect(screen.getByText((_, element) => element?.tagName === "SPAN" && element.textContent === "Après : La graine noire")).toBeTruthy();
    expect(screen.getByText("fake-ollama")).toBeTruthy();
    expect(acceptProposal).not.toHaveBeenCalled();

    const title = screen.getByDisplayValue("La graine noire");
    fireEvent.change(title, { target: { value: "La graine écarlate" } });
    fireEvent.click(screen.getAllByRole("button", { name: "Descendre la proposition" })[0]);
    fireEvent.click(screen.getAllByRole("button", { name: "Retirer de la proposition" })[5]);
    fireEvent.click(screen.getByRole("button", { name: "Ajouter un épisode" }));
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer le brouillon" }));

    await waitFor(() => expect(updateProposal).toHaveBeenCalledWith(expect.objectContaining({
      expected_revision: 2,
      items: expect.arrayContaining([expect.objectContaining({ title: "La graine écarlate" })]),
    })));
    fireEvent.click(screen.getByRole("button", { name: "Valider et appliquer au plan" }));
    await waitFor(() => expect(acceptProposal).toHaveBeenCalledWith({ expected_revision: 3, expected_plan_revision: 3 }));
    expect(await screen.findByText("Proposition validée et appliquée au plan.")).toBeTruthy();
  });

  it("blocks acceptance when the proposal sources or plan revision are stale", async () => {
    renderBoard(api({ getProposal: async () => proposal({ stale: true, current_source_fingerprint: "changed" }) }));
    expect((await screen.findByRole("alert")).textContent).toContain("Le casting, les relations ou le plan ont changé.");
    expect(screen.getByRole("button", { name: "Valider et appliquer au plan" }).hasAttribute("disabled")).toBe(true);
  });
});
