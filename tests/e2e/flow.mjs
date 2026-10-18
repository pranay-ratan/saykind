// The levels are a path, not a gate: Welcome, Level 1, the menu and the café are reachable WITHOUT visiting /level-2.
// Level 2 is optional: its start screen has Skip (to the café), Back to levels, and Next: the café once a word is practiced.
// With NEXT_PUBLIC_UNLOCK_ALL_LEVELS=false at build time the old gate applies and this suite reports it instead.
import { BASE_URL, checkAxe, clickByText, finish, launch, newPage, openMenu, record, sleep, startApp, waitForText } from "./helpers.mjs";

const GATED = process.env.NEXT_PUBLIC_UNLOCK_ALL_LEVELS === "false";

/** The café scene is on screen and waits on its Start button (no sound can play before a tap on this page). */
const cafeWaitingToStart = (page) =>
  page.waitForFunction(() => document.querySelector(".stage") !== null && [...document.querySelectorAll("button")].some((b) => b.textContent?.includes("Start")), { timeout: 10000 });

async function main() {
  const browser = await launch();
  try {
    // 1. Welcome, Level 1, menu, café: never touching /level-2 or the progress store.
    const page = await newPage(browser);
    await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });
    await startApp(page);
    record("flow: Welcome then Level 1", true);

    await openMenu(page);
    const menuText = await page.evaluate(() => document.body.innerText);
    const locked = menuText.includes("Opens after Level 2");
    record("flow: no level is locked in the menu", GATED ? locked : !locked, GATED ? "built with the gate on" : "");
    record("flow: Level 2 is labelled optional", menuText.toLowerCase().includes("optional"));
    await checkAxe(page, "Level menu");

    if (!GATED) {
      await clickByText(page, "At the Café");
      await sleep(2800);
      const inCafe = await page.evaluate(() => document.querySelector(".stage") !== null);
      record("flow: the café opens from the menu without visiting Level 2", inCafe);
    }

    // 2. Level 2 start screen: Skip goes straight on to the café.
    const skip = await newPage(browser);
    await skip.goto(`${BASE_URL}/level-2`, { waitUntil: "domcontentloaded" });
    await waitForText(skip, "Look around you");
    const hasSkip = await skip.evaluate(() => [...document.querySelectorAll("a")].some((a) => a.textContent?.trim() === "Skip"));
    record("level 2: Skip is offered on the start screen", hasSkip);
    const hasBack = await skip.evaluate(() => [...document.querySelectorAll("a")].some((a) => a.textContent?.trim() === "Back to levels"));
    const nextBefore = await skip.evaluate(() => [...document.querySelectorAll("a")].some((a) => a.textContent?.includes("Next: the café")));
    record("level 2: Back to levels is there from the start", hasBack);
    record("level 2: Next appears only after a word is practiced", !nextBefore);
    await clickByText(skip, "Skip", "a");
    await skip.waitForFunction(() => location.pathname === "/", { timeout: 10000 });
    await cafeWaitingToStart(skip);
    const skipLanding = await skip.evaluate(() => !document.body.innerText.includes("Find your words"));
    record("level 2: Skip lands in the café, waiting on Start, with no Welcome screen", skipLanding);
    await checkAxe(skip, "Café, waiting on Start");
    await skip.close();

    // 3. Practicing a word on Level 2 still marks it done and offers Next: the café.
    const practice = await newPage(browser);
    await practice.goto(`${BASE_URL}/level-2`, { waitUntil: "domcontentloaded" });
    await waitForText(practice, "Look around you");
    await clickByText(practice, "Open camera");
    await practice.waitForSelector('button[aria-label$="Tap to practice"]', { timeout: 20000 });
    await practice.click('button[aria-label$="Tap to practice"]');
    await waitForText(practice, "Practice");
    await clickByText(practice, "Back to looking");
    await sleep(500);
    await practice.waitForFunction(() => [...document.querySelectorAll("a")].some((a) => a.textContent?.includes("Next: the café")), { timeout: 8000 });
    record("level 2: Next: the café appears after practicing a word", true);
    await checkAxe(practice, "Level 2 with navigation buttons");
    const stored = await practice.evaluate(() => localStorage.getItem("saykind.progress.v1"));
    record("level 2: completion is saved in the progress store", Boolean(stored && stored.includes("level2-camera")));
    await clickByText(practice, "Next: the café", "a");
    await practice.waitForFunction(() => location.pathname === "/", { timeout: 10000 });
    await cafeWaitingToStart(practice);
    record("flow: Next: the café lands in the café, waiting on Start", true);
    await practice.close();

    // 4. Back to levels returns to the menu without the Welcome screen.
    const back = await newPage(browser);
    await back.goto(`${BASE_URL}/level-2`, { waitUntil: "domcontentloaded" });
    await waitForText(back, "Look around you");
    await clickByText(back, "Back to levels", "a");
    await back.waitForFunction(() => location.pathname === "/", { timeout: 10000 });
    await waitForText(back, "Discover Objects");
    record("flow: Back to levels opens the menu, not Welcome", await back.evaluate(() => !document.body.innerText.includes("Find your words")));
  } finally {
    await browser.close();
  }
  finish();
}

main().catch((error) => {
  console.error("FAIL  suite crashed:", error.message);
  process.exitCode = 1;
});
