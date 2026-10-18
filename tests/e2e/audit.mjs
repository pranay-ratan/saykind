// UI audit: visits every screen at 375px and lists tap targets under 64px, patient-screen text under 20px, red or
// danger colours, and white text on coral. Prints findings; set AUDIT_STRICT=1 to fail when any are found.
// Usage: BASE_URL=http://localhost:3000 node tests/e2e/audit.mjs
import { BASE_URL, clickByText, converseMock, enterCafe, json, launch, newPage, openMenu, sleep, startApp, unlockLevels, waitForMicReady, waitForText, transcribeQueue } from "./helpers.mjs";

const MIN_TARGET = 64;
const MIN_TEXT = 20;

/** Runs in the page. Returns what is wrong on the current screen. */
function inspect({ patient, MIN_TARGET, MIN_TEXT, root }) {
  const scope = (root && document.querySelector(root)) || document.body;
  const visible = (el) => {
    const rect = el.getBoundingClientRect();
    const style = getComputedStyle(el);
    return rect.width > 0 && rect.height > 0 && style.visibility !== "hidden" && style.display !== "none" && Number(style.opacity) > 0.05;
  };
  const rgb = (value) => (value.match(/[\d.]+/g) ?? []).map(Number);
  const hue = ([r, g, b]) => {
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    if (max === min) return { h: 0, s: 0, l: max / 255 };
    const d = max - min;
    const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    const l = (max + min) / 510;
    return { h: (h * 60 + 360) % 360, s: d / 255 / (1 - Math.abs(2 * l - 1)), l };
  };
  const isRed = (c) => {
    const [r, g, b, a = 1] = rgb(c);
    if (a < 0.3) return false;
    const { h, s, l } = hue([r, g, b]);
    return s > 0.55 && l > 0.2 && l < 0.7 && (h >= 350 || h <= 8);
  };
  const isCoral = (c) => {
    const [r, g, b, a = 1] = rgb(c);
    return a > 0.5 && Math.abs(r - 224) < 14 && Math.abs(g - 122) < 16 && Math.abs(b - 95) < 16;
  };
  const isWhite = (c) => {
    const [r, g, b] = rgb(c);
    return r > 245 && g > 245 && b > 245;
  };
  const label = (el) => (el.getAttribute("aria-label") || el.textContent || el.tagName).trim().replace(/\s+/g, " ").slice(0, 40);

  const small = [];
  for (const el of scope.querySelectorAll('button, a[href], [role="button"], [role="switch"], input:not([type="hidden"]):not([type="file"]), select, textarea, label:has(input[type="file"])')) {
    if (!visible(el) || el.closest('[aria-hidden="true"]')) continue;
    // A control inside another control (the switch inside its row) is one target, measured by the outer one.
    if (el.parentElement?.closest('button, a[href], [role="button"], [role="switch"], label')) continue;
    const rect = el.getBoundingClientRect();
    if (Math.min(rect.width, rect.height) < MIN_TARGET - 0.5) small.push(`${label(el)} (${Math.round(rect.width)}x${Math.round(rect.height)})`);
  }

  const smallText = new Map();
  const reds = [];
  const whiteOnCoral = [];
  const walker = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const node = walker.currentNode;
    const text = node.textContent.trim();
    const el = node.parentElement;
    const box = el?.getBoundingClientRect();
    if (!text || !el || !box || box.width < 3 || box.height < 3 || !visible(el) || el.closest('[aria-hidden="true"], script, style, noscript') || el.classList.contains("sr-only")) continue;
    if (el.closest("svg")) continue;
    const style = getComputedStyle(el);
    const size = parseFloat(style.fontSize);
    if (patient && size < MIN_TEXT - 0.1) smallText.set(`${text.slice(0, 30)} (${size}px)`, true);
    if (isRed(style.color)) reds.push(`text "${text.slice(0, 24)}" ${style.color}`);
    let bg = null;
    for (let p = el; p; p = p.parentElement) {
      const color = getComputedStyle(p).backgroundColor;
      if (rgb(color)[3] !== 0 && !/rgba\(0, 0, 0, 0\)/.test(color)) {
        bg = color;
        break;
      }
    }
    if (bg && isCoral(bg) && isWhite(style.color)) whiteOnCoral.push(`"${text.slice(0, 24)}"`);
    if (bg && isCoral(style.color) && true) whiteOnCoral.push(`coral text "${text.slice(0, 24)}"`);
  }
  for (const el of scope.querySelectorAll("*")) {
    if (!visible(el)) continue;
    const bg = getComputedStyle(el).backgroundColor;
    if (isRed(bg) && el.getBoundingClientRect().width > 6) reds.push(`background on ${label(el)} ${bg}`);
    const border = getComputedStyle(el).borderTopColor;
    if (getComputedStyle(el).borderTopWidth !== "0px" && isRed(border)) reds.push(`border on ${label(el)} ${border}`);
  }
  const overflow = [];
  if (document.documentElement.scrollWidth > window.innerWidth + 1) overflow.push(`page is ${document.documentElement.scrollWidth}px wide in a ${window.innerWidth}px window`);
  for (const el of scope.querySelectorAll('button, a[href], [role="button"], h1, h2, p, input')) {
    if (!visible(el) || el.closest('[aria-hidden="true"], .strip, [data-sk-scroll]')) continue;
    const rect = el.getBoundingClientRect();
    if (rect.width > 2 && (rect.right > window.innerWidth + 1 || rect.left < -1)) overflow.push(`${label(el)} spills past the screen edge`);
  }
  return { overflow: [...new Set(overflow)], small: [...new Set(small)], smallText: [...smallText.keys()], reds: [...new Set(reds)], whiteOnCoral: [...new Set(whiteOnCoral)] };
}

