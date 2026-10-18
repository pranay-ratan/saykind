import { describe, expect, it } from "vitest";
import { newSession, withFollowUp, withHelpRequest, withMenuUsed, withOrder, withTurn, endSession } from "../cafe-session";
import type { PracticeEvent } from "../saykind/log";
import { assembleReportInput, hasAnyPractice, latestTranscript, localDate } from "./assemble";
import { isEmail, reportToMailto, reportToText } from "./format";
import { containsBannedLanguage } from "./language";
import { buildTemplateReport } from "./template";
import { DISCLAIMER, reportContentSchema, reportInputSchema, type ReportInput, type SavedReport } from "./types";

const NOW = new Date(2026, 9, 18, 12, 0, 0).getTime();
const HOUR = 60 * 60 * 1000;

const attempt = (itemId: string, ts: number, extra: Partial<Extract<PracticeEvent, { type: "attempt" }>> = {}): PracticeEvent => ({
  type: "attempt",
  id: `${itemId}-${ts}`,
  ts,
  level: 1,
  itemId,
  itemText: itemId,
  retry: 0,
  durationMs: 1000,
  heard: itemId,
  recognition: "matches",
  selfConfirmed: false,
  slowPlays: 0,
  normalPlays: 0,
  helpUses: 0,
  ...extra,
});

function cafeEvent(): PracticeEvent {
  const order = { drink: "latte" as const, size: "large" as const, temperature: "hot" as const, extras: [], finished: true };
  let session = withTurn(newSession(NOW - HOUR), "barista", "Hi there!", NOW - HOUR + 1);
  session = withTurn(session, "patient", "latte large", NOW - HOUR + 2);
  session = withTurn(session, "patient", "hot", NOW - HOUR + 3);
  session = withFollowUp(withMenuUsed(withHelpRequest(session)));
  session = endSession(withOrder(session, order), NOW - HOUR + 4);
  return { type: "cafe_session", ts: NOW - HOUR + 4, level: 3, completed: true, session };
}

const play = (itemId: string, ts: number, slow: boolean): PracticeEvent => ({ type: "play", ts, level: 1, itemId, itemText: itemId, slow });
const help = (itemId: string, ts: number): PracticeEvent => ({ type: "help", ts, level: 1, itemId, itemText: itemId, kind: "first-sound" });

const sampleEvents = (): PracticeEvent[] => [
  attempt("chair", NOW - 3 * HOUR),
  attempt("chair", NOW - 3 * HOUR + 10, { retry: 1 }),
  play("chair", NOW - 3 * HOUR + 11, true),
  play("chair", NOW - 3 * HOUR + 12, false),
  play("chair", NOW - 3 * HOUR + 13, false),
  play("chair", NOW - 3 * HOUR + 14, false),
  help("chair", NOW - 3 * HOUR + 15),
  help("chair", NOW - 3 * HOUR + 16),
  attempt("mug", NOW - 2 * HOUR),
  attempt("old", NOW - 80 * HOUR),
  { type: "complete", ts: NOW - 2 * HOUR + 5, level: 1, itemId: "mug", itemText: "mug", how: "self-confirmed" },
  { type: "activity", ts: NOW - 2 * HOUR + 6, level: 1, name: "adaptive", detail: "Needed extra cues on chair." },
  cafeEvent(),
];

describe("assembling a report", () => {
  it("uses only the last day and builds compact counts", () => {
    const input = assembleReportInput({ events: sampleEvents(), cameraEvents: [], adaptiveLevel: 2, now: NOW });
    expect(input.date).toBe(localDate(NOW));
    expect(input.level1.words.map((word) => word.word).sort()).toEqual(["chair", "mug"]);
    const chair = input.level1.words.find((word) => word.word === "chair");
    expect(chair).toMatchObject({ attempts: 2, hints: 2, slowPlays: 1, replays: 3 });
    expect(input.level1.words.find((word) => word.word === "mug")?.selfReports).toBe(1);
    expect(input.level1.adaptiveLevel).toBe(2);
    expect(input.level1.careNotes).toEqual(["Needed extra cues on chair."]);
    expect(input.cafe).toMatchObject({ order: "a large hot latte", completed: true, turns: 2, followUpsNeeded: 1, helpRequests: 1, menuHelpUsed: true });
  });

  it("adds Level 2 camera practice from the camera log", () => {
    const input = assembleReportInput({
      events: [],
      cameraEvents: [
        { word: "Mug", source: "camera", type: "identified", ts: NOW - HOUR },
        { word: "mug", source: "camera", type: "slow", ts: NOW - HOUR + 1 },
        { word: "mug", source: "camera", type: "attempt", ts: NOW - HOUR + 2 },
        { word: "mug", source: "camera", type: "self-reported", ts: NOW - HOUR + 3 },
      ],
      adaptiveLevel: null,
      now: NOW,
    });
    expect(input.level2.words).toEqual([{ word: "mug", attempts: 1, replays: 0, slowPlays: 1, hints: 0, selfReports: 1 }]);
  });

  it("never carries conversation text, audio or images in the input", () => {
    const input = assembleReportInput({ events: sampleEvents(), cameraEvents: [], adaptiveLevel: 1, now: NOW });
    const text = JSON.stringify(input);
    expect(text).not.toContain("latte large");
    expect(text).not.toContain("Hi there");
    expect(reportInputSchema.safeParse(input).success).toBe(true);
  });

  it("keeps the transcript separate and only from the newest visit", () => {
    expect(latestTranscript(sampleEvents(), NOW - 24 * HOUR).map((turn) => turn.text)).toEqual(["Hi there!", "latte large", "hot"]);
    expect(latestTranscript([], 0)).toEqual([]);
  });

  it("knows when there is nothing to report", () => {
    expect(hasAnyPractice(assembleReportInput({ events: [], cameraEvents: [], adaptiveLevel: null, now: NOW }))).toBe(false);
  });

  it("caps the number of words", () => {
    const events = Array.from({ length: 30 }, (_, index) => attempt(`word${index}`, NOW - HOUR + index));
    expect(assembleReportInput({ events, cameraEvents: [], adaptiveLevel: null, now: NOW }).level1.words.length).toBeLessThanOrEqual(12);
  });
});

