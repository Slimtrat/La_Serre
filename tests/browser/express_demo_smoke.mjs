import { createRequire } from "node:module";
import fs from "node:fs";

const require = createRequire(import.meta.url);
const playwrightModule = process.env.PLAYWRIGHT_MODULE || "playwright";
const browserPath = process.env.PLAYWRIGHT_BROWSER_PATH
  || (process.platform === "win32" && fs.existsSync("C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe")
    ? "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"
    : undefined);
const { chromium } = require(playwrightModule);

const baseURL = process.env.SERRE_BASE_URL || "http://127.0.0.1:8765";
const browser = await chromium.launch({
  headless: true,
  ...(browserPath ? { executablePath: browserPath } : {}),
});
const page = await browser.newPage({ viewport: { width: 1280, height: 760 } });
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));

function expect(condition, message) {
  if (!condition) throw new Error(message);
}

async function stageStatus(id, expected) {
  await page.waitForFunction(
    ({ stageId, status }) => window.SerreDemo?.state()?.stages?.find((item) => item.id === stageId)?.status === status,
    { stageId: id, status: expected },
  );
}

await page.goto(baseURL + "/?view=graph", { waitUntil: "networkidle" });
await page.evaluate(() => {
  localStorage.setItem("serre-studio-getting-started-v0.2.10", "seen");
});
await page.request.post(baseURL + "/api/demo/reset", { data: { locale: "fr", feedback: "" } });
await page.reload({ waitUntil: "networkidle" });

await page.locator("#studio-tools-menu-toggle").click();
await page.locator("#demo-production-open").click();
const dialog = page.locator("#demo-production-dialog");
await dialog.waitFor({ state: "visible" });
await page.waitForFunction(() => window.SerreDemo?.state()?.stages?.length === 5);
expect(await dialog.locator(".demo-chain-step").count() === 5, "La chaîne de démo n’affiche pas cinq étapes");
expect(await dialog.locator(".demo-chain-step [data-demo-imagine]").count() === 5, "Chaque case doit proposer l’imagination IA");
expect(await dialog.locator("[data-demo-imagine]").count() === 6, "L’étape inspectée doit répéter l’action principale");
expect(await dialog.locator('[data-demo-imagine="story"]:not(:disabled)').count() === 2, "L’histoire devrait être la seule étape ouverte");
expect(await dialog.locator('[data-demo-imagine="plan"]:not(:disabled)').count() === 0, "Le plan ne doit pas devancer la validation de l’histoire");

await dialog.locator("#demo-story-input").fill("Belladone dérobe à Aconit une graine qui connaît leurs mensonges");
await dialog.locator('.demo-inspector [data-demo-imagine="story"]').click();
await stageStatus("story", "generated");
expect(await page.locator("#activity-overlay").isVisible(), "La barre d’activité ne s’est pas ouverte");
expect((await page.locator("#activity-segments i").count()) === 5, "La barre d’activité ne montre pas les cinq maillons");
expect((await page.locator("#activity-state").textContent()).includes("Validation requise"), "L’activité n’indique pas la validation humaine");
await dialog.locator('[data-demo-approve="story"]').click();
await stageStatus("story", "approved");
expect(await dialog.locator('.demo-chain-step[data-demo-select="plan"] .demo-step-imagine').isEnabled(), "Le découpage n’a pas été déverrouillé");

await dialog.locator('.demo-inspector [data-demo-imagine="plan"]').click();
await stageStatus("plan", "generated");
expect(await dialog.locator(".demo-beats article").count() === 3, "Le découpage ne contient pas trois temps");
await dialog.locator('[data-demo-reject="plan"]').click();
await stageStatus("plan", "rejected");
expect(await dialog.locator('.demo-chain-step[data-demo-select="frames"]').getAttribute("class").then((value) => value.includes("locked")), "Le refus du plan n’a pas reverrouillé les images");
await dialog.locator('.demo-inspector [data-demo-imagine="plan"]').click();
await stageStatus("plan", "generated");
await dialog.locator('[data-demo-approve="plan"]').click();
await stageStatus("plan", "approved");

await dialog.locator('.demo-inspector [data-demo-imagine="frames"]').click();
await stageStatus("frames", "generated");
expect(await dialog.locator(".demo-frames img").count() === 3, "Les trois images économiques ne sont pas affichées");
await page.waitForFunction(() => [...document.querySelectorAll(".demo-frames img")].every((image) => image.complete && image.naturalWidth === 480));
await dialog.locator('[data-demo-approve="frames"]').click();
await stageStatus("frames", "approved");

await dialog.locator('.demo-inspector [data-demo-imagine="sound"]').click();
await stageStatus("sound", "generated");
expect(await dialog.locator(".demo-audio audio").count() === 1, "L’ambiance audio n’est pas contrôlable");
await dialog.locator('[data-demo-approve="sound"]').click();
await stageStatus("sound", "approved");

await dialog.locator('.demo-inspector [data-demo-imagine="video"]').click();
await stageStatus("video", "generated");
const video = dialog.locator(".demo-video video");
expect(await video.count() === 1, "La mini-vidéo n’est pas affichée");
const response = await page.request.get(new URL(await video.getAttribute("src"), baseURL).href);
expect(response.ok(), "Le média vidéo n’est pas servi");
expect((await response.body()).length > 10_000, "La mini-vidéo servie est vide");
await dialog.locator('[data-demo-approve="video"]').click();
await page.waitForFunction(() => window.SerreDemo?.state()?.complete === true);
expect(await dialog.locator("[data-demo-progress-value]").getAttribute("style").then((value) => value.includes("100%")), "La progression finale n’atteint pas 100 %");
expect((await page.locator("#activity-numbers").textContent()).includes("100 %"), "La barre d’activité n’atteint pas 100 %");

const before = await dialog.boundingBox();
const handle = dialog.locator("[data-demo-drag]");
const box = await handle.boundingBox();
await page.mouse.move(box.x + 100, box.y + 20);
await page.mouse.down();
await page.mouse.move(box.x + 140, box.y + 45, { steps: 4 });
await page.mouse.up();
const after = await dialog.boundingBox();
expect(Math.abs(after.x - before.x) > 10, "La fenêtre de démo n’est pas déplaçable");
expect(errors.length === 0, "Erreurs navigateur : " + errors.join(" | "));

console.log(JSON.stringify({ stages: 5, frames: 3, progress: 100, videoBytes: (await response.body()).length }));
await browser.close();
