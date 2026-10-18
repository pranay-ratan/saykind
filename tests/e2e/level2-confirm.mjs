// Level 2: a box from Perceptron's native box mode carries no confidence, so the sheet asks the server what the
// crop is. When the answer is unsure (or differs from the box's label) the sheet shows "Is it a ___?" with big
// buttons for the label and its alternatives; a confident, matching answer changes nothing. Everything is mocked.
import { BASE_URL, checkAxe, clickByText, finish, json, launch, newPage, record, sleep, waitForText } from "./helpers.mjs";

const BOX_MODE = { objects: [{ label: "bottle", confidence: 1, x: 0.2, y: 0.3, w: 0.3, h: 0.3 }], raw: [], provider: "perceptron", latencyMs: 120, model: "perceptron-mk1.5", mode: "box" };

const detectMock = (confirm) => ({ body }) => (String(body).includes('"purpose":"confirm"') ? json({ ...confirm, model: "perceptron-mk1.5", latencyMs: 60 }) : json(BOX_MODE));

async function openSheet(page) {
  await page.goto(`${BASE_URL}/level-2`, { waitUntil: "domcontentloaded" });
  await waitForText(page, "Look around you");
  await clickByText(page, "Camera", "button");
  await page.waitForSelector('button[aria-label$="Tap to practice"]', { timeout: 20000 });
  await page.click('button[aria-label$="Tap to practice"]');
  await waitForText(page, "Practice");
}

async function main() {
  const browser = await launch();
  try {
    // 1. Unsure answer: "Is it a mug?" with mug, cup and the box's own label, then a tap picks the word.
    const unsure = await newPage(browser, { mocks: { "/api/detect": detectMock({ label: "mug", alternatives: ["cup"], confidence: 0.4 }) } });
    await openSheet(unsure);
    await waitForText(unsure, "Is it a mug?", 15000);
    const buttons = await unsure.evaluate(() => [...document.querySelectorAll("button")].map((b) => b.textContent?.trim()).filter((t) => ["mug", "cup", "bottle", "Other"].includes(t)));
    record("confirm: an unsure answer asks Is it a mug? with big buttons", buttons.includes("mug") && buttons.includes("cup") && buttons.includes("bottle") && buttons.includes("Other"), buttons.join(", "));
    const sizes = await unsure.evaluate(() => [...document.querySelectorAll("button")].filter((b) => ["mug", "cup"].includes(b.textContent?.trim())).map((b) => Math.round(b.getBoundingClientRect().height)));
    record("confirm: the buttons are at least 64 px", sizes.every((h) => h >= 64), sizes.join(", "));
    await checkAxe(unsure, "Level 2 sheet, Is it a mug?");
    await clickByText(unsure, "cup", "button");
    await sleep(400);
    const after = await unsure.evaluate(() => ({ heading: document.querySelector("h2.text-4xl")?.textContent?.trim(), asking: document.body.innerText.includes("Is it a") }));
    record("confirm: tapping a word takes it and closes the question", after.heading === "cup" && !after.asking, JSON.stringify(after));
    await unsure.close();

    // 2. A confident, matching answer: nothing to ask.
    const sure = await newPage(browser, { mocks: { "/api/detect": detectMock({ label: "bottle", alternatives: [], confidence: 0.9 }) } });
    await openSheet(sure);
    await sleep(2500);
    const quiet = await sure.evaluate(() => !document.body.innerText.includes("Is it a") && document.body.innerText.includes("Practice"));
    record("confirm: a confident matching answer asks nothing", quiet);
    await sure.close();
  } finally {
    await browser.close();
  }
  finish();
}

main().catch((error) => {
  console.error("FAIL  suite crashed:", error.message);
  process.exitCode = 1;
});
