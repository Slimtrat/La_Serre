import { describe, expect, it } from "vitest";

import { decodeJobEnvelope, SETUP_ROUTE_NAME } from "../../../src/features/setup";
import { formatStudioRoute, parseStudioRoute, studioRoute } from "../../../src/app/router";

describe("setup route contract", () => {
  it("keeps the setup assistant on the stable Create deep link", () => {
    const url = studioRoute(SETUP_ROUTE_NAME, { projectId: "tentafruit" });
    expect(parseStudioRoute(formatStudioRoute(url))).toMatchObject({ kind: "primary", name: "create", context: { projectId: "tentafruit" } });
  });

  it("preserves the not-run smoke status from the backend contract", () => {
    const decoded = decodeJobEnvelope({
      job: {
        id: "job-frozen",
        status: "completed",
        mode: "automatic",
        error: null,
        recovered: false,
        accepted_license_ids: [],
        steps: [],
        smoke_checks: [{
          check_id: "image",
          status: "not_run",
          required_components: ["keyframe-sdxl"],
          message: "Smoke check not run",
        }],
      },
    });

    expect(decoded?.smokeChecks[0]?.status).toBe("not_run");
  });
});
