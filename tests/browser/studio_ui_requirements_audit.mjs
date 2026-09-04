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

const checks = [];
const consoleErrors = [];
const narrowMetrics = { accessibleNames: {} };

function expect(value, message) {
  if (!value) throw new Error(message);
}

async function check(name, action) {
  try {
    await action();
    checks.push({ name, status: "passed" });
    process.stdout.write(`PASS  ${name}\n`);
  } catch (error) {
    checks.push({ name, status: "failed", error: error.message });
    process.stdout.write(`FAIL  ${name}\n      ${error.message}\n`);
  }
}

function normalize(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

async function waitForLanguage(page, language) {
  await page.waitForFunction((expected) => document.documentElement.lang === expected, language);
}

async function dialogBounds(page) {
  const bounds = await page.locator("#getting-started-dialog").boundingBox();
  expect(bounds, "Le guide ouvert doit avoir des dimensions visibles");
  return bounds;
}

async function unnamedTopbarControls(page) {
  return page.locator(".topbar button, .topbar select, .topbar a").evaluateAll((elements) => {
    function visibleText(element) {
      const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, {
        acceptNode(node) {
          const parent = node.parentElement;
          if (!parent || parent.closest('[aria-hidden="true"]')) return NodeFilter.FILTER_REJECT;
          const style = getComputedStyle(parent);
          return style.display === "none" || style.visibility === "hidden"
            ? NodeFilter.FILTER_REJECT
            : NodeFilter.FILTER_ACCEPT;
        },
      });
      let text = "";
      while (walker.nextNode()) text += ` ${walker.currentNode.nodeValue}`;
      return text.trim();
    }
    return elements.filter((element) => {
      const style = getComputedStyle(element);
      const box = element.getBoundingClientRect();
      if (style.display === "none" || style.visibility === "hidden" || !box.width || !box.height) {
        return false;
      }
      const labelledBy = element.getAttribute("aria-labelledby");
      const labelledText = labelledBy
        ? labelledBy.split(/\s+/).map((id) => document.getElementById(id)?.textContent || "").join(" ")
        : "";
      return !normalizeName(
        element.getAttribute("aria-label")
        || labelledText
        || visibleText(element)
        || element.getAttribute("title"),
      );
    }).map((element) => element.id || element.className || element.tagName);

    function normalizeName(value) {
      return String(value || "").replace(/\s+/g, " ").trim();
    }
  });
}

const browser = await chromium.launch({
  headless: true,
  ...(browserPath ? { executablePath: browserPath } : {}),
});
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
page.setDefaultTimeout(5000);
page.on("pageerror", (error) => consoleErrors.push(`pageerror: ${error.message}`));
page.on("console", (message) => {
  if (message.type() === "error") {
    const location = message.location();
    const source = location.url ? ` @ ${location.url}${location.lineNumber ? `:${location.lineNumber}` : ""}` : "";
    consoleErrors.push(`console: ${message.text()}${source}`);
  }
});

await page.addInitScript(() => {
  if (sessionStorage.getItem("serre-studio-ui-audit-initialized")) return;
  sessionStorage.setItem("serre-studio-ui-audit-initialized", "true");
  localStorage.setItem("serre-studio-getting-started-v0.2.8", "seen");
  localStorage.setItem("serre-studio-language", "fr");
  localStorage.removeItem("serre-studio-getting-started-position-v1");
});
await page.goto(new URL("?view=graph", baseUrl).href, { waitUntil: "domcontentloaded" });
await page.waitForFunction(() => window.SerreI18n && window.SerreGettingStarted);
await page.waitForSelector("#production-queue-toggle");

await check("la navigation globale historique est réellement masquée", async () => {
  expect(await page.locator(".legacy-workspace-nav").isHidden(), "Production/Plan/Sorties/Réglages restent visibles comme cluster global");
  expect(await page.locator(".legacy-workspace-nav [data-workspace-target]:visible").count() === 0, "Un onglet historique reste visible");
});

await check("Projet → Série → Épisode → Plan est lisible et navigable", async () => {
  const contextText = normalize(await page.locator(".studio-context").innerText());
  const folded = contextText.toLocaleLowerCase("fr");
  const positions = ["projet", "série", "épisode", "plan"].map((label) => folded.indexOf(label));
  expect(positions.every((position) => position >= 0), `Hiérarchie incomplète : ${contextText}`);
  expect(positions.every((position, index) => index === 0 || position > positions[index - 1]), `Hiérarchie désordonnée : ${contextText}`);
  await page.locator('[data-context-action="bible"]').click();
  expect(await page.locator("body").getAttribute("data-workspace-view") === "bible", "Série/Bible ne navigue pas vers la Bible");
  await page.locator("#context-shot").click();
  expect(await page.locator("body").getAttribute("data-workspace-view") === "graph", "Plan ne revient pas au graphe");
});

