#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(new URL("../../frontend/package.json", import.meta.url));
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const baseUrl = process.env.SERRE_STUDIO_URL;
if (!baseUrl) throw new Error("SERRE_STUDIO_URL is required");

const repository = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const artifacts = path.resolve(process.env.SERRE_E2E_ARTIFACT_DIR || path.join(repository, "artifacts/browser-integration"));
fs.mkdirSync(artifacts, { recursive: true });
const browserPath = [
  process.env.PLAYWRIGHT_BROWSER_PATH,
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
].find((candidate) => candidate && fs.existsSync(candidate));
const browser = await chromium.launch({ headless: true, ...(browserPath ? { executablePath: browserPath } : {}) });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
await context.tracing.start({ screenshots: true, snapshots: true, sources: true });
const page = await context.newPage();
page.setDefaultTimeout(15_000);
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
await page.addInitScript(() => {
  localStorage.setItem("serre-studio-getting-started-seen", "1");
  localStorage.setItem("serre-studio-language", "fr");
  localStorage.setItem("serre-studio-workspace-view", "guided");
});

function expect(condition, message) {
  if (!condition) throw new Error(message);
}

async function api(method, route, data) {
  const response = await page.request.fetch(new URL(route, baseUrl).href, {
    method,
    ...(data === undefined ? {} : { data }),
  });
  if (!response.ok()) throw new Error(`${method} ${route}: ${response.status()} ${await response.text()}`);
  return response.json();
}

async function stage(name) {
  await page.getByRole("navigation", { name: "Parcours de création" }).getByRole("button", { name: new RegExp(name) }).click();
}

let episodeId;
try {
  await page.goto(new URL("?view=guided", baseUrl).href, { waitUntil: "domcontentloaded" });
  const manualEntry = page.getByRole("button", { name: /Continuer sans moteurs|Continue without engines/ });
  await page.locator("[data-guided-journey]").or(manualEntry).first().waitFor({ state: "visible", timeout: 60_000 });
  if (await manualEntry.isVisible()) await manualEntry.click();
  await page.locator("[data-guided-journey]").waitFor();

  // Bootstrap selects an isolated project on first load; seed its canonical Bible afterwards.
  await api("PUT", "api/bible/locations/kitchen", {
    id: "kitchen", name: "La cuisine", visual_description: "Une cuisine chaleureuse avec une grande table et des casseroles.",
    signature_details: ["table en bois"], palette: ["ocre", "crème", "vert"], generation_negative_prompt: "sans texte incrusté",
  });

  await stage("Épisode");
  const created = page.waitForResponse((response) => response.request().method() === "POST" && new URL(response.url()).pathname === "/api/episodes");
  await page.getByRole("button", { name: "Créer et lier l’épisode" }).click();
  const createdResponse = await created;
  expect(createdResponse.status() === 201, `Episode creation returned ${createdResponse.status()}`);
  episodeId = (await createdResponse.json()).id;
  await page.locator("[data-episode-authoring]").waitFor();

  const script = page.getByRole("tabpanel", { name: "Scénario" });
  await script.getByRole("textbox", { name: "Titre" }).fill("Chita et les pâtes volées");
  await script.getByRole("textbox", { name: "Promesse / logline" }).fill("Chita protège son dîner d'une bande de voleurs maladroits.");
  await script.getByRole("textbox", { name: "Scénario" }).fill("Chita prépare ses pâtes, déjoue les deux voleurs et partage finalement son dîner avec ses amis.");
  await script.getByRole("textbox", { name: "Accroche" }).fill("Les pâtes disparaissent au moment de passer à table.");
  await script.getByRole("textbox", { name: "Sortie / cliffhanger" }).fill("Une autre casserole bouge toute seule.");
  await script.getByRole("checkbox", { name: "La cuisine" }).check();
  const appliedDraft = page.waitForResponse((response) => response.request().method() === "POST" && new URL(response.url()).pathname === `/api/episodes/${episodeId}/draft/apply`);
  await script.getByRole("button", { name: "Soumettre à relecture" }).click();
  expect((await appliedDraft).ok(), "Manual draft was not persisted");

  await page.getByRole("tab", { name: "Cohérence" }).click();
  const reviewed = page.waitForResponse((response) => response.request().method() === "POST" && new URL(response.url()).pathname === `/api/episodes/${episodeId}/review`);
  await page.getByRole("button", { name: "Relire le scénario" }).click();
  expect((await reviewed).ok(), "Coherence review failed");
  await page.getByText("Aucun blocage").waitFor();
  const approved = page.waitForResponse((response) => response.request().method() === "POST" && new URL(response.url()).pathname === `/api/episodes/${episodeId}/approve`);
  await page.getByRole("button", { name: "Approuver le scénario" }).click();
  expect((await approved).ok(), "Script approval failed");

  await page.getByRole("tab", { name: "Storyboard" }).click();
  const board = page.getByRole("tabpanel", { name: "Storyboard" });
  for (let index = 0; index < 6; index += 1) {
    await board.getByRole("button", { name: "Ajouter un plan" }).click();
    const card = board.locator("ol > li").nth(index);
    await card.getByRole("textbox", { name: "Action narrative" }).fill(`Plan narratif ${index + 1} : Chita poursuit les pâtes volées.`);
    await card.getByRole("textbox", { name: "Action visible" }).fill(`Chita traverse la cuisine pour retrouver ses pâtes, étape ${index + 1}.`);
  }
  await board.getByText("Budget prêt").waitFor();
  const appliedBreakdown = page.waitForResponse((response) => response.request().method() === "POST" && new URL(response.url()).pathname === `/api/episodes/${episodeId}/breakdown/apply`);
  await board.getByRole("button", { name: "Appliquer le storyboard" }).click();
  expect((await appliedBreakdown).ok(), "Six-card storyboard was not persisted");
  const canonical = await api("GET", `api/episodes/${episodeId}`);
  expect(canonical.episode.shot_order.length === 6 && canonical.shots.length === 6, "Canonical package does not contain six ordered shots");
  expect(canonical.shots.reduce((total, shot) => total + shot.duration, 0) === 30, "Canonical duration is not 30 s");

  await page.reload({ waitUntil: "domcontentloaded" });
  await page.locator("[data-guided-journey]").waitFor();
  await stage("Storyboard");
  const restored = page.getByRole("tabpanel", { name: "Storyboard" });
  await restored.getByText("Budget prêt").waitFor();
  expect(await restored.locator("ol > li").count() === 6, "Shot cards did not survive reload");
  expect((await restored.getByRole("textbox", { name: "Action narrative" }).first().inputValue()).includes("Chita poursuit"), "Shot source did not survive reload");
  expect(!(await page.locator("[data-episode-authoring]").innerText()).includes("kitchen"), "Technical location ID leaked into the normal UI");
  expect(errors.length === 0, `JavaScript errors: ${errors.join(" | ")}`);
  console.log(`PASS episode authoring: ${episodeId}, manual script/review/approval, 6 shots/30 s and reload`);
} catch (error) {
  console.error("PAGE ERRORS", errors.join(" | ") || "none");
  console.error("PAGE CONTENT", await page.locator("body").innerText());
  await page.screenshot({ path: path.join(artifacts, "episode-authoring-failure.png"), fullPage: true });
  throw error;
} finally {
  await context.tracing.stop({ path: path.join(artifacts, "episode-authoring-trace.zip") });
  await browser.close();
}
