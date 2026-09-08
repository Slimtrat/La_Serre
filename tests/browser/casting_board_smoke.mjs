#!/usr/bin/env node
import { createRequire } from "node:module";
import fs from "node:fs";

const require = createRequire(new URL("../../frontend/package.json", import.meta.url));
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const executablePath = process.env.PLAYWRIGHT_BROWSER_PATH
  || (process.platform === "win32" && fs.existsSync("C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe")
    ? "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" : undefined);
const baseURL = process.env.SERRE_STUDIO_URL || "http://127.0.0.1:8000/";
const browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) });
const page = await browser.newPage({ viewport: { width: 1280, height: 850 } });
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
page.setDefaultTimeout(10_000);
const json = (route, body) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) });
const stages = ["idea", "casting", "relationships", "season", "episode", "storyboard", "production", "release"].map((id) => ({
  id, status: id === "idea" ? "completed" : id === "casting" ? "ready" : "empty", count: id === "casting" ? 1 : 0,
  blockers: [], primary_action: { code: "EDIT", label: "Continue", target: "#/create", mode: "manual" },
}));
const character = { id: "iris", name: "Iris", role: "Witness", promoted_revision: 1 };
const guided = { state: { revision: 2, active_episode_id: null, brief: { working_title: "Casting smoke", idea: "A visual identity test", genre: "Drama", tone: "Quiet", audience: "Adult", episode_title: "One", episode_concept: "A visual choice", locked_fields: [] }, characters: [character] }, completion: {}, proposals: [] };
let revision = 4;
let activeMaster = "visual-11111111111111111111111111111111";
const variants = [
  ["visual-11111111111111111111111111111111", "portrait", "approved", "artist.png", null],
  ["visual-22222222222222222222222222222222", "full_body", "candidate", "ComfyUI", "sdxl"],
  ["visual-33333333333333333333333333333333", "portrait", "candidate", "artist-b.png", null],
  ["visual-44444444444444444444444444444444", "expression", "candidate", "ComfyUI", "sdxl"],
].map(([id, kind, status, source, model]) => ({
  id, character_id: "iris", kind, status,
  media_url: `/api/casting/iris/variants/${id}/content`,
  permanent_identity: "Silver hair and angular adult face",
  outfit: kind === "full_body" ? "Long charcoal coat" : "",
  transient_state: kind === "expression" ? "Suspicious expression" : "",
  provenance: { source: model ? "generated" : "imported", source_label: source, model, workflow: model ? "casting-v1" : null, seed: model ? 42 : null, license: "artist-owned", revision: "r1" },
}));
const board = () => ({ revision, updated_at: new Date().toISOString(), characters: [{ character_id: "iris", active_master_id: activeMaster, variants }] });

await page.route("**/api/studio/journey", (route) => json(route, { project_id: "test", active_episode_id: null, revision: "r1", counts: {}, stale_artifacts: [], stages }));
await page.route("**/api/guided", (route) => json(route, guided));
await page.route("**/api/casting", (route) => json(route, board()));
await page.route("**/api/casting/iris/variants/*/content", (route) => route.fulfill({ status: 200, contentType: "image/svg+xml", body: '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="300"><rect width="100%" height="100%" fill="#665577"/></svg>' }));
await page.route("**/api/casting/iris/variants/*/approve", async (route) => {
  const id = route.request().url().split("/").at(-2);
  activeMaster = id;
  const selected = variants.find((item) => item.id === id);
  if (selected) selected.status = "approved";
  revision += 1;
  await json(route, { board: board(), affected: { shot_ids: ["S01E001-S01"], rendered_shot_ids: [] }, regeneration_started: false });
});
await page.route("**/api/projects", (route) => json(route, { active_id: "test", projects: [{ id: "test", name: "Test", active: true }] }));
await page.route("**/api/health", (route) => json(route, { status: "ok" }));

try {
  await page.goto(new URL("#/create", baseURL).href, { waitUntil: "domcontentloaded" });
  await page.locator("[data-casting-board]").waitFor();
  if (await page.locator("[data-casting-board] article").count() !== 4) throw new Error("Four visual candidates were not rendered");
  const compare = page.getByRole("button", { name: "Comparer" });
  await compare.nth(0).click();
  await compare.nth(1).click();
  if (await page.locator('[data-casting-board] button[aria-pressed="true"]').count() !== 2) throw new Error("Comparison selection failed");
  await page.getByRole("button", { name: "Approuver comme maître" }).first().click();
  await page.getByText("Aucune régénération lancée", { exact: false }).waitFor();
  if (errors.length) throw new Error(errors.join("\n"));
  console.log("Casting board smoke: 4 candidates, comparison and explicit approval validated.");
} finally {
  await browser.close();
}