await check("Assets, File, Journal, Guide et Réglages sont identifiables", async () => {
  const toolbarText = normalize(await page.locator(".studio-tools").innerText());
  for (const label of ["Assets", "File", "Journal", "Guide", "Réglages"]) {
    expect(toolbarText.includes(label), `${label} est absent de la barre d’outils : ${toolbarText}`);
  }
});

await check("l’état des moteurs est séparé de la navigation", async () => {
  const service = page.locator(".service-status");
  expect(await service.count() === 1 && await service.isVisible(), "Le statut des moteurs doit être un contrôle visible dédié");
  expect(await service.locator("xpath=ancestor::nav").count() === 0, "Le statut moteur est imbriqué dans une navigation");
  const name = `${await service.getAttribute("aria-label")} ${await service.getAttribute("title")}`;
  expect(/ComfyUI/i.test(name) && /Ollama/i.test(name), `Nom moteur imprécis : ${name}`);
});

await check("chaque contrôle primaire desktop a un nom accessible", async () => {
  const unnamed = await unnamedTopbarControls(page);
  expect(unnamed.length === 0, `Contrôles sans nom : ${unnamed.join(", ")}`);
});

await check("FR → EN traduit les surfaces majeures et les attributs", async () => {
  await page.locator("#language-select").selectOption("fr");
  await waitForLanguage(page, "fr");
  expect(await page.locator("#graph-zoom-out").getAttribute("aria-label") === "Dézoomer", "Les contrôles du graphe ne sont pas en français");
  await page.locator("#language-select").selectOption("en");
  await waitForLanguage(page, "en");
  const contextText = normalize(await page.locator(".studio-context").innerText()).toLowerCase();
  expect(contextText.includes("project"), "Projet n’est pas traduit");
  expect(contextText.includes("series"), "Série n’est pas traduite");
  expect(contextText.includes("episode"), "Épisode n’est pas traduit");
  expect(contextText.includes("shot"), "Plan n’est pas traduit");
  expect(await page.locator("#graph-zoom-out").getAttribute("aria-label") === "Zoom out", "Les contrôles du graphe ne sont pas traduits");
  expect(await page.locator("#project-select").getAttribute("aria-label") === "Active project", "aria-label Projet non traduit");
  expect(await page.locator("#settings-toggle").getAttribute("title") === "Configure engines and storage", "title Réglages non traduit");
  expect(await page.locator("#series-cast-open").getAttribute("aria-label") === "Characters, series resource", "aria-label Personnages non traduit");
});

await check("les surfaces dynamiques majeures suivent EN", async () => {
  await page.locator("#production-queue-toggle").click();
  await page.waitForSelector("#production-queue[aria-hidden='false']");
  expect(normalize(await page.locator("#production-queue h2").innerText()) === "Generation queue", "File dynamique non traduite");
  await page.locator('[data-queue-action="close"]').click();
  await page.locator("#notification-toggle").click();
  expect(normalize(await page.locator("#notification-panel header strong").innerText()).includes("Activity"), "Journal dynamique non traduit");
  await page.locator("#notification-toggle").click();
  await page.locator('[data-context-action="bible"]').click();
  await page.waitForSelector("#bible-workspace:not(.hidden)");
  expect(normalize(await page.locator("#bible-title").innerText()).includes("Canon Bible"), "Bible dynamique non traduite");
  await page.locator("#context-shot").click();
  await page.locator('[data-tool-action="assets"]').click();
  expect(await page.locator("body").getAttribute("data-workspace-view") === "outputs", "Assets ne navigue pas vers les sorties");
  expect(normalize(await page.locator("#preview-panel h2").innerText()) === "Human review", "Sorties dynamiques non traduites");
  await page.locator("#context-shot").click();
});

await check("la langue EN persiste après reload et le fallback reste français", async () => {
  expect(await page.evaluate(() => localStorage.getItem("serre-studio-language")) === "en", "La préférence EN n’est pas persistée");
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.SerreI18n);
  await waitForLanguage(page, "en");
  expect(await page.locator("#language-select").inputValue() === "en", "Le sélecteur ne restaure pas EN");
  expect(await page.evaluate(() => window.SerreI18n.t("common.fallbackProof")) === "Texte de secours", "Une clé EN absente ne retombe pas sur FR");
  expect(await page.evaluate(() => window.SerreI18n.setLanguage("xx")) === "fr", "Une langue inconnue ne retombe pas sur FR");
  await waitForLanguage(page, "fr");
});

