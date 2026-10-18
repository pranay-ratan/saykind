"use client";

import { useMemo, useRef, useState, type RefObject } from "react";
import type { LearnItem } from "../items";
import type { Level, Recognition } from "../log";
import { saveSetProgress, useSetProgress } from "../progress";
import { usePractice, type Subject } from "../use-practice";
import { useAdaptive } from "./use-adaptive";

/**
 * EXERCISE CONTROLLER: everything a "see it, hear it, say it" screen needs, with no visuals at all.
 * Used by Level 1 (the object list) and Level 2 (one photographed object). Bind any components to it.
 *
 * The controller NEVER grades speech. Speech recognition is unreliable (especially for speech affected by aphasia), so
 * feedback is only ever "here is what the computer heard", always with a caveat, and the person can retry, listen again,
 * confirm "that's what I said", or carry on regardless.
 */

export type FeedbackKind = "heard-match" | "heard-different" | "nothing-heard" | "check-failed" | "mic-problem";

export type Feedback = {
  kind: FeedbackKind;
  /** A short, kind headline. Never claims a word was perfect. */
  title: string;
  /** One or two plain sentences, including what was heard when something was. */
  detail: string;
  /** What the computer reported hearing (uncertain). Empty if nothing. */
  heard: string;
  recognition: Recognition;
  /** Always shown with results that include a transcription. */
  caveat: string | null;
  /** True when something was heard, so the UI can ask "Is that what you said?". */
  canConfirm: boolean;
};

export type Pronunciation = {
  text: string;
  /** Standard dictionary syllables, e.g. ["cook", "ie"]. */
  syllables: string[];
  /** Index of the stressed syllable when there is more than one. */
  stressed?: number;
  /** General American IPA, e.g. "/ˈkʊk.i/". Optional help. */
  ipa?: string;
  /** First letters, e.g. "Coo". */
  startsWith: string;
};

export type ExerciseController = {
  /* ---- what to show ---- */
  items: LearnItem[];
  currentWord: LearnItem;
  currentExerciseIndex: number;
  total: number;
  /** 0 to 1: how many are done, for a progress bar. */
  progress: number;
  completedIds: string[];
  /** True after continuing past the last item. */
  isFinished: boolean;
  isFirst: boolean;
  isLast: boolean;
  pronunciation: Pronunciation;

  /* ---- audio and recording state ---- */
  isPlayingAudio: boolean;
  isPlayingSlowAudio: boolean;
  isRecording: boolean;
  /** Recording has stopped and the computer is checking what it heard. */
  isProcessing: boolean;
  /** The browser's microphone permission prompt is open. */
  isRequestingMic: boolean;
  /** Give this to the microphone visual; the live voice level is written to it as the CSS variable --level (0 to 1). */
  micLevelRef: RefObject<HTMLDivElement | null>;
  latestFeedback: Feedback | null;
  /** Number of recording attempts for this word during this visit. */
  attemptCount: number;
  /** A short, calm line from the adaptive layer. Show it as small text only; it never states a score. */
  adaptiveMessage: string | null;

  /* ---- optional help (each use is recorded) ---- */
  syllablesShown: boolean;
  firstSoundShown: boolean;
  toggleSyllables: () => void;
  toggleFirstSound: () => void;

  /* ---- actions: call these from buttons ---- */
  playPronunciation: () => void;
  playSlowPronunciation: () => void;
  stopAudio: () => void;
  startRecording: () => Promise<void>;
  /** Ends the recording and checks it. The person decides when; there is no timer and no silence cut-off. */
  stopRecording: () => Promise<void>;
  /** Start if idle, stop if recording. */
  toggleRecording: () => Promise<void>;
  /** Clear the result and let them try again. Unlimited. */
  retryWord: () => void;
  /** The person says "that's what I said" (confirms the transcription differs only because the computer misheard). */
  confirmHeard: () => void;
  /** Move on. Works with or without a recording, and never requires a "pass". */
  continueToNextWord: () => void;
  /** Move on without practicing this one. */
  skipWord: () => void;
  goToWord: (index: number) => void;
  previousWord: () => void;
  /** Back to the first item. */
  restart: () => void;
};

type Options = {
  /** Stable id for saving progress, e.g. "level1". */
  id: string;
  level: Level;
  items: LearnItem[];
  /** Remember where the person is across menu use, level changes and reloads. Default true. */
  persist?: boolean;
};

const CAVEAT = "Speech recognition can make mistakes, so it's only a guide.";

export const subjectOf = (item: LearnItem): Subject => ({ id: item.id, text: item.text, accepted: item.accepted, audioKey: item.audioKey });

function describe(recognition: Recognition, heard: string, word: string, problemText: string | null): Feedback {
  const said = heard.replace(/[.!?]+$/, "");
  switch (recognition) {
    case "matches":
      return { kind: "heard-match", recognition, heard, canConfirm: false, caveat: CAVEAT, title: "Good practice.", detail: `I heard “${said}”. Ready for the next word, or try once more?` };
    case "differs":
      return { kind: "heard-different", recognition, heard, canConfirm: true, caveat: CAVEAT, title: "Thank you.", detail: `I heard “${said}”. Let me check I have that right. You can say it again, listen once more, or carry on.` };
    case "nothing":
      return { kind: "nothing-heard", recognition, heard: "", canConfirm: false, caveat: null, title: "Let me listen once more.", detail: "I did not catch that. Bring the microphone a little closer, whenever you are ready." };
    default:
      return problemText
        ? { kind: "mic-problem", recognition, heard: "", canConfirm: false, caveat: null, title: "The microphone isn't available.", detail: problemText }
        : { kind: "check-failed", recognition, heard: "", canConfirm: false, caveat: null, title: "I couldn't check that just now.", detail: `Something went wrong on our side. You can try again, or carry on with “${word}”.` };
  }
}

