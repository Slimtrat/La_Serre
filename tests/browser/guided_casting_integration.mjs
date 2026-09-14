#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(new URL("../../frontend/package.json", import.meta.url));
const { chromium } = require("playwright");
const baseUrl = process.env.SERRE_STUDIO_URL;
if (!baseUrl) throw new Error("SERRE_STUDIO_URL is required");
const repository = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const artifacts = path.resolve(process.env.SERRE_E2E_ARTIFACT_DIR || path.join(repository, "artifacts/browser-integration"));
fs.mkdirSync(artifacts, { recursive: true });
const browserCandidates = [
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
].filter((candidate) => fs.existsSync(candidate));
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

try {
  await page.goto(new URL("?view=guided", baseUrl).href, { waitUntil: "domcontentloaded" });
  const manualEntry = page.getByRole("button", { name: /Continuer sans moteurs|Continue without engines/ });
  await manualEntry.waitFor({ state: "visible", timeout: 60_000 });
  await manualEntry.click();
  await page.locator("[data-guided-journey]").waitFor();
  await page.getByRole("button", { name: /Casting/ }).click();
  await page.getByRole("button", { name: "Ajouter un personnage" }).click();

  const characterForm = page.getByRole("button", { name: "Enregistrer la fiche" }).locator("xpath=ancestor::form");
  await characterForm.getByLabel("Nom", { exact: true }).fill("Iris");
  await characterForm.getByLabel("Rôle", { exact: true }).fill("Gardienne de la serre");
  await characterForm.getByLabel("Apparence", { exact: true }).fill("Une gardienne adulte aux cheveux argentés et au regard calme et déterminé.");
  await characterForm.getByLabel("Tenue", { exact: true }).fill("Une longue veste anthracite brodée de pétales violets et argentés.");
  await characterForm.getByLabel(/Détails signature/).fill("cicatrice en étoile, bague de verre");
  await characterForm.getByLabel(/Palette/).fill("argent, anthracite, violet");
  await characterForm.getByLabel("Personnalité", { exact: true }).fill("Loyale, lucide et secrètement inquiète.");
  await characterForm.getByLabel(/Désirs/).fill("protéger la serre");
  await characterForm.getByLabel(/Peurs/).fill("échouer seule");
  await characterForm.getByLabel("Voix", { exact: true }).fill("Une voix basse, posée et légèrement voilée.");
  await characterForm.getByRole("button", { name: "Enregistrer la fiche" }).click();
  await page.getByRole("button", { name: "Valider dans la Bible" }).click();

  const importPanel = page.getByText("Importer une apparence", { exact: true }).first().locator("..");
  await importPanel.locator("summary").click();
  await importPanel.locator('input[name="file"]').setInputFiles(path.join(repository, "assets/branding/la-serre-icon.png"));
  await importPanel.locator('input[name="license"]').fill("project-test-fixture");
  await importPanel.locator('input[name="rights_confirmed"]').check();
  await importPanel.getByRole("button", { name: "Importer une apparence" }).click();
  await page.getByText("candidate", { exact: true }).waitFor();
  await page.getByRole("button", { name: "Approuver comme maître" }).click();
  await page.getByText("MASTER", { exact: true }).waitFor();

  const guidedResponse = await page.request.get(new URL("api/guided", baseUrl).href);
  const castingResponse = await page.request.get(new URL("api/casting", baseUrl).href);
  if (!guidedResponse.ok() || !castingResponse.ok()) throw new Error("Real project APIs are unavailable");
  const guided = await guidedResponse.json();
  const casting = await castingResponse.json();
  const draftId = guided.state.characters[0]?.id;
  if (!draftId || guided.canonical_characters[0]?.id !== draftId) throw new Error("Promotion did not preserve the character ID");
  if (!casting.characters[0]?.active_master_id) throw new Error("The imported candidate was not persisted as master");

  await page.reload({ waitUntil: "domcontentloaded" });
  await page.locator("[data-guided-journey]").waitFor();
  await page.getByRole("button", { name: /Casting/ }).click();
  await page.getByText("MASTER", { exact: true }).waitFor();
  if (await page.getByRole("combobox", { name: "Character" }).inputValue() !== draftId) {
    throw new Error("Character selection was not restored after reload");
  }
  if (pageErrors.length) throw new Error(`JavaScript errors: ${pageErrors.join(" | ")}`);
  console.log(`PASS real guided casting: ${draftId} promoted, imported, approved and reloaded`);
} catch (error) {
  console.error("PAGE ERRORS", pageErrors.join(" | ") || "none");
  console.error("PAGE CONTENT", await page.locator("body").innerText());
  await page.screenshot({ path: path.join(artifacts, "guided-casting-failure.png"), fullPage: true });
  throw error;
} finally {
  await context.tracing.stop({ path: path.join(artifacts, "guided-casting-trace.zip") });
  await browser.close();
}
