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
const { chromium } = require(playwrightModule);

function expect(value, message) { if (!value) throw new Error(message); }

const assetId = "asset-" + "a".repeat(64);
const asset = {
  id: assetId,
  name: "belladone-reference.png",
  kind: "image",
  media_type: "image/svg+xml",
  bytes: 128,
  sha256: "a".repeat(64),
  updated_at: "2026-09-05T12:00:00Z",
  source: "manual",
  sources: ["manual"],
  status: "imported",
  statuses: ["imported"],
  provider: null,
  model: null,
  origin_asset_id: null,
  episodes: ["S01E001"],
  shots: ["S01E001-S01"],
  characters: ["belladone"],
  locations: ["serre-des-venins"],
  bindings: [{ shot_id: "S01E001-S01", episode_id: "S01E001", slot: "keyframe" }],
  files: [{ root: "output", path: "S01E001-S01/imports/keyframe.png" }],
  compatible_slots: ["keyframe"],
  previewable: true,
  content_url: `/api/asset-catalog/${assetId}/content`,
  usage_count: 1,
  provenance: { source: "manual", provider: null, model: null, origin_asset_id: null, files: [] },
};
const facets = {
  kinds: [{ value: "image", label: "image", count: 1 }],
  characters: [{ value: "belladone", label: "Belladone", count: 1 }],
  locations: [{ value: "serre-des-venins", label: "La Serre des Venins", count: 1 }],
  episodes: [{ value: "S01E001", label: "S01E001", count: 1 }],
  statuses: [{ value: "imported", label: "imported", count: 1 }],
};

const browser = await chromium.launch({ headless: true, executablePath: browserPath });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.addInitScript(() => localStorage.setItem("serre-studio-getting-started-v0.2.13", "seen"));
let reused = null;
const fulfillCatalog = (route) => route.fulfill({
  status: 200,
  contentType: "application/json",
  body: JSON.stringify({ items: [asset], total: 1, indexed_total: 1, updated_at: asset.updated_at, facets }),
});
await page.route("**/api/asset-catalog", fulfillCatalog);
await page.route("**/api/asset-catalog?*", fulfillCatalog);
await page.route(`**/api/asset-catalog/${assetId}/content`, (route) => route.fulfill({
  status: 200,
  contentType: "image/svg+xml",
  body: '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" fill="#8f6"/></svg>',
}));
await page.route("**/api/assets/*/keyframe/reuse", async (route) => {
  reused = route.request().postDataJSON();
  await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ...asset, slot: "keyframe", filename: "keyframe.png", url: "/api/assets/S01E001-S01/keyframe/content" }) });
});

await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
await page.waitForFunction(() => window.SerreAssetDrawer && window.SerreWorkspace);
await page.evaluate(async () => {
  window.SerreWorkspace.show("graph");
  await window.SerreGraph.load("shot", "S01E001-S01", { fit: true });
});
const initialView = await page.locator("body").getAttribute("data-workspace-view");
await page.locator("#studio-tools-menu-toggle").click();
await page.locator('[data-tool-action="assets"]').click();
await page.waitForSelector("#asset-drawer[aria-hidden='false']");
await page.waitForSelector(".asset-card");
const cardCount = await page.locator(".asset-card").count();
expect(cardCount === 1, "Le catalogue n’affiche pas l’asset mocké : " + await page.locator("#asset-grid").innerText());
expect(await page.locator("#asset-filter-character option").allTextContents().then((items) => items.some((item) => item.includes("Belladone"))), "Le filtre personnage manque");
expect(await page.locator("#asset-detail").innerText().then((text) => text.includes("SHA-256")), "La provenance n’est pas visible");
expect(await page.locator("body").getAttribute("data-workspace-view") === initialView, "Le drawer a changé de scope");

const source = page.locator(".asset-card");
const target = page.locator('.graph-node[data-node-id="keyframe"]');
expect(await target.count() === 1, "Le nœud Keyframes du graphe est absent");
const dataTransfer = await page.evaluateHandle(() => new DataTransfer());
await source.dispatchEvent("dragstart", { dataTransfer });
expect(await page.locator("body").evaluate((body) => body.classList.contains("asset-dragging")), "Le mode drag du catalogue n’est pas actif");
await target.dispatchEvent("dragenter", { dataTransfer });
await target.dispatchEvent("dragover", { dataTransfer });
expect(await target.evaluate((node) => node.classList.contains("drop-target")), "Le nœud compatible ne devient pas une cible");
await target.dispatchEvent("drop", { dataTransfer });
await source.dispatchEvent("dragend", { dataTransfer });
for (let attempt = 0; attempt < 30 && !reused; attempt += 1) await page.waitForTimeout(100);
expect(reused?.asset_id === assetId, "Le drag n’a pas transmis la référence d’asset");
expect(await page.locator("#asset-drawer").getAttribute("aria-hidden") === "false", "Le drawer s’est fermé pendant la réutilisation");

await page.locator("#asset-drawer-close").click();
expect(await page.locator("#asset-drawer").getAttribute("aria-hidden") === "true", "Le drawer ne se ferme pas");
await browser.close();
process.stdout.write("PASS Asset Drawer global, filtres, provenance et drag-and-drop\n");
