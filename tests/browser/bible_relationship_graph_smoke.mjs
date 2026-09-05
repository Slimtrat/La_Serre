#!/usr/bin/env node

import { createRequire } from "node:module";
import fs from "node:fs";

const require = createRequire(import.meta.url);
const baseUrl = process.env.SERRE_STUDIO_URL || process.argv[2] || "http://127.0.0.1:8765/";
const playwrightModule = process.env.PLAYWRIGHT_MODULE || "playwright";
const browserPath = process.env.PLAYWRIGHT_BROWSER_PATH
  || (process.platform === "win32" && fs.existsSync("C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe")
    ? "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"
    : undefined);
const { chromium } = require(playwrightModule);

function expect(value, message) { if (!value) throw new Error(message); }

const characters = [
  { id: "belladone", name: "Belladone", role: "Charmeuse imprudente" },
  { id: "aconit", name: "Aconit", role: "Gardienne jalouse" },
  { id: "graine-noire", name: "La Graine Noire", role: "Antagoniste miniature" },
].map((item) => ({
  ...item,
  visual_description: `Description visuelle canonique détaillée de ${item.name}`,
  wardrobe: `Silhouette botanique et tenue canonique détaillée de ${item.name}`,
  signature_details: ["silhouette signature"], palette: ["noir", "violet", "vert"],
  personality: { audace: .8, loyauté: .5, curiosité: .7 }, wants: ["obtenir la vérité"], fears: ["être oubliée"],
  voice_description: "Voix française expressive, précise et reconnaissable",
  generation_negative_prompt: "identity drift", visual_references: [], voice_references: [], canonical_prompt_id: null,
}));
const relationships = [
  { id: "belladone-vers-aconit", source: "belladone", target: "aconit", label: "Fascination provocatrice", summary: "Belladone transforme chaque avertissement en invitation.", desire: 88, trust: 32, anger: 12, fear: 18, attachment: 74, toxicity: 48 },
  { id: "aconit-vers-belladone", source: "aconit", target: "belladone", label: "Protection possessive", summary: "Aconit protège Belladone avec une jalousie soigneusement contenue.", desire: 71, trust: 61, anger: 28, fear: 67, attachment: 92, toxicity: 76 },
  { id: "graine-vers-belladone", source: "graine-noire", target: "belladone", label: "Emprise", summary: "La Graine veut prendre racine dans ses failles.", desire: 15, trust: -90, anger: 72, fear: 8, attachment: 86, toxicity: 96 },
];
let bible = {
  schema_version: 1, revision: 4, updated_at: new Date().toISOString(), title: "Bible test",
  characters, locations: [], relationships,
  art_direction: { summary: "Fantasy botanique", visual_style: [], palette: [], rendering_rules: [], banned_elements: [] },
  tone: { summary: "Dark romance joueuse", keywords: [], dialogue_rules: [], content_boundaries: [] },
  world_rules: [], narrative_arcs: [], secrets: [], references: [], prompts: [], changes: [],
};
const impact = { bible_revision: 4, changes: [], affected_episodes: [], affected_shots: [], artifact_count: 0, artifacts: [] };

const browser = await chromium.launch({ headless: true, ...(browserPath ? { executablePath: browserPath } : {}) });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
const errors = [];
let savedPayload = null;
page.setDefaultTimeout(10_000);
page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
page.on("console", (message) => { if (message.type() === "error") errors.push(`console: ${message.text()}`); });
await page.addInitScript(() => {
  localStorage.setItem("serre-studio-getting-started-v0.2.11", "seen");
  localStorage.setItem("serre-studio-language", "fr");
});
await page.route("**/api/bible", async (route) => {
  if (route.request().method() === "GET") await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(bible) });
  else await route.continue();
});
await page.route("**/api/bible/impact", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(impact) }));
await page.route("**/api/bible/relationships/*", async (route) => {
  if (route.request().method() !== "PUT") return route.continue();
  savedPayload = route.request().postDataJSON();
  bible = { ...bible, revision: bible.revision + 1, relationships: bible.relationships.map((item) => item.id === savedPayload.id ? savedPayload : item) };
  await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ bible, impact: { ...impact, bible_revision: bible.revision } }) });
});

