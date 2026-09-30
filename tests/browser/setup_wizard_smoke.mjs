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
let startRequests = 0;
page.setDefaultTimeout(12_000);
page.on("pageerror", (error) => errors.push(error.message));
page.on("request", (request) => {
  const pathname = new URL(request.url()).pathname;
  if (request.method() === "POST" && /\/api\/runtime-packs\/[^/]+\/jobs$/.test(pathname)) {
    startRequests += 1;
  }
});
await page.addInitScript(() => {
  localStorage.setItem("serre-studio-language", "fr");
  localStorage.setItem("serre-studio-getting-started-seen", "1");
});

async function api(path) {
  const response = await page.request.get(new URL(path, baseUrl).href);
  expect(response.ok(), `GET ${path} returned ${response.status()}: ${await response.text()}`);
  return response.json();
}

try {
  await page.goto(new URL("#/create", baseUrl).href, { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: "Préparer mon studio" }).waitFor();
  expect(await page.getByText("Browser Fixture GPU").count() === 1, "Le diagnostic FastAPI n’est pas visible");
  const diagnosis = await api("api/runtime-packs/current");
  expect(diagnosis.pack_id === "tentafruit-local-12gb-v1", "Le diagnostic ne vient pas du vrai contrat de pack");
  expect(diagnosis.status === "incomplete", `Diagnostic initial inattendu : ${diagnosis.status}`);
  expect(diagnosis.components.some((item) => item.id === "keyframe-sdxl" && item.state === "missing"), "Le composant manquant n’est pas diagnostiqué");
  expect((await api("api/runtime-packs/jobs/latest")).job === null, "Un job existe avant le consentement");

  await page.getByRole("button", { name: "Préparer mon studio" }).click();
  const install = page.getByRole("button", { name: "Installer et vérifier" });
  expect(await install.isDisabled(), "L’installation doit être bloquée sans consentement");
  await page.getByRole("checkbox", { name: /J’ai vérifié l’espace requis/ }).check();
  expect(await install.isDisabled(), "Refuser la licence doit maintenir l’installation bloquée");
  const refused = await api("__e2e__/setup-state");
  expect(refused.download_calls.length === 0, "Un téléchargement a démarré malgré le refus");
  expect(refused.process_calls.length === 0, "Un processus a démarré malgré le refus");
  expect(refused.state_files.length === 0, "Un état de préparation a été créé sans consentement");
  expect(startRequests === 0, "Le navigateur a appelé la route de démarrage sans consentement");

  await page.getByRole("checkbox", { name: /J’accepte la licence Browser fixture license/ }).check();
  const started = page.waitForResponse((response) => (
    response.request().method() === "POST"
      && /\/api\/runtime-packs\/[^/]+\/jobs$/.test(new URL(response.url()).pathname)
  ));
  await install.click();
  const startResponse = await started;
  expect(startResponse.status() === 202, `Le vrai démarrage FastAPI répond ${startResponse.status()}`);
  const startPayload = await startResponse.json();
  const jobId = startPayload.job?.id;
  expect(typeof jobId === "string" && jobId.length > 0, "Le gestionnaire persistant n’a pas créé de job");
  await page.getByRole("heading", { name: "Votre studio est prêt" }).waitFor();
  expect(await page.getByText("Contrôle réussi").count() === 1, "Le smoke check du gestionnaire réel manque");

  const completed = await api(`api/runtime-packs/jobs/${jobId}`);
  expect(completed.job.status === "completed", `État final inattendu : ${completed.job.status}`);
  expect(completed.job.accepted_license_ids.includes("browser-fixture-license"), "Le consentement n’est pas persisté");
  const latest = await api("api/runtime-packs/jobs/latest");
  expect(latest.job.id === jobId, "Le dernier job persisté n’est pas restitué");
  const evidence = await api("__e2e__/setup-state");
  expect(evidence.download_calls.length === 1, "Le faux téléchargement doit être appelé exactement une fois");
  expect(evidence.process_calls.length === 1, "Le faux processus doit être appelé exactement une fois");
  expect(evidence.process_calls[0].join(" ") === "browser-smoke keyframe-sdxl", "Commande smoke inattendue");
  expect(evidence.state_files.length === 1 && evidence.model_installed, "Les preuves physiques ne sont pas persistées");

  const reportResponse = await page.request.get(new URL(`api/runtime-packs/jobs/${jobId}/report`, baseUrl).href);
  expect(reportResponse.ok(), `Le rapport répond ${reportResponse.status()}`);
  expect(reportResponse.headers()["content-disposition"]?.includes(jobId), "Le rapport n’est pas proposé en téléchargement");
  const report = await reportResponse.json();
  expect(report.result === "passed" && report.job_id === jobId, "Le rapport ne prouve pas la préparation réussie");
  expect(report.initial_prerequisites[0]?.state === "missing", "Le rapport a perdu le diagnostic initial");

  await page.reload({ waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: "Votre studio est prêt" }).waitFor();
  expect(await page.getByText(/préparation précédente/i).count() === 0, "La vue finale doit rester concise après reprise");
  expect((await api("api/runtime-packs/jobs/latest")).job.id === jobId, "Le rechargement a perdu le job persisté");
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.getByRole("button", { name: "Commencer à créer" }).isVisible(), "L’action principale mobile n’est pas visible");
  expect(errors.length === 0, `Erreurs navigateur : ${errors.join(" | ")}`);
  console.log(`PASS setup wizard real API: diagnose -> refuse/no download -> ${jobId} -> persisted report -> reload ready`);
} finally {
  await browser.close();
}
