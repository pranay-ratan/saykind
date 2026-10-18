"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { ApiError, transcribe } from "@/lib/client-api";
import { heardAny } from "@/lib/match";
import { MIC_MESSAGES, useAudioRecorder, type MicProblem } from "@/lib/use-audio-recorder";
import { playWord, stopWordAudio } from "@/lib/word-audio";
import { logEvent, newId, type Level, type Recognition } from "./log";
import { saveSample } from "./samples";
import { getSettings } from "./settings";

/** Whatever is being practiced: an object, a café word, a menu item, a phrase. */
export type Subject = {
  id: string;
  text: string;
  accepted: string[];
  /** Ready-made recording under /audio/words, or null to use the server voice for `text`. */
  audioKey: string | null;
};

export type Outcome = { recognition: Recognition; heard: string; problem?: MicProblem };
export type PracticeStatus = "idle" | "recording" | "processing" | "result";
/** The last recording, playable from an object URL ("Hear me"). Replaced by the next attempt, dropped on reset. */
export type LastAttempt = { url: string; mimeType: string };

type Counters = { retry: number; slow: number; normal: number; help: number };

/**
 * One hook for every level that has "hear it, say it": normal and slow playback, recording the attempt, asking the
 * server what it heard, and writing all of it to the practice record. It never grades speech: the outcome is only
 * ever "what the computer reported hearing", which is uncertain, and it never blocks the person from carrying on.
 */
