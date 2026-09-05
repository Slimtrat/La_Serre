import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const edge = process.env.EDGE_PATH || "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const baseURL = process.env.SERRE_BASE_URL || "http://127.0.0.1:8765";
const port = 9333;
const profile = fs.mkdtempSync(path.join(os.tmpdir(), "serre-view-dock-"));
const browser = spawn(edge, [
  "--headless=new",
  "--disable-gpu",
  "--no-first-run",
  `--remote-debugging-port=${port}`,
  `--user-data-dir=${profile}`,
  "--window-size=1280,760",
  `${baseURL}/?view=graph`,
], { stdio: "ignore" });

const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
let socket;
try {
  let target;
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const targets = await fetch(`http://127.0.0.1:${port}/json/list`).then((response) => response.json());
      target = targets.find((item) => item.type === "page" && item.url.startsWith(baseURL));
      if (target) break;
    } catch (_error) { /* Edge is still starting. */ }
    await sleep(250);
  }
  if (!target) throw new Error("Edge did not expose the Studio test tab");

  socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", reject, { once: true });
  });
  let sequence = 0;
  const pending = new Map();
  socket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    const handler = pending.get(message.id);
    if (!handler) return;
    pending.delete(message.id);
    if (message.error) handler.reject(new Error(message.error.message));
    else handler.resolve(message.result);
  });
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++sequence;
    pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });
  const evaluate = async (expression) => {
    const result = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
    return result.result.value;
  };

  await send("Runtime.enable");
  await send("Page.enable");
  for (let attempt = 0; attempt < 40; attempt += 1) {
    if (await evaluate("document.readyState === 'complete' && Boolean(window.SerreWorkspace)")) break;
    await sleep(100);
  }
  const closed = await evaluate(`(() => {
    const dock = document.querySelector('#studio-view-dock');
    return { left: dock.getBoundingClientRect().left, buttons: dock.querySelectorAll('[data-workspace-target]').length };
  })()`);
  if (closed.buttons !== 5 || closed.left > -100) throw new Error(`Unexpected closed dock: ${JSON.stringify(closed)}`);

  await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: 1, y: 380 });
  await sleep(350);
  const opened = await evaluate(`(() => {
    const dock = document.querySelector('#studio-view-dock');
    const plan = dock.querySelector('[data-workspace-target="plan"]');
    plan.click();
    const planView = document.body.dataset.workspaceView;
    dock.querySelector('[data-workspace-target="graph"]').click();
    return { left: dock.getBoundingClientRect().left, planView, finalView: document.body.dataset.workspaceView };
  })()`);
  if (opened.left < -2 || opened.planView !== "plan" || opened.finalView !== "graph") {
    throw new Error(`Dock interaction failed: ${JSON.stringify(opened)}`);
  }
  await evaluate(`fetch('/api/demo/reset', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ locale: 'fr', feedback: '' }),
  }).then(() => window.SerreDemo.open())`);
  const demoInitial = await evaluate(`(() => ({
    action: document.querySelector('.demo-inspector [data-demo-imagine="story"]').textContent,
    modelInstallVisible: !document.querySelector('[data-demo-install-model]').classList.contains('hidden'),
  }))()`);
  if (!demoInitial.action.includes("exemple local") || !demoInitial.modelInstallVisible) {
    throw new Error(`Demo engine labels are misleading: ${JSON.stringify(demoInitial)}`);
  }
  await evaluate(`(() => {
    const input = document.querySelector('#demo-story-input');
    input.value = 'Belladone dérobe la graine noire à Aconit.';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    document.querySelector('.demo-inspector [data-demo-imagine="story"]').click();
  })()`);
  for (let attempt = 0; attempt < 60; attempt += 1) {
    if (await evaluate("window.SerreDemo.state()?.stages?.[0]?.status === 'generated'")) break;
    await sleep(100);
  }
  const provenance = await evaluate("document.querySelector('.demo-provenance strong')?.textContent || ''");
  if (!provenance.includes("SANS IA")) throw new Error(`Missing preview provenance: ${provenance}`);
  await evaluate("window.SerreDemo.close(); window.SerreNarrativeWorkflow.open('episode')");
  await sleep(300);
  const fieldAssistant = await evaluate(`(() => ({
    buttons: document.querySelectorAll('.narrative-workflow-dialog .ai-field-trigger').length,
    title: document.querySelector('.narrative-workflow-dialog .ai-field-trigger')?.title || '',
  }))()`);
  if (fieldAssistant.buttons < 15 || !fieldAssistant.title.includes("contexte actuel")) {
    throw new Error(`Contextual field assistant is missing: ${JSON.stringify(fieldAssistant)}`);
  }
  console.log(JSON.stringify({ closed, opened, demoInitial, provenance, fieldAssistant }));
} finally {
  socket?.close();
  browser.kill();
  await sleep(200);
  fs.rmSync(profile, { recursive: true, force: true });
}
