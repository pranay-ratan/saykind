// Phone layout: on real iPhone sizes (375x667, 390x844, 430x932; device scale 3, touch, a 34 px home-indicator safe
// area when Chrome can emulate it) every screen with a bottom action panel must keep its content above the panel:
// on Level 1 the word and the speaker and snail buttons sit fully inside the viewport and never overlap the panel, and
// the panel is flush with the viewport bottom with its content ending above the safe area. Screenshots go to
// SCREEN_DIR (default tests/e2e/screenshots, git-ignored).
import { mkdirSync } from "node:fs";
import { BASE_URL, clickByText, finish, launch, newPage, record, sleep, waitForText } from "./helpers.mjs";

/** Start on a phone: the instruction line is hidden on short screens, so wait for the microphone instead. */
async function startOnPhone(page) {
  await page.waitForFunction(() => [...document.querySelectorAll("button")].some((button) => button.textContent?.trim() === "Start"), { timeout: 15000 });
  await page.evaluate(() => [...document.querySelectorAll("button")].find((button) => button.textContent?.trim() === "Start")?.click());
  await page.waitForSelector('[aria-label="Tap to speak"]', { timeout: 15000 });
}

const SIZES = [
  { width: 375, height: 667 },
  { width: 390, height: 844 },
  { width: 430, height: 932 },
];
const SAFE = { top: 47, bottom: 34 };
const SCREEN_DIR = process.env.SCREEN_DIR || new URL("./screenshots/", import.meta.url).pathname;
const TOLERANCE = 2;
/** On the smallest phone the two buttons may need a small scroll on the second Level 1 screen (the word never does). */
const SMALL_SCROLL = 80;

mkdirSync(SCREEN_DIR, { recursive: true });

/** Tries Chrome's safe-area emulation; returns the bottom inset env() actually resolves to. */
async function emulateSafeArea(page) {
  const client = await page.createCDPSession();
  try {
    await client.send("Emulation.setSafeAreaInsets", { insets: { top: SAFE.top, left: 0, bottom: SAFE.bottom, right: 0 } });
  } catch {
    // Older Chrome: no emulation, env() resolves to 0 and the checks still run.
  }
}

function measure() {
  const probe = document.createElement("div");
  probe.style.cssText = "position:fixed;left:-9999px;top:0;height:0;padding-bottom:env(safe-area-inset-bottom, 0px)";
  document.body.appendChild(probe);
  const safeBottom = parseFloat(getComputedStyle(probe).paddingBottom) || 0;
  probe.remove();
  const rect = (el) => (el ? (({ top, bottom, left, right }) => ({ top, bottom, left, right }))(el.getBoundingClientRect()) : null);
  const panel = document.querySelector('[data-testid="bottom-panel"]');
  const panelStyle = panel ? getComputedStyle(panel) : null;
  return {
    viewport: innerHeight,
    safeBottom,
    panel: rect(panel),
    panelPaddingBottom: panelStyle ? parseFloat(panelStyle.paddingBottom) : null,
    word: rect(document.querySelector("h1")),
    speaker: rect(document.querySelector('[aria-label^="Hear "], [aria-label="Listen"]')),
    snail: rect(document.querySelector('[aria-label="Hear it slowly"]')),
    picture: rect(document.querySelector('[data-testid="picture"]')),
  };
}

const inside = (r, h) => Boolean(r) && r.top >= -TOLERANCE && r.bottom <= h + TOLERANCE;
const above = (r, panel) => Boolean(r) && Boolean(panel) && r.bottom <= panel.top + TOLERANCE;

