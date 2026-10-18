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
});
