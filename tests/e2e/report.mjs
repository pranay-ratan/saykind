// From the end of a café order to the report: preview, transcript off by default, Email, Share (stubbed), Download PDF,
// Copy, saved on the device and Delete in the caregiver view, and the template fallback. Everything external is mocked.
import { BANNED, BASE_URL, checkAxe, clickByText, converseMock, enterCafe, finish, json, launch, newPage, record, sleep, speakTurn, transcribeQueue, waitForText } from "./helpers.mjs";

const AI_REPORT = {
  content: {
    summary: "Practiced a café order with a large hot latte.",
    strengths: ["Finished an order."],
    needsSupport: [],
    observations: ["Two spoken turns."],
    suggestedFocus: ["Keep going at their own pace."],
    limits: "One short session.",
  },
  source: "ai",
};

const SCORE_LANGUAGE = /\d\s?%|\bscor|\bwrong\b|\bincorrect|\bfail|diagnos(?!is\.)/i;

const stubs = () => {
  window.__shared = null;
  window.__copied = null;
  Object.defineProperty(navigator, "share", { configurable: true, value: async (data) => void (window.__shared = { title: data.title, text: data.text, files: (data.files ?? []).map((file) => ({ name: file.name, type: file.type })) }) });
  Object.defineProperty(navigator, "canShare", { configurable: true, value: () => true });
  Object.defineProperty(navigator.clipboard, "writeText", { configurable: true, value: async (text) => void (window.__copied = text) });
};

async function finishOrder(page) {
  await enterCafe(page);
  await waitForText(page, "What can I get for you today?", 25000);
  await speakTurn(page);
  await waitForText(page, "A large latte. Hot or iced?");
  await speakTurn(page);
  await waitForText(page, "Anything else?").catch(() => undefined);
  await speakTurn(page);
  await waitForText(page, "Have a lovely day!");
  await page.waitForFunction(() => [...document.querySelectorAll("button")].some((b) => b.textContent?.includes("See my report")), { timeout: 15000 });
}

async function main() {
  const browser = await launch();
  try {
    // 1. Café end -> report preview (the model's report)
    const page = await newPage(browser, {
      mocks: {
        "/api/converse": converseMock,
        "/api/transcribe": transcribeQueue(["latte... large", "hot", "no thank you"]),
        "/api/report": () => json(AI_REPORT),
      },
    });
    await page.evaluateOnNewDocument(stubs);
    await finishOrder(page);
    await clickByText(page, "See my report", "button");
    await waitForText(page, "Report for my doctor", 15000);
    await waitForText(page, "Practiced a café order");
    record("report: opens from the end of the café", true);
    const preview = await page.evaluate(() => document.body.innerText);
    record("report: says nothing is sent until you tap", preview.includes("Nothing is sent until you tap."));
    record("report: carries the fixed line", preview.includes("AI observations, not a diagnosis."));
    record("report: no score or judging language", !SCORE_LANGUAGE.test(preview.replace(/AI observations, not a diagnosis\./g, "")) && !BANNED.test(preview.replace(/AI observations, not a diagnosis\./g, "")));
    await checkAxe(page, "Report preview");

    // 2. The transcript switch is off by default and only then adds the conversation
    const toggleState = await page.$eval('[role="switch"]', (node) => node.getAttribute("aria-checked"));
    record("report: transcript is off by default", toggleState === "false" && !preview.includes("Me: latte"));
    await page.click('[role="switch"]');
    await sleep(200);
    const withTranscript = await page.evaluate(() => document.body.innerText);
    record("report: the transcript switch adds the conversation", withTranscript.includes("Me: latte... large"));
    await page.click('[role="switch"]');

    // 3. Doctor details, then Email, Share, Copy, Download PDF
    await page.type('input[type="email"]', "lee@example.com");
    await sleep(300);
    const mailto = await page.$eval('a[aria-label^="Email to my doctor"]', (node) => node.getAttribute("href"));
    record("report: Email opens a mail link with the doctor, a subject and a note to attach", mailto.startsWith("mailto:lee%40example.com?subject=") && decodeURIComponent(mailto).includes("Please attach"), mailto.slice(0, 80));

    await clickByText(page, "Share", "button");
    await sleep(300);
    const shared = await page.evaluate(() => window.__shared);
    record("report: Share hands the browser a report file", Boolean(shared && shared.files.length === 1 && /^saykind-report-\d{4}-\d{2}-\d{2}\.txt$/.test(shared.files[0].name)), JSON.stringify(shared?.files ?? null));

    await clickByText(page, "Copy", "button");
    await sleep(300);
    const copied = await page.evaluate(() => window.__copied);
    record("report: Copy puts the report text on the clipboard without the conversation", Boolean(copied && copied.includes("AI observations, not a diagnosis.") && !copied.includes("Me:")));

    const href = await page.$eval('a[href^="/report/print"]', (node) => node.getAttribute("href"));
    const opened = browser.waitForTarget((target) => target.url().includes("/report/print"), { timeout: 10000 });
    await page.click('a[href^="/report/print"]');
    const printPage = await (await opened).page();
    await waitForText(printPage, "Save as PDF");
    const printText = await printPage.evaluate(() => document.body.innerText);
    record("report: Download PDF opens a print-friendly page", href.includes("t=0") && printText.includes("Saykind practice report") && printText.includes("Practiced a café order") && !printText.includes("Me:"));
    await printPage.close();

    // 4. Saved on the device; listed and deleted in the caregiver view
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("saykind.reports.v1") ?? "[]"));
    record("report: saved on this device with an id and a date", saved.length === 1 && Boolean(saved[0].id) && /^\d{4}-\d{2}-\d{2}$/.test(saved[0].input.date));
    const caregiver = await browser.newPage();
    await caregiver.setViewport({ width: 390, height: 844 });
    await caregiver.goto(`${BASE_URL}/caregiver`, { waitUntil: "domcontentloaded" });
    await waitForText(caregiver, "Reports for my doctor");
    await waitForText(caregiver, `Report, ${saved[0].input.date}`);
    await checkAxe(caregiver, "Caregiver view with saved reports");
    await clickByText(caregiver, "Delete", "button");
    await waitForText(caregiver, "No saved reports yet.");
    record("report: listed in the caregiver view and Delete removes it", (await caregiver.evaluate(() => JSON.parse(localStorage.getItem("saykind.reports.v1") ?? "[]"))).length === 0);
    await caregiver.close();

    // 5. The report service fails: the same screen, from the template
    const fallback = await newPage(browser, {
      mocks: {
        "/api/converse": converseMock,
        "/api/transcribe": transcribeQueue(["latte... large", "hot", "no thank you"]),
        "/api/report": () => ({ status: 500, contentType: "application/json", body: Buffer.from(JSON.stringify({ error: "upstream" })) }),
      },
    });
    await finishOrder(fallback);
    await clickByText(fallback, "See my report", "button");
    await waitForText(fallback, "Written from a fixed template.", 15000);
    const text = await fallback.evaluate(() => document.body.innerText);
    record("report: a failed report service gives the template report", text.includes("had a café ordering conversation") && !SCORE_LANGUAGE.test(text.replace(/AI observations, not a diagnosis\./g, "")));
  } finally {
    await browser.close();
  }
  finish();
}

main().catch((error) => {
  console.error("FAIL  suite crashed:", error.message);
  process.exitCode = 1;
});
