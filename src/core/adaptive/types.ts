/** One practice attempt, as the adaptive layer sees it. No audio, images or personal data. */
export interface AttemptEvent {
  word: string;
  level: number;
  replays: number;
  slowPlays: number;
  hintUsed: boolean;
  attempts: number;
  /** What the speech-to-text heard, if anything. Text only. */
  transcript?: string;
  /** How close the attempt was to the word, 0 (not close) to 1 (exact). */
  closeness: number;
  sttConfidence?: number;
  abandoned: boolean;
}

export type CueSupport = "none" | "firstSound" | "syllables";

export const MIN_LEVEL = 1;
export const MAX_LEVEL = 5;

/** The decision the app applies. `message` is the only text the person sees. `careNote` goes to the care-team view. */
export interface AdaptiveDecision {
  nextLevel: number;
  cueSupport: CueSupport;
  autoSlow: boolean;
  message: string;
  careNote: string;
}

export interface AdaptRequest {
  recent: AttemptEvent[];
  currentLevel: number;
}

export interface AdaptResponse {
  decision: AdaptiveDecision;
  source: "claude" | "rules";
}
