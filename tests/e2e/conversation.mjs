// The café conversation end to end with mocks: a fragmented utterance, a change of mind, an empty turn, a picture
// answer from the Help sheet, the order complete state and "See my report"; then the failed-voice fallback.
// Speech, transcription and Claude are mocked, so no provider is contacted.
import { BANNED, checkAxe, converseMock, enterCafe, finish, label, launch, newPage, record, speakTurn, transcribeQueue, waitForMicReady, waitForText, clickByText } from "./helpers.mjs";

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
