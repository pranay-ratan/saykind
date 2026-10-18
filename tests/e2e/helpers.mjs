// Shared helpers for the browser suites. Every /api call is intercepted and answered by a mock, so no provider is
// contacted. Chrome is found from CHROME_PATH or the standard macOS location.

import { readFileSync } from "node:fs";
import puppeteer from "puppeteer-core";

export const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
export const CHROME_PATH = process.env.CHROME_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const AXE_SOURCE = readFileSync(new URL("../../node_modules/axe-core/axe.min.js", import.meta.url), "utf8");
const BLOCKING_IMPACTS = new Set(["serious", "critical"]);

/** Minimal valid-looking audio for the mock speech route. Playback may fail; the app then uses the device voice. */
const SILENT_MP3 = Buffer.from("SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU2LjQuMTAxAAAAAAAAAAAAAAAA", "base64");

export const MOCKS = {
  "/api/status": { configured: true, providers: { speak: "elevenlabs", transcribe: "elevenlabs", converse: "claude" }, keysPresent: {}, missing: [] },
  "/api/transcribe": { text: "chair" },
  "/api/converse": {
    reply: "Hello! What would you like today?",
    order: { drink: null, size: null, temperature: null, extras: [] },
    nextSlot: "drink",
    unclearStreak: 0,
  },
  "/api/detect": {
    objects: [{ label: "mug", confidence: 0.92, x: 0.2, y: 0.3, w: 0.3, h: 0.3 }],
    raw: [],
    provider: "perceptron",
    latencyMs: 120,
  },
  "/api/adapt": {
    decision: { nextLevel: 1, cueSupport: "none", autoSlow: false, message: "Thank you. Keep going at your own pace.", careNote: "Mock decision." },
    source: "rules",
  },
};

export function mockFor(url, overrides = {}, body = "") {
  const path = new URL(url).pathname;
  if (path === "/api/speak") return { status: 200, contentType: "audio/mpeg", body: SILENT_MP3 };
  if (path === "/api/tts") return { status: 200, contentType: "audio/mpeg", body: SILENT_MP3 };
  const override = overrides[path];
  if (typeof override === "function") return override({ url, body });
  const json = override ?? MOCKS[path];
  if (json) return { status: 200, contentType: "application/json", body: Buffer.from(JSON.stringify(json)) };
  return null;
}

