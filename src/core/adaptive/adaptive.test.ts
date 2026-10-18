import { describe, expect, it } from "vitest";
import { closenessScore, editDistance, normalizeWord } from "./closeness";
import { parseDecision, compactEvents } from "./claude";
import { decideNextStep } from "./rules";
import type { AttemptEvent } from "./types";

function attempt(overrides: Partial<AttemptEvent> = {}): AttemptEvent {
  return {
    word: "mug",
    level: 2,
    replays: 0,
    slowPlays: 0,
    hintUsed: false,
    attempts: 1,
    closeness: 0.9,
    abandoned: false,
    ...overrides,
  };
}

describe("normalizeWord", () => {
  it("lowercases, drops punctuation and collapses spaces", () => {
    expect(normalizeWord("  Coffee!  ")).toBe("coffee");
    expect(normalizeWord("Water   bottle.")).toBe("water bottle");
  });
});

describe("editDistance", () => {
  it("counts single-letter edits", () => {
    expect(editDistance("mug", "mug")).toBe(0);
    expect(editDistance("mug", "mud")).toBe(1);
    expect(editDistance("cup", "")).toBe(3);
  });
});

describe("closenessScore", () => {
  it("scores an exact match as 1", () => {
    expect(closenessScore("mug", "Mug!")).toBe(1);
  });

  it("scores a heard word that contains the target as 1", () => {
    expect(closenessScore("cup", "a cup please")).toBe(1);
  });

  it("gives partial credit to a near miss", () => {
    const score = closenessScore("chair", "chare");
    expect(score).toBeGreaterThan(0.5);
    expect(score).toBeLessThan(1);
  });

  it("gives a first-sound match a small extra boost", () => {
    const withSound = closenessScore("banana", "bxxxxx");
    const withoutSound = closenessScore("banana", "xbxxxx");
    expect(withSound).toBeGreaterThan(withoutSound);
  });

  it("scores nothing heard as 0", () => {
    expect(closenessScore("mug", "")).toBe(0);
  });
});

describe("decideNextStep", () => {
  it("stays put with no attempts and gives no cue", () => {
    const decision = decideNextStep([], 2);
    expect(decision.nextLevel).toBe(2);
    expect(decision.cueSupport).toBe("none");
    expect(decision.autoSlow).toBe(false);
  });

  it("steps up after three close attempts in a row with no hints", () => {
    const recent = [attempt(), attempt(), attempt()];
    expect(decideNextStep(recent, 2).nextLevel).toBe(3);
  });

  it("does not step up when a hint was used in the close run", () => {
    const recent = [attempt(), attempt({ hintUsed: true }), attempt()];
    expect(decideNextStep(recent, 2).nextLevel).toBe(2);
  });

  it("steps down after two struggles in a row", () => {
    const recent = [attempt({ closeness: 0.1 }), attempt({ closeness: 0.2 })];
    const decision = decideNextStep(recent, 3);
    expect(decision.nextLevel).toBe(2);
    expect(decision.autoSlow).toBe(true);
    expect(decision.cueSupport).toBe("syllables");
  });

  it("steps down after a single abandoned word", () => {
    const decision = decideNextStep([attempt({ abandoned: true, closeness: 0 })], 4);
    expect(decision.nextLevel).toBe(3);
  });

  it("never moves more than one level at once", () => {
    const recent = Array.from({ length: 10 }, () => attempt());
    expect(decideNextStep(recent, 2).nextLevel).toBe(3);
  });

  it("keeps the level inside 1 to 5", () => {
    expect(decideNextStep([attempt({ abandoned: true, closeness: 0 })], 1).nextLevel).toBe(1);
    expect(decideNextStep(Array.from({ length: 3 }, () => attempt()), 5).nextLevel).toBe(5);
  });

  it("never uses scoring or wrong-answer words in the message", () => {
    const messages = [
      decideNextStep([], 1).message,
      decideNextStep([attempt(), attempt(), attempt()], 1).message,
      decideNextStep([attempt({ closeness: 0.1 }), attempt({ closeness: 0.1 })], 3).message,
    ];
    for (const message of messages) {
      expect(message.toLowerCase()).not.toMatch(/wrong|incorrect|score|%|grade/);
    }
  });
});

describe("parseDecision (Claude reply)", () => {
  const reply = JSON.stringify({
    nextLevel: 5,
    cueSupport: "firstSound",
    autoSlow: false,
    message: "Good effort. Let's keep going.",
    careNote: "Level change suggested.",
  });

  it("reads JSON wrapped in prose", () => {
    const decision = parseDecision(`Here you go: ${reply}`, 3);
    expect(decision.cueSupport).toBe("firstSound");
  });

  it("clamps the suggested level to one step from where the person is", () => {
    expect(parseDecision(reply, 3).nextLevel).toBe(4);
  });

  it("rejects a reply with the wrong shape", () => {
    expect(() => parseDecision('{"nextLevel": 2}', 2)).toThrow();
  });

  it("rejects a reply with no JSON", () => {
    expect(() => parseDecision("sorry, no", 2)).toThrow();
  });
});

describe("compactEvents", () => {
  it("keeps only the last ten events and no extra fields", () => {
    const events = Array.from({ length: 12 }, (_, index) => ({ ...attempt(), word: `w${index}`, audio: "secret" }));
    const compact = compactEvents(events as unknown as AttemptEvent[]);
    expect(compact).toHaveLength(10);
    expect(compact[0]).not.toHaveProperty("audio");
    expect(compact[9].word).toBe("w11");
  });
});
