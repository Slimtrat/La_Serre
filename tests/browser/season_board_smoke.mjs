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
const artifacts = path.resolve(
  process.env.SERRE_E2E_ARTIFACT_DIR
    || path.join(repository, "artifacts/browser-integration"),
);
fs.mkdirSync(artifacts, { recursive: true });

const browserCandidates = [
  process.env.PLAYWRIGHT_BROWSER_PATH,
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
].filter((candidate) => candidate && fs.existsSync(candidate));
const browser = await chromium.launch({
  headless: true,
  ...(browserCandidates[0] ? { executablePath: browserCandidates[0] } : {}),
});
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
await context.tracing.start({ screenshots: true, snapshots: true, sources: true });
const page = await context.newPage();
const pageErrors = [];
page.on("pageerror", (error) => pageErrors.push(error.message));
page.setDefaultTimeout(15_000);
await page.addInitScript(() => {
  localStorage.setItem("serre-studio-getting-started-seen", "1");
  localStorage.setItem("serre-studio-language", "fr");
  localStorage.setItem("serre-studio-workspace-view", "guided");
});

function expect(condition, message) {
  if (!condition) throw new Error(message);
}

async function readPlan() {
  const response = await page.request.get(new URL("api/season-plan", baseUrl).href);
  if (!response.ok()) throw new Error(`SeasonPlan API unavailable: ${response.status()}`);
  return response.json();
}

async function waitForPlan(predicate, message) {
  const deadline = Date.now() + 15_000;
  let plan = await readPlan();
  while (!predicate(plan) && Date.now() < deadline) {
    await page.waitForTimeout(100);
    plan = await readPlan();
  }
  expect(predicate(plan), message);
  return plan;
}

async function openSeasonBoard() {
  await page.locator("[data-guided-journey]").waitFor();
  const journey = page.getByRole("navigation", { name: "Parcours de création" });
  await journey.getByRole("button", { name: /Saison/ }).click();
  await page.locator("[data-season-plan-board]").waitFor();
}

async function createItem(title) {
  const before = await readPlan();
  const board = page.locator("[data-season-plan-board]");
  await board.getByRole("button", { name: "Ajouter une intention", exact: true }).first().click();
  const created = await waitForPlan(
    (plan) => plan.revision > before.revision && plan.items.length === before.items.length + 1,
    `L'intention ${title} n'a pas été créée`,
  );
  const item = created.items.find((candidate) =>
    !before.items.some((previous) => previous.id === candidate.id)
  );
  expect(item, `Le nouvel item ${title} est introuvable`);

  const titleField = page.getByDisplayValue("Nouvel épisode", { exact: true }).last();
  await titleField.waitFor();
  const card = titleField.locator("xpath=ancestor::li");
  await titleField.fill(title);
  const saveResponse = page.waitForResponse((response) =>
    response.request().method() === "PUT"
    && new URL(response.url()).pathname === `/api/season-plan/items/${item.id}`
  );
  await card.getByRole("button", { name: "Enregistrer", exact: true }).click();
  expect((await saveResponse).ok(), `L'enregistrement de ${title} a échoué`);
  await waitForPlan(
    (plan) => plan.items.some((candidate) => candidate.id === item.id && candidate.title === title),
    `Le titre ${title} n'a pas été persisté`,
  );
  return item.id;
}

function cardForTitle(title) {
  return page.getByDisplayValue(title, { exact: true }).locator("xpath=ancestor::li");
}

async function materialize(title, itemId) {
  const validation = page.waitForResponse((candidate) =>
    candidate.request().method() === "PUT"
    && new URL(candidate.url()).pathname === `/api/season-plan/items/${itemId}`
  );
  await cardForTitle(title).getByRole("button", { name: "Valider" }).click();
  expect((await validation).ok(), `La validation de ${title} a échoué`);
  const before = await waitForPlan(
    (candidate) => candidate.items.some((item) => item.id === itemId && item.lifecycle === "validated"),
    `La validation de ${title} n'est pas persistée`,
  );
  const response = page.waitForResponse((candidate) =>
    candidate.request().method() === "POST"
    && new URL(candidate.url()).pathname === `/api/season-plan/items/${itemId}/materialize`
  );
  await cardForTitle(title).getByRole("button", { name: "Créer l’épisode" }).click();
  expect((await response).ok(), `La matérialisation de ${title} a échoué`);
  const plan = await waitForPlan(
    (candidate) => candidate.revision > before.revision
      && candidate.items.some((item) => item.id === itemId && item.episode_id),
    `La matérialisation de ${title} n'est pas persistée`,
  );
  return plan.items.find((item) => item.id === itemId).episode_id;
}