const findings = [];
async function audit(page, screen, patient = true, root = null) {
  await sleep(500);
  const result = await page.evaluate(inspect, { patient, MIN_TARGET, MIN_TEXT, root });
  const count = result.overflow.length + result.small.length + result.smallText.length + result.reds.length + result.whiteOnCoral.length;
  console.log(`\n## ${screen}${count === 0 ? ": follows the rules" : ""}`);
  if (result.overflow.length) console.log(`  layout: ${result.overflow.join("; ")}`);
  if (result.small.length) console.log(`  targets under ${MIN_TARGET}px: ${result.small.join("; ")}`);
  if (result.smallText.length) console.log(`  text under ${MIN_TEXT}px: ${result.smallText.slice(0, 14).join("; ")}${result.smallText.length > 14 ? ` (+${result.smallText.length - 14} more)` : ""}`);
  if (result.reds.length) console.log(`  red colours: ${result.reds.join("; ")}`);
  if (result.whiteOnCoral.length) console.log(`  white or coral text on coral: ${result.whiteOnCoral.join("; ")}`);
  findings.push({ screen, count });
}

const REPORT_MOCK = json({ content: { summary: "On 2026-10-18, the person practiced 1 word in Level 1.", strengths: ["Kept going."], needsSupport: [], observations: ["Chair: 2 tries."], suggestedFocus: ["Keep going."], limits: "One short session." }, source: "template" });

async function main() {
  const browser = await launch();
  const width = Number(process.env.AUDIT_WIDTH || 375);
  const height = width >= 768 ? 800 : 812;
  try {
    const page = await newPage(browser, { width, height, mocks: { "/api/converse": converseMock, "/api/transcribe": transcribeQueue(["latte"]), "/api/report": () => REPORT_MOCK } });
    await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });
    await waitForText(page, "Find your words");
    await audit(page, "Welcome");

    await unlockLevels(page);
    await startApp(page);
    await audit(page, "Level 1 word screen");

    await openMenu(page);
    await audit(page, "Level menu");
    await clickByText(page, "Settings and sharing");
    await sleep(500);
    await audit(page, "Settings");
    await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });
    await startApp(page);

    await page.evaluate(() => localStorage.setItem("saykind.progress.v1", JSON.stringify({ level1: { index: 1, completed: ["chair"] }, "level2-camera": { index: 1, completed: ["x"] } })));
    await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });
    await startApp(page);
    await audit(page, "Level 1 word screen (other words)");
    await page.evaluate(() => document.querySelector('[aria-label="Call or message my caregiver"]')?.click());
    await sleep(500);
    await audit(page, "Get Help sheet");

    const cafe = await newPage(browser, { width, height, mocks: { "/api/converse": converseMock, "/api/transcribe": transcribeQueue(["latte"]), "/api/report": () => REPORT_MOCK } });
    await enterCafe(cafe);
    await waitForMicReady(cafe);
    await audit(cafe, "Café (controls)");
    await clickByText(cafe, "Menu", "button");
    await sleep(700);
    await audit(cafe, "Café menu panel");

    const level2 = await newPage(browser, { width, height });
    await level2.goto(`${BASE_URL}/level-2`, { waitUntil: "domcontentloaded" });
    await waitForText(level2, "Look around you");
    await audit(level2, "Level 2 start");
    await clickByText(level2, "Camera", "button");
    await level2.waitForSelector('button[aria-label$="Tap to practice"]', { timeout: 20000 });
    await audit(level2, "Level 2 live camera");
    await level2.click('button[aria-label$="Tap to practice"]');
    await waitForText(level2, "Practice");
    await audit(level2, "Level 2 object sheet");

    const caregiver = await newPage(browser, { width, height, mocks: { "/api/report": () => REPORT_MOCK } });
    await caregiver.goto(`${BASE_URL}/caregiver`, { waitUntil: "domcontentloaded" });
    await waitForText(caregiver, "Reports for my doctor");
    await audit(caregiver, "Caregiver view", false);
    await clickByText(caregiver, "Make a report for my doctor", "button");
    await waitForText(caregiver, "Report for my doctor", 15000);
    await waitForText(caregiver, "Written from a fixed template.", 15000);
    await audit(caregiver, "Report preview", true, '[role="dialog"]');
  } finally {
    await browser.close();
  }
  const total = findings.reduce((n, f) => n + f.count, 0);
  console.log(`\n${findings.length} screens audited, ${findings.filter((f) => f.count === 0).length} follow the rules, ${total} findings`);
  if (process.env.AUDIT_STRICT === "1" && total > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error("FAIL  audit crashed:", error.message);
  process.exitCode = 1;
});