await check("le tutoriel s’ouvre, se ferme et restaure le focus", async () => {
  const opener = page.locator("#getting-started-open");
  await opener.click();
  expect(await page.locator("#getting-started-dialog").getAttribute("open") !== null, "Le guide ne s’ouvre pas");
  expect(normalize(await page.locator("[data-guide-brand]").innerText()) === "Bien démarrer", "Le guide ne suit pas la langue FR");
  await page.locator("#language-select").selectOption("en");
  await waitForLanguage(page, "en");
  expect(normalize(await page.locator("[data-guide-brand]").innerText()) === "Getting started", "Le guide ouvert ne suit pas le passage EN");
  await page.locator("#language-select").selectOption("fr");
  await waitForLanguage(page, "fr");
  await page.locator('[data-guide-action="close"]').click();
  expect(await page.locator("#getting-started-dialog").getAttribute("open") === null, "Le bouton fermer ne ferme pas le guide");
  expect(await page.evaluate(() => document.activeElement?.id) === "getting-started-open", "Le focus ne revient pas au bouton Guide");
  await opener.click();
});

await check("le sélecteur FR/EN du guide reste synchronisé avec toute l’interface", async () => {
  try {
    await page.locator('[data-guide-language="en"]').click();
    await page.waitForTimeout(100);
    expect(await page.locator("html").getAttribute("lang") === "en", "Le bouton EN du guide ne change que le guide");
    expect(await page.locator("#language-select").inputValue() === "en", "La navbar ne reflète pas la langue choisie dans le guide");
  } finally {
    await page.evaluate(() => {
      window.SerreI18n.setLanguage("fr");
      window.SerreGettingStarted.setLanguage("fr");
    });
  }
});

await check("le guide ne masque pas le centre utile au placement initial", async () => {
  const guide = await dialogBounds(page);
  const graph = await page.locator("#graph-viewport").boundingBox();
  expect(graph, "Le canvas central doit être visible");
  const center = { x: graph.x + graph.width / 2, y: graph.y + graph.height / 2 };
  const covered = center.x >= guide.x && center.x <= guide.x + guide.width
    && center.y >= guide.y && center.y <= guide.y + guide.height;
  expect(!covered, `Le guide recouvre le centre du canvas (${Math.round(center.x)}, ${Math.round(center.y)})`);
});

let draggedPosition;
await check("le drag pointeur déplace vraiment le guide et persiste", async () => {
  const before = await dialogBounds(page);
  const handle = await page.locator("[data-guide-drag-handle]").boundingBox();
  expect(handle, "Poignée de déplacement absente");
  await page.mouse.move(handle.x + 100, handle.y + handle.height / 2);
  await page.mouse.down();
  await page.mouse.move(handle.x - 150, handle.y + 100, { steps: 8 });
  await page.mouse.up();
  const after = await dialogBounds(page);
  expect(Math.abs(after.x - before.x) >= 80 || Math.abs(after.y - before.y) >= 50, "Le geste pointeur n’a pas déplacé le guide");
  draggedPosition = await page.evaluate(() => JSON.parse(localStorage.getItem("serre-studio-getting-started-position-v1")));
  expect(Number.isFinite(draggedPosition?.x) && Number.isFinite(draggedPosition?.y), "La position n’est pas persistée");
  await page.locator('[data-guide-action="close"]').click();
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.SerreGettingStarted);
  await page.locator("#getting-started-open").click();
  await page.waitForFunction((expected) => {
    const rect = document.querySelector("#getting-started-dialog")?.getBoundingClientRect();
    return rect && Math.abs(rect.left - expected.x) <= 2 && Math.abs(rect.top - expected.y) <= 2;
  }, draggedPosition);
  const restored = await dialogBounds(page);
  expect(Math.abs(restored.x - draggedPosition.x) <= 2 && Math.abs(restored.y - draggedPosition.y) <= 2, `Position restaurée incorrecte : ${JSON.stringify(restored)} vs ${JSON.stringify(draggedPosition)}`);
});

