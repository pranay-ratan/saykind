import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const baristaChat = vi.fn();
vi.mock("./llm", () => ({ baristaChat: (...args: unknown[]) => baristaChat(...args) }));

import { EMPTY_ORDER } from "../order";
import { runBaristaTurn } from "./barista";

const model = (overrides: Record<string, unknown>) => ({
  confidence: "clear",
  asks_for_help: false,
  drink: "unchanged",
  size: "unchanged",
  temperature: "unchanged",
  add_extras: [],
  remove_extras: [],
  clear_order: false,
  finish_order: false,
  next_question: "none",
  reply: "Okay.",
  ...overrides,
});

beforeEach(() => baristaChat.mockReset());

describe("barista turn", () => {
  it("takes a fragment as an answer and asks one next question", async () => {
    baristaChat.mockResolvedValueOnce(model({ drink: "latte", size: "large", next_question: "temperature", reply: "A large latte. Hot or iced?" }));
    const result = await runBaristaTurn({ history: [], order: EMPTY_ORDER, patient: { via: "speech", text: "latte... large" }, unclearStreak: 0 });
    expect(result.order).toMatchObject({ drink: "latte", size: "large" });
    expect(result.nextSlot).toBe("temperature");
    expect(result.reply).toBe("A large latte. Hot or iced?");
    expect(result.unclearStreak).toBe(0);
  });

  it("lets the customer change their mind", async () => {
    const order = { ...EMPTY_ORDER, drink: "latte" as const, size: "large" as const };
    baristaChat.mockResolvedValueOnce(model({ drink: "hot-tea", next_question: "temperature", reply: "Hot tea instead. Hot or iced?" }));
    const result = await runBaristaTurn({ history: [], order, patient: { via: "speech", text: "no, tea" }, unclearStreak: 0 });
    expect(result.order.drink).toBe("hot-tea");
    expect(result.order.size).toBe("large");
  });

  it("keeps the order and asks gently when nothing could be made out", async () => {
    baristaChat.mockResolvedValueOnce(model({ confidence: "unclear", next_question: "drink", reply: "That's okay, take your time. Coffee or tea?" }));
    const result = await runBaristaTurn({ history: [], order: EMPTY_ORDER, patient: { via: "silence", text: "" }, unclearStreak: 1 });
    expect(result.order).toEqual(EMPTY_ORDER);
    expect(result.unclearStreak).toBe(2);
  });

  it("rejects a drink that is not on the menu and removes judging words from the reply", async () => {
    baristaChat.mockResolvedValue(model({ drink: "flat-white", next_question: "drink", reply: "Perfect! Which drink would you like?" }));
    const result = await runBaristaTurn({ history: [], order: EMPTY_ORDER, patient: { via: "speech", text: "flat white" }, unclearStreak: 0 });
    expect(result.order.drink).toBeNull();
    expect(result.reply).not.toMatch(/perfect/i);
  });

  it("finishes the order when the customer wants nothing more", async () => {
    const order = { ...EMPTY_ORDER, drink: "latte" as const, size: "large" as const, temperature: "hot" as const };
    baristaChat.mockResolvedValueOnce(model({ finish_order: true, next_question: "none", reply: "You're welcome! A large hot latte. Have a lovely day!" }));
    const result = await runBaristaTurn({ history: [], order, patient: { via: "speech", text: "no thank you" }, unclearStreak: 0 });
    expect(result.order.finished).toBe(true);
    expect(result.nextSlot).toBe("none");
  });

  it("gives a gentle reply when the model times out", async () => {
    const { LlmError } = await import("./llm/claude");
    baristaChat.mockRejectedValueOnce(new LlmError("timeout", "slow"));
    const result = await runBaristaTurn({ history: [], order: EMPTY_ORDER, patient: { via: "speech", text: "hmm" }, unclearStreak: 0 });
    expect(result.reply).toContain("Menu");
    expect(result.order).toEqual(EMPTY_ORDER);
  });
});