const inputs: Record<string, ReportInput> = {
  full: assembleReportInput({ events: sampleEvents(), cameraEvents: [{ word: "mug", source: "camera", type: "attempt", ts: NOW - HOUR }], adaptiveLevel: 3, now: NOW }),
  empty: assembleReportInput({ events: [], cameraEvents: [], adaptiveLevel: null, now: NOW }),
  hardWords: assembleReportInput({
    events: [help("chair", NOW - HOUR + 4), help("chair", NOW - HOUR + 5), attempt("chair", NOW - HOUR), attempt("chair", NOW - HOUR + 1), attempt("chair", NOW - HOUR + 2), attempt("chair", NOW - HOUR + 3)],
    cameraEvents: [],
    adaptiveLevel: 1,
    now: NOW,
  }),
};

describe("the template report", () => {
  it.each(Object.keys(inputs))("is valid and free of score or judging language (%s)", (name) => {
    const content = buildTemplateReport(inputs[name]);
    expect(reportContentSchema.safeParse(content).success).toBe(true);
    expect(containsBannedLanguage(content)).toBe(false);
    const text = JSON.stringify(content);
    expect(text).not.toMatch(/\d\s?%|\bscore|\bwrong\b|\bincorrect|\bfail|diagnos/i);
  });

  it("is deterministic", () => {
    expect(buildTemplateReport(inputs.full)).toEqual(buildTemplateReport(inputs.full));
  });

  it("says what happened and where support may help", () => {
    const content = buildTemplateReport(inputs.hardWords);
    expect(content.summary).toContain("practiced 1 word in Level 1");
    expect(content.needsSupport.join(" ")).toContain("chair");
    expect(buildTemplateReport(inputs.empty).summary).toContain("No practice was recorded");
  });
});

describe("report language rules", () => {
  const base = buildTemplateReport(inputs.full);
  it("flags scores, percentages, grades and diagnostic words", () => {
    for (const bad of ["He scored well.", "About 80% of tries matched.", "That was wrong.", "This suggests a severe disorder.", "A failed attempt."]) {
      expect(containsBannedLanguage({ ...base, observations: [bad] })).toBe(true);
    }
  });
  it("allows the fixed disclaimer wording", () => {
    expect(containsBannedLanguage({ ...base, limits: "These are observations, not a diagnosis." })).toBe(false);
  });
});

describe("sharing text", () => {
  const report: SavedReport = { id: "r1", createdAt: NOW, source: "template", input: inputs.full, content: buildTemplateReport(inputs.full), disclaimer: DISCLAIMER, transcript: [{ who: "patient", text: "latte please", ts: 1 }] };

  it("always ends with the fixed line and leaves the conversation out by default", () => {
    const text = reportToText(report, false);
    expect(text).toContain(DISCLAIMER);
    expect(text).not.toContain("latte please");
    expect(reportToText(report, true)).toContain("Me: latte please");
  });

  it("builds a short mailto with a note to attach the file", () => {
    const link = reportToMailto(report, { name: "Dr. Lee", email: "lee@example.com" });
    expect(link.startsWith("mailto:lee%40example.com?subject=")).toBe(true);
    const body = decodeURIComponent(link.split("&body=")[1]);
    expect(body).toContain("Please attach the saved Saykind report file");
    expect(body).not.toContain("latte please");
    expect(body.length).toBeLessThanOrEqual(1200);
  });

  it("leaves the address empty when it is not an email", () => {
    expect(reportToMailto(report, { name: "", email: "nope" }).startsWith("mailto:?subject=")).toBe(true);
    expect(isEmail("a@b.co")).toBe(true);
  });
});
