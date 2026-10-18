// The café conversation end to end with mocks: a fragmented utterance, a change of mind, an empty turn, a picture
// answer from the Help sheet, the order complete state and "See my report"; then the failed-voice fallback.
// Speech, transcription and Claude are mocked, so no provider is contacted.
import { BASE_URL, checkAxe, clickByText, finish, launch, newPage, openMenu, record, sleep, unlockLevels, waitForText } from "./helpers.mjs";

const json = (value) => ({ status: 200, contentType: "application/json", body: Buffer.from(JSON.stringify(value)) });
const EMPTY = { drink: null, size: null, temperature: null, extras: [], finished: false };
const BANNED = /perfect|wrong|incorrect|mistake|score|good job/i;

/** A stateless stand-in for the barista: it reads the client's order and what the person said. */
function converseMock({ body }) {
  const request = JSON.parse(body);
  const order = { ...EMPTY, ...request.order, extras: [...(request.order?.extras ?? [])] };
  const text = (request.patient?.text ?? "").toLowerCase();
  if (request.patient?.via === "tap" && request.tapped?.slot === "temperature") {
    order.temperature = request.tapped.id;
    return json({ reply: "Got it. Anything else?", order, nextSlot: "extras", unclearStreak: 0 });
  }
  if (request.patient?.via === "silence" || !text) {
    return json({ reply: "That's okay, take your time. Hot or iced? You can tap Menu to choose from pictures.", order, nextSlot: "temperature", unclearStreak: (request.unclearStreak ?? 0) + 1 });
  }
  if (/no thank/.test(text)) {
    order.finished = true;
    return json({ reply: "You're welcome! A large hot tea. Have a lovely day!", order, nextSlot: "none", unclearStreak: 0 });
  }
  if (/tea/.test(text)) order.drink = "hot-tea";
  else if (/latte/.test(text)) order.drink = "latte";
  if (/large/.test(text)) order.size = "large";
  const reply = order.drink === "hot-tea" ? "Hot tea instead. Hot or iced?" : "A large latte. Hot or iced?";
  return json({ reply, order, nextSlot: "temperature", unclearStreak: 0 });
}

function transcribeQueue(texts) {
  let index = 0;
  return () => json({ text: texts[Math.min(index++, texts.length - 1)] });
}

const label = (text) => `[aria-label="${text}"]`;

async function waitForMicReady(page) {
  await page.waitForSelector(label("Tap to speak"), { timeout: 25000 });
}

async function speakTurn(page) {
  await waitForMicReady(page);
  await page.click(label("Tap to speak"));
  await page.waitForSelector(label("Finish speaking"), { timeout: 8000 });
  await sleep(800);
  await page.click(label("Finish speaking"));
}

async function enterCafe(page) {
  await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });
  await unlockLevels(page);
  await page.waitForFunction(() => [...document.querySelectorAll("button")].some((b) => b.textContent?.trim() === "Start"), { timeout: 15000 });
  await clickByText(page, "Start", "button");
  await waitForText(page, "Listen, then say the word");
  await openMenu(page);
  await clickByText(page, "At the Café");
}

async function main() {
  const browser = await launch();
  try {
    // 1. A full order: fragment, change of mind, empty turn, a picture answer, then complete.
    const page = await newPage(browser, {
      mocks: {
        "/api/converse": converseMock,
        "/api/transcribe": transcribeQueue(["latte... large", "no, tea", "", "no thank you"]),
      },
    });
    await enterCafe(page);
    await waitForText(page, "What can I get for you today?", 25000);
    record("conversation: the barista greets first", true);

    await speakTurn(page);
    await waitForText(page, "A large latte. Hot or iced?");
    record("conversation: a fragment ('latte... large') is taken as an answer", true);

    await speakTurn(page);
    await waitForText(page, "Hot tea instead.");
    record("conversation: a change of mind updates the order", true);

    await speakTurn(page); // empty transcript
    await waitForText(page, "take your time");
    const gentle = await page.evaluate(() => document.body.innerText);
    record("conversation: an empty turn gets a gentle question and the menu pictures", gentle.includes("tap Menu") && !BANNED.test(gentle));

    // Picture answer from the Help sheet feeds the same conversation.
    await waitForMicReady(page);
    await clickByText(page, "Help", "button");
    await page.waitForSelector(label("Hot"), { timeout: 8000 });
    await page.click(label("Hot"));
    await page.click('[aria-label^="Choose Hot"]');
    await waitForText(page, "Anything else?");
    record("conversation: a picture answer continues the same conversation", true);

    await speakTurn(page);
    await waitForText(page, "Have a lovely day!");
    await page.waitForFunction(() => [...document.querySelectorAll("button")].some((b) => b.textContent?.includes("See my report")), { timeout: 15000 });
    record("conversation: the closing line shows, then See my report", true);
    await checkAxe(page, "Café, order complete");

    const saved = await page.evaluate(() => {
      const events = JSON.parse(localStorage.getItem("saykind.log.v1") ?? "[]");
      return events.find((event) => event.type === "cafe_session") ?? null;
    });
    record("conversation: the session is written to the practice log", Boolean(saved && saved.completed === true), saved ? `turns ${saved.session.turns.length}` : "none");
    if (saved) {
      record("conversation: session holds the order, help use and follow-ups", saved.session.order.drink === "hot-tea" && saved.session.order.finished && saved.session.helpRequests >= 1 && saved.session.menuHelpUsed === true && saved.session.followUpsNeeded >= 1 && saved.session.endedAt > saved.session.startedAt, JSON.stringify({ help: saved.session.helpRequests, menu: saved.session.menuHelpUsed, followUps: saved.session.followUpsNeeded }));
    }

    // 2. The server voice fails: the line is still shown and the conversation goes on.
    const failed = await newPage(browser, {
      mocks: {
        "/api/speak": () => ({ status: 502, contentType: "application/json", body: Buffer.from(JSON.stringify({ error: "upstream" })) }),
        "/api/converse": converseMock,
      },
    });
    await enterCafe(failed);
    await waitForText(failed, "What can I get for you today?", 25000);
    await waitForMicReady(failed);
    record("fallback: when the server voice fails the line stays on screen and it is still your turn", true);
  } finally {
    await browser.close();
  }
  finish();
}

main().catch((error) => {
  console.error("FAIL  suite crashed:", error.message);
  process.exitCode = 1;
});
