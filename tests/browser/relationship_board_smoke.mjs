#!/usr/bin/env node

import { createRequire } from "node:module";
import fs from "node:fs";

const require = createRequire(new URL("../../frontend/package.json", import.meta.url));
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const browserPath = process.env.PLAYWRIGHT_BROWSER_PATH
  || (process.platform === "win32" && fs.existsSync("C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe")
    ? "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"
    : undefined);
const baseURL = process.env.SERRE_STUDIO_URL || "http://127.0.0.1:8000/";
const browser = await chromium.launch({ headless: true, ...(browserPath ? { executablePath: browserPath } : {}) });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
let savedPayload = null;

const relationship = {
  id: "belladone-aconit", source: "belladone", target: "aconit", label: "Désir nié",
  summary: "Belladone provoque Aconit tandis que leur confiance reste fragile.",
  desire: 72, trust: 46, anger: 24, fear: 58, attachment: 68, jealousy: 64, toxicity: 18,
  provenance: { source: "template", note: "Fixture de démarrage" },
};
const board = {
  bible_revision: 3,
  updated_at: new Date().toISOString(),
  characters: [{ id: "belladone", name: "Belladone" }, { id: "aconit", name: "Aconit" }, { id: "graine-noire", name: "La Graine Noire" }],
  relationships: [relationship, { ...relationship, id: "graine-belladone", source: "graine-noire", target: "belladone", label: "Emprise", jealousy: 22 }],
  secrets: [{
    id: "seed", owners: ["aconit"], known_by: ["aconit"], hidden_from: ["belladone"],
    summary: "Aconit reconnaît le symbole ancien gravé sur la graine.", severity: 0.72,
    created_episode: 1, revealed: false, provenance: { source: "template", note: "Fixture" },
  }],
  history: [],
  impact: { affected_episodes: [], affected_shots: [], artifact_count: 0 },
};

function expect(value, message) { if (!value) throw new Error(message); }
page.setDefaultTimeout(10_000);
page.on("pageerror", (error) => errors.push(error.message));
page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
await page.addInitScript(() => {
  localStorage.setItem("serre-studio-getting-started-v0.2.13", "seen");
  localStorage.setItem("serre-studio-language", "fr");
});
await page.route("**/api/relationship-board", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(board) }));
await page.route("**/api/relationship-board/relationships/*", async (route) => {
  savedPayload = route.request().postDataJSON();
  await route.fulfill({
    status: 200, contentType: "application/json",
    body: JSON.stringify({ ...board, bible_revision: 4, relationships: [savedPayload.relationship], impact: { affected_episodes: ["S01E001"], affected_shots: [], artifact_count: 1 } }),
  });
});

try {
  await page.goto(new URL("#/bible", baseURL).href, { waitUntil: "domcontentloaded" });
  await page.locator("[data-relationship-board]").waitFor({ state: "visible" });
  expect(await page.getByRole("button", { name: "Choisir cette direction: Belladone → Aconit" }).count() === 1, "La direction Belladone → Aconit est absente");
  expect(await page.locator('[aria-label^="Choisir cette direction:"]').count() === 6, "Le triangle relationnel ne présente pas ses six directions");
  expect(await page.getByRole("button", { name: "Choisir cette direction: La Graine Noire → Belladone" }).count() === 1, "Le troisième sommet du triangle est absent");
  const jealousy = page.getByLabel("Jalousie value");
  await jealousy.fill("79");
  expect(savedPayload === null, "Le canon a été modifié sans validation humaine");
  await page.getByRole("button", { name: "Enregistrer dans la Bible" }).click();
  await page.waitForFunction(() => document.body.textContent?.includes("S01E001"));
  expect(savedPayload?.confirmed_by_user === true, "Le gate humain explicite est absent");
  expect(savedPayload?.relationship?.jealousy === 79, "La jalousie éditée n’a pas été enregistrée");

  await page.getByRole("tab", { name: "Secrets" }).click();
  expect(await page.getByRole("group", { name: "Au courant" }).count() === 1, "Les connaissances du secret sont absentes");
  expect(await page.getByRole("group", { name: "Tenu à l’écart" }).count() === 1, "Les exclusions du secret sont absentes");

  await page.setViewportSize({ width: 640, height: 760 });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow <= 1, `Débordement horizontal de ${overflow}px`);
  expect(errors.length === 0, `Erreurs navigateur: ${errors.join(" | ")}`);
  console.log("PASS tableau relationnel directionnel, gate humain, secrets et affichage étroit");
} finally {
  await browser.close();
}
