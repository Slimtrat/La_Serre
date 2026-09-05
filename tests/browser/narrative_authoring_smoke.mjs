#!/usr/bin/env node

import { createRequire } from "node:module";
import fs from "node:fs";

const require = createRequire(import.meta.url);
const baseUrl = process.env.SERRE_STUDIO_URL || "http://127.0.0.1:8000/";
const playwrightModule = process.env.PLAYWRIGHT_MODULE || "playwright";
const browserPath = process.env.PLAYWRIGHT_BROWSER_PATH
  || (process.platform === "win32" && fs.existsSync("C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe")
    ? "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"
    : undefined);
const { chromium } = require(playwrightModule);
const browser = await chromium.launch({ headless: true, ...(browserPath ? { executablePath: browserPath } : {}) });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const pageErrors = [];
let createdEpisodeId = null;
page.on("pageerror", (error) => pageErrors.push(error.message));

function expect(value, message) {
  if (!value) throw new Error(message);
}

try {
  await page.goto(new URL("?view=graph", baseUrl).href, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.SerreNarrativeWorkflow && window.SerreGraph);
  await page.locator("#narrative-workflow-open").evaluate((button) => button.click());
  const dialog = page.locator("#narrative-workflow-dialog");
  await dialog.waitFor({ state: "visible" });
  expect(await dialog.locator(".narrative-stage").count() === 3, "Le pipeline Série doit afficher trois étapes");
  await dialog.locator("#director-concept").fill("Une histoire complète reste modifiable avant chaque validation humaine.");
  expect(await dialog.locator("#director-save").isEnabled(), "Le brouillon Director doit rester éditable manuellement");
  await page.evaluate(() => window.SerreI18n.setLanguage("en"));
  expect(await dialog.locator("#narrative-workflow-title").textContent() === "Story room", "Le titre ne réagit pas au passage en anglais");
  expect(await dialog.locator("#director-save").textContent() === "Save", "Les actions ne sont pas traduites en anglais");
  expect(await dialog.locator("#screenwriter-status").textContent() === "Locked", "Les gates bloquées ne sont pas traduites");
  expect(await dialog.locator("#director-concept").inputValue() === "Une histoire complète reste modifiable avant chaque validation humaine.", "Le changement de langue ne doit pas effacer le brouillon");
  await page.evaluate(() => window.SerreI18n.setLanguage("fr"));
  expect(await dialog.locator("#narrative-workflow-title").textContent() === "Atelier narratif", "Le retour au français n’est pas réactif");
  expect(await dialog.locator("#director-save").textContent() === "Enregistrer", "Les actions ne reviennent pas en français");
  await dialog.locator('[data-author-tab="episode"]').click();
  await dialog.locator("#episode-new").click();
  await dialog.locator("#episode-author-title").fill("Épisode créé dans le Studio");
  await dialog.locator("#episode-author-source").fill("Une graine oubliée appelle doucement le premier personnage de la série.");
  expect(await dialog.locator(".shot-blueprint").count() === 0, "Aucun plan ne doit être imposé avant le découpage");
  const createdResponsePromise = page.waitForResponse((response) => (
    new URL(response.url()).pathname === "/api/episodes" && response.request().method() === "POST"
  ));
  await dialog.locator("#episode-save").click();
  const createdResponse = await createdResponsePromise;
  expect(createdResponse.status() === 201, `La création UI répond ${createdResponse.status()}`);
  createdEpisodeId = (await createdResponse.json()).id;
  await page.waitForFunction((id) => document.querySelector("#episode-select")?.value === id, createdEpisodeId);
  const createdPackage = await page.request.get(new URL(`api/episodes/${createdEpisodeId}`, baseUrl).href);
  expect(createdPackage.ok(), "Le premier épisode créé par l’UI n’est pas navigable");
  expect((await createdPackage.json()).shots.length === 0, "Un épisode vide ne doit pas recevoir de plan implicite");
  const graph = await page.request.get(new URL("api/graphs/series/series", baseUrl).href);
  expect(graph.ok(), `Le graphe Série répond ${graph.status()}`);
  const nodeIds = (await graph.json()).nodes.map((node) => node.id);
  for (const id of ["series:director", "series:screenwriter", "series:validator"]) {
    expect(nodeIds.includes(id), `Le nœud métier ${id} est absent du graphe`);
  }
  expect(pageErrors.length === 0, `Erreur JavaScript: ${pageErrors.join(" | ")}`);
  console.log(`PASS narrative authoring: 3 gates, ${createdEpisodeId} created from UI, empty breakdown and graph nodes`);
} finally {
  if (createdEpisodeId) {
    await page.request.delete(new URL(`api/episodes/${createdEpisodeId}`, baseUrl).href).catch(() => {});
  }
  await browser.close();
}
