export type SetupLocale = "fr" | "en";
export type PackStatus = "ready" | "incomplete" | "incompatible";
export type JobStatus =
  | "queued"
  | "running"
  | "paused"
  | "awaiting_license"
  | "awaiting_manual"
  | "completed"
  | "failed"
  | "cancelled";

export interface SetupLicense {
  readonly id: string;
  readonly name: string;
  readonly url: string;
  readonly summary: string;
  readonly commercialUse: "allowed" | "restricted" | "review_required";
}

export interface SetupComponent {
  readonly id: string;
  readonly role: string;
  readonly state: string;
  readonly required: boolean;
  readonly sizeBytes: number;
  readonly reason: string;
  readonly action: string;
  readonly license: SetupLicense;
}

export interface SetupDiagnosis {
  readonly packId: string;
  readonly status: PackStatus;
  readonly summary: string;
  readonly requiredDownloadBytes: number;
  readonly hardware: {
    readonly vramGb: number | null;
    readonly diskFreeBytes: number;
    readonly gpuName: string | null;
  };
  readonly components: readonly SetupComponent[];
}

export interface SetupJobStep {
  readonly componentId: string;
  readonly status: string;
  readonly message: string;
}

export interface SetupSmokeResult {
  readonly checkId: string;
  readonly status: "passed" | "failed";
  readonly requiredComponents: readonly string[];
  readonly message: string;
}

export interface SetupJob {
  readonly id: string;
  readonly status: JobStatus;
  readonly mode: "automatic" | "manual";
  readonly error: string | null;
  readonly recovered: boolean;
  readonly acceptedLicenseIds: readonly string[];
  readonly steps: readonly SetupJobStep[];
  readonly smokeChecks: readonly SetupSmokeResult[];
}

const JOB_STATUSES = new Set<JobStatus>([
  "queued",
  "running",
  "paused",
  "awaiting_license",
  "awaiting_manual",
  "completed",
  "failed",
  "cancelled",
]);

function record(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("Réponse de préparation invalide");
  }
  return value as Record<string, unknown>;
}

function text(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function number(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

export function decodeDiagnosis(value: unknown): SetupDiagnosis {
  const source = record(value);
  const hardware = record(source.hardware);
  const status = text(source.status);
  if (!["ready", "incomplete", "incompatible"].includes(status)) {
    throw new Error("État du pack inconnu");
  }
  const components = Array.isArray(source.components) ? source.components : [];
  return {
    packId: text(source.pack_id),
    status: status as PackStatus,
    summary: text(source.summary),
    requiredDownloadBytes: number(source.required_download_bytes),
    hardware: {
      vramGb: typeof hardware.vram_gb === "number" ? hardware.vram_gb : null,
      diskFreeBytes: number(hardware.disk_free_bytes),
      gpuName: typeof hardware.gpu_name === "string" ? hardware.gpu_name : null,
    },
    components: components.map((item) => {
      const component = record(item);
      const license = record(component.license);
      const commercialUse = text(license.commercial_use, "review_required");
      return {
        id: text(component.id),
        role: text(component.role),
        state: text(component.state, "unknown"),
        required: component.required !== false,
        sizeBytes: number(component.size_bytes),
        reason: text(component.reason),
        action: text(component.action),
        license: {
          id: text(license.id),
          name: text(license.name),
          url: text(license.url),
          summary: text(license.summary),
          commercialUse: (["allowed", "restricted", "review_required"].includes(
            commercialUse,
          )
            ? commercialUse
            : "review_required") as SetupLicense["commercialUse"],
        },
      };
    }),
  };
}

export function decodeJobEnvelope(value: unknown): SetupJob | null {
  const envelope = record(value);
  if (envelope.job === null || envelope.job === undefined) return null;
  const job = record(envelope.job);
  const status = text(job.status);
  if (!JOB_STATUSES.has(status as JobStatus)) throw new Error("État du job inconnu");
  const steps = Array.isArray(job.steps) ? job.steps : [];
  const smoke = Array.isArray(job.smoke_checks) ? job.smoke_checks : [];
  return {
    id: text(job.id),
    status: status as JobStatus,
    mode: job.mode === "manual" ? "manual" : "automatic",
    error: typeof job.error === "string" ? job.error : null,
    recovered: job.recovered === true,
    acceptedLicenseIds: Array.isArray(job.accepted_license_ids)
      ? job.accepted_license_ids.map(String)
      : [],
    steps: steps.map((item) => {
      const step = record(item);
      return {
        componentId: text(step.component_id),
        status: text(step.status),
        message: text(step.message),
      };
    }),
    smokeChecks: smoke.map((item) => {
      const check = record(item);
      return {
        checkId: text(check.check_id),
        status: check.status === "passed" ? "passed" : "failed",
        requiredComponents: Array.isArray(check.required_components)
          ? check.required_components.map(String)
          : [],
        message: text(check.message),
      };
    }),
  };
}

export function formatBytes(bytes: number, locale: SetupLocale): string {
  if (bytes <= 0) return locale === "fr" ? "Aucun téléchargement" : "No download";
  const units = ["o", "Kio", "Mio", "Gio"];
  const englishUnits = ["B", "KiB", "MiB", "GiB"];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), 3);
  return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(
    bytes / 1024 ** exponent,
  )} ${(locale === "fr" ? units : englishUnits)[exponent]}`;
}
