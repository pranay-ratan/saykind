/**
 * Which levels are open. The levels are a path, not a gate: by default every level is open from the menu and Level 2
 * (the camera) is optional. Setting NEXT_PUBLIC_UNLOCK_ALL_LEVELS=false restores the old rule, where the café (3) and
 * the real-world phrases (4) open once Level 2 has been completed on this device.
 */
export type LevelNumber = 1 | 2 | 3 | 4;

export const UNLOCK_ALL_LEVELS = process.env.NEXT_PUBLIC_UNLOCK_ALL_LEVELS !== "false";

export function isLevelUnlocked(level: LevelNumber, state: { level2Complete: boolean; unlockAll?: boolean }): boolean {
  if (state.unlockAll ?? UNLOCK_ALL_LEVELS) return true;
  if (level <= 2) return true;
  return state.level2Complete;
}

/** Where /level-2 sends the person back to. The app reads these on load. NEXT_AFTER_LEVEL2 opens the café itself. */
export const RETURN_FROM_LEVEL2 = "/?from=level2";
export const NEXT_AFTER_LEVEL2 = "/?from=level2&next=cafe";

export type LevelReturn = { fromLevel2: boolean; nextCafe: boolean };

export function parseLevelReturn(search: string): LevelReturn {
  const params = new URLSearchParams(search);
  return { fromLevel2: params.get("from") === "level2", nextCafe: params.get("next") === "cafe" };
}
