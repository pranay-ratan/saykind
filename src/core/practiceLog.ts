export type PracticeEventType = 'identified' | 'replay' | 'slow' | 'attempt' | 'corrected' | 'self-reported';

export interface PracticeEvent {
  word: string;
  source: 'camera';
  type: PracticeEventType;
  confidence?: number;
  provider?: string;
  ts: number;
}

export type PracticeSink = (events: readonly PracticeEvent[]) => void;

export const PRACTICE_STORAGE_KEY = 'saykind_practice_events';
const MAX_STORED_EVENTS = 2000;

function readStoredEvents(): PracticeEvent[] {
  try {
    const raw = window.localStorage.getItem(PRACTICE_STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as PracticeEvent[]) : [];
  } catch (error) {
    console.warn('Practice log could not be read', error);
    return [];
  }
}

/** Default sink: appends to localStorage and keeps the newest MAX_STORED_EVENTS. */
const localStorageSink: PracticeSink = (events) => {
  try {
    window.localStorage.setItem(PRACTICE_STORAGE_KEY, JSON.stringify(events.slice(-MAX_STORED_EVENTS)));
  } catch (error) {
    console.warn('Practice log could not be saved', error);
  }
};

let activeSink: PracticeSink = localStorageSink;

export function logPracticeEvent(event: PracticeEvent): void {
  if (typeof window === 'undefined') return;
  const next = [...readStoredEvents(), event];
  activeSink(next);
}

/** For the care-team view. Returns a copy, so callers cannot change the stored log. */
export function getPracticeEvents(): PracticeEvent[] {
  if (typeof window === 'undefined') return [];
  return [...readStoredEvents()];
}

/** Swap the sink, for example to send events to a server later. */
export function setSink(sink: PracticeSink): void {
  activeSink = sink;
}
