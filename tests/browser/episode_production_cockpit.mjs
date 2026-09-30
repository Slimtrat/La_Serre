#!/usr/bin/env node

import { spawn } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import net from "node:net";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(new URL("../../frontend/package.json", import.meta.url));
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const baseUrl = process.env.SERRE_STUDIO_URL;
const python = process.env.SERRE_E2E_PYTHON;
const outputDir = process.env.SERRE_E2E_OUTPUT_DIR;
if (!baseUrl || !python || !outputDir) throw new Error("Browser integration environment is incomplete");

const repository = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const artifacts = path.resolve(process.env.SERRE_E2E_ARTIFACT_DIR || path.join(repository, "artifacts/browser-integration"));
fs.mkdirSync(artifacts, { recursive: true });
const episodeId = "S01E001";
const expectedShotCount = 6;
const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64");
const mp4 = Buffer.concat([Buffer.from("00000018667479706d703432", "hex"), Buffer.from("mock-comfy-video")]);

function expect(condition, message) {
  if (!condition) throw new Error(message);
}

async function readBody(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  return Buffer.concat(chunks);
}

async function startFakeComfy() {
  const jobs = new Map();
  let sequence = 0;
  let injectedFailure = false;
  const server = http.createServer(async (request, response) => {
    const url = new URL(request.url || "/", "http://127.0.0.1:9");
    const json = (status, payload) => {
      response.writeHead(status, { "content-type": "application/json" });
      response.end(JSON.stringify(payload));
    };
    if (request.method === "GET" && url.pathname === "/system_stats") return json(200, { system: "browser-fake" });
    if (request.method === "GET" && url.pathname === "/object_info") return json(200, {});
    if (request.method === "GET" && url.pathname.startsWith("/models/")) return json(200, []);
    if (request.method === "GET" && url.pathname === "/queue") return json(200, { queue_running: [], queue_pending: [] });
    if (request.method === "POST" && url.pathname === "/upload/image") {
      await readBody(request);
      return json(200, { name: `uploaded-${++sequence}.png`, subfolder: "", type: "input" });
    }
    if (request.method === "POST" && url.pathname === "/prompt") {
      const payload = JSON.parse((await readBody(request)).toString("utf8"));
      const workflow = payload.prompt || {};
      const saveEntry = Object.entries(workflow).find(([, node]) => ["SaveImage", "SaveVideo"].includes(node?.class_type));
      if (!saveEntry) return json(400, { error: "No supported output node" });
      const [nodeId, node] = saveEntry;
      const isVideo = node.class_type === "SaveVideo";
      const prefix = String(node.inputs?.filename_prefix || "unknown");
      const shouldFail = !isVideo && prefix.includes(`${episodeId}-S02`) && !injectedFailure;
      injectedFailure ||= shouldFail;
      const promptId = `browser-prompt-${++sequence}`;
      jobs.set(promptId, { nodeId, isVideo, failed: shouldFail });
      return json(200, { prompt_id: promptId, number: sequence, node_errors: {} });
    }
    if (request.method === "GET" && url.pathname.startsWith("/history/")) {
      const promptId = decodeURIComponent(url.pathname.slice("/history/".length));
      const job = jobs.get(promptId);
      if (!job) return json(200, {});
      if (job.failed) {
        return json(200, { [promptId]: { status: { status_str: "error", completed: true, messages: [["execution_error", { exception_message: "Injected recoverable engine failure" }]] }, outputs: {} } });
      }
      const kind = job.isVideo ? "videos" : "images";
      const filename = `${promptId}.${job.isVideo ? "mp4" : "png"}`;
      return json(200, { [promptId]: { status: { status_str: "success", completed: true, messages: [] }, outputs: { [job.nodeId]: { [kind]: [{ filename, subfolder: "", type: "output" }] } } } });
    }
    if (request.method === "GET" && url.pathname === "/view") {
      const isVideo = String(url.searchParams.get("filename")).endsWith(".mp4");
      response.writeHead(200, { "content-type": isVideo ? "video/mp4" : "image/png" });
      return response.end(isVideo ? mp4 : png);
    }
    json(404, { error: `${request.method} ${url.pathname}` });
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(9, "127.0.0.1", resolve);
  });
  return { server, didInjectFailure: () => injectedFailure };
}

async function freePort() {
  const listener = net.createServer();
  await new Promise((resolve, reject) => {
    listener.once("error", reject);
    listener.listen(0, "127.0.0.1", resolve);
  });
  const address = listener.address();
  expect(address && typeof address === "object", "Could not allocate a restart port");
  const port = address.port;
  await new Promise((resolve) => listener.close(resolve));
  return port;
}

