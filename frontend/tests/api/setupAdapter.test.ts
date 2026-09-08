import { beforeEach, describe, expect, it, vi } from "vitest";

const generated = vi.hoisted(() => ({
  diagnose: vi.fn(), latest: vi.fn(), get: vi.fn(), start: vi.fn(), pause: vi.fn(),
  resume: vi.fn(), repair: vi.fn(), cancel: vi.fn(), logs: vi.fn(),
}));

vi.mock("@/generated/openapi", () => ({
  diagnosePackApiRuntimePacksCurrentGet: generated.diagnose,
  latestJobApiRuntimePacksJobsLatestGet: generated.latest,
  getJobApiRuntimePacksJobsJobIdGet: generated.get,
  startJobApiRuntimePacksPackIdJobsPost: generated.start,
  pauseJobApiRuntimePacksJobsJobIdPausePost: generated.pause,
  resumeJobApiRuntimePacksJobsJobIdResumePost: generated.resume,
  repairJobApiRuntimePacksJobsJobIdRepairPost: generated.repair,
  cancelJobApiRuntimePacksJobsJobIdCancelPost: generated.cancel,
  getLogsApiRuntimePacksJobsJobIdLogsGet: generated.logs,
}));

import { setupApi } from "../../src/features/setup/api";

const job = { job: { id: "j1", status: "running", mode: "automatic", error: null, recovered: false, steps: [], smoke_checks: [] } };

beforeEach(() => vi.clearAllMocks());

describe("setup API adapter", () => {
  it("maps explicit consent and destination choices to the generated SET02 client", async () => {
    generated.start.mockResolvedValue(job);
    await expect(setupApi.start({ packId: "local-v1", mode: "automatic", acceptedLicenseIds: ["license-a"], usePersonalComfyModels: true })).resolves.toMatchObject({ id: "j1", status: "running" });
    expect(generated.start).toHaveBeenCalledWith("local-v1", {
      mode: "automatic", accepted_license_ids: ["license-a"], use_personal_comfy_models: true,
    });
  });

  it("recovers active jobs from either managed or personal storage", async () => {
    generated.latest
      .mockResolvedValueOnce({ job: null })
      .mockResolvedValueOnce(job);
    await expect(setupApi.latest()).resolves.toMatchObject({ id: "j1", status: "running" });
    expect(generated.latest).toHaveBeenNthCalledWith(2, {
      use_personal_comfy_models: true,
    });
  });

  it("returns only log messages from the redacted server log envelope", async () => {
    generated.logs.mockResolvedValue({ logs: [{ level: "info", message: "download resumed" }, { level: "info" }] });
    await expect(setupApi.logs("j1")).resolves.toEqual(["download resumed", ""]);
    expect(generated.logs).toHaveBeenCalledWith("j1");
  });
});
