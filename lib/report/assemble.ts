import type { SessionTurn } from "../cafe-session";
import { describeOrder } from "../order";
import { summarise, type PracticeEvent as LogEvent } from "../saykind/log";
import type { PracticeEvent as CameraEvent } from "../../src/core/practiceLog";
import type { ReportInput, WordPractice } from "./types";

const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_WORDS = 12;
const MAX_NOTES = 5;
const WORD_CHARS = 60;
const NOTE_CHARS = 200;
const ORDER_CHARS = 120;

export type AssembleOptions = {
  events: readonly LogEvent[];
  cameraEvents: readonly CameraEvent[];
  adaptiveLevel: number | null;
  now?: number;
  /** Only events at or after this time are used. Default: the last 24 hours. */
  sinceTs?: number;
};

export function localDate(ts: number): string {
  const date = new Date(ts);
  const two = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${two(date.getMonth() + 1)}-${two(date.getDate())}`;
}

const clip = (text: string, max: number) => text.replace(/\s+/g, " ").trim().slice(0, max);

function cameraWords(events: readonly CameraEvent[]): WordPractice[] {
  const byWord = new Map<string, WordPractice>();
  for (const event of events) {
    const key = clip(event.word.toLowerCase(), WORD_CHARS);
    if (!key) continue;
    const current = byWord.get(key) ?? { word: key, attempts: 0, replays: 0, slowPlays: 0, hints: 0, selfReports: 0 };
    byWord.set(key, {
      ...current,
      attempts: current.attempts + (event.type === "attempt" ? 1 : 0),
      replays: current.replays + (event.type === "replay" ? 1 : 0),
      slowPlays: current.slowPlays + (event.type === "slow" ? 1 : 0),
      selfReports: current.selfReports + (event.type === "self-reported" ? 1 : 0),
    });
  }
  return [...byWord.values()].slice(0, MAX_WORDS);
}

function level1Words(events: readonly LogEvent[]): WordPractice[] {
  return summarise([...events])
    .filter((word) => word.level === 1 && (word.attempts > 0 || word.normalPlays > 0 || word.slowPlays > 0 || word.helpUses > 0))
    .slice(0, MAX_WORDS)
    .map((word) => ({
      word: clip(word.itemText, WORD_CHARS),
      attempts: word.attempts,
      replays: word.normalPlays,
      slowPlays: word.slowPlays,
      hints: word.helpUses,
      selfReports: word.selfConfirmed,
    }));
}

function careNotes(events: readonly LogEvent[]): string[] {
  const notes = events.flatMap((event) => (event.type === "activity" && event.level === 1 && event.name === "adaptive" && event.detail ? [clip(event.detail, NOTE_CHARS)] : []));
  return [...new Set(notes)].slice(-MAX_NOTES);
}

/** The newest café visit inside the window, if any. */
export function latestCafeSession(events: readonly LogEvent[]) {
  for (let index = events.length - 1; index >= 0; index -= 1) {
    const event = events[index];
    if (event.type === "cafe_session") return event;
  }
  return null;
}

/** The café conversation from the newest visit, for the optional transcript. */
export function latestTranscript(events: readonly LogEvent[], sinceTs: number): SessionTurn[] {
  const visit = latestCafeSession(events.filter((event) => event.ts >= sinceTs));
  return visit ? [...visit.session.turns] : [];
}

/** Builds the compact report input from the practice log, the camera log and the adaptive level. Pure. */
export function assembleReportInput(options: AssembleOptions): ReportInput {
  const now = options.now ?? Date.now();
  const sinceTs = options.sinceTs ?? now - DAY_MS;
  const events = options.events.filter((event) => event.ts >= sinceTs);
  const cameraEvents = options.cameraEvents.filter((event) => event.ts >= sinceTs);
  const visit = latestCafeSession(events);
  const patientTurns = visit ? visit.session.turns.filter((turn) => turn.who === "patient").length : 0;

  return {
    date: localDate(now),
    level1: { words: level1Words(events), adaptiveLevel: options.adaptiveLevel, careNotes: careNotes(events) },
    level2: { words: cameraWords(cameraEvents) },
    cafe: visit
      ? {
          order: clip(describeOrder(visit.session.order), ORDER_CHARS),
          completed: visit.completed,
          turns: patientTurns,
          followUpsNeeded: visit.session.followUpsNeeded,
          helpRequests: visit.session.helpRequests,
          menuHelpUsed: visit.session.menuHelpUsed,
        }
      : null,
  };
}

export const hasAnyPractice = (input: ReportInput): boolean => input.level1.words.length > 0 || input.level2.words.length > 0 || input.cafe !== null;
