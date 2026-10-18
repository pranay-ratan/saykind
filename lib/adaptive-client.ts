"use client";

import type { AdaptiveDecision, AttemptEvent } from "../src/core/adaptive/types";

/**
 * Asks the server for the next step. Never throws and never shows an error: any failure returns null, and the
 * practice screen simply keeps its current settings. Only text and numbers are sent (see src/core/adaptive).
 */
export async function requestAdaptation(recent: AttemptEvent[], currentLevel: number): Promise<AdaptiveDecision | null> {
  try {
    const response = await fetch("/api/adapt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recent, currentLevel }),
    });
    if (!response.ok) return null;
    const data = (await response.json()) as { decision?: AdaptiveDecision };
    return data.decision ?? null;
  } catch {
    return null;
  }
}
