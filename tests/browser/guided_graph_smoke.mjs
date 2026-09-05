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

function expect(value, message) {
  if (!value) throw new Error(message);
}

const browser = await chromium.launch({
  headless: true,
  ...(browserPath ? { executablePath: browserPath } : {}),
});
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
const pageErrors = [];
page.setDefaultTimeout(10_000);
page.on("pageerror", (error) => pageErrors.push(error.message));
await page.addInitScript(() => {
  localStorage.setItem("serre-studio-getting-started-seen", "1");
  localStorage.setItem("serre-studio-language", "fr");
  localStorage.setItem("serre-studio-workspace-view", "guided");
});

try {
  await page.goto(new URL("?view=guided", baseUrl).href, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => (
    window.SerreGuided && window.SerreGraph && window.SerreWorkflowTemplates && window.SerreWorkspace
  ));

  await page.evaluate(async () => {
    await window.SerreGuided.load();
    window.SerreGuided.goTo(4);
    await window.SerreWorkflowTemplates.load(true);
  });
  await page.waitForFunction(() => (
    document.querySelectorAll("#guided-template-catalogue .workflow-template-node").length === 4
  ));
  const productionTemplates = await page.locator(
    "#guided-template-catalogue .workflow-template-node",
  ).evaluateAll((nodes) => nodes.map((node) => node.dataset.templateId));
  expect(new Set(productionTemplates).size === 4, "Le catalogue Production doit montrer quatre templates distincts");

  await page.evaluate(async () => {
    window.SerreWorkspace.show("graph");
    await window.SerreGraph.load("series", "series", { fit: true });
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  });
  const expectedJourney = [
    "journey:idea",
    "journey:universe",
    "journey:episode",
    "journey:storyboard",
    "journey:production",
    "journey:result",
  ];
  await page.waitForFunction((ids) => ids.every((id) => (
    document.querySelector(`.graph-node[data-node-id="${id}"]`)
  )), expectedJourney);
  const journeyIds = await page.locator('.graph-node[data-node-id^="journey:"]').evaluateAll(
    (nodes) => nodes.map((node) => node.dataset.nodeId),
  );
  expect(journeyIds.length === 6, `Le graphe doit afficher 6 nœuds journey, reçu ${journeyIds.length}`);
  expect(expectedJourney.every((id) => journeyIds.includes(id)), "Le parcours journey du graphe est incomplet");

  await page.evaluate(() => window.dispatchEvent(new CustomEvent("studio:guided-autopilot-stage", {
    detail: {
      run_id: "smoke-guided-graph",
      stage_id: "storyboard",
      label: "Storyboard",
      status: "running",
      summary: "Découpage en cours",
    },
  })));
  await page.waitForFunction(() => !document.querySelector("#graph-world").classList.contains("camera-follow"));
  const storyboardState = await page.evaluate(() => {
    const viewport = document.querySelector("#graph-viewport");
    const node = document.querySelector('.graph-node[data-node-id="journey:storyboard"]');
    const viewportRect = viewport.getBoundingClientRect();
    const nodeRect = node.getBoundingClientRect();
    return {
      selected: node.classList.contains("selected"),
      runtimeState: node.dataset.runtimeState,
      horizontalDelta: Math.abs(
        nodeRect.left + nodeRect.width / 2 - (viewportRect.left + viewportRect.width / 2),
      ),
      verticalDelta: Math.abs(
        nodeRect.top + nodeRect.height / 2 - (viewportRect.top + viewportRect.height / 2),
      ),
    };
  });
  expect(storyboardState.selected, "L’événement running ne sélectionne pas journey:storyboard");
  expect(storyboardState.runtimeState === "active", "Le storyboard sélectionné n’est pas marqué actif");
  expect(
    storyboardState.horizontalDelta <= 3 && storyboardState.verticalDelta <= 3,
    `journey:storyboard n’est pas centré (${storyboardState.horizontalDelta}, ${storyboardState.verticalDelta})`,
  );
  expect(pageErrors.length === 0, `Erreur JavaScript : ${pageErrors.join(" | ")}`);
  console.log("PASS guided graph: 6 journey nodes, 4 production templates, storyboard running centered");
} finally {
  await browser.close();
}
