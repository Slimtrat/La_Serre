#!/usr/bin/env node

import { spawn } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(new URL("../../frontend/package.json", import.meta.url));
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const baseUrl = process.env.SERRE_STUDIO_URL;
const python = process.env.SERRE_E2E_PYTHON;
const outputDir = process.env.SERRE_E2E_OUTPUT_DIR;
const privateDir = process.env.SERRE_E2E_PRIVATE_DIR;
const ffmpeg = process.env.SERRE_E2E_FFMPEG || "ffmpeg";
const ffprobe = process.env.SERRE_E2E_FFPROBE || "ffprobe";
if (!baseUrl || !python || !outputDir || !privateDir) {
  throw new Error("Browser integration environment is incomplete");
}

const repository = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const artifacts = path.resolve(process.env.SERRE_E2E_ARTIFACT_DIR || path.join(repository, "artifacts/browser-integration"));
fs.mkdirSync(artifacts, { recursive: true });
const episodeId = "S01E001";
const requiredFiles = ["reel.mp4", "cover.png", "subtitles.srt", "caption.txt", "release.json"];
const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64");

function expect(condition, message) {
  if (!condition) throw new Error(message);
}

function sha256(file) {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

async function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd: repository, stdio: ["ignore", "pipe", "pipe"] });
    const output = [];
    const errors = [];
    child.stdout.on("data", (chunk) => output.push(chunk));
    child.stderr.on("data", (chunk) => errors.push(chunk));
    child.once("error", reject);
    child.once("exit", (code) => code === 0 ? resolve(Buffer.concat(output).toString("utf8")) : reject(new Error(`${command} exited with ${code}: ${Buffer.concat(errors).toString("utf8")}`)));
  });
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

function ensureEpisodeCatalog() {
  const episode = path.join(privateDir, "episodes", "season-01", episodeId, "episode.json");
  if (fs.existsSync(episode)) return;
  fs.cpSync(path.join(repository, "starter_catalog"), privateDir, { recursive: true, force: true });
}

async function api(pageContext, method, route, data, root = baseUrl) {
  const response = await pageContext.request.fetch(new URL(route, root).href, {
    method,
    ...(data === undefined ? {} : { data }),
  });
  if (!response.ok()) throw new Error(`${method} ${route}: ${response.status()} ${await response.text()}`);
  return response.json();
}

async function openRelease(page, root = baseUrl) {
  const url = new URL(`#/results?project=default&episode=${episodeId}`, root);
  await page.goto(url.href, { waitUntil: "domcontentloaded" });
  const candidate = page.locator("[data-release-candidate]");
  await candidate.waitFor({ state: "visible", timeout: 60_000 });
  return candidate;
}

async function mutateAndWait(page, action, pathname, state) {
  const completed = page.waitForResponse((response) =>
    response.request().method() === "POST" && new URL(response.url()).pathname === pathname,
  );
  await page.locator(`[data-release-action="${action}"]`).click();
  const response = await completed;
  expect(response.ok(), `${pathname} returned ${response.status()}: ${await response.text()}`);
  await page.locator(`[data-release-candidate][data-release-status="${state}"]`).waitFor();
}

async function assertDownloadablePack(pageContext, exported, root = baseUrl) {
  const names = exported.files.map((item) => item.filename).sort();
  expect(JSON.stringify(names) === JSON.stringify([...requiredFiles].sort()), `Unexpected release files: ${names.join(", ")}`);
  for (const item of exported.files) {
    expect(item.bytes > 0, `${item.filename} is recorded as empty`);
    const response = await pageContext.request.get(new URL(item.url, root).href);
    expect(response.ok(), `${item.filename} download returned ${response.status()}`);
    const body = await response.body();
    expect(body.length > 0, `${item.filename} download is empty`);
    expect(crypto.createHash("sha256").update(body).digest("hex") === item.sha256, `${item.filename} download hash differs from the manifest`);
  }
}

ensureEpisodeCatalog();
const browserPath = [
  process.env.PLAYWRIGHT_BROWSER_PATH,
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
].find((candidate) => candidate && fs.existsSync(candidate));
const browser = await chromium.launch({ headless: true, ...(browserPath ? { executablePath: browserPath } : {}) });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
await context.tracing.start({ screenshots: true, snapshots: true, sources: true });
const page = await context.newPage();
page.setDefaultTimeout(30_000);
const pageErrors = [];
page.on("pageerror", (error) => pageErrors.push(error.message));
await page.addInitScript(() => {
  localStorage.setItem("serre-studio-getting-started-seen", "1");
  localStorage.setItem("serre-studio-language", "en");
});

