"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { requestAdaptation } from "../../adaptive-client";
import { closenessScore } from "../../../src/core/adaptive/closeness";
import type { AdaptiveDecision, AttemptEvent, CueSupport } from "../../../src/core/adaptive/types";
import type { LearnItem } from "../items";
import { logEvent } from "../log";

/**
 * Level 1's adaptive layer. It counts what the person does with each word (replays, slow listens, hints, skips), turns
 * each recognised attempt into an AttemptEvent, asks the server for the next step, and keeps the decision for the screen.
 * The person only ever sees the short calm message. The care note goes to the practice record.
 */

const LEVEL_KEY = "saykind_adaptive_level";
const DEFAULT_LEVEL = 1;
const MAX_RECENT = 10;

type WordCounts = { word: string; replays: number; slowPlays: number; hintUsed: boolean };

function freshCounts(word: string): WordCounts {
  return { word, replays: 0, slowPlays: 0, hintUsed: false };
}

/** Reads the saved level on the first client render. Never throws; the default is used if storage is unavailable. */
function savedLevel(): number {
  try {
    const value = Number(window.localStorage.getItem(LEVEL_KEY));
    return Number.isInteger(value) && value >= 1 && value <= 5 ? value : DEFAULT_LEVEL;
  } catch {
    return DEFAULT_LEVEL;
  }
}

function saveLevel(level: number): void {
  try {
    window.localStorage.setItem(LEVEL_KEY, String(level));
  } catch {
    // Storage can be blocked; the level then simply resets next visit.
  }
}

export type AdaptiveState = {
  level: number;
  message: string | null;
  cueSupport: CueSupport;
  autoSlow: boolean;
  /** Counts a listen. `slow` is the snail. */
  recordReplay: (slow: boolean) => void;
  recordHint: () => void;
  /** Called when the person moves past the word without practising it. */
  recordAbandon: () => void;
};

export function useAdaptive({
  enabled,
  word,
  status,
  heard,
  attemptCount,
}: {
  /** Only Level 1 sends events. Other screens that use the exercise controller stay unwired. */
  enabled: boolean;
  word: LearnItem;
  status: string;
  heard: string | null;
  attemptCount: number;
}): AdaptiveState {
  const [state, setState] = useState(() => ({
    level: typeof window === "undefined" ? DEFAULT_LEVEL : savedLevel(),
    message: null as string | null,
    cueSupport: "none" as CueSupport,
    autoSlow: false,
  }));

  const countsRef = useRef<WordCounts>(freshCounts(word.id));
  const recentRef = useRef<AttemptEvent[]>([]);
  const lastKeyRef = useRef<string | null>(null);

  const countsFor = useCallback((): WordCounts => {
    if (countsRef.current.word !== word.id) countsRef.current = freshCounts(word.id);
    return countsRef.current;
  }, [word.id]);

  const apply = useCallback((decision: AdaptiveDecision) => {
    setState((current) => ({
      ...current,
      level: decision.nextLevel,
      message: decision.message,
      cueSupport: decision.cueSupport,
      autoSlow: decision.autoSlow,
    }));
    saveLevel(decision.nextLevel);
    logEvent({ type: "activity", ts: Date.now(), level: 1, name: "adaptive", detail: decision.careNote });
  }, []);

  const decide = useCallback(
    async (event: AttemptEvent) => {
      if (!enabled) return;
      const recent = [...recentRef.current, event].slice(-MAX_RECENT);
      recentRef.current = recent;
      const decision = await requestAdaptation(recent, event.level);
      if (decision) apply(decision);
    },
    [apply, enabled],
  );

  // One event per finished attempt. The key stops the same result from being sent twice on re-render.
  useEffect(() => {
    if (!enabled || status !== "result" || heard === null) return;
    const key = `${word.id}|${attemptCount}|${heard}`;
    if (lastKeyRef.current === key) return;
    lastKeyRef.current = key;

    const counts = countsFor();
    void decide({
      word: word.text,
      level: state.level,
      replays: counts.replays,
      slowPlays: counts.slowPlays,
      hintUsed: counts.hintUsed,
      attempts: attemptCount,
      transcript: heard || undefined,
      closeness: closenessScore(word.text, heard),
      abandoned: false,
    });
  }, [enabled, status, heard, attemptCount, word.id, word.text, state.level, countsFor, decide]);

  const recordReplay = (slow: boolean) => {
    const counts = countsFor();
    if (slow) counts.slowPlays += 1;
    else counts.replays += 1;
  };

  const recordHint = () => {
    countsFor().hintUsed = true;
  };

  const recordAbandon = () => {
    const counts = countsFor();
    void decide({
      word: word.text,
      level: state.level,
      replays: counts.replays,
      slowPlays: counts.slowPlays,
      hintUsed: counts.hintUsed,
      attempts: attemptCount,
      closeness: 0,
      abandoned: true,
    });
  };

  return {
    level: state.level,
    message: state.message,
    cueSupport: state.cueSupport,
    autoSlow: state.autoSlow,
    recordReplay,
    recordHint,
    recordAbandon,
  };
}
