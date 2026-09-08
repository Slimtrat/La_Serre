#!/usr/bin/env node

import { createRequire } from "node:module";
import fs from "node:fs";

const require = createRequire(new URL("../../frontend/package.json", import.meta.url));
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const browserPath = process.env.PLAYWRIGHT_BROWSER_PATH
  || (process.platform === "win32" && fs.existsSync("C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe")
    ? "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"
    : undefined);
const baseURL = process.env.SERRE_STUDIO_URL || process.argv[2] || "http://127.0.0.1:8000/";
const browser = await chromium.launch({
  headless: true,
  ...(browserPath ? { executablePath: browserPath } : {}),
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.setDefaultTimeout(10_000);
const checks = [];
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));

function expect(condition, message) {
  if (!condition) throw new Error(message);
}

async function check(name, action) {
  try {
    await action();
    checks.push({ name, status: "passed" });
    console.log("PASS ", name);
  } catch (error) {
    checks.push({ name, status: "failed", error: error.message });
    console.error("FAIL ", name, "-", error.message);
  }
}

await page.addInitScript(() => {
  localStorage.setItem("serre-studio-getting-started-v0.2.13", "seen");
  localStorage.setItem("serre-studio-language", "fr");
});
await page.goto(new URL("#/create", baseURL).href, { waitUntil: "domcontentloaded" });
await page.waitForSelector("[data-studio-shell]");
await page.waitForFunction(() => document.body.dataset.shellOwner === "react");

await check("React possède seul le shell et expose trois destinations primaires", async () => {
  expect(await page.locator("[data-studio-shell]").count() === 1, "Le shell React est absent ou dupliqué");
  expect(await page.locator("[data-primary-navigation] button").count() === 3, "La navigation primaire ne contient pas exactement trois boutons");
  expect(await page.locator("[data-context-bar]").count() === 1, "La barre de contexte est absente");
  expect(await page.locator("[data-tools-menu]").count() === 1, "Le menu Outils est absent");
  for (const selector of [".topbar", "[data-legacy-navigation-slot='view-dock']"]) {
    const surface = page.locator(selector);
    expect(await surface.isHidden(), selector + " reste visible");
    expect(await surface.getAttribute("aria-hidden") === "true", selector + " reste exposé à l’accessibilité");
    expect(await surface.evaluate((element) => element.inert), selector + " reste interactif");
  }
});

await check("les routes primaires pilotent les URL canoniques", async () => {
  const expected = [
    ["Créer", "#/create"],
    ["Produire", "#/produce"],
    ["Résultats", "#/results"],
  ];
  for (const [label, hash] of expected) {
    await page.getByRole("button", { name: label, exact: true }).click();
    await page.waitForFunction((value) => location.hash.startsWith(value), hash);
    expect(await page.getByRole("button", { name: label, exact: true }).getAttribute("aria-current") === "page", label + " n’est pas marqué actif");
  }
});

await check("les deep-links conservent le contexte après rechargement", async () => {
  const before = await page.evaluate(() => location.hash);
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForSelector("[data-studio-shell]");
  expect(await page.evaluate(() => location.hash) === before, "Le deep-link a changé au rechargement");
  expect((await page.evaluate(() => location.hash)).startsWith("#/results"), "La route Résultats n’est pas restaurée");
});

await check("le menu React ouvre les outils legacy et ignore les outils inconnus", async () => {
  const clickCount = await page.evaluate(() => {
    let count = 0;
    const listener = () => { count += 1; };
    document.addEventListener("click", listener, { capture: true });
    window.dispatchEvent(new CustomEvent("studio:tool-open-request", { detail: { tool: "unknown" } }));
    document.removeEventListener("click", listener, { capture: true });
    return count;
  });
  expect(clickCount === 0, "Un outil inconnu déclenche une action");

  await page.locator("[data-tools-menu] summary").click();
  await page.getByRole("menuitem", { name: "Guide", exact: true }).click();
  expect(await page.locator("#getting-started-dialog").getAttribute("open") !== null, "Le guide legacy ne s’ouvre pas");
  await page.locator('[data-guide-action="close"]').click();
});

await check("la route inconnue est récupérable", async () => {
  await page.evaluate(() => { location.hash = "#/inconnue"; });
  await page.waitForFunction(() => document.body.textContent?.includes("Page introuvable"));
  await page.getByRole("button", { name: "Revenir à Créer" }).click();
  await page.waitForFunction(() => location.hash.startsWith("#/create"));
});

await check("FR/EN traduit le shell sans modifier ses routes", async () => {
  const language = page.getByRole("combobox", { name: "Langue de l’interface" });
  await language.selectOption("en");
  await page.waitForFunction(() => document.documentElement.lang === "en");
  expect(await page.getByRole("button", { name: "Create", exact: true }).count() === 1, "Create n’est pas traduit");
  expect(await page.getByRole("button", { name: "Produce", exact: true }).count() === 1, "Produce n’est pas traduit");
  expect(await page.getByRole("button", { name: "Results", exact: true }).count() === 1, "Results n’est pas traduit");
  expect((await page.evaluate(() => location.hash)).startsWith("#/create"), "La traduction a changé la route");
});

await check("les contrôles essentiels restent nommés et accessibles au clavier", async () => {
  const unnamed = await page.locator("[data-studio-shell] button, [data-studio-shell] select, [data-studio-shell] summary, [data-studio-shell] a").evaluateAll((elements) =>
    elements.filter((element) => {
      const text = element.textContent?.trim();
      const label = element.getAttribute("aria-label");
      return !text && !label;
    }).length,
  );
  expect(unnamed === 0, unnamed + " contrôle(s) sans nom accessible");
  await page.getByRole("button", { name: "Create", exact: true }).focus();
  await page.keyboard.press("Tab");
  expect(await page.evaluate(() => document.activeElement?.matches("[data-primary-navigation] button, [data-studio-shell] button, [data-studio-shell] summary, [data-studio-shell] select")), "Le parcours clavier quitte le shell");
});

await check("le shell reste utilisable en viewport étroit", async () => {
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.locator("[data-primary-navigation]").isVisible(), "La navigation primaire disparaît");
  expect(await page.locator("[data-context-bar]").isVisible(), "Le contexte disparaît");
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow <= 1, "Le shell déborde horizontalement de " + overflow + "px");
});

await check("le repli legacy restaure puis cède proprement la navigation", async () => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const root = page.locator("#studio-react-root");
  await root.evaluate((element) => element.removeAttribute("data-shell-owner"));
  await page.waitForFunction(() => document.body.dataset.shellOwner === "legacy");
  expect(await page.locator(".topbar").isVisible(), "La topbar de repli ne revient pas");
  expect(await page.locator("[data-legacy-navigation-slot='view-dock']").isVisible(), "Le dock de repli ne revient pas");
  await root.evaluate((element) => { element.dataset.shellOwner = "react"; });
  await page.waitForFunction(() => document.body.dataset.shellOwner === "react");
  expect(await page.locator(".topbar").isHidden(), "La topbar legacy concurrence React après restauration");
});

await check("aucune erreur JavaScript n’est émise", async () => {
  expect(errors.length === 0, errors.join(" | "));
});

await browser.close();
const failed = checks.filter((item) => item.status === "failed");
console.log(JSON.stringify({ checks: checks.length, passed: checks.length - failed.length, failed: failed.length }));
if (failed.length) process.exitCode = 1;