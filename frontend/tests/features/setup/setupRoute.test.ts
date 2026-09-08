import { describe, expect, it } from "vitest";

import { SETUP_ROUTE_NAME } from "../../../src/features/setup";
import { formatStudioRoute, parseStudioRoute, studioRoute } from "../../../src/app/router";

describe("setup route contract", () => {
  it("keeps the setup assistant on the stable Create deep link", () => {
    const url = studioRoute(SETUP_ROUTE_NAME, { projectId: "tentafruit" });
    expect(parseStudioRoute(formatStudioRoute(url))).toMatchObject({ kind: "primary", name: "create", context: { projectId: "tentafruit" } });
  });
});
