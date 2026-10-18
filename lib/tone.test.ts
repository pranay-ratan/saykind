import { describe, expect, it } from "vitest";
import { buildTemplateReport } from "./report/template";
import { hasUndignifiedLanguage, politeSentences } from "./tone";
import { decideNextStep } from "../src/core/adaptive/rules";
import { MIC_MESSAGES } from "./use-audio-recorder";

const PATRONISING = [
  "Good job!",
  "Well done, you did it!",
  "Don't worry, take your time.",
  "I can't understand you.",
  "Just say the size.",
  "Simply tap the picture.",
  "You're a bit slow today, slow down.",
  "Perfect! That's not wrong.",
  "Here you go, sweetie.",
  "Great choice! Hot or iced?",
  "Excellent. Small, medium or large?",
  "Nice. Anything else?",
];

const DIGNIFIED = [
  "Of course. Which drink would you like?",
  "Let me check I have that right. A large latte?",
  "Thank you. Hot or iced?",
  "Take your time. You can tap Menu to choose from pictures.",
  "A medium iced tea, please. Anything else?",
  "An Americano, of course. Hot or iced?",
  "Have a lovely day!",
];

describe("dignity rules", () => {
  it("catches talking down, cheering, pity, blame and hurrying", () => {
    for (const line of PATRONISING) expect(hasUndignifiedLanguage(line), line).toBe(true);
  });

  it("lets polite adult language through", () => {
    for (const line of DIGNIFIED) expect(hasUndignifiedLanguage(line), line).toBe(false);
  });

  it("keeps only the sentences that pass", () => {
    expect(politeSentences("Good job! A large latte. Hot or iced?")).toBe("A large latte. Hot or iced?");
    expect(politeSentences("Don't worry.")).toBe("");
    expect(politeSentences("Of course. Anything else?")).toBe("Of course. Anything else?");
  });

  it("does not match everyday café words", () => {
    expect(hasUndignifiedLanguage("An iced latte and a slow-roasted coffee, please.")).toBe(false);
    expect(hasUndignifiedLanguage("Large, please. Thank you.")).toBe(false);
  });
});

describe("the app's own lines follow the rules", () => {
  it("adaptive messages", () => {
    const attempt = (closeness: number) => ({ word: "chair", level: 1, attempts: 1, closeness, replays: 0, slowPlays: 0, hintUsed: false, abandoned: false, retries: 0, ts: 1 });
    const messages = [
      decideNextStep([], 1).message,
      decideNextStep([attempt(1), attempt(1), attempt(1)], 1).message,
      decideNextStep([attempt(0.1), attempt(0.1)], 3).message,
    ];
    for (const message of messages) expect(hasUndignifiedLanguage(message), message).toBe(false);
  });

  it("the template report", () => {
    const report = buildTemplateReport({
      date: "2026-10-18",
      level1: { words: [{ word: "chair", attempts: 4, replays: 2, slowPlays: 1, hints: 2, selfReports: 1 }], adaptiveLevel: 2, careNotes: ["Level 2: one hint."] },
      level2: { words: [] },
      cafe: { turns: 6, followUpsNeeded: 2, helpRequests: 1, menuHelpUsed: true, completed: true, order: "a large hot latte" },
    } as never);
    const text = [report.summary, report.limits, ...report.strengths, ...report.needsSupport, ...report.observations, ...report.suggestedFocus].join("\n");
    expect(hasUndignifiedLanguage(text), text).toBe(false);
  });

  it("microphone messages", () => {
    for (const message of Object.values(MIC_MESSAGES)) expect(hasUndignifiedLanguage(message), message).toBe(false);
  });
});
