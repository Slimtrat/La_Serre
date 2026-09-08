import { describe, expect, it } from "vitest";

import {
  STUDIO_ROUTES,
  formatStudioRoute,
  parseStudioRoute,
  studioRoute,
} from "../../src/app/router";

describe("Studio routes", () => {
  it("distinguishes primary, contextual and advanced spaces", () => {
    expect(STUDIO_ROUTES.map(({ kind, name }) => `${kind}:${name}`)).toEqual([
      "primary:create",
      "primary:produce",
      "primary:results",
      "contextual:bible",
      "contextual:settings",
      "advanced:graph",
    ]);
  });

  it("round-trips a stable contextual deep-link in deterministic order", () => {
    const route = studioRoute("produce", {
      shotId: "shot 4",
      episodeId: "S01E003",
      projectId: "Belladone & Aconit",
      seriesId: "season/1",
    });
    const href = formatStudioRoute(route);

    expect(href).toBe(
      "#/produce?project=Belladone+%26+Aconit&series=season%2F1&episode=S01E003&shot=shot+4",
    );
    expect(parseStudioRoute(`http://localhost:8000/${href}`)).toEqual(route);
  });

  it("preserves useful context in the not-found fallback", () => {
    expect(parseStudioRoute("#/lost?project=garden&episode=pilot")).toEqual({
      kind: "not-found",
      attemptedHref: "/lost?project=garden&episode=pilot",
      context: { projectId: "garden", episodeId: "pilot" },
    });
  });

  it("rejects a mismatched kind instead of emitting an ambiguous URL", () => {
    expect(() =>
      formatStudioRoute({ kind: "advanced", name: "create", context: {} }),
    ).toThrowError("Invalid Studio route: advanced/create");
  });
});