let restarted;
try {
  const canonical = await api(page, "GET", `api/episodes/${episodeId}`);
  const duration = Number(canonical.episode?.duration_target ?? canonical.duration_target);
  const shots = canonical.shots ?? [];
  expect(duration >= 30 && duration <= 60, `Release fixture needs a 30-60 second episode, got ${duration}`);
  expect(shots.length > 0, "Release fixture needs at least one shot");
  const shotId = shots[0].id;
  const episodeOutput = path.join(outputDir, episodeId);
  const master = path.join(episodeOutput, "episode.mp4");
  fs.mkdirSync(episodeOutput, { recursive: true });
  await run(ffmpeg, [
    "-hide_banner", "-loglevel", "error", "-y",
    "-f", "lavfi", "-i", `color=c=0x201126:s=576x1024:r=24:d=${duration}`,
    "-f", "lavfi", "-i", "anullsrc=r=48000:cl=stereo",
    "-t", String(duration), "-c:v", "libx264", "-preset", "ultrafast", "-crf", "51",
    "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "32k", "-shortest", master,
  ]);
  fs.writeFileSync(path.join(episodeOutput, "episode-generation.json"), JSON.stringify({ schema_version: 1, status: "FINAL", fixture_revision: 1 }));
  fs.writeFileSync(path.join(episodeOutput, "subtitles.fr.srt"), `1\n00:00:01,000 --> 00:00:03,000\nA secret wakes in the greenhouse.\n`);
  const shotOutput = path.join(outputDir, shotId);
  fs.mkdirSync(shotOutput, { recursive: true });
  fs.writeFileSync(path.join(shotOutput, "keyframe.png"), png);

  let candidate = await openRelease(page);
  expect(await candidate.getAttribute("data-release-status") === "missing", "Absent candidate is not presented as creatable");
  await mutateAndWait(page, "create", `/api/episodes/${episodeId}/release-candidate`, "draft");
  candidate = page.locator("[data-release-candidate]");
  expect(await candidate.locator("[data-release-technical-ready]").getAttribute("data-release-technical-ready") === "true", "Real ffprobe media was not technically ready");
  expect(await candidate.locator("[data-release-human-approved]").getAttribute("data-release-human-approved") === "false", "Technical readiness was mistaken for human approval");
  expect(await candidate.locator("[data-release-action=export]").isDisabled(), "Export must be gated before human approval");
  const disclaimer = await candidate.locator("[data-release-quality-disclaimer]").innerText();
  expect(/artistic quality/i.test(disclaimer), "The UI does not distinguish artistic judgement from technical validation");

  await mutateAndWait(page, "approve", `/api/episodes/${episodeId}/release-candidate/approve`, "approved");
  expect(await candidate.locator("[data-release-human-approved]").getAttribute("data-release-human-approved") === "true", "Explicit human approval was not reflected");
  await mutateAndWait(page, "export", `/api/episodes/${episodeId}/release-candidate/export`, "exported");
  let persisted = await api(page, "GET", `api/episodes/${episodeId}/release-candidate`);
  expect(persisted.state === "exported" && persisted.exports.length === 1, "Export state was not persisted by the backend");
  const firstExport = persisted.exports[0];
  await assertDownloadablePack(page, firstExport);
  const firstDirectory = firstExport.path;
  expect(fs.existsSync(firstDirectory), "The immutable pack directory does not exist");
  expect(JSON.stringify(fs.readdirSync(firstDirectory).sort()) === JSON.stringify([...requiredFiles].sort()), "Physical pack contents differ from the release contract");
  const firstHashes = Object.fromEntries(requiredFiles.map((name) => [name, sha256(path.join(firstDirectory, name))]));
  const exportedProbe = JSON.parse(await run(ffprobe, [
    "-v", "error", "-show_streams", "-show_format", "-of", "json",
    path.join(firstDirectory, "reel.mp4"),
  ]));
  const exportedVideo = exportedProbe.streams.find((stream) => stream.codec_type === "video");
  const exportedAudio = exportedProbe.streams.find((stream) => stream.codec_type === "audio");
  expect(exportedVideo?.width === 1080 && exportedVideo?.height === 1920, "Exported Reel does not probe as 1080x1920");
  expect(exportedVideo?.codec_name === "h264" && exportedAudio?.codec_name, "Exported Reel does not contain H.264 video and audio");
  expect(persisted.source.width === 576 && persisted.source.height === 1024, "Work master provenance did not retain 576x1024");
  expect(persisted.reel.width === 1080 && persisted.reel.height === 1920, "Rendered Reel was not probed at 1080x1920");
  expect(persisted.reel.video_codec === "h264" && persisted.reel.audio_codec, "Rendered Reel is missing H.264 video or audio");
  expect(persisted.render_profile.width === 1080 && persisted.render_profile.height === 1920, "Persisted render profile is not 1080x1920");
  expect(persisted.render_profile.safe_area.bottom > 0 && persisted.render_profile.safe_area.top > 0, "Safe-area metadata is absent");

  fs.writeFileSync(path.join(episodeOutput, "episode-generation.json"), JSON.stringify({ schema_version: 1, status: "FINAL", fixture_revision: 2 }));
  const restartPort = await freePort();
  const restartedUrl = `http://127.0.0.1:${restartPort}/`;
  const restartLog = fs.openSync(path.join(artifacts, "release-candidate-restart.log"), "w");
  restarted = spawn(python, ["-m", "uvicorn", "tools.browser_integration_server:app", "--host", "127.0.0.1", "--port", String(restartPort)], {
    cwd: repository,
    env: process.env,
    stdio: ["ignore", restartLog, restartLog],
  });
  await waitForHealth(restartedUrl, restarted);
  await openRelease(page, restartedUrl);
  candidate = page.locator("[data-release-candidate]");
  expect(await candidate.getAttribute("data-release-status") === "stale", "Changed source was not stale after backend restart");
  await candidate.locator("[data-release-stale]").waitFor();
  expect(await candidate.locator("[data-release-action=approve]").isDisabled(), "A stale candidate can be approved without refresh");
  expect(await candidate.locator("[data-release-action=export]").isDisabled(), "A stale candidate can be exported");
  expect(Object.entries(firstHashes).every(([name, digest]) => sha256(path.join(firstDirectory, name)) === digest), "A source change mutated the previous export");

  await mutateAndWait(page, "refresh", `/api/episodes/${episodeId}/release-candidate`, "draft");
  await mutateAndWait(page, "approve", `/api/episodes/${episodeId}/release-candidate/approve`, "approved");
  await mutateAndWait(page, "export", `/api/episodes/${episodeId}/release-candidate/export`, "exported");
  persisted = await api(page, "GET", `api/episodes/${episodeId}/release-candidate`, undefined, restartedUrl);
  expect(persisted.exports.length === 2, `Expected two immutable exports, got ${persisted.exports.length}`);
  expect(persisted.exports[0].id === firstExport.id && persisted.exports[1].id !== firstExport.id, "Later export overwrote or reused the first version");
  await assertDownloadablePack(page, persisted.exports[1], restartedUrl);
  expect(Object.entries(firstHashes).every(([name, digest]) => sha256(path.join(firstDirectory, name)) === digest), "Second export mutated the first pack");
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.locator('[data-release-candidate][data-release-status="exported"]').waitFor();
  expect(await page.locator("[data-release-download]").count() >= requiredFiles.length * 2, "Reload lost persisted downloadable export history");
  expect(pageErrors.length === 0, `JavaScript errors: ${pageErrors.join(" | ")}`);
  console.log("PASS release candidate: real 576x1024-to-1080x1920 render/ffprobe, explicit approval, immutable packs, stale invalidation, restart persistence and downloads");
} catch (error) {
  console.error("PAGE ERRORS", pageErrors.join(" | ") || "none");
  console.error("PAGE CONTENT", await page.locator("body").innerText());
  await page.screenshot({ path: path.join(artifacts, "episode-release-candidate-failure.png"), fullPage: true });
  throw error;
} finally {
  await stopProcess(restarted);
  await context.tracing.stop({ path: path.join(artifacts, "episode-release-candidate-trace.zip") });
  await browser.close();
}
