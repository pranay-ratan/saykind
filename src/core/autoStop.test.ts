import { describe, expect, it } from "vitest";
import { AUTO_STOP, autoStopReason, readLevel } from "./autoStop";

describe("autoStopReason", () => {
  it("keeps listening while the person has not spoken and the ceiling is far", () => {
    expect(autoStopReason({ now: 5000, startedAt: 0, lastLoudAt: null })).toBeNull();
  });

  it("keeps listening during a short pause", () => {
    expect(autoStopReason({ now: 4000, startedAt: 0, lastLoudAt: 2000 })).toBeNull();
  });

  it("stops after 2.5 seconds of silence once the person has spoken", () => {
    expect(autoStopReason({ now: 4500, startedAt: 0, lastLoudAt: 2000 })).toBe("silence");
  });

  it("stops at the 15 second ceiling even without any speech", () => {
    expect(autoStopReason({ now: AUTO_STOP.maxMs, startedAt: 0, lastLoudAt: null })).toBe("max");
  });

  it("reports the ceiling rather than silence when both apply", () => {
    expect(autoStopReason({ now: 15000, startedAt: 0, lastLoudAt: 1000 })).toBe("max");
  });

  it("takes custom limits", () => {
    expect(autoStopReason({ now: 1200, startedAt: 0, lastLoudAt: 100 }, { silenceMs: 1000, maxMs: 9000, speechLevel: 0.1 })).toBe("silence");
  });
});

describe("readLevel", () => {
  it("returns 0 with no element or no value", () => {
    expect(readLevel(null)).toBe(0);
  });

  it("parses the --level variable", () => {
    const fake = { style: { getPropertyValue: () => "0.42" } } as unknown as HTMLElement;
    expect(readLevel(fake)).toBeCloseTo(0.42);
  });
});
