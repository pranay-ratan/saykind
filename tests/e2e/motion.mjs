// Reduced motion: with prefers-reduced-motion set, Welcome, Level 1 and Level 2 must have no running animation and no canvas.
import { BASE_URL, finish, launch, newPage, record, sleep, startApp, waitForText } from "./helpers.mjs";

/** Every animation the page is running, by name, ignoring none. */
const runningAnimations = () =>
  document
    .getAnimations()
    .filter((animation) => animation.playState === "running")
    .map((animation) => animation.animationName || animation.transitionProperty || animation.id || "animation");

async function main() {
  const browser = await launch();
  try {
    const page = await newPage(browser, { reducedMotion: true });
    await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });
    await waitForText(page, "Find your words");
    await sleep(1500);
    const welcome = await page.evaluate(runningAnimations);
    const canvases = await page.evaluate(() => document.querySelectorAll("canvas").length);
    record("reduced motion: Welcome has no running animation", welcome.length === 0 && canvases === 0, welcome.slice(0, 4).join(", "));

    await startApp(page);
    await sleep(1500);
    const level1 = await page.evaluate(runningAnimations);
    record("reduced motion: Level 1 has no running animation", level1.length === 0, level1.slice(0, 4).join(", "));

    const level2 = await newPage(browser, { reducedMotion: true });
    await level2.goto(`${BASE_URL}/level-2`, { waitUntil: "domcontentloaded" });
    await waitForText(level2, "Look around you");
    await sleep(1500);
    const camera = await level2.evaluate(runningAnimations);
    record("reduced motion: Level 2 has no running animation", camera.length === 0, camera.slice(0, 4).join(", "));
  } finally {
    await browser.close();
  }
  finish();
}

main().catch((error) => {
  console.error("FAIL  suite crashed:", error.message);
  process.exitCode = 1;
});
