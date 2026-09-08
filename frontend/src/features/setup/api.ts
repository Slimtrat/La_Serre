import {
  cancelJobApiRuntimePacksJobsJobIdCancelPost,
  diagnosePackApiRuntimePacksCurrentGet,
  getJobApiRuntimePacksJobsJobIdGet,
  getLogsApiRuntimePacksJobsJobIdLogsGet,
  latestJobApiRuntimePacksJobsLatestGet,
  pauseJobApiRuntimePacksJobsJobIdPausePost,
  repairJobApiRuntimePacksJobsJobIdRepairPost,
  resumeJobApiRuntimePacksJobsJobIdResumePost,
  startJobApiRuntimePacksPackIdJobsPost,
} from "@/generated/openapi";

import {
  decodeDiagnosis,
  decodeJobEnvelope,
  type SetupDiagnosis,
  type SetupJob,
} from "./model";

export interface SetupStartInput {
  readonly packId: string;
  readonly mode: "automatic" | "manual";
  readonly acceptedLicenseIds: readonly string[];
  readonly usePersonalComfyModels: boolean;
}

export interface SetupApi {
  diagnose(): Promise<SetupDiagnosis>;
  latest(): Promise<SetupJob | null>;
  getJob(jobId: string): Promise<SetupJob>;
  start(input: SetupStartInput): Promise<SetupJob>;
  pause(jobId: string): Promise<SetupJob>;
  resume(jobId: string, acceptedLicenseIds: readonly string[]): Promise<SetupJob>;
  repair(jobId: string, acceptedLicenseIds: readonly string[]): Promise<SetupJob>;
  cancel(jobId: string): Promise<SetupJob>;
  logs(jobId: string): Promise<readonly string[]>;
}

function requiredJob(value: unknown): SetupJob {
  const job = decodeJobEnvelope(value);
  if (!job) throw new Error("Préparation introuvable");
  return job;
}

export const setupApi: SetupApi = {
  async diagnose() {
    return decodeDiagnosis(await diagnosePackApiRuntimePacksCurrentGet());
  },
  async latest() {
    const [managed, personal] = await Promise.all([
      latestJobApiRuntimePacksJobsLatestGet(),
      latestJobApiRuntimePacksJobsLatestGet({ use_personal_comfy_models: true }),
    ]);
    const jobs = [decodeJobEnvelope(managed), decodeJobEnvelope(personal)].filter(
      (job): job is SetupJob => job !== null,
    );
    const active = new Set(["queued", "running", "paused", "awaiting_license", "awaiting_manual"]);
    return jobs.find((job) => active.has(job.status)) ?? jobs[0] ?? null;
  },
  async getJob(jobId) {
    return requiredJob(await getJobApiRuntimePacksJobsJobIdGet(jobId));
  },
  async start(input) {
    return requiredJob(
      await startJobApiRuntimePacksPackIdJobsPost(input.packId, {
        mode: input.mode,
        accepted_license_ids: [...input.acceptedLicenseIds],
        use_personal_comfy_models: input.usePersonalComfyModels,
      }),
    );
  },
  async pause(jobId) {
    return requiredJob(await pauseJobApiRuntimePacksJobsJobIdPausePost(jobId));
  },
  async resume(jobId, acceptedLicenseIds) {
    return requiredJob(
      await resumeJobApiRuntimePacksJobsJobIdResumePost(jobId, {
        accepted_license_ids: [...acceptedLicenseIds],
      }),
    );
  },
  async repair(jobId, acceptedLicenseIds) {
    return requiredJob(
      await repairJobApiRuntimePacksJobsJobIdRepairPost(jobId, {
        accepted_license_ids: [...acceptedLicenseIds],
      }),
    );
  },
  async cancel(jobId) {
    return requiredJob(await cancelJobApiRuntimePacksJobsJobIdCancelPost(jobId));
  },
  async logs(jobId) {
    const envelope = (await getLogsApiRuntimePacksJobsJobIdLogsGet(jobId)) as {
      logs?: Array<{ message?: unknown }>;
    };
    return (envelope.logs ?? []).map((entry) =>
      typeof entry.message === "string" ? entry.message : "",
    );
  },
};
