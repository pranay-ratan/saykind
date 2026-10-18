// The first Level 1 screen after Welcome must not shift: the text at the bottom used to appear near the top and slide
// down. This suite records every layout shift (with its source element) and the position of the bottom status line,
// the microphone, the word and the picture every 100 ms for 2 seconds after Start, at a normal and a slow connection.
// Pass: cumulative layout shift under 0.02 after Start. Set SHIFT_VERBOSE=1 to print the timeline.
import { BASE_URL, finish, launch, newPage, record, sleep } from "./helpers.mjs";

const MAX_SHIFT = 0.02;
const SAMPLE_MS = 100;
const WINDOW_MS = 2000;

/** Before any page script: keep every layout shift with when it happened and what moved. */
const observeShift = () => {
  window.__shifts = [];
  const describe = (node) => {
    if (!node) return "?";
    const el = node.nodeType === 1 ? node : node.parentElement;
    if (!el) return node.nodeName;
    const text = (el.textContent || "").trim().replace(/\s+/g, " ").slice(0, 40);
    return `${el.tagName.toLowerCase()}${el.className && typeof el.className === "string" ? "." + el.className.split(" ").slice(0, 2).join(".") : ""} "${text}"`;
  };
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (entry.hadRecentInput) continue;
      window.__shifts.push({
        at: Math.round(entry.startTime),
        value: entry.value,
        sources: (entry.sources || []).slice(0, 3).map((s) => ({ what: describe(s.node), from: Math.round(s.previousRect.top), to: Math.round(s.currentRect.top) })),
      });
    }
  }).observe({ type: "layout-shift", buffered: true });
};

function sample() {
  const top = (el) => (el ? Math.round(el.getBoundingClientRect().top) : null);
  const footerStatus = [...document.querySelectorAll('footer p[aria-live="polite"], p[aria-live="polite"]')].pop();
  return {
    t: Math.round(performance.now()),
    status: top(footerStatus),
    mic: top(document.querySelector('[aria-label="Tap to speak"]')),
    word: top(document.querySelector("h1")),
    art: top(document.querySelector("svg")),
    fonts: document.fonts.status,
    frameH: Math.round(document.querySelector(".frame")?.getBoundingClientRect().height ?? 0),
  };
}

async function run(browser, { width, height, slow, secondWord = false }) {
  const label = `${width}px${slow ? ", slow 3G" : ""}${secondWord ? ", second word" : ""}`;
  const page = await newPage(browser, { width, height });
  await page.evaluateOnNewDocument(observeShift);
  // Saved progress at the second word: the screen after Welcome is then the other Level 1 layout (ExerciseView).
  if (secondWord) await page.evaluateOnNewDocument(() => localStorage.setItem("saykind.progress.v1", JSON.stringify({ level1: { index: 1, completed: ["chair"] } })));
  if (slow) {
    const client = await page.createCDPSession();
    await client.send("Network.emulateNetworkConditions", { offline: false, latency: 400, downloadThroughput: (400 * 1024) / 8, uploadThroughput: (400 * 1024) / 8 });
  }
  await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => [...document.querySelectorAll("button")].some((b) => b.textContent?.trim() === "Start"), { timeout: 30000 });
  await sleep(600);
  const shiftsBefore = await page.evaluate(() => window.__shifts.length);
  await page.evaluate(() => [...document.querySelectorAll("button")].find((b) => b.textContent?.trim() === "Start")?.click());

  const timeline = [];
  const started = Date.now();
  while (Date.now() - started < WINDOW_MS) {
    timeline.push(await page.evaluate(sample));
    await sleep(SAMPLE_MS);
  }
  const shifts = (await page.evaluate(() => window.__shifts)).slice(shiftsBefore);
  const cls = shifts.reduce((sum, shift) => sum + shift.value, 0);
  const statusTops = timeline.map((s) => s.status).filter((v) => v !== null);
  const statusTravel = statusTops.length ? Math.max(...statusTops) - Math.min(...statusTops) : 0;
  const micTops = timeline.map((s) => s.mic).filter((v) => v !== null);
  const micTravel = micTops.length ? Math.max(...micTops) - Math.min(...micTops) : 0;

  if (process.env.SHIFT_VERBOSE === "1") {
    console.log(`\n-- ${label}: timeline (t ms: status / mic / word / art tops, fonts, frame height)`);
    for (const s of timeline) console.log(`   ${String(s.t).padStart(6)}: ${s.status} / ${s.mic} / ${s.word} / ${s.art}  ${s.fonts}  ${s.frameH}`);
    console.log(`-- ${label}: ${shifts.length} shift(s) after Start`);
    for (const s of shifts) console.log(`   at ${s.at} ms value ${s.value.toFixed(4)}: ${s.sources.map((x) => `${x.what} ${x.from}->${x.to}`).join(" | ")}`);
  }
  record(`level 1 first screen (${label}): layout shift under ${MAX_SHIFT}`, cls < MAX_SHIFT, `cls ${cls.toFixed(4)} over ${shifts.length} shift(s); status line moved ${statusTravel}px, mic moved ${micTravel}px`);
  record(`level 1 first screen (${label}): the bottom status line stays put`, statusTravel <= 2, `${statusTravel}px`);
  await page.close();
}

async function main() {
  const browser = await launch();
  try {
    await run(browser, { width: 375, height: 812, slow: false });
    await run(browser, { width: 375, height: 812, slow: true });
    await run(browser, { width: 1280, height: 800, slow: false });
    await run(browser, { width: 375, height: 812, slow: false, secondWord: true });
    await run(browser, { width: 1280, height: 800, slow: false, secondWord: true });
    await run(browser, { width: 375, height: 560, slow: false });
  } finally {
    await browser.close();
  }
  finish();
}

main().catch((error) => {
  console.error("FAIL  suite crashed:", error.message);
  process.exitCode = 1;
});
