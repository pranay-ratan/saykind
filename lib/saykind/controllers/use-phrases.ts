"use client";

import { useMemo, useRef, useState } from "react";
import { logEvent } from "../log";
import { PHRASES, phraseAudioKey, type Phrase } from "../phrases";
import { usePractice, type Subject } from "../use-practice";

/**
 * PHRASE CONTROLLER (Level 4): ready-made phrases for real places. Normal and slow playback, "play it aloud for
 * someone" (with a record of it), and optional speaking practice. No visuals.
 */
export const subjectOfPhrase = (phrase: Phrase): Subject => ({ id: phrase.id, text: phrase.text, accepted: [phrase.text], audioKey: phraseAudioKey(phrase) });

export function usePhrases() {
  const micLevelRef = useRef<HTMLDivElement>(null);
  const practice = usePractice(4, micLevelRef);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const groups = useMemo(
    () => (["Ordering", "Asking for help", "Everyday"] as const).map((group) => ({ group, phrases: PHRASES.filter((p) => p.group === group) })),
    [],
  );
  const selected = PHRASES.find((p) => p.id === selectedId) ?? null;

  return {
    phrases: PHRASES,
    groups,
    selected,
    select: (id: string | null) => {
      practice.reset();
      setSelectedId(id);
    },
    micLevelRef,
    isPlayingAudio: practice.listening,
    isPlayingSlowAudio: practice.slowListening,
    isRecording: practice.status === "recording",
    isProcessing: practice.status === "processing",
    isRequestingMic: practice.requesting,
    /** What the computer heard after a speaking attempt (uncertain), or null. */
    attempt: practice.status === "result" ? practice.outcome : null,
    micProblemText: practice.problemText,
    play: (phrase: Phrase) => practice.play(subjectOfPhrase(phrase), false),
    playSlowly: (phrase: Phrase) => practice.play(subjectOfPhrase(phrase), true),
    /** Playing it for another person; same audio, recorded as such. */
    playAloud: (phrase: Phrase, slow = false) => {
      logEvent({ type: "activity", ts: Date.now(), level: 4, name: "played-aloud", detail: phrase.id });
      practice.play(subjectOfPhrase(phrase), slow);
    },
    showCard: (phrase: Phrase) => logEvent({ type: "activity", ts: Date.now(), level: 4, name: "card-shown", detail: phrase.id }),
    stopAudio: practice.stop,
    toggleRecording: (phrase: Phrase) => (practice.status === "result" ? practice.another() : void practice.toggle(subjectOfPhrase(phrase))),
    retry: practice.another,
  };
}