export const results = [];
export function record(name, ok, detail = "") {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` - ${detail}` : ""}`);
}

export async function axeViolations(page) {
  await page.evaluate(AXE_SOURCE);
  const run = await page.evaluate(async () => {
    const report = await window.axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa"] } });
    return report.violations.map((violation) => ({
      id: violation.id,
      impact: violation.impact,
      nodes: violation.nodes.length,
      sample: violation.nodes.slice(0, 2).map((node) => node.target.join(" ")),
    }));
  });
  return run;
}

export async function checkAxe(page, screen) {
  const violations = await axeViolations(page);
  const blocking = violations.filter((violation) => BLOCKING_IMPACTS.has(violation.impact));
  if (blocking.length === 0) {
    record(`axe: ${screen}`, true, violations.length ? `${violations.length} minor finding(s), none serious` : "no violations");
  } else {
    record(`axe: ${screen}`, false, blocking.map((violation) => `${violation.id} (${violation.impact}) on ${violation.sample.join(" | ")}`).join("; "));
  }
  return violations;
}

export async function newPage(browser, { reducedMotion = false, width = 390, height = 844, mocks = {} } = {}) {
  const page = await browser.newPage();
  await page.setViewport({ width, height, deviceScaleFactor: 1, isMobile: width < 768, hasTouch: width < 768 });
  if (reducedMotion) await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
  const consoleErrors = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => consoleErrors.push(error.message));
  await page.setRequestInterception(true);
  page.on("request", (request) => {
    const url = request.url();
    if (!url.startsWith(BASE_URL) || !new URL(url).pathname.startsWith("/api/")) return request.continue();
    const mock = mockFor(url, mocks, request.postData() ?? "");
    if (!mock) return request.continue();
    return request.respond({ status: mock.status, contentType: mock.contentType, body: mock.body });
  });
  page.consoleErrors = consoleErrors;
  return page;
}

export async function waitForText(page, text, timeout = 8000) {
  await page.waitForFunction((needle) => document.body.innerText.includes(needle), { timeout }, text);
}

export async function startApp(page) {
  await page.waitForFunction(() => [...document.querySelectorAll("button")].some((button) => button.textContent?.trim() === "Start"), { timeout: 15000 });
  await page.evaluate(() => [...document.querySelectorAll("button")].find((button) => button.textContent?.trim() === "Start")?.click());
  await waitForText(page, "Listen, then say the word");
}


export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export function launch() {
  return puppeteer.launch({ executablePath: CHROME_PATH, headless: true, args: ["--no-sandbox", "--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"] });
}

export async function clickByText(page, text, selector = 'button, [role="button"], a') {
  await page.evaluate(
    (needle, sel) => [...document.querySelectorAll(sel)].find((node) => node.textContent?.includes(needle))?.click(),
    text,
    selector,
  );
}

export async function openMenu(page) {
  await page.evaluate(() => document.querySelector('[aria-label="Open menu"]')?.click());
  await sleep(400);
}

/** Prints the summary and sets the exit code. */
export function finish() {
  console.log("");
  const failed = results.filter((result) => !result.ok);
  console.log(`${results.length - failed.length} passed, ${failed.length} failed`);
  if (failed.length > 0) process.exitCode = 1;
}

/** Marks Level 2 as done on this device (what practicing a word on /level-2 does), then reloads. */
export async function unlockLevels(page) {
  await page.evaluate(() => localStorage.setItem("saykind.progress.v1", JSON.stringify({ "level2-camera": { index: 1, completed: ["practiced-a-word"] } })));
  await page.reload({ waitUntil: "domcontentloaded" });
}

// ---- the café conversation, shared by the conversation and report suites ----
export const json = (value) => ({ status: 200, contentType: "application/json", body: Buffer.from(JSON.stringify(value)) });
const EMPTY = { drink: null, size: null, temperature: null, extras: [], finished: false };
export const BANNED = /perfect|wrong|incorrect|mistake|score|good job/i;

/** A stateless stand-in for the barista: it reads the client's order and what the person said. */
export function converseMock({ body }) {
  const request = JSON.parse(body);
  const order = { ...EMPTY, ...request.order, extras: [...(request.order?.extras ?? [])] };
  const text = (request.patient?.text ?? "").toLowerCase();
  if (request.patient?.via === "tap" && request.tapped?.slot === "temperature") {
    order.temperature = request.tapped.id;
    return json({ reply: "Got it. Anything else?", order, nextSlot: "extras", unclearStreak: 0 });
  }
  if (request.patient?.via === "silence" || !text) {
    return json({ reply: "That's okay, take your time. Hot or iced? You can tap Menu to choose from pictures.", order, nextSlot: "temperature", unclearStreak: (request.unclearStreak ?? 0) + 1 });
  }
  if (/no thank/.test(text)) {
    order.finished = true;
    return json({ reply: "You're welcome! A large hot tea. Have a lovely day!", order, nextSlot: "none", unclearStreak: 0 });
  }
  if (/tea/.test(text)) order.drink = "hot-tea";
  else if (/latte/.test(text)) order.drink = "latte";
  if (/large/.test(text)) order.size = "large";
  const reply = order.drink === "hot-tea" ? "Hot tea instead. Hot or iced?" : "A large latte. Hot or iced?";
  return json({ reply, order, nextSlot: "temperature", unclearStreak: 0 });
}

export function transcribeQueue(texts) {
  let index = 0;
  return () => json({ text: texts[Math.min(index++, texts.length - 1)] });
}

export const label = (text) => `[aria-label="${text}"]`;

export async function waitForMicReady(page) {
  await page.waitForSelector(label("Tap to speak"), { timeout: 25000 });
}

export async function speakTurn(page) {
  await waitForMicReady(page);
  await page.click(label("Tap to speak"));
  await page.waitForSelector(label("Finish speaking"), { timeout: 8000 });
  await sleep(800);
  await page.click(label("Finish speaking"));
}

export async function enterCafe(page) {
  await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });
  await unlockLevels(page);
  await page.waitForFunction(() => [...document.querySelectorAll("button")].some((b) => b.textContent?.trim() === "Start"), { timeout: 15000 });
  await clickByText(page, "Start", "button");
  await waitForText(page, "Listen, then say the word");
  await openMenu(page);
  await clickByText(page, "At the Café");
}