async function waitForHealth(url, process) {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    if (process.exitCode !== null) throw new Error(`Restarted FastAPI exited with ${process.exitCode}`);
    try {
      if ((await fetch(new URL("health", url))).ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw new Error("Restarted FastAPI did not become healthy");
}

async function stopProcess(process) {
  if (!process || process.exitCode !== null) return;
  process.kill();
  await Promise.race([
    new Promise((resolve) => process.once("exit", resolve)),
    new Promise((resolve) => setTimeout(resolve, 5_000)),
  ]);
}

const browserPath = [
  process.env.PLAYWRIGHT_BROWSER_PATH,
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
].find((candidate) => candidate && fs.existsSync(candidate));
const fakeComfy = await startFakeComfy();
const browser = await chromium.launch({ headless: true, ...(browserPath ? { executablePath: browserPath } : {}) });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
await context.tracing.start({ screenshots: true, snapshots: true, sources: true });
const page = await context.newPage();
page.setDefaultTimeout(20_000);
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
await page.addInitScript(() => {
  localStorage.setItem("serre-studio-getting-started-seen", "1");
  localStorage.setItem("serre-studio-language", "en");
  localStorage.setItem("serre-studio-workspace-view", "guided");
});

async function api(pageContext, method, route, data, root = baseUrl) {
  const response = await pageContext.request.fetch(new URL(route, root).href, {
    method,
    ...(data === undefined ? {} : { data }),
  });
  if (!response.ok()) throw new Error(`${method} ${route}: ${response.status()} ${await response.text()}`);
  return response.json();
}

async function waitForQueue(pageContext, root = baseUrl) {
  const deadline = Date.now() + 90_000;
  while (Date.now() < deadline) {
    const queue = await api(pageContext, "GET", "api/production-queue", undefined, root);
    const active = queue.items.filter((item) => ["queued", "running"].includes(item.status));
    if (active.length === 0) return queue;
    await pageContext.waitForTimeout(200);
  }
  throw new Error("Production queue did not become idle");
}

async function clickAndWaitForMutation(locator, pathname) {
  const completed = page.waitForResponse((response) =>
    response.request().method() === "POST" && new URL(response.url()).pathname === pathname,
  );
  await locator.click();
  const response = await completed;
  expect(response.ok(), `${pathname} returned ${response.status()}: ${await response.text()}`);
}

async function openCockpit(root = baseUrl) {
  await page.goto(new URL("?view=guided", root).href, { waitUntil: "domcontentloaded" });
  const manualEntry = page.getByRole("button", { name: /Continue without engines|Continuer sans moteurs/ });
  await page.locator("[data-guided-journey]").or(manualEntry).first().waitFor({ state: "visible", timeout: 60_000 });
  if (await manualEntry.isVisible()) await manualEntry.click();
  await page.locator("[data-guided-journey]").waitFor();
  await page.getByRole("navigation", { name: /Creation journey|Parcours de création/ }).getByRole("button", { name: /Production/ }).click();
  const cockpit = page.locator("[data-production-cockpit]");
  await cockpit.waitFor();
  expect(await cockpit.locator("[data-shot-id]").count() === expectedShotCount, "Cockpit did not render the six canonical shots");
}

function approvalSnapshot() {
  const result = new Map();
  for (let index = 1; index <= expectedShotCount; index += 1) {
    const shotId = `${episodeId}-S${String(index).padStart(2, "0")}`;
    const approvalPath = path.join(outputDir, shotId, "keyframe-approval.json");
    if (fs.existsSync(approvalPath)) result.set(shotId, crypto.createHash("sha256").update(fs.readFileSync(approvalPath)).digest("hex"));
  }
  return result;
}

let restarted;
try {
  const canonical = await api(page, "GET", `api/episodes/${episodeId}`);
  expect(canonical.shots.length === expectedShotCount, "Cockpit scenario requires the preceding six-shot authoring scenario");
  await openCockpit();

  await clickAndWaitForMutation(
    page.locator('[data-production-action="produce-missing"]'),
    "/api/production-queue/batch/missing",
  );
  let queue = await waitForQueue(page);
  expect(fakeComfy.didInjectFailure(), "The fake external engine did not inject its recoverable failure");
  expect(queue.items.filter((item) => item.status === "failed").length === 1, "Exactly one shot should fail independently");
  expect(queue.items.filter((item) => item.status === "awaiting_approval").length === expectedShotCount - 1, "Other keyframes did not reach approval");

  await page.reload({ waitUntil: "domcontentloaded" });
  await openCockpit();
  const approvalButtons = page.locator('[data-production-action="approve"]');
  while ((await approvalButtons.count()) > 0) {
    const before = await approvalButtons.count();
    const card = approvalButtons.first().locator("xpath=ancestor::*[@data-shot-id][1]");
    const shotId = await card.getAttribute("data-shot-id");
    await clickAndWaitForMutation(approvalButtons.first(), `/api/production-queue/shots/${shotId}/approve`);
    await page.waitForFunction(
      ([selector, previous]) => document.querySelectorAll(selector).length < previous,
      ['[data-production-action="approve"]', before],
    );
  }
  const approvedBeforeRetry = approvalSnapshot();
  expect(approvedBeforeRetry.size === expectedShotCount - 1, "Successful shots were not physically approved");

  const retryButton = page.locator('[data-production-action="retry"]');
  const retryCard = retryButton.locator("xpath=ancestor::*[@data-shot-id][1]");
  const failedShotId = await retryCard.getAttribute("data-shot-id");
  const failedItem = queue.items.find((item) => item.shot_id === failedShotId && item.status === "failed");
  expect(failedItem, "Failed queue item was not exposed for retry");
  await clickAndWaitForMutation(retryButton, `/api/production-queue/items/${failedItem.id}/retry`);
  queue = await waitForQueue(page);
  expect(queue.items.filter((item) => item.status === "failed").length === 0, "Independent retry did not recover the failed shot");
  for (const [shotId, digest] of approvedBeforeRetry) {
    expect(approvalSnapshot().get(shotId) === digest, `Retry changed approval for ${shotId}`);
  }

  await page.reload({ waitUntil: "domcontentloaded" });
  await openCockpit();
  const recoveredApproval = page.locator('[data-production-action="approve"]');
  const recoveredCard = recoveredApproval.locator("xpath=ancestor::*[@data-shot-id][1]");
  const recoveredShotId = await recoveredCard.getAttribute("data-shot-id");
  await clickAndWaitForMutation(recoveredApproval, `/api/production-queue/shots/${recoveredShotId}/approve`);
  expect(approvalSnapshot().size === expectedShotCount, "Recovered keyframe approval was not persisted");
  await clickAndWaitForMutation(
    page.locator('[data-production-action="produce-missing"]'),
    "/api/production-queue/batch/missing",
  );
  queue = await waitForQueue(page);
  expect(queue.items.every((item) => !["failed", "queued", "running"].includes(item.status)), "Video production did not finish cleanly");

  await page.reload({ waitUntil: "domcontentloaded" });
  await openCockpit();
  const readiness = page.locator("[data-production-readiness]");
  await readiness.waitFor();
  expect(await readiness.getAttribute("data-assemblable") === "true", "Episode is not reported as assemblable");
  expect(await page.locator('[data-production-action="assemble"]:not([disabled])').count() === 1, "Assembly action is not enabled");
  for (let index = 1; index <= expectedShotCount; index += 1) {
    const shotId = `${episodeId}-S${String(index).padStart(2, "0")}`;
    for (const name of ["keyframe.png", "clip.mp4", "generation.json", "keyframe-approval.json"]) {
      const artifactPath = path.join(outputDir, shotId, name);
      expect(fs.existsSync(artifactPath) && fs.statSync(artifactPath).size > 0, `Missing physical artifact ${shotId}/${name}`);
    }
  }

  const port = await freePort();
  const restartedUrl = `http://127.0.0.1:${port}/`;
  const restartLog = fs.openSync(path.join(artifacts, "production-cockpit-restart.log"), "w");
  restarted = spawn(python, ["-m", "uvicorn", "tools.browser_integration_server:app", "--host", "127.0.0.1", "--port", String(port)], {
    cwd: repository,
    env: process.env,
    stdio: ["ignore", restartLog, restartLog],
  });
  await waitForHealth(restartedUrl, restarted);
  await openCockpit(restartedUrl);
  expect(await page.locator("[data-production-readiness]").getAttribute("data-assemblable") === "true", "Assemblable state was lost after backend restart");
  const restartedQueue = await api(page, "GET", "api/production-queue", undefined, restartedUrl);
  expect(restartedQueue.items.length === queue.items.length, "Persistent queue history changed after backend restart");
  expect(errors.length === 0, `JavaScript errors: ${errors.join(" | ")}`);
  console.log(`PASS production cockpit: ${expectedShotCount} shots, isolated retry, approvals, physical media, readiness and backend restart`);
} catch (error) {
  console.error("PAGE ERRORS", errors.join(" | ") || "none");
  console.error("PAGE CONTENT", await page.locator("body").innerText());
  await page.screenshot({ path: path.join(artifacts, "episode-production-cockpit-failure.png"), fullPage: true });
  throw error;
} finally {
  await stopProcess(restarted);
  await context.tracing.stop({ path: path.join(artifacts, "episode-production-cockpit-trace.zip") });
  await browser.close();
  await new Promise((resolve) => fakeComfy.server.close(resolve));
}