try {
  await page.goto(new URL("?view=graph", baseUrl).href, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.SerreBible && window.SerreI18n);
  await page.locator('[data-context-action="bible"]').click();
  await page.locator('[data-bible-category="relationships"]').click();
  const graph = page.locator("#bible-relationship-graph");
  await graph.waitFor({ state: "visible" });

  expect(await graph.locator(".relationship-person-node").count() === 3, "Tous les personnages ne sont pas visibles");
  expect(await graph.locator(".relationship-edge-hit").count() === 3, "Tous les liens directionnels ne sont pas visibles");
  const reciprocal = await graph.locator('[data-relation-id="belladone-vers-aconit"] .relationship-edge-line, [data-relation-id="aconit-vers-belladone"] .relationship-edge-line').evaluateAll((items) => items.map((item) => item.getAttribute("d")));
  expect(reciprocal.length === 2 && reciprocal[0] !== reciprocal[1], "Les liens réciproques se superposent");

  const toxicEdge = graph.locator('[data-relation-id="graine-vers-belladone"] .relationship-edge-hit');
  await toxicEdge.hover({ force: true });
  const popover = graph.locator(".relationship-popover");
  await popover.waitFor({ state: "visible" });
  expect((await popover.innerText()).includes("96%"), "L’overlay ne montre pas la toxicité");
  await toxicEdge.click({ force: true });
  await page.locator(".relationship-direction-editor").waitFor({ state: "visible" });
  expect(await page.locator("#bible-json-advanced").getAttribute("open") === null, "Le JSON avancé est ouvert par défaut");
  expect(await page.locator("#bible-editor").isHidden(), "Le JSON est imposé dans le parcours normal");

  const toxicity = page.locator(".relationship-metric.metric-toxicity input");
  await toxicity.fill("99");
  await page.locator("#bible-save").click();
  await page.waitForFunction(() => document.querySelector("#bible-validation")?.textContent?.includes("enregistrée"));
  expect(savedPayload?.toxicity === 99, "Le formulaire guidé ne sauvegarde pas la toxicité");

  const belladone = graph.locator('[data-character-id="belladone"]');
  const before = await belladone.boundingBox();
  await belladone.dragTo(graph.locator(".relationship-graph-viewport"), { targetPosition: { x: 210, y: 210 } });
  const after = await belladone.boundingBox();
  expect(before && after && Math.hypot(after.x - before.x, after.y - before.y) > 20, "Les personnages ne sont pas déplaçables");

  expect(await page.locator("#studio-tools-menu-toggle").isVisible(), "Le menu Outils regroupé est absent");
  expect(await page.locator("#settings-toggle").isHidden(), "Les outils secondaires encombrent encore la top bar");
  await page.locator("#studio-tools-menu-toggle").click();
  expect(await page.locator("#settings-toggle").isVisible(), "Réglages n’est pas accessible dans le menu Outils");

  await page.setViewportSize({ width: 640, height: 700 });
  expect(await page.locator("#studio-tools-menu-toggle").isVisible(), "Le regroupement disparaît sur petit écran");
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow <= 1, `Débordement horizontal de ${overflow}px`);
  expect(errors.length === 0, errors.join(" | "));

  process.stdout.write("PASS graphe de relations directionnel et réciproque\n");
  process.stdout.write("PASS overlay de toxicité et édition guidée sans JSON\n");
  process.stdout.write("PASS drag-and-drop des personnages\n");
  process.stdout.write("PASS top bar regroupée à 1440 px et 640 px\n");
  process.stdout.write("PASS aucune erreur console\n");
} finally {
  await browser.close();
}