export function useExercise({ id, level, items, persist = true }: Options): ExerciseController {
  const micLevelRef = useRef<HTMLDivElement>(null);
  const practice = usePractice(level, micLevelRef);
  const saved = useSetProgress(id);
  const [transient, setTransient] = useState<{ index: number; completed: string[] }>({ index: 0, completed: [] });

  // Progress lives in the saved store (so it survives menus and reloads); a plain state backs non-persistent sets.
  const state = persist ? saved : transient;
  const total = items.length;
  const finished = state.index >= total;
  const index = Math.min(Math.max(state.index, 0), total - 1);
  const currentWord = items[index];
  const adaptive = useAdaptive({ enabled: id === "level1", word: currentWord, status: practice.status, heard: practice.outcome?.heard ?? null, attemptCount: practice.attemptsFor(currentWord.id) });
  const subject = useMemo(() => subjectOf(currentWord), [currentWord]);
  const write = (next: { index: number; completed: string[] }) => (persist ? saveSetProgress(id, next) : setTransient(next));

  // Per-word help state resets whenever the word changes.
  const [helpState, setHelpState] = useState({ word: "", syllables: false, firstSound: false });
  const help = helpState.word === currentWord.id ? helpState : { word: currentWord.id, syllables: adaptive.cueSupport === "syllables", firstSound: adaptive.cueSupport === "firstSound" };

  const latestFeedback = useMemo(
    () => (practice.status === "result" && practice.outcome ? describe(practice.outcome.recognition, practice.outcome.heard, currentWord.text, practice.problemText) : null),
    [practice.status, practice.outcome, practice.problemText, currentWord.text],
  );

  const attemptCount = practice.attemptsFor(currentWord.id);

  const advance = (how: "heard-match" | "self-confirmed" | "skipped" | "continued") => {
    practice.complete(subject, how);
    practice.reset();
    const counted = how === "skipped" || state.completed.includes(currentWord.id) ? state.completed : [...state.completed, currentWord.id];
    write({ index: Math.min(state.index + 1, total), completed: counted });
  };

  return {
    items,
    currentWord,
    currentExerciseIndex: index,
    total,
    progress: total ? Math.min(state.index, total) / total : 0,
    completedIds: state.completed,
    isFinished: finished,
    isFirst: index === 0,
    isLast: index === total - 1,
    pronunciation: { text: currentWord.text, syllables: currentWord.syllables, stressed: currentWord.stressed, ipa: currentWord.ipa, startsWith: currentWord.startsWith },

    isPlayingAudio: practice.listening,
    isPlayingSlowAudio: practice.slowListening,
    isRecording: practice.status === "recording",
    isProcessing: practice.status === "processing",
    isRequestingMic: practice.requesting,
    micLevelRef,
    latestFeedback,
    attemptCount,
    adaptiveMessage: adaptive.message,

    syllablesShown: help.syllables,
    firstSoundShown: help.firstSound,
    toggleSyllables: () => {
      if (!help.syllables) {
        practice.help(subject, "syllables");
        adaptive.recordHint();
      }
      setHelpState({ ...help, syllables: !help.syllables });
    },
    toggleFirstSound: () => {
      if (!help.firstSound) {
        practice.help(subject, "first-sound");
        adaptive.recordHint();
      }
      setHelpState({ ...help, firstSound: !help.firstSound });
    },

    playPronunciation: () => {
      adaptive.recordReplay(false);
      practice.play(subject, adaptive.autoSlow);
    },
    playSlowPronunciation: () => {
      adaptive.recordReplay(true);
      practice.play(subject, true);
    },
    stopAudio: practice.stop,
    startRecording: async () => {
      if (practice.status === "idle") await practice.toggle(subject);
    },
    stopRecording: async () => {
      if (practice.status === "recording") await practice.toggle(subject);
    },
    toggleRecording: async () => {
      if (practice.status === "result") practice.another();
      else await practice.toggle(subject);
    },
    retryWord: () => practice.another(),
    confirmHeard: () => advance("self-confirmed"),
    continueToNextWord: () => advance(latestFeedback?.kind === "heard-match" ? "heard-match" : "continued"),
    skipWord: () => {
      adaptive.recordAbandon();
      practice.help(subject, "skip");
      advance("skipped");
    },
    goToWord: (target) => {
      practice.reset();
      write({ ...state, index: Math.min(Math.max(target, 0), total - 1) });
    },
    previousWord: () => {
      practice.reset();
      write({ ...state, index: Math.max(Math.min(state.index, total - 1) - 1, 0) });
    },
    restart: () => {
      practice.reset();
      write({ index: 0, completed: [] });
    },
  };
}
