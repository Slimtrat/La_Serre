#!/usr/bin/env node

import { createRequire } from "node:module";
import fs from "node:fs";

const require = createRequire(import.meta.url);
const baseUrl = process.env.SERRE_STUDIO_URL || process.argv[2] || "http://127.0.0.1:8000/";
const playwrightModule = process.env.PLAYWRIGHT_MODULE || "playwright";
const browserPath = process.env.PLAYWRIGHT_BROWSER_PATH
  || (process.platform === "win32" && fs.existsSync("C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe")
    ? "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"
    : undefined);

let chromium;
try {
  ({ chromium } = require(playwrightModule));
} catch (error) {
  throw new Error(
    `Playwright is required. Install it or set PLAYWRIGHT_MODULE to its module path. ${error.message}`,
  );
}

function expect(value, message) {
  if (!value) throw new Error(message);
}

function pathOf(response) {
  return new URL(response.url()).pathname;
}

const browser = await chromium.launch({
  headless: true,
  ...(browserPath ? { executablePath: browserPath } : {}),
});
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
const consoleErrors = [];
page.setDefaultTimeout(10_000);
page.on("pageerror", (error) => consoleErrors.push(`pageerror: ${error.message}`));
page.on("console", (message) => {
  if (message.type() !== "error") return;
  const location = message.location();
  consoleErrors.push(`console: ${message.text()}${location.url ? ` @ ${location.url}` : ""}`);
});
await page.addInitScript(() => {
  localStorage.setItem("serre-studio-getting-started-seen", "1");
  localStorage.setItem("serre-studio-language", "fr");
  localStorage.setItem("serre-studio-workspace-view", "graph");
});

try {
  await page.goto(new URL("?view=graph", baseUrl).href, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.SerreGraph && window.SerreCoherence && window.SerreBible);

  await page.waitForFunction(() => {
    try { return Boolean(JSON.parse(document.querySelector("#shot-editor")?.value || "{}").id); }
    catch (_error) { return false; }
  });
  const shotId = await page.evaluate(() => JSON.parse(document.querySelector("#shot-editor").value).id);
  expect(shotId, "Aucun plan actif n’est disponible dans l’épisode");
  const activeShot = page.locator("#context-shot");
  await activeShot.waitFor({ state: "visible" });
  await activeShot.click();
  await page.waitForFunction(
    (id) => window.SerreGraph.current()?.scope === "shot" && window.SerreGraph.current()?.id === id,
    shotId,
  );

  const businessNode = page.locator('.graph-node[data-node-id="cast"]');
  await businessNode.waitFor({ state: "visible" });
  await businessNode.click();
  expect(
    (await page.locator("#graph-inspector-title").innerText()).trim() === "Personnages",
    "Le nœud métier Personnages n’ouvre pas son inspecteur",
  );
  const validate = page.locator('[data-graph-action="validate-shot-characters"]');
  await validate.waitFor({ state: "visible" });

  const reviewResponsePromise = page.waitForResponse(
    (response) => pathOf(response) === "/api/coherence/review"
      && response.request().method() === "POST",
  );
  await validate.click();
  const reviewResponse = await reviewResponsePromise;
  expect(reviewResponse.ok(), `La validation métier répond ${reviewResponse.status()}`);
  const report = await reviewResponse.json();
  expect(report.id && report.subject_id === shotId, "Le rapport ne cible pas le plan ouvert");
  expect(report.scope === "shot", `Portée inattendue du rapport : ${report.scope}`);

  const reportHost = page.locator("#graph-coherence-report");
  await reportHost.waitFor({ state: "visible" });
  expect(await reportHost.getAttribute("data-status") === report.status, "Le statut affiché diffère du rapport API");
  expect((await reportHost.innerText()).includes(report.summary), "Le résumé du rapport n’est pas rendu dans l’inspecteur");

  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.SerreGraph && window.SerreCoherence && window.SerreBible);
  await page.waitForFunction(
    (id) => {
      try { return JSON.parse(document.querySelector("#shot-editor")?.value || "{}").id === id; }
      catch (_error) { return false; }
    },
    shotId,
  );
  await page.locator("#context-shot").click();
  await page.waitForFunction(
    (id) => window.SerreGraph.current()?.scope === "shot" && window.SerreGraph.current()?.id === id,
    shotId,
  );
  const latestResponsePromise = page.waitForResponse(
    (response) => pathOf(response) === `/api/coherence/shot/${shotId}/latest`
      && response.request().method() === "GET",
  );
  await page.locator('.graph-node[data-node-id="cast"]').click();
  const latestResponse = await latestResponsePromise;
  expect(latestResponse.ok(), `Le dernier rapport répond ${latestResponse.status()}`);
  const latest = await latestResponse.json();
  expect(latest?.id === report.id, "Le rechargement ne restitue pas le dernier rapport créé");
  await reportHost.waitFor({ state: "visible" });
  expect((await reportHost.innerText()).includes(report.summary), "Le dernier rapport n’est pas restauré dans l’inspecteur");

  const seriesCast = page.locator(".context-series #series-cast-open");
  await seriesCast.waitFor({ state: "visible" });
  expect(/Personnages|Characters/.test(await seriesCast.ariaSnapshot()), "Personnages n’a pas de nom accessible au niveau Série");
  await seriesCast.click();
  await page.waitForFunction(() => document.body.dataset.workspaceView === "bible");
  const selectedCharacters = page.locator('#bible-categories [data-bible-category="characters"].selected');
  await selectedCharacters.waitFor({ state: "visible" });
  expect(
    (await page.locator("#bible-collection-title").innerText()).trim() === "Personnages",
    "Le raccourci Série n’ouvre pas le registre Personnages",
  );

  expect(consoleErrors.length === 0, consoleErrors.join(" | "));
  process.stdout.write(`PASS plan ouvert : ${shotId}\n`);
  process.stdout.write(`PASS validation depuis le nœud métier Personnages : ${report.id} (${report.status})\n`);
  process.stdout.write("PASS dernier rapport restauré après reload\n");
  process.stdout.write("PASS Personnages accessible depuis le contexte Série\n");
  process.stdout.write("PASS aucune erreur console\n");
} finally {
  await browser.close();
}
