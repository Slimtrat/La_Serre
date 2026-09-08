// @vitest-environment jsdom

import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CastingBoard } from "../../../src/features/casting";
import { renderWithStudio } from "../../../src/test";

const api = vi.hoisted(() => ({
  get: vi.fn(),
  review: vi.fn(),
  import: vi.fn(),
  generate: vi.fn(),
}));

vi.mock("../../../src/features/casting/castingApi", () => ({
  getCasting: api.get,
  reviewVariant: api.review,
  importVariant: api.import,
  generateVariant: api.generate,
}));

const variants = [
  {
    id: "visual-11111111111111111111111111111111",
    character_id: "iris",
    kind: "portrait",
    status: "approved",
    media_url: "/fake/portrait.png",
    permanent_identity: "Silver hair and angular adult face",
    outfit: "Charcoal petal coat",
    transient_state: "Neutral expression",
    provenance: {
      source: "imported",
      source_label: "artist.png",
      model: null,
      workflow: null,
      seed: null,
      license: "CC-BY-4.0",
      revision: "r2",
    },
  },
  {
    id: "visual-22222222222222222222222222222222",
    character_id: "iris",
    kind: "full_body",
    status: "candidate",
    media_url: "/fake/full.png",
    permanent_identity: "Silver hair and angular adult face",
    outfit: "Long violet evening coat",
    transient_state: "",
    provenance: {
      source: "generated",
      source_label: "ComfyUI local",
      model: "sdxl",
      workflow: "casting-v1",
      seed: 42,
      license: "model-output",
      revision: "wf-r1",
    },
  },
];

beforeEach(() => {
  api.get.mockResolvedValue({
    revision: 7,
    characters: [{ character_id: "iris", active_master_id: variants[0].id, variants }],
  });
  api.review.mockResolvedValue({
    board: { revision: 8, characters: [] },
    affected: { shot_ids: ["S01E001-S01"], rendered_shot_ids: [] },
    regeneration_started: false,
  });
});
afterEach(cleanup);

describe("CastingBoard", () => {
  it("compares candidates and exposes full provenance", async () => {
    renderWithStudio(
      <CastingBoard characters={[{ id: "iris", name: "Iris" }]} locale="fr" />,
    );
    expect(await screen.findByRole("heading", { name: "Identités visuelles maîtres" })).toBeTruthy();
    expect(screen.getByText("CC-BY-4.0", { exact: false })).toBeTruthy();
    expect(screen.getByText("sdxl", { exact: false })).toBeTruthy();
    const compare = screen.getAllByRole("button", { name: "Comparer" });
    fireEvent.click(compare[0]);
    fireEvent.click(compare[1]);
    expect(compare[0].getAttribute("aria-pressed")).toBe("true");
    expect(compare[1].getAttribute("aria-pressed")).toBe("true");
  });

  it("promotes only after an explicit approval and reports impact", async () => {
    renderWithStudio(
      <CastingBoard characters={[{ id: "iris", name: "Iris" }]} locale="fr" />,
    );
    fireEvent.click(await screen.findByRole("button", { name: "Approuver comme maître" }));
    await waitFor(() => expect(api.review).toHaveBeenCalledWith(
      "approve", "iris", variants[1].id, 7,
    ));
    expect((await screen.findByRole("status")).textContent).toContain("Aucune régénération lancée");
  });
});