async function checkLevel1(page, label, m, smallScrollAllowed = false) {
  record(`${label}: the word sits inside the viewport above the mic panel`, inside(m.word, m.viewport) && above(m.word, m.panel), JSON.stringify({ word: m.word, panelTop: m.panel?.top }));
  const buttonsClear = inside(m.speaker, m.viewport) && inside(m.snail, m.viewport) && above(m.speaker, m.panel) && above(m.snail, m.panel);
  const buttonsNear = Boolean(m.speaker && m.snail && m.panel) && Math.max(m.speaker.bottom, m.snail.bottom) - m.panel.top <= SMALL_SCROLL;
  record(`${label}: the speaker and snail buttons sit above the mic panel${smallScrollAllowed ? " (a small scroll allowed)" : ""}`, buttonsClear || (smallScrollAllowed && buttonsNear), JSON.stringify({ speaker: m.speaker, snail: m.snail, panelTop: m.panel?.top }));
  record(`${label}: the mic panel is flush with the viewport bottom and clears the safe area`, Boolean(m.panel) && Math.abs(m.panel.bottom - m.viewport) <= TOLERANCE && m.panelPaddingBottom !== null && m.panelPaddingBottom + TOLERANCE >= m.safeBottom, JSON.stringify({ panelBottom: m.panel?.bottom, viewport: m.viewport, paddingBottom: m.panelPaddingBottom, safeBottom: m.safeBottom }));
}

async function shot(page, name) {
  await page.screenshot({ path: `${SCREEN_DIR}/${name}.png` });
}

async function main() {
  const browser = await launch();
  try {
    for (const size of SIZES) {
      const tag = `${size.width}x${size.height}`;
      // Level 1, chair (the redesigned screen).
      const chair = await newPage(browser, { width: size.width, height: size.height });
      await chair.setViewport({ ...size, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
      await emulateSafeArea(chair);
      // Pages share storage, so make sure this one starts at the first word (the chair screen).
      await chair.evaluateOnNewDocument(() => localStorage.removeItem("saykind.progress.v1"));
      await chair.goto(BASE_URL, { waitUntil: "domcontentloaded" });
      await startOnPhone(chair);
      await sleep(800);
      await shot(chair, `level1-chair-${tag}`);
      await checkLevel1(chair, `level 1 chair ${tag}`, await chair.evaluate(measure));
      await chair.close();

      // Level 1, second word (the other Level 1 screen), reached with saved progress.
      const hat = await newPage(browser, { width: size.width, height: size.height });
      await hat.setViewport({ ...size, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
      await emulateSafeArea(hat);
      await hat.evaluateOnNewDocument(() => localStorage.setItem("saykind.progress.v1", JSON.stringify({ level1: { index: 3, completed: ["chair", "cookie", "mug"] } })));
      await hat.goto(BASE_URL, { waitUntil: "domcontentloaded" });
      await startOnPhone(hat);
      await sleep(800);
      await shot(hat, `level1-hat-${tag}`);
      await checkLevel1(hat, `level 1 hat ${tag}`, await hat.evaluate(measure), size.height <= 667);
      await hat.close();

      // Level 2 object sheet: the mic block sits inside the viewport.
      const sheet = await newPage(browser, { width: size.width, height: size.height });
      await sheet.setViewport({ ...size, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
      await emulateSafeArea(sheet);
      await sheet.goto(`${BASE_URL}/level-2`, { waitUntil: "domcontentloaded" });
      await waitForText(sheet, "Look around you");
      await shot(sheet, `level2-start-${tag}`);
      await clickByText(sheet, "Camera", "button");
      await sheet.waitForSelector('button[aria-label$="Tap to practice"]', { timeout: 20000 });
      await sheet.click('button[aria-label$="Tap to practice"]');
      await waitForText(sheet, "Practice");
      await sleep(600);
      await shot(sheet, `level2-sheet-${tag}`);
      const sheetMeasure = await sheet.evaluate(() => {
        const mic = document.querySelector('[aria-label="Tap to speak"]')?.getBoundingClientRect();
        const panel = document.querySelector('[data-testid="bottom-panel"]')?.getBoundingClientRect();
        return { mic: mic ? { top: mic.top, bottom: mic.bottom } : null, panelBottom: panel?.bottom ?? null, viewport: innerHeight };
      });
      record(`level 2 sheet ${tag}: the microphone panel is pinned inside the viewport`, Boolean(sheetMeasure.mic) && sheetMeasure.mic.bottom <= sheetMeasure.viewport + TOLERANCE && sheetMeasure.panelBottom !== null && Math.abs(sheetMeasure.panelBottom - sheetMeasure.viewport) <= TOLERANCE, JSON.stringify(sheetMeasure));
      await sheet.close();
    }
  } finally {
    await browser.close();
  }
  finish();
}

main().catch((error) => {
  console.error("FAIL  suite crashed:", error.message);
  process.exitCode = 1;
});