try {
  await page.goto(new URL("?view=guided", baseUrl).href, { waitUntil: "domcontentloaded" });
  const manualEntry = page.getByRole("button", {
    name: /Continuer sans moteurs|Continue without engines/,
  });
  await page.locator("[data-guided-journey]").or(manualEntry).first().waitFor({
    state: "visible",
    timeout: 60_000,
  });
  if (await manualEntry.isVisible()) await manualEntry.click();
  await openSeasonBoard();

  const board = page.locator("[data-season-plan-board]");
  expect(await board.count() === 1, "Le Studio doit afficher un unique SeasonPlan canonique");

  const firstId = await createItem("La graine noire");
  const secondId = await createItem("Le pacte de verre");
  let plan = await readPlan();
  expect(plan.items.length >= 2, "Le plan doit contenir au moins deux intentions");

  const dragResponse = page.waitForResponse((response) =>
    response.request().method() === "PUT"
    && new URL(response.url()).pathname === "/api/season-plan/order"
  );
  await cardForTitle("La graine noire")
    .getByRole("button", { name: "Déplacer l’intention: La graine noire" })
    .dragTo(cardForTitle("Le pacte de verre"));
  expect((await dragResponse).ok(), "Le reorder souris a échoué");
  await waitForPlan(
    (candidate) => candidate.items[0]?.id === secondId && candidate.items[1]?.id === firstId,
    "Le drag souris n'a pas atteint la vraie API",
  );

  const reorderResponse = page.waitForResponse((response) =>
    response.request().method() === "PUT"
    && new URL(response.url()).pathname === "/api/season-plan/order"
  );
  await page.getByRole("button", {
    name: "Déplacer l’intention: Le pacte de verre",
  }).press("ArrowDown");
  expect((await reorderResponse).ok(), "Le reorder clavier a échoué");
  plan = await waitForPlan(
    (candidate) => candidate.items[0]?.id === firstId && candidate.items[1]?.id === secondId,
    "Le reorder clavier n'a pas atteint la vraie API",
  );

  await page.reload({ waitUntil: "domcontentloaded" });
  await openSeasonBoard();
  const titlesAfterReload = await page
    .locator("[data-season-plan-board]")
    .getByRole("textbox", { name: "Titre" })
    .evaluateAll((inputs) => inputs.map((input) => input.value));
  expect(
    titlesAfterReload[0] === "La graine noire" && titlesAfterReload[1] === "Le pacte de verre",
    "Le reorder clavier n'a pas persisté après reload",
  );

  const secondEpisodeId = await materialize("Le pacte de verre", secondId);
  const firstEpisodeId = await materialize("La graine noire", firstId);
  expect(
    firstEpisodeId && secondEpisodeId && firstEpisodeId !== secondEpisodeId,
    "Chaque item doit être lié à un unique épisode matérialisé",
  );

  const insertedId = await createItem("L’ombre entre les deux");
  const insertionResponse = page.waitForResponse((response) =>
    response.request().method() === "PUT"
    && new URL(response.url()).pathname === "/api/season-plan/order"
  );
  await page.getByRole("button", {
    name: "Déplacer l’intention: L’ombre entre les deux",
  }).press("ArrowUp");
  expect((await insertionResponse).ok(), "L'insertion par reorder clavier a échoué");

  plan = await waitForPlan(
    (candidate) => candidate.items[0]?.id === firstId
      && candidate.items[1]?.id === insertedId
      && candidate.items[2]?.id === secondId,
    "Le nouvel item n'a pas été inséré entre les épisodes matérialisés",
  );
  const firstAfterInsertion = plan.items.find((item) => item.id === firstId);
  const secondAfterInsertion = plan.items.find((item) => item.id === secondId);
  expect(
    firstAfterInsertion?.episode_id === firstEpisodeId,
    "L'insertion a changé l'episode_id du premier item",
  );
  expect(
    secondAfterInsertion?.episode_id === secondEpisodeId,
    "L'insertion a changé l'episode_id du second item",
  );

  for (const episodeId of [firstEpisodeId, secondEpisodeId]) {
    const response = await page.request.get(new URL(`api/episodes/${episodeId}`, baseUrl).href);
    expect(response.ok(), `L'épisode ${episodeId} n'existe plus dans le vrai catalogue`);
  }

  await page.reload({ waitUntil: "domcontentloaded" });
  await openSeasonBoard();
  plan = await readPlan();
  expect(
    plan.items[0]?.id === firstId
      && plan.items[1]?.id === insertedId
      && plan.items[2]?.id === secondId,
    "L'insertion entre les épisodes n'a pas persisté après reload",
  );
  expect(await page.locator("[data-season-plan-board]").count() === 1, "Le reload a dupliqué le board");
  expect(pageErrors.length === 0, `Erreurs JavaScript: ${pageErrors.join(" | ")}`);

  console.log(
    `PASS real SeasonPlan: mouse + keyboard reorder persisted; ${secondEpisodeId}, insertion, ${firstEpisodeId} remained stable`,
  );
} catch (error) {
  console.error("PAGE ERRORS", pageErrors.join(" | ") || "none");
  console.error("PAGE CONTENT", await page.locator("body").innerText());
  await page.screenshot({
    path: path.join(artifacts, "season-board-failure.png"),
    fullPage: true,
  });
  throw error;
} finally {
  await context.tracing.stop({ path: path.join(artifacts, "season-board-trace.zip") });
  await browser.close();
}
