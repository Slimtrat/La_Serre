import { createRequire } from "node:module";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const require = createRequire(new URL("../../frontend/package.json", import.meta.url));
const playwrightModule = process.env.PLAYWRIGHT_MODULE || "playwright";
const browserPath = process.env.PLAYWRIGHT_BROWSER_PATH
  || (process.platform === "win32" && fs.existsSync("C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe")
    ? "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"
    : undefined);
const { chromium } = require(playwrightModule);

const baseURL = process.env.SERRE_STUDIO_URL || "http://127.0.0.1:8000/";
const artifactDirectory = fileURLToPath(new URL("../../artifacts/", import.meta.url));
fs.mkdirSync(artifactDirectory, { recursive: true });

const browser = await chromium.launch({
  headless: true,
  ...(browserPath ? { executablePath: browserPath } : {}),
});
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));

function expect(condition, message) {
  if (!condition) throw new Error(message);
}

await page.goto(new URL("?gallery=components", baseURL).href, { waitUntil: "domcontentloaded" });
const gallery = page.locator("[data-component-gallery]");
await gallery.waitFor();

for (const state of ["normal", "loading", "disabled", "error", "stale", "empty"]) {
  expect(await gallery.locator(`[data-gallery-state="${state}"]`).count() > 0, `Missing gallery state: ${state}`);
}

const dialogTrigger = page.getByRole("button", { name: "Open dialog" });
await dialogTrigger.click();
await page.getByRole("dialog", { name: "Dialog example" }).waitFor();
await page.keyboard.press("Escape");
expect(await dialogTrigger.evaluate((element) => element === document.activeElement), "Dialog focus was not restored");

await page.screenshot({
  fullPage: true,
  path: `${artifactDirectory}/component-gallery-desktop.png`,
});
await page.setViewportSize({ width: 390, height: 844 });
await page.screenshot({
  fullPage: true,
  path: `${artifactDirectory}/component-gallery-narrow.png`,
});

expect(errors.length === 0, "Browser errors: " + errors.join(" | "));
console.log(JSON.stringify({ gallery: true, screenshots: ["desktop", "narrow"] }));
await browser.close();
