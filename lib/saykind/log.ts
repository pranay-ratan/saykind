"use client";

import type { CafeSession } from "@/lib/cafe-session";
import { createLocalStore } from "./store";

/**
 * The practice record: what was practiced, when, how many tries, what help was used, and what the computer
 * heard. It is kept on THIS device. A "recognition" is only ever what automatic speech recognition returned,
 * which can be wrong for any voice and is especially unreliable for speech affected by aphasia, so it is always
 * stored and shown as uncertain, never as a pronunciation grade.
 */
export type Level = 1 | 2 | 3 | 4;

export type Recognition = "matches" | "differs" | "nothing" | "error";

export type PracticeEvent =
  | {
      type: "attempt";
      id: string;
      ts: number;
      level: Level;
      itemId: string;
      itemText: string;
      /** 0 for the first try, 1 for the first retry, and so on (within one visit to the word). */
      retry: number;
      durationMs: number;
      /** What automatic speech recognition returned. Uncertain. */
      heard: string;
      recognition: Recognition;
      /** The person said "that's what I meant". */
      selfConfirmed: boolean;
      slowPlays: number;
      normalPlays: number;
      helpUses: number;
      /** A saved recording of this attempt, if the person chose to keep recordings. */
      sampleId?: string;
    }
  | { type: "play"; ts: number; level: Level; itemId: string; itemText: string; slow: boolean }
  | { type: "help"; ts: number; level: Level; itemId: string; itemText: string; kind: "syllables" | "first-sound" | "skip" | "picture-help" | "menu" }
  | { type: "select"; ts: number; level: Level; itemId: string; itemText: string; via: "tap" }
  | { type: "complete"; ts: number; level: Level; itemId: string; itemText: string; how: "heard-match" | "self-confirmed" | "skipped" | "continued" }
  | { type: "activity"; ts: number; level: Level; name: string; detail?: string }
  | { type: "cafe_session"; ts: number; level: 3; completed: boolean; session: CafeSession }
  | { type: "help_request"; ts: number; action: "call-started" | "summary-opened" | "summary-copied" | "summary-shared" };

const MAX_EVENTS = 4000;
const store = createLocalStore<PracticeEvent[]>("saykind.log.v1", []);

export const useLog = () => store.use();
export const getLog = () => store.get();

export function logEvent(event: PracticeEvent) {
  store.update((events) => [...events, event].slice(-MAX_EVENTS));
}

export const newId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
export const clearLog = () => store.set([]);

/* ------------------------------------------------------------------------------------------ */
/* Summaries, shared by the caregiver view and the help message                                */
/* ------------------------------------------------------------------------------------------ */

export type WordSummary = {
  itemId: string;
  itemText: string;
  level: Level;
  attempts: number;
  retries: number;
  lastTs: number;
  slowPlays: number;
  normalPlays: number;
  helpUses: number;
  matches: number;
  differs: number;
  nothing: number;
  errors: number;
  selfConfirmed: number;
  /** The last few things the computer reported hearing (uncertain). */
  heard: { ts: number; text: string; recognition: Recognition }[];
  completed: boolean;
};

export function summarise(events: PracticeEvent[]): WordSummary[] {
  const map = new Map<string, WordSummary>();
  const get = (event: { level: Level; itemId: string; itemText: string; ts: number }) => {
    const key = `${event.level}:${event.itemId}`;
    let summary = map.get(key);
    if (!summary) {
      summary = {
        itemId: event.itemId,
        itemText: event.itemText,
        level: event.level,
        attempts: 0,
        retries: 0,
        lastTs: 0,
        slowPlays: 0,
        normalPlays: 0,
        helpUses: 0,
        matches: 0,
        differs: 0,
        nothing: 0,
        errors: 0,
        selfConfirmed: 0,
        heard: [],
        completed: false,
      };
      map.set(key, summary);
    }
    summary.lastTs = Math.max(summary.lastTs, event.ts);
    return summary;
  };

  for (const event of events) {
    if (event.type === "attempt") {
      const s = get(event);
      s.attempts += 1;
      if (event.retry > 0) s.retries += 1;
      if (event.recognition === "matches") s.matches += 1;
      if (event.recognition === "differs") s.differs += 1;
      if (event.recognition === "nothing") s.nothing += 1;
      if (event.recognition === "error") s.errors += 1;
      if (event.heard) s.heard = [...s.heard, { ts: event.ts, text: event.heard, recognition: event.recognition }].slice(-4);
    } else if (event.type === "play") {
      const s = get(event);
      if (event.slow) s.slowPlays += 1;
      else s.normalPlays += 1;
    } else if (event.type === "help") {
      get(event).helpUses += 1;
    } else if (event.type === "complete") {
      const s = get(event);
      s.completed = true;
      if (event.how === "self-confirmed") s.selfConfirmed += 1;
    } else if (event.type === "select") {
      get(event);
    }
  }
  return [...map.values()].sort((a, b) => b.lastTs - a.lastTs);
}

/** Words that might benefit from more practice, phrased as a suggestion rather than a verdict. */
export function mightBenefit(summary: WordSummary): boolean {
  return summary.attempts >= 3 || summary.helpUses >= 2 || (summary.attempts >= 2 && summary.matches === 0 && summary.selfConfirmed === 0);
}

export function relativeTime(ts: number, now = Date.now()): string {
  const minutes = Math.round((now - ts) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.round(hours / 24);
  return days === 1 ? "yesterday" : `${days} days ago`;
}
