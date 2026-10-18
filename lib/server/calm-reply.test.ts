import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("./llm", () => ({ baristaChat: vi.fn() }));

import { calmReply } from "./barista";

describe("calm reply", () => {
  it("leaves a gentle reply alone", () => {
    expect(calmReply("A large latte. Hot or iced?", "temperature")).toBe("A large latte. Hot or iced?");
  });

  it("drops a sentence that says perfect or wrong", () => {
    expect(calmReply("Perfect! A large latte. Hot or iced?", "temperature")).toBe(" A large latte. Hot or iced?".trim());
    expect(calmReply("That's not wrong at all. Hot or iced?", "temperature")).toBe("Hot or iced?");
  });

  it("falls back to a calm question when nothing is left", () => {
    expect(calmReply("Perfect!", "size")).toBe("Got it. Small, medium or large?");
  });

  it("drops cheering, pity, blame and hurrying, keeping the polite part", () => {
    expect(calmReply("Good job! A large latte. Hot or iced?", "temperature")).toBe("A large latte. Hot or iced?");
    expect(calmReply("Don't worry. Hot or iced?", "temperature")).toBe("Hot or iced?");
    expect(calmReply("I can't understand you. Coffee or tea?", "drink")).toBe("Coffee or tea?");
    expect(calmReply("Just tell me the size.", "size")).toBe("Got it. Small, medium or large?");
  });

  it("drops praise of a choice and keeps the plain confirmation", () => {
    expect(calmReply("Great choice! An Americano, of course. Hot or iced?", "temperature")).toBe("An Americano, of course. Hot or iced?");
    expect(calmReply("Excellent. Anything else?", "extras")).toBe("Anything else?");
    expect(calmReply("Nice!", "drink")).toBe("Of course. Which drink would you like?");
  });
});
