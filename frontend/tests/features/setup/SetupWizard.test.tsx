// @vitest-environment jsdom

import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { type SetupApi, type SetupDiagnosis, type SetupJob, SetupWizard } from "../../../src/features/setup";
import { renderWithStudio } from "../../../src/test";

const diagnosis: SetupDiagnosis = {
  packId: "local-creator-v1",
  status: "incomplete",
  summary: "2 composants à installer",
  requiredDownloadBytes: 3 * 1024 ** 3,
  hardware: { gpuName: "RTX 4070", vramGb: 12, diskFreeBytes: 80 * 1024 ** 3 },
  components: [
    {
      id: "ollama-engine", role: "runtime", state: "installed", required: true,
      sizeBytes: 0, reason: "", action: "none",
      license: { id: "ollama", name: "Ollama", url: "https://ollama.com/license", summary: "Runtime local", commercialUse: "allowed" },
    },
    {
      id: "keyframe-sdxl", role: "image_model", state: "missing", required: true,
      sizeBytes: 3 * 1024 ** 3, reason: "missing", action: "download",
      license: { id: "sdxl", name: "SDXL", url: "https://example.test/sdxl", summary: "Review model terms", commercialUse: "review_required" },
    },
  ],
};

const runningJob: SetupJob = {
  id: "job-1", status: "running", mode: "automatic", error: null, recovered: false,
  acceptedLicenseIds: [],
  steps: [
    { componentId: "ollama-engine", status: "skipped", message: "Already installed" },
    { componentId: "keyframe-sdxl", status: "running", message: "Downloading" },
  ],
  smokeChecks: [],
};

function fakeApi(overrides: Partial<SetupApi> = {}): SetupApi {
  return {
    diagnose: vi.fn().mockResolvedValue(diagnosis),
    latest: vi.fn().mockResolvedValue(null),
    getJob: vi.fn().mockResolvedValue(runningJob),
    start: vi.fn().mockResolvedValue(runningJob),
    pause: vi.fn().mockResolvedValue({ ...runningJob, status: "paused" }),
    resume: vi.fn().mockResolvedValue(runningJob),
    repair: vi.fn().mockResolvedValue(runningJob),
    cancel: vi.fn().mockResolvedValue({ ...runningJob, status: "cancelled" }),
    logs: vi.fn().mockResolvedValue(["safe diagnostic line"]),
    ...overrides,
  };
}

afterEach(cleanup);

describe("SetupWizard", () => {
  it("explains capabilities and requires explicit destination and license consent", async () => {
    const api = fakeApi();
    renderWithStudio(<SetupWizard api={api} locale="fr" />);

    expect(await screen.findByRole("heading", { name: "Préparer mon studio" })).toBeTruthy();
    expect(screen.getByText("RTX 4070")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Créer des personnages" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Préparer mon studio" }));

    const start = screen.getByRole("button", { name: "Installer et vérifier" });
    expect((start as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole("checkbox", { name: /J’accepte la licence SDXL/ }));
    fireEvent.click(screen.getByRole("checkbox", { name: /J’ai vérifié l’espace requis/ }));
    expect((start as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(start);

    await waitFor(() => expect(api.start).toHaveBeenCalledWith({
      packId: "local-creator-v1",
      mode: "automatic",
      acceptedLicenseIds: ["sdxl"],
      usePersonalComfyModels: false,
    }));
  });

  it("resumes an existing job after reload and exposes pause controls", async () => {
    const recovered = { ...runningJob, recovered: true };
    const api = fakeApi({ latest: vi.fn().mockResolvedValue(recovered), getJob: vi.fn().mockResolvedValue(recovered) });
    renderWithStudio(<SetupWizard api={api} locale="fr" />);

    expect(await screen.findByText(/préparation précédente a été retrouvée/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Mettre en pause" }));
    await waitFor(() => expect(api.pause).toHaveBeenCalledWith("job-1"));
    expect(await screen.findByRole("button", { name: "Reprendre" })).toBeTruthy();
  });

  it("offers recovery, manual mode and on-demand redacted technical logs", async () => {
    const failed: SetupJob = { ...runningJob, status: "failed", error: "Checksum mismatch" };
    const api = fakeApi({ latest: vi.fn().mockResolvedValue(failed), getJob: vi.fn().mockResolvedValue(failed),
      repair: vi.fn().mockResolvedValue(failed) });
    renderWithStudio(<SetupWizard api={api} locale="fr" />);

    expect(await screen.findByRole("heading", { name: /besoin de votre aide/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Réessayer" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Réparer" }));
    await waitFor(() => expect(api.repair).toHaveBeenCalledWith("job-1", []));
    fireEvent.click(screen.getByText("Voir les détails techniques"));
    expect(await screen.findByText("safe diagnostic line")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Choisir manuellement" }));
    await waitFor(() => expect(api.start).toHaveBeenCalledWith(expect.objectContaining({ mode: "manual", usePersonalComfyModels: true })));
  });

  it("shows final smoke checks and unlocks the creation journey", async () => {
    const completed: SetupJob = {
      ...runningJob,
      status: "completed",
      smokeChecks: [{ checkId: "ollama", status: "passed", requiredComponents: ["ollama-engine"], message: "Narrative engine responded" }],
    };
    const api = fakeApi({ latest: vi.fn().mockResolvedValue(completed), getJob: vi.fn().mockResolvedValue(completed) });
    renderWithStudio(<SetupWizard api={api} locale="en" readyContent={<p>Golden path unlocked</p>} />);

    expect(await screen.findByRole("heading", { name: "Your studio is ready" })).toBeTruthy();
    expect(screen.getByText("Narrative engine responded")).toBeTruthy();
    expect(screen.getByLabelText("Validation preview generated locally")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Start creating" }));
    expect(screen.getByText("Golden path unlocked")).toBeTruthy();
  });
});
