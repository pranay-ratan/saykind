// Welcome: the aurora fills the whole screen at 0.75 and is inert, the logo sits in the middle third, the tagline and
// Start sit in the lower third, there is no other text, and nothing shifts in the first 2.5 seconds. Checked at phone
// and desktop sizes, and once with reduced motion (a still gradient, no canvas).
import { BASE_URL, checkAxe, finish, launch, newPage, record, sleep, waitForText } from "./helpers.mjs";

const MAX_SHIFT = 0.02;

/** Runs before any script on the page: adds up every layout shift that was not caused by the person. */
const observeShift = () => {
  window.__cls = 0;
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) if (!entry.hadRecentInput) window.__cls += entry.value;
  }).observe({ type: "layout-shift", buffered: true });
};

function measure() {
  const frame = document.querySelector(".frame")?.getBoundingClientRect() ?? { top: 0, left: 0, width: innerWidth, height: innerHeight };
  const aurora = document.querySelector('[aria-hidden="true"].pointer-events-none');
  const box = aurora?.getBoundingClientRect();
  const canvas = document.querySelector("canvas")?.getBoundingClientRect();
  const logo = document.querySelector('img[alt="Saykind"]')?.getBoundingClientRect();
  const start = [...document.querySelectorAll("button")].find((b) => b.textContent?.trim() === "Start")?.getBoundingClientRect();
  const tagline = document.querySelector("h1")?.getBoundingClientRect();
  const covers = (r) => Boolean(r) && r.width >= frame.width - 1 && r.height >= frame.height - 1;
  const rel = (r) => (r ? { top: (r.top - frame.top) / frame.height, bottom: (r.bottom - frame.top) / frame.height, centre: (r.left + r.width / 2 - frame.left) / frame.width } : null);
  return {
    cls: window.__cls,
    auroraOpacity: aurora ? getComputedStyle(aurora).opacity : null,
    auroraPointer: aurora ? getComputedStyle(aurora).pointerEvents : null,
    auroraCovers: covers(box),
    canvasCovers: covers(canvas),
    hasCanvas: Boolean(canvas),
    staticGlow: aurora ? getComputedStyle(aurora.firstElementChild ?? aurora).backgroundImage.includes("radial-gradient") : false,
    logo: rel(logo),
    start: rel(start),
    tagline: rel(tagline),
    text: document.body.innerText.replace(/\s+/g, " ").trim(),
  };
}

const near = (value, low, high) => typeof value === "number" && value >= low && value <= high;

async function check(browser, { width, height, reducedMotion = false }) {
  const label = `${width}px${reducedMotion ? ", reduced motion" : ""}`;
  const page = await newPage(browser, { width, height, reducedMotion });
  await page.evaluateOnNewDocument(observeShift);
  await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });
  await waitForText(page, "Find your words");
  await sleep(2500);
  const m = await page.evaluate(measure);
  record(`welcome ${label}: aurora fills the screen, inert, at 0.75`, m.auroraCovers && m.auroraOpacity === "0.75" && m.auroraPointer === "none", `covers ${m.auroraCovers}, opacity ${m.auroraOpacity}, pointer ${m.auroraPointer}`);
  if (reducedMotion) record(`welcome ${label}: still gradient, no canvas`, !m.hasCanvas && m.staticGlow);
  else record(`welcome ${label}: the aurora canvas covers the screen`, m.hasCanvas && m.canvasCovers);
  record(`welcome ${label}: the logo sits in the middle third`, Boolean(m.logo) && near(m.logo.top, 0.3, 0.5) && near(m.logo.bottom, 0.5, 0.7) && near(m.logo.centre, 0.45, 0.55), JSON.stringify(m.logo));
  record(`welcome ${label}: tagline and Start sit in the lower third`, Boolean(m.tagline) && Boolean(m.start) && m.tagline.top >= 0.64 && m.start.top > m.tagline.bottom && m.start.bottom <= 1, JSON.stringify({ tagline: m.tagline, start: m.start }));
  record(`welcome ${label}: no other text`, m.text === "Find your words. At your pace. Start", m.text.slice(0, 80));
  record(`welcome ${label}: no layout shift in the first 2.5 s`, m.cls < MAX_SHIFT, `cumulative layout shift ${m.cls.toFixed(4)}`);
  await checkAxe(page, `Welcome (${label})`);
  await page.close();
}

async function main() {
  const browser = await launch();
  try {
    await check(browser, { width: 375, height: 812 });
    await check(browser, { width: 1280, height: 800 });
    await check(browser, { width: 375, height: 812, reducedMotion: true });
  } finally {
    await browser.close();
  }
  finish();
}

main().catch((error) => {
  console.error("FAIL  suite crashed:", error.message);
  process.exitCode = 1;
});
