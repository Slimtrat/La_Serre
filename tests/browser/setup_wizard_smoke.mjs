#!/usr/bin/env node

import { createRequire } from "node:module";
import fs from "node:fs";

const require = createRequire(new URL("../../frontend/package.json", import.meta.url));
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const baseUrl = process.env.SERRE_STUDIO_URL || "http://127.0.0.1:8000/";
const browserPath = process.env.PLAYWRIGHT_BROWSER_PATH
  || (process.platform === "win32" && fs.existsSync("C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe")
    ? "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"
    : undefined);

function expect(condition, message) {
  if (!condition) throw new Error(message);
}

const browser = await chromium.launch({ headless: true, ...(browserPath ? { executablePath: browserPath } : {}) });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
let activeJob = null;
let jobReads = 0;
page.setDefaultTimeout(12_000);
page.on("pageerror", (error) => errors.push(error.message));
await page.addInitScript(() => {
  localStorage.setItem("serre-studio-language", "fr");
  localStorage.setItem("serre-studio-getting-started-seen", "1");
});

const diagnosis = {
  pack_id: "local-creator-v1", status: "incomplete", summary: "Studio local à préparer",
  required_download_bytes: 1073741824,
  hardware: { gpu_name: "Fake GPU", vram_gb: 12, disk_free_bytes: 107374182400 },
  components: [{
    id: "keyframe-sdxl", role: "image_model", state: "missing", required: true,
    size_bytes: 1073741824, reason: "missing", action: "download",
    license: { id: "sdxl", name: "SDXL", url: "https://example.test/license", summary: "Test terms", commercial_use: "review_required" },
  }],
};
const running = () => ({ job: {
  id: "fake-job", status: "running", mode: "automatic", error: null, recovered: false,
  steps: [{ component_id: "keyframe-sdxl", status: "running", message: "Fake download" }], smoke_checks: [],
} });
const completed = () => ({ job: {
  id: "fake-job", status: "completed", mode: "automatic", error: null, recovered: true,
  steps: [{ component_id: "keyframe-sdxl", status: "installed", message: "Checksum verified" }],
  smoke_checks: [{ check_id: "image", status: "passed", required_components: ["keyframe-sdxl"], message: "Image pipeline responded" }],
} });

await page.route("**/api/**", async (route) => {
  const request = route.request();
  const path = new URL(request.url()).pathname;
  let body = {};
  if (path === "/api/projects") body = { projects: [{ id: "tentafruit", name: "Tentafruit" }] };
  else if (path === "/api/episodes") body = { episodes: [] };
  else if (path === "/api/runtime-services") body = { enabled: true, services: [] };
  else if (path === "/api/runtime-packs/current") body = diagnosis;
  else if (path === "/api/runtime-packs/jobs/latest") body = activeJob ? completed() : { job: null };
  else if (/\/api\/runtime-packs\/[^/]+\/jobs$/.test(path) && request.method() === "POST") { activeJob = "fake-job"; body = running(); }
  else if (path === "/api/runtime-packs/jobs/fake-job") { jobReads += 1; body = jobReads > 1 ? completed() : running(); }
  else if (path.endsWith("/logs")) body = { logs: [{ message: "fake safe log" }] };
  else body = {};
  await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) });
});

try {
  await page.goto(new URL("#/create?project=tentafruit", baseUrl).href, { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: "Préparer mon studio" }).waitFor();
  expect(await page.getByText("Fake GPU").count() === 1, "Le diagnostic matériel fake n’est pas visible");
  await page.getByRole("button", { name: "Préparer mon studio" }).click();
  const install = page.getByRole("button", { name: "Installer et vérifier" });
  expect(await install.isDisabled(), "L’installation doit être bloquée sans consentement");
  await page.getByRole("checkbox", { name: /J’accepte la licence SDXL/ }).check();
  await page.getByRole("checkbox", { name: /J’ai vérifié l’espace requis/ }).check();
  await install.click();
  await page.getByRole("heading", { name: "Votre studio est prêt" }).waitFor();
  expect(await page.getByText("Image pipeline responded").count() === 1, "Le smoke check final manque");

  await page.reload({ waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: "Votre studio est prêt" }).waitFor();
  expect(await page.getByText(/préparation précédente/i).count() === 0, "La vue finale doit rester concise après reprise");
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.getByRole("button", { name: "Commencer à créer" }).isVisible(), "L’action principale mobile n’est pas visible");
  expect(errors.length === 0, `Erreurs navigateur : ${errors.join(" | ")}`);
  console.log("PASS setup wizard fake: absent -> consent -> install -> smoke -> reload ready (desktop/mobile)");
} finally {
  await browser.close();
}
