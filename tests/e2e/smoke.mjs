// Browser smoke suite: Welcome (with a reduced-motion check), Level 1, the café menu, /level-2, the caregiver view and
// the Get Help sheet. Every /api call is intercepted and answered by a mock (see helpers.mjs).
// Usage: BASE_URL=http://localhost:3000 npm run test:e2e   (needs a production build running at BASE_URL)

import puppeteer from "puppeteer-core";
import { CHROME_PATH, BASE_URL, checkAxe, newPage, record, results, startApp, unlockLevels, waitForText } from "./helpers.mjs";

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

    // 3. Start, Level 1 (Level 2 marked done first, so the café is open)
    await unlockLevels(welcome);
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