export function usePractice(level: Level, levelRef: RefObject<HTMLElement | null>) {
  const recorder = useAudioRecorder(levelRef);
  const [status, setStatusValue] = useState<PracticeStatus>("idle");
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [listening, setListening] = useState(false);
  const [slowListening, setSlowListening] = useState(false);
  const statusRef = useRef<PracticeStatus>("idle");
  const runRef = useRef(0);
  const startedAt = useRef(0);
  const counters = useRef(new Map<string, Counters>());
  const [attempts, setAttempts] = useState<Record<string, number>>({});
  const [lastAttempt, setLastAttempt] = useState<LastAttempt | null>(null);
  const lastAttemptRef = useRef<LastAttempt | null>(null);

  const replaceLastAttempt = useCallback((next: LastAttempt | null) => {
    if (lastAttemptRef.current) URL.revokeObjectURL(lastAttemptRef.current.url);
    lastAttemptRef.current = next;
    setLastAttempt(next);
  }, []);

  const setStatus = useCallback((next: PracticeStatus) => {
    statusRef.current = next;
    setStatusValue(next);
  }, []);

  const countersFor = (id: string): Counters => {
    let c = counters.current.get(id);
    if (!c) {
      c = { retry: 0, slow: 0, normal: 0, help: 0 };
      counters.current.set(id, c);
    }
    return c;
  };

  const stop = useCallback(() => {
    stopWordAudio();
    setListening(false);
    setSlowListening(false);
  }, []);

  /** Back to a fresh start for this word (a new visit): clears the on-screen result and the try counter. */
  const reset = useCallback(
    (subject?: Subject) => {
      runRef.current += 1;
      if (statusRef.current === "recording" || statusRef.current === "processing") recorder.cancel();
      stop();
      setStatus("idle");
      setOutcome(null);
      replaceLastAttempt(null);
      if (subject) {
        counters.current.delete(subject.id);
        setAttempts((all) => ({ ...all, [subject.id]: 0 }));
      }
    },
    [recorder, replaceLastAttempt, setStatus, stop],
  );

  const play = useCallback(
    (subject: Subject, slow = false) => {
      const c = countersFor(subject.id);
      if (slow) c.slow += 1;
      else c.normal += 1;
      logEvent({ type: "play", ts: Date.now(), level, itemId: subject.id, itemText: subject.text, slow });
      stopWordAudio();
      setListening(!slow);
      setSlowListening(slow);
      void playWord(subject.audioKey, subject.text, { slow }).then(() => {
        setListening(false);
        setSlowListening(false);
      });
    },
    [level],
  );

  const help = useCallback(
    (subject: Subject, kind: "syllables" | "first-sound" | "skip" | "picture-help" | "menu") => {
      countersFor(subject.id).help += 1;
      logEvent({ type: "help", ts: Date.now(), level, itemId: subject.id, itemText: subject.text, kind });
    },
    [level],
  );

  /** Start recording, or finish and check it. The person controls both; nothing is timed. */
  const toggle = useCallback(
    async (subject: Subject) => {
      if (statusRef.current === "processing") return;

      if (statusRef.current === "recording") {
        const run = runRef.current;
        const durationMs = Date.now() - startedAt.current;
        setStatus("processing");
        const audio = await recorder.finish();
        if (run !== runRef.current) return;

        const c = countersFor(subject.id);
        let result: Outcome;
        if (!audio) {
          result = { recognition: "error", heard: "" };
        } else {
          try {
            const heard = (await transcribe(audio)).trim();
            result = { recognition: !heard ? "nothing" : heardAny(subject.accepted, heard) ? "matches" : "differs", heard };
          } catch (error) {
            console.warn("[practice] could not check the recording:", error instanceof ApiError ? error.code : error);
            result = { recognition: "error", heard: "" };
          }
        }
        if (run !== runRef.current) return;
        replaceLastAttempt(audio ? { url: URL.createObjectURL(audio.blob), mimeType: audio.mimeType } : null);

        // Keep the recording only if the person asked us to, and only on this device.
        let sampleId: string | undefined;
        const settings = getSettings();
        if (audio && settings.keepPracticeAudio) {
          sampleId = newId();
          const saved = await saveSample({
            id: sampleId,
            kind: "attempt",
            ts: Date.now(),
            durationMs,
            mimeType: audio.mimeType,
            blob: audio.blob,
            itemId: subject.id,
            itemText: subject.text,
            approvedForCaregiver: settings.share.audio,
          });
          if (!saved) sampleId = undefined;
        }

        logEvent({
          type: "attempt",
          id: newId(),
          ts: Date.now(),
          level,
          itemId: subject.id,
          itemText: subject.text,
          retry: c.retry,
          durationMs,
          heard: result.heard,
          recognition: result.recognition,
          selfConfirmed: false,
          slowPlays: c.slow,
          normalPlays: c.normal,
          helpUses: c.help,
          sampleId,
        });
        c.retry += 1;
        setAttempts((all) => ({ ...all, [subject.id]: c.retry }));
        setOutcome(result);
        setStatus("result");
        return;
      }

      stop();
      setOutcome(null);
      const run = ++runRef.current;
      const problem = await recorder.start();
      if (run !== runRef.current) return;
      if (problem) {
        setOutcome({ recognition: "error", heard: "", problem });
        setStatus("result");
        return;
      }
      startedAt.current = Date.now();
      setStatus("recording");
    },
    [level, recorder, replaceLastAttempt, setStatus, stop],
  );

  /** Go back from a result to the ready state, for another try. Tries are unlimited. */
  /** How many recording attempts have been made for this subject during this visit. */
  const attemptsFor = (id: string) => attempts[id] ?? 0;

  const another = useCallback(() => {
    setOutcome(null);
    setStatus("idle");
  }, [setStatus]);

  const complete = useCallback(
    (subject: Subject, how: "heard-match" | "self-confirmed" | "skipped" | "continued") => {
      logEvent({ type: "complete", ts: Date.now(), level, itemId: subject.id, itemText: subject.text, how });
    },
    [level],
  );

  useEffect(
    () => () => {
      runRef.current += 1;
      stopWordAudio();
      if (lastAttemptRef.current) URL.revokeObjectURL(lastAttemptRef.current.url);
    },
    [],
  );

  const problemText = outcome?.problem ? MIC_MESSAGES[outcome.problem].replace(/ You can still answer by tapping pictures in Help\.$/, "") : null;

  return {
    status,
    outcome,
    problemText,
    lastAttempt,
    listening,
    slowListening,
    requesting: recorder.status === "requesting",
    play,
    help,
    toggle,
    another,
    attemptsFor,
    reset,
    complete,
    stop,
  };
}
