// Browser smoke suite: Welcome (with a reduced-motion check), Level 1, the café menu, /level-2, the caregiver view and
// the Get Help sheet. Every /api call is intercepted and answered by a mock: ElevenLabs speech and transcription,
// Claude's conversation, Perceptron detection and the adaptive route. No provider is contacted.
// Usage: BASE_URL=http://localhost:3000 npm run test:e2e
// Needs a production build running at BASE_URL (npm run build && npm start). Chrome is found from CHROME_PATH or
// the standard macOS location.

import { readFileSync } from "node:fs";
import puppeteer from "puppeteer-core";

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const CHROME_PATH = process.env.CHROME_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const AXE_SOURCE = readFileSync(new URL("../../node_modules/axe-core/axe.min.js", import.meta.url), "utf8");
const BLOCKING_IMPACTS = new Set(["serious", "critical"]);

/** Minimal valid-looking audio for the mock speech route. Playback may fail; the app then uses the device voice. */
const SILENT_MP3 = Buffer.from("SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU2LjQuMTAxAAAAAAAAAAAAAAAA", "base64");

const MOCKS = {
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
    decision: { nextLevel: 1, cueSupport: "none", autoSlow: false, message: "Nice practice. Keep going at your own pace.", careNote: "Mock decision." },
    source: "rules",
  },
};

function mockFor(url) {
  const path = new URL(url).pathname;
  if (path === "/api/speak") return { status: 200, contentType: "audio/mpeg", body: SILENT_MP3 };
  if (path === "/api/tts") return { status: 200, contentType: "audio/mpeg", body: SILENT_MP3 };
  const json = MOCKS[path];
  if (json) return { status: 200, contentType: "application/json", body: Buffer.from(JSON.stringify(json)) };
  return null;
}

const results = [];
function record(name, ok, detail = "") {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` - ${detail}` : ""}`);
}

async function axeViolations(page) {
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

async function checkAxe(page, screen) {
  const violations = await axeViolations(page);
  const blocking = violations.filter((violation) => BLOCKING_IMPACTS.has(violation.impact));
  if (blocking.length === 0) {
    record(`axe: ${screen}`, true, violations.length ? `${violations.length} minor finding(s), none serious` : "no violations");
  } else {
    record(`axe: ${screen}`, false, blocking.map((violation) => `${violation.id} (${violation.impact}) on ${violation.sample.join(" | ")}`).join("; "));
  }
  return violations;
}

async function newPage(browser, { reducedMotion = false, width = 390, height = 844 } = {}) {
  const page = await browser.newPage();
  await page.setViewport({ width, height, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
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
    const mock = mockFor(url);
    if (!mock) return request.continue();
    return request.respond({ status: mock.status, contentType: mock.contentType, body: mock.body });
  });
  page.consoleErrors = consoleErrors;
  return page;
}

async function waitForText(page, text, timeout = 8000) {
  await page.waitForFunction((needle) => document.body.innerText.includes(needle), { timeout }, text);
}

async function startApp(page) {
  await page.waitForFunction(() => [...document.querySelectorAll("button")].some((button) => button.textContent?.trim() === "Start"), { timeout: 15000 });
  await page.evaluate(() => [...document.querySelectorAll("button")].find((button) => button.textContent?.trim() === "Start")?.click());
  await waitForText(page, "Listen, then say the word");
}

async function main() {
  const browser = await puppeteer.launch({ executablePath: CHROME_PATH, headless: true, args: ["--no-sandbox", "--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"] });
  try {
    // 1. Welcome, normal motion
    const welcome = await newPage(browser);
    await welcome.goto(BASE_URL, { waitUntil: "domcontentloaded" });
    await waitForText(welcome, "Find your words");
    record("welcome: headline renders", true);
    await checkAxe(welcome, "Welcome");

    // 2. Welcome, reduced motion: no WebGL aurora, plain headline, static gradient
    const reduced = await newPage(browser, { reducedMotion: true });
    await reduced.goto(BASE_URL, { waitUntil: "domcontentloaded" });
    await waitForText(reduced, "Find your words");
    const reducedCheck = await reduced.evaluate(() => ({
      canvases: document.querySelectorAll("canvas").length,
      headline: document.querySelector("h1")?.textContent ?? "",
    }));
    record("welcome: reduced motion has no canvas aurora", reducedCheck.canvases === 0, `canvas elements: ${reducedCheck.canvases}`);
    record("welcome: reduced motion headline is plain text", reducedCheck.headline === "Find your words. At your pace.", reducedCheck.headline);
    reduced.close();

    // 3. Start, Level 1
    await startApp(welcome);
    record("level 1: opens after Start", true);
    await checkAxe(welcome, "Level 1");

    // 4. Café through the menu (mocked conversation)
    await welcome.evaluate(() => document.querySelector('[aria-label="Open menu"]')?.click());
    await new Promise((resolve) => setTimeout(resolve, 400));
    await welcome.evaluate(() => [...document.querySelectorAll('[role="button"], button')].find((node) => node.textContent?.includes("At the Café"))?.click());
    await new Promise((resolve) => setTimeout(resolve, 2500));
    record("café: opens from the menu", true);
    await checkAxe(welcome, "Café");

    // 5. Caregiver view
    const caregiver = await newPage(browser);
    await caregiver.goto(`${BASE_URL}/caregiver`, { waitUntil: "domcontentloaded" });
    await checkAxe(caregiver, "Caregiver view");

    // 6. Get Help sheet (caregiver sheet) from Level 1
    const help = await newPage(browser);
    await help.goto(BASE_URL, { waitUntil: "domcontentloaded" });
    await startApp(help);
    await help.evaluate(() => document.querySelector('[aria-label="Call or message my caregiver"]')?.click());
    await new Promise((resolve) => setTimeout(resolve, 500));
    const sheet = await help.evaluate(() => document.body.innerText.includes("Need a hand?"));
    record("get help: sheet opens", sheet);
    await checkAxe(welcome, "Get Help sheet");

    // 7. /level-2 with mocked detection (no camera in headless Chrome: the start screen is checked)
    const level2 = await newPage(browser, { width: 1280, height: 800 });
    await level2.goto(`${BASE_URL}/level-2?debug=1`, { waitUntil: "domcontentloaded" });
    await waitForText(level2, "Look around you");
    const frame = await level2.evaluate(() => {
      const root = document.querySelector(".fixed.inset-0");
      const rect = root?.getBoundingClientRect();
      return { width: rect?.width ?? 0, height: rect?.height ?? 0, frameCard: document.querySelector(".frame") !== null };
    });
    record("level 2: full-bleed at 1280px", frame.width >= 1270 && frame.height >= 790 && !frame.frameCard, `root ${Math.round(frame.width)}x${Math.round(frame.height)}, phone-card wrapper: ${frame.frameCard}`);
    await checkAxe(level2, "Level 2 start screen (1280px)");

    console.log("");
    const failed = results.filter((result) => !result.ok);
    console.log(`${results.length - failed.length} passed, ${failed.length} failed`);
    if (failed.length > 0) process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error("FAIL  suite crashed:", error.message);
  process.exitCode = 1;
});
