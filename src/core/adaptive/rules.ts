import { MAX_LEVEL, MIN_LEVEL, type AdaptiveDecision, type AttemptEvent, type CueSupport } from "./types";

/** An attempt at or above this closeness counts as close. */
const CLOSE_THRESHOLD = 0.7;
/** Below this closeness an attempt counts as a struggle. */
const STRUGGLE_THRESHOLD = 0.4;
const STEP_UP_CLOSE_STREAK = 3;
const STEP_DOWN_STRUGGLE_STREAK = 2;
const SLOW_AFTER_STRUGGLE_STREAK = 2;

export function clampLevel(level: number): number {
  return Math.min(MAX_LEVEL, Math.max(MIN_LEVEL, Math.round(level)));
}

function isClose(event: AttemptEvent): boolean {
  return !event.abandoned && event.closeness >= CLOSE_THRESHOLD;
}

function isStruggle(event: AttemptEvent): boolean {
  return event.abandoned || event.closeness < STRUGGLE_THRESHOLD;
}

/** How many events at the end of the list satisfy the predicate in a row. */
function trailingStreak(events: readonly AttemptEvent[], predicate: (event: AttemptEvent) => boolean): number {
  let count = 0;
  for (let index = events.length - 1; index >= 0 && predicate(events[index]); index -= 1) {
    count += 1;
  }
  return count;
}

function cueFor(struggles: number, lastHintUsed: boolean): CueSupport {
  if (struggles >= STEP_DOWN_STRUGGLE_STREAK) return "syllables";
  if (struggles >= 1 || lastHintUsed) return "firstSound";
  return "none";
}

function messageFor(direction: "up" | "down" | "stay", cue: CueSupport): string {
  if (direction === "up") return "You're getting these on the first try. Let's try a new word that's a little bigger.";
  if (direction === "down") return "Let's take it a little slower together. Here is some help with the sounds.";
  if (cue === "syllables") return "Let's break the word into parts. Take all the time you need.";
  if (cue === "firstSound") return "Here's a little help with the first sound. Take your time.";
  return "Nice practice. Keep going at your own pace.";
}

/**
 * The fallback rules. Works with no key. Moves at most one level per decision:
 * up after 3 close attempts in a row with no hints, down after 2 struggles in a row or after any abandoned attempt.
 * Patients are never told a score or that they were wrong; the care note is for the care team only.
 */
export function decideNextStep(recent: readonly AttemptEvent[], currentLevel: number): AdaptiveDecision {
  const level = clampLevel(currentLevel);
  if (recent.length === 0) {
    return { nextLevel: level, cueSupport: "none", autoSlow: false, message: messageFor("stay", "none"), careNote: `Level ${level}: no attempts yet.` };
  }

  const last = recent[recent.length - 1];
  const struggles = trailingStreak(recent, isStruggle);
  const closes = trailingStreak(recent, (event) => isClose(event) && !event.hintUsed);

  const goingDown = last.abandoned || struggles >= STEP_DOWN_STRUGGLE_STREAK;
  const goingUp = !goingDown && closes >= STEP_UP_CLOSE_STREAK;
  const nextLevel = clampLevel(goingDown ? level - 1 : goingUp ? level + 1 : level);
  const direction = goingDown ? "down" : goingUp ? "up" : "stay";

  const cueSupport = goingUp ? "none" : cueFor(struggles, last.hintUsed);
  const autoSlow = struggles >= SLOW_AFTER_STRUGGLE_STREAK;

  const careNote = describeCare(direction, nextLevel, level, struggles, closes);
  return { nextLevel, cueSupport, autoSlow, message: messageFor(direction, cueSupport), careNote };
}

function describeCare(direction: "up" | "down" | "stay", nextLevel: number, level: number, struggles: number, closes: number): string {
  if (direction === "up") return `Moved up to level ${nextLevel} after ${closes} close attempts in a row with no hints.`;
  if (direction === "down") return `Moved down to level ${nextLevel} after ${struggles} hard attempts or an abandoned word.`;
  return `Staying at level ${level}. Recent hard attempts in a row: ${struggles}; close attempts without hints in a row: ${closes}.`;
}
