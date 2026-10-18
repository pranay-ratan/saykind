import { describe, expect, it } from "vitest";
import { isLevelUnlocked, parseLevelReturn } from "./unlock";

describe("level unlocking", () => {
  it("keeps Levels 1 and 2 open", () => {
    expect(isLevelUnlocked(1, { level2Complete: false, unlockAll: false })).toBe(true);
    expect(isLevelUnlocked(2, { level2Complete: false, unlockAll: false })).toBe(true);
  });

  it("opens the café and phrases only after Level 2", () => {
    expect(isLevelUnlocked(3, { level2Complete: false, unlockAll: false })).toBe(false);
    expect(isLevelUnlocked(4, { level2Complete: false, unlockAll: false })).toBe(false);
    expect(isLevelUnlocked(3, { level2Complete: true, unlockAll: false })).toBe(true);
  });

  it("opens everything when the unlock-all switch is on", () => {
    expect(isLevelUnlocked(4, { level2Complete: false, unlockAll: true })).toBe(true);
  });

  it("reads the return markers from the address", () => {
    expect(parseLevelReturn("?from=level2&next=cafe")).toEqual({ fromLevel2: true, nextCafe: true });
    expect(parseLevelReturn("?from=level2")).toEqual({ fromLevel2: true, nextCafe: false });
    expect(parseLevelReturn("")).toEqual({ fromLevel2: false, nextCafe: false });
  });
});
