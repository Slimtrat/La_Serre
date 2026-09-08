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

await page.evaluate(() => window.SerreWorkspace?.show("bible"));
await page.locator("#bible-workspace:not(.hidden)").waitFor();
await page.evaluate(() => window.SerreWorkspace?.show("graph"));
await page.locator(".graph-workbench").waitFor();

expect(errors.length === 0, "Erreurs navigateur : " + errors.join(" | "));
console.log(JSON.stringify({ reactMounted: true, legacyViews: ["bible", "graph"] }));
await browser.close();
