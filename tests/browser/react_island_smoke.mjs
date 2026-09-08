import { createRequire } from "node:module";
import fs from "node:fs";

const require = createRequire(new URL("../../frontend/package.json", import.meta.url));
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const browserPath = process.env.PLAYWRIGHT_BROWSER_PATH
  || (process.platform === "win32" && fs.existsSync("C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe")
    ? "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"
    : undefined);
const baseURL = process.env.SERRE_STUDIO_URL || "http://127.0.0.1:8000/";
const browser = await chromium.launch({
  headless: true,
  ...(browserPath ? { executablePath: browserPath } : {}),
});
const page = await browser.newPage({ viewport: { width: 1280, height: 760 } });
const errors = [];
page.setDefaultTimeout(10_000);
page.on("pageerror", (error) => errors.push(error.message));

function expect(condition, message) {
  if (!condition) throw new Error(message);
}

await page.goto(new URL("#/create", baseURL).href, { waitUntil: "domcontentloaded" });
await page.waitForSelector("[data-studio-shell]");
await page.waitForFunction(() =>
  document.querySelector("#studio-react-root")?.dataset.reactMounted === "true"
  && document.body.dataset.shellOwner === "react",
);

const root = page.locator("#studio-react-root");
expect(await root.count() === 1, "La page doit exposer une seule racine React");
expect(await root.getAttribute("data-react-mounted") === "true", "React n’est pas monté");
await page.waitForFunction(() =>
  document.querySelector("#studio-react-root")?.textContent?.includes("API connectée"),
);

const contextMarker = root.locator("[data-studio-kernel-context]");
await contextMarker.waitFor();
await page.evaluate(() => {
  window.dispatchEvent(new CustomEvent("studio:project-changed", {
    detail: { active_id: "smoke-project" },
  }));
  window.dispatchEvent(new CustomEvent("studio:episode-loaded", {
    detail: { episode: { id: "smoke-episode", series_id: "smoke-series" }, shots: [] },
  }));
});
await page.waitForFunction(() => {
  const marker = document.querySelector("[data-studio-kernel-context]");
  return marker?.dataset.projectId === "smoke-project"
    && marker?.dataset.episodeId === "smoke-episode";
});

const expected = [
  ["Créer", "#/create"],
  ["Produire", "#/produce"],
  ["Résultats", "#/results"],
];
expect(await page.locator("[data-primary-navigation] button").count() === 3, "Le shell doit exposer trois routes primaires");
for (const [label, hash] of expected) {
  await page.getByRole("button", { name: label, exact: true }).click();
  await page.waitForFunction((target) => location.hash.startsWith(target), hash);
}
expect(await page.locator(".topbar").isHidden(), "La topbar legacy doit être masquée");
expect(await page.locator("#studio-view-dock").isHidden(), "Le dock legacy doit être masqué");
expect(errors.length === 0, "Erreurs navigateur : " + errors.join(" | "));

console.log(JSON.stringify({
  reactMounted: true,
  apiConnected: true,
  kernelContext: true,
  primaryRoutes: expected.map(([, hash]) => hash),
}));
await browser.close();