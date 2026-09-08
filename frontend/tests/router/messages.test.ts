import { describe, expect, it } from "vitest";

import {
  getStudioMessages,
  normalizeStudioLocale,
} from "../../src/app/router";

describe("Studio navigation messages", () => {
  it("provides accessible route and navigation names in French", () => {
    const copy = getStudioMessages("fr-FR");

    expect(copy.navigation.primaryName).toBe("Navigation principale");
    expect(copy.routes).toMatchObject({
      create: "Créer",
      produce: "Produire",
      results: "Résultats",
      graph: "Inspecter le pipeline",
    });
    expect(copy.notFound.title).toBe("Page introuvable");
  });

  it("provides the complete English alternative and a deterministic fallback", () => {
    expect(getStudioMessages("en-GB").routes.settings).toBe("Settings");
    expect(getStudioMessages("en-US").notFound.backToCreate).toBe(
      "Back to Create",
    );
    expect(normalizeStudioLocale("de-DE")).toBe("fr");
    expect(normalizeStudioLocale(undefined)).toBe("fr");
  });
});
