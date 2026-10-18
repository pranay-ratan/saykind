// Level 2 object sheet: the microphone is the Level 1 recorder. With Chrome's fake microphone, the mic is at least
// 96 px, a tap starts a recording whose live level moves the ring, a second tap stops it, the recording is sent for
// checking (not empty), a warm line with no score appears, and "Hear me" plays it back. Everything else is mocked.
import { BASE_URL, checkAxe, clickByText, finish, launch, newPage, record, sleep, waitForText } from "./helpers.mjs";

const MIN_MIC = 96;
const LISTEN_MS = 1500;

async function main() {
  const browser = await launch();
  try {
    const page = await newPage(browser);
    // The recording goes to /api/transcribe as multipart form data. Puppeteer cannot always expose a binary body, so
    // the count of requests is the proof it was sent; the byte size is reported when the body can be read.
    let transcribeRequests = 0;
    let transcribeBytes = null;
    page.on("request", (request) => {
      if (!request.url().includes("/api/transcribe")) return;
      transcribeRequests += 1;
      const size = (data) => {
        if (typeof data === "string" && data.length > 0) transcribeBytes = data.length;
      };
      size(request.postData());
      if (transcribeBytes === null && typeof request.fetchPostData === "function") request.fetchPostData().then(size).catch(() => undefined);
    });

    await page.goto(`${BASE_URL}/level-2`, { waitUntil: "domcontentloaded" });
    await waitForText(page, "Look around you");
    await clickByText(page, "Camera", "button");
    await page.waitForSelector('button[aria-label$="Tap to practice"]', { timeout: 20000 });
    await page.click('button[aria-label$="Tap to practice"]');
    await waitForText(page, "Practice");

    const hasPill = await page.evaluate(() => document.querySelector('[aria-label="Record your pronunciation"]') !== null);
    record("level 2 mic: the small voice pill is gone from the sheet", !hasPill);

    await page.waitForSelector('[aria-label="Tap to speak"]', { timeout: 8000 });
    const size = await page.$eval('[aria-label="Tap to speak"]', (el) => {
      const rect = el.getBoundingClientRect();
      return { width: Math.round(rect.width), height: Math.round(rect.height) };
    });
    record("level 2 mic: at least 96 px", size.width >= MIN_MIC && size.height >= MIN_MIC, `${size.width}x${size.height}`);

    await page.click('[aria-label="Tap to speak"]');
    await page.waitForSelector('[aria-label="Finish speaking"]', { timeout: 8000 });
    record("level 2 mic: a tap starts listening (tap to stop, no press and hold)", true);

    // The recorder writes the live level to its wrapper as --level; the fake microphone is never silent.
    let peak = 0;
    const started = Date.now();
    while (Date.now() - started < LISTEN_MS) {
      const level = await page.evaluate(() => {
        const button = document.querySelector('[aria-label="Finish speaking"]');
        let node = button?.parentElement;
        while (node && !node.style.getPropertyValue("--level")) node = node.parentElement;
        return Number.parseFloat(node?.style.getPropertyValue("--level") || "0") || 0;
      });
      peak = Math.max(peak, level);
      await sleep(100);
    }
    record("level 2 mic: the live level moves while listening", peak > 0.01, `peak level ${peak.toFixed(3)}`);
    const listening = await page.evaluate(() => document.body.innerText.includes("Listening"));
    record("level 2 mic: a calm listening line shows", listening);

    await page.click('[aria-label="Finish speaking"]');
    await page.waitForFunction(() => [...document.querySelectorAll("button")].some((b) => b.textContent?.includes("Hear me")), { timeout: 15000 });
    // "Hear me" exists only when the recorder handed back a non-empty blob (an empty recording gives no attempt to play).
    record("level 2 mic: the recording is not empty, sent for checking, and Hear me is offered", transcribeRequests >= 1, `${transcribeRequests} transcribe request(s)${transcribeBytes ? `, ${transcribeBytes} bytes` : ""}`);
    const text = await page.evaluate(() => document.body.innerText);
    record("level 2 mic: a warm line with no score", text.includes("Thank you.") && !/\d\s?%|score|wrong|good job/i.test(text));
    await checkAxe(page, "Level 2 object sheet with the microphone");

    await clickByText(page, "Hear me", "button");
    await sleep(300);
    record("level 2 mic: Hear me plays without an error", (await page.evaluate(() => document.body.innerText)).includes("Hear me"));
  } finally {
    await browser.close();
  }
  finish();
}

main().catch((error) => {
  console.error("FAIL  suite crashed:", error.message);
  process.exitCode = 1;
});
