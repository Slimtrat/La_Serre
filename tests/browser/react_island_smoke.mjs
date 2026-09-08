import { createRequire } from "node:module";
import fs from "node:fs";

const require = createRequire(new URL("../../frontend/package.json", import.meta.url));
const playwrightModule = process.env.PLAYWRIGHT_MODULE || "playwright";
const browserPath = process.env.PLAYWRIGHT_BROWSER_PATH
  || (process.platform === "win32" && fs.existsSync("C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe")
    ? "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"
    : undefined);
const { chromium } = require(playwrightModule);

const baseURL = process.env.SERRE_STUDIO_URL || "http://127.0.0.1:8000/";
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

await page.goto(new URL("?view=graph", baseURL).href, { waitUntil: "domcontentloaded" });
await page.waitForFunction(() => window.SerreWorkspace && document.querySelector("#studio-react-root")?.dataset.reactMounted === "true");
const root = page.locator("#studio-react-root");
await root.waitFor();
expect(await root.getAttribute("data-react-mounted") === "true", "L’îlot React n’est pas monté");
expect((await root.textContent()).includes("Interface React initialisée"), "Le composant témoin React est absent");

const contextMarker = root.locator("[data-studio-kernel-context]");
await contextMarker.waitFor();
await page.waitForFunction(() => {
  const marker = document.querySelector("[data-studio-kernel-context]");
  const project = window.SerreProjects?.current?.();
  const episode = window.SerreEpisode?.current?.();
  return marker?.dataset.projectId === (project?.active_id || "")
    && marker?.dataset.episodeId === (episode?.episode?.id || "");
});

await page.evaluate(() => {
  const marker = document.querySelector("[data-studio-kernel-context]");
  window.__kernelProjectUpdates = 0;
  new MutationObserver((records) => {
    window.__kernelProjectUpdates += records.length;
  }).observe(marker, { attributes: true, attributeFilter: ["data-project-id"] });
  window.dispatchEvent(new CustomEvent("studio:project-changed", {
    detail: { active_id: "smoke-project" },
  }));
});
await page.waitForFunction(() =>
  document.querySelector("[data-studio-kernel-context]")?.dataset.projectId === "smoke-project",
);
expect(
  await page.evaluate(() => window.__kernelProjectUpdates) === 1,
  "Le changement projet legacy a été appliqué plusieurs fois dans React",
);

await page.evaluate(() => {
  window.dispatchEvent(new CustomEvent("studio:episode-loaded", {
    detail: { episode: { id: "smoke-episode", series_id: "smoke-series" }, shots: [] },
  }));
});
await page.waitForFunction(() =>
  document.querySelector("[data-studio-kernel-context]")?.dataset.episodeId === "smoke-episode",
);

await page.evaluate(() => window.SerreWorkspace?.show("bible"));
await page.locator("#bible-workspace:not(.hidden)").waitFor();
await page.evaluate(() => window.SerreWorkspace?.show("graph"));
await page.locator(".graph-workbench").waitFor();

expect(errors.length === 0, "Erreurs navigateur : " + errors.join(" | "));
console.log(JSON.stringify({ reactMounted: true, kernelContext: true, legacyViews: ["bible", "graph"] }));
await browser.close();