await check("le clavier déplace, recentre, ancre et ferme le guide", async () => {
  const handle = page.locator("[data-guide-drag-handle]");
  await handle.focus();
  const before = await dialogBounds(page);
  await page.keyboard.press("ArrowLeft");
  const moved = await dialogBounds(page);
  expect(moved.x <= before.x - 18, "Flèche gauche ne déplace pas le guide de 20 px");
  await page.keyboard.press("Home");
  const centered = await dialogBounds(page);
  expect(Math.abs(centered.x + centered.width / 2 - 720) <= 3, `Origine ne recentre pas le guide : ${JSON.stringify(centered)}`);
  await page.keyboard.press("End");
  await page.waitForFunction(() => {
    const rect = document.querySelector("#getting-started-dialog")?.getBoundingClientRect();
    return rect && rect.right >= window.innerWidth - 14;
  });
  const docked = await dialogBounds(page);
  expect(docked.x + docked.width >= 1425, `Fin n’ancre pas le guide à droite : ${JSON.stringify(docked)}`);
  await page.keyboard.press("Escape");
  expect(await page.locator("#getting-started-dialog").getAttribute("open") === null, "Échap ne ferme pas le guide");
});

await page.setViewportSize({ width: 640, height: 700 });
await page.locator("#getting-started-open").click();
await page.waitForTimeout(100);
await check("le guide reste utilisable dans un viewport étroit", async () => {
  const guide = await dialogBounds(page);
  expect(guide.x >= -1 && guide.y >= -1, `Guide hors écran : ${JSON.stringify(guide)}`);
  expect(guide.x + guide.width <= 641 && guide.y + guide.height <= 701, `Guide déborde du viewport : ${JSON.stringify(guide)}`);
  const controls = await page.locator(".getting-started-controls").boundingBox();
  expect(controls && controls.y + controls.height <= 701, "Les contrôles du guide sont coupés");
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow <= 1, `Scroll horizontal global de ${overflow}px`);
});

await check("le viewport étroit conserve la hiérarchie de contexte", async () => {
  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  narrowMetrics.clientWidth = dimensions.clientWidth;
  narrowMetrics.scrollWidth = dimensions.scrollWidth;
  const visibleText = normalize(await page.locator(".studio-context").innerText());
  const folded = visibleText.toLocaleLowerCase("fr");
  for (const label of ["projet", "série", "épisode", "plan"]) {
    expect(folded.includes(label), `${label} disparaît en viewport étroit : ${visibleText}`);
  }
  for (const selector of [".context-project", ".context-series", ".context-episode", ".context-shot"]) {
    expect(await page.locator(selector).isVisible(), `${selector} n’est pas visible en viewport étroit`);
  }
  expect(await page.locator(".context-series button:visible").count() > 0, "La Série n’a plus de contrôle navigable en viewport étroit");
});

await check("chaque icône primaire étroite garde un nom accessible", async () => {
  const unnamed = await unnamedTopbarControls(page);
  expect(unnamed.length === 0, `Contrôles étroits sans nom : ${unnamed.join(", ")}`);
  const requiredNames = [
    ["[data-tool-action=assets]", /Assets|médias|media/i],
    ["#production-queue-toggle", /File|Queue|production/i],
    ["#notification-toggle", /Journal|Activity/i],
    ["#getting-started-open", /Guide|démarrage|started/i],
    ["#settings-toggle", /Réglages|Settings|moteurs|engines/i],
  ];
  for (const [selector, expected] of requiredNames) {
    const control = page.locator(selector);
    expect(await control.isVisible(), `${selector} n’est plus identifiable visuellement`);
    const snapshot = await control.ariaSnapshot();
    narrowMetrics.accessibleNames[selector] = snapshot.replace(/^\s*-\s*button\s*/, "").trim();
    expect(expected.test(snapshot), `${selector} a un nom accessible non sémantique : ${snapshot}`);
  }
});

await check("aucune erreur JavaScript n’est émise pendant le parcours", async () => {
  expect(consoleErrors.length === 0, consoleErrors.join(" | "));
});

await browser.close();
const failures = checks.filter((item) => item.status === "failed");
process.stdout.write(`\nViewport étroit : scrollWidth=${narrowMetrics.scrollWidth}px, clientWidth=${narrowMetrics.clientWidth}px\n`);
for (const [selector, name] of Object.entries(narrowMetrics.accessibleNames)) {
  process.stdout.write(`  ${selector}: ${name}\n`);
}
process.stdout.write(`\n${checks.length - failures.length}/${checks.length} exigences validées sur ${baseUrl}\n`);
if (failures.length) {
  process.stdout.write(`${failures.length} défaut(s) concret(s) détecté(s).\n`);
  process.exitCode = 1;
}
