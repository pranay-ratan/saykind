// Dev's game flow: Welcome, Level 1, the menu, /level-2, back to the menu, and the café reachable.
// Also checks the lock: without Level 2 done, the café stays closed (unless NEXT_PUBLIC_UNLOCK_ALL_LEVELS was set at build time).
import { BASE_URL, checkAxe, clickByText, finish, launch, newPage, openMenu, record, sleep, startApp, waitForText } from "./helpers.mjs";

const UNLOCK_ALL = process.env.NEXT_PUBLIC_UNLOCK_ALL_LEVELS === "true";

async function main() {
  const browser = await launch();
  try {
    const page = await newPage(browser);
    await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });
    await startApp(page);
    record("flow: Welcome then Level 1", true);

    await openMenu(page);
    const lockedBefore = await page.evaluate(() => document.body.innerText.includes("Opens after Level 2"));
    record("flow: café is closed until Level 2 is done", UNLOCK_ALL ? !lockedBefore : lockedBefore);

    await clickByText(page, "Discover Objects");
    await page.waitForFunction(() => location.pathname === "/level-2", { timeout: 10000 });
    await waitForText(page, "Look around you");
    const hasBack = await page.evaluate(() => [...document.querySelectorAll("a")].some((a) => a.textContent?.trim() === "Back to levels"));
    const nextBefore = await page.evaluate(() => [...document.querySelectorAll("a")].some((a) => a.textContent?.includes("Next: the café")));
    record("level 2: Back to levels is there from the start", hasBack);
    record("level 2: Next appears only after a word is practiced", !nextBefore);

    // Practice a word: fake camera + mocked detection, tap the box, the sheet speaks the word.
    await clickByText(page, "Open camera");
    await page.waitForSelector('button[aria-label$="Tap to practice"]', { timeout: 20000 });
    await page.click('button[aria-label$="Tap to practice"]');
    await waitForText(page, "Practice");
    await clickByText(page, "Back to looking");
    await sleep(500);
    await page.waitForFunction(() => [...document.querySelectorAll("a")].some((a) => a.textContent?.includes("Next: the café")), { timeout: 8000 });
    record("level 2: Next: the café appears after practicing a word", true);
    await checkAxe(page, "Level 2 with navigation buttons");

    const stored = await page.evaluate(() => localStorage.getItem("saykind.progress.v1"));
    record("level 2: completion is saved in the progress store", Boolean(stored && stored.includes("level2-camera")));

    await clickByText(page, "Next: the café", "a");
    await page.waitForFunction(() => location.pathname === "/", { timeout: 10000 });
    await waitForText(page, "Next: ready when you are");
    const menuNext = await page.evaluate(() => document.body.innerText.includes("Next: ready when you are") && !document.body.innerText.includes("Find your words"));
    record("flow: lands on the level menu with the café marked next", menuNext);

    await clickByText(page, "At the Café");
    await sleep(2800);
    const inCafe = await page.evaluate(() => document.querySelector(".stage") !== null);
    record("flow: the café opens", inCafe);

    // Back to levels returns to the menu without the Welcome screen.
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
