/**
 * When a Level 2 recording should end by itself. The person can always tap to stop; this only helps when they
 * forget: after a stretch of silence once they have spoken, or at a hard ceiling. Nothing here is shown as a timer.
 */
export const AUTO_STOP = {
  /** Silence (after speech) that ends the recording. */
  silenceMs: 2500,
  /** The longest a recording can run. */
  maxMs: 15000,
  /** The live level (0 to 1, from the recorder's ring) that counts as speech. */
  speechLevel: 0.08,
} as const;

export type AutoStopLimits = { silenceMs: number; maxMs: number; speechLevel: number };

export type AutoStopReason = "silence" | "max" | null;

export interface AutoStopInput {
  now: number;
  startedAt: number;
  /** When the level was last at or above speechLevel, or null if the person has not spoken yet. */
  lastLoudAt: number | null;
}

/** Why the recording should stop now, or null to keep listening. The ceiling wins over silence. */
export function autoStopReason(input: AutoStopInput, limits: AutoStopLimits = AUTO_STOP): AutoStopReason {
  if (input.now - input.startedAt >= limits.maxMs) return "max";
  if (input.lastLoudAt !== null && input.now - input.lastLoudAt >= limits.silenceMs) return "silence";
  return null;
}

/** Reads the live level the recorder writes as the CSS variable --level on its target element. */
export function readLevel(target: HTMLElement | null): number {
  const raw = target?.style.getPropertyValue("--level");
  const value = raw ? Number.parseFloat(raw) : 0;
  return Number.isFinite(value) ? value : 0;
}
