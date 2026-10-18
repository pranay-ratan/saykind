"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { computeEnvelope, followAudio, prefersReducedMotion, setMouth, type Envelope } from "./lip-sync";

/**
 * Plays the barista's voice (text-to-speech from the server).
 *
 * Mobile Safari only lets a page play sound after a tap, and only on an audio
 * element that was started by that tap. So `unlock()` is called synchronously
 * inside the Start button's click handler; after that, the same element can play
 * every later reply even though each one arrives after a network round trip.
 */

// One silent sample. Enough to satisfy the browser's "user started playback" rule.
const SILENCE = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=";

/** "device" means the server voice was unavailable and the device voice read the line (no mouth movement). */
export type SayResult = "ended" | "interrupted" | "blocked" | "failed" | "device";

const MAX_CACHED = 40;
/** How long the device voice has to begin before the line is shown as text only. */
const DEVICE_VOICE_START_MS = 3000;

export function useBaristaVoice() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const cacheRef = useRef(new Map<string, Blob>());
  const tokenRef = useRef(0);
  const envelopesRef = useRef(new Map<string, Promise<Envelope | null>>());
  const finishRef = useRef<((result: SayResult) => void) | null>(null);
  const lastLineRef = useRef<string | null>(null);
  const [speaking, setSpeaking] = useState(false);

  const element = useCallback((): HTMLAudioElement => {
    if (!audioRef.current) {
      const audio = new Audio();
      audio.preload = "auto";
      audio.setAttribute("playsinline", "");
      audioRef.current = audio;
    }
    return audioRef.current;
  }, []);

  /** Call synchronously from a tap/click handler. */
  const unlock = useCallback(() => {
    const audio = element();
    audio.src = SILENCE;
    audio.play().catch(() => {});
  }, [element]);

  const stop = useCallback(() => {
    tokenRef.current += 1;
    audioRef.current?.pause();
    if (typeof window !== "undefined") window.speechSynthesis?.cancel();
    finishRef.current?.("interrupted");
  }, []);

  /** Used only when the server voice fails: the device speaks the line, and the mouth stays closed. */
  const speakWithDevice = useCallback((text: string, token: number): Promise<SayResult> => {
    if (typeof window === "undefined" || !window.speechSynthesis) return Promise.resolve("failed");
    return new Promise<SayResult>((resolve) => {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "en-US";
      // A device with no usable voice never starts or errors. Give up quietly so the conversation can go on.
      let started = false;
      const giveUp = window.setTimeout(() => {
        if (started) return;
        window.speechSynthesis.cancel();
        resolve(token === tokenRef.current ? "failed" : "interrupted");
      }, DEVICE_VOICE_START_MS);
      utterance.onstart = () => {
        started = true;
        window.clearTimeout(giveUp);
      };
      utterance.onend = () => resolve(token === tokenRef.current ? "device" : "interrupted");
      utterance.onerror = () => resolve(token === tokenRef.current ? "failed" : "interrupted");
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
    });
  }, []);

  const fetchAudio = useCallback(async (text: string): Promise<Blob> => {
    const cached = cacheRef.current.get(text);
    if (cached) return cached;

    const response = await fetch("/api/speak", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (!response.ok) throw new Error(`speak ${response.status}`);
    const blob = await response.blob();
    if (!blob.type.startsWith("audio/")) throw new Error("speak returned something that isn't audio");

    if (cacheRef.current.size >= MAX_CACHED) {
      const oldest = cacheRef.current.keys().next().value;
      if (oldest !== undefined) cacheRef.current.delete(oldest);
    }
    cacheRef.current.set(text, blob);
    return blob;
  }, []);

  /**
   * Speak a line and resolve when it has finished (or was cut short).
   * `aside` lines (help examples) don't replace what "hear again" repeats.
   */
  const say = useCallback(
    async (text: string, options: { aside?: boolean } = {}): Promise<SayResult> => {
      stop();
      const token = tokenRef.current;
      if (!options.aside) lastLineRef.current = text;

      let blob: Blob;
      try {
        blob = await fetchAudio(text);
      } catch (error) {
        console.error("[voice]", error instanceof Error ? error.message : error);
        if (token !== tokenRef.current) return "interrupted";
        return speakWithDevice(text, token);
      }
      if (token !== tokenRef.current) return "interrupted";

      const audio = element();
      const url = URL.createObjectURL(blob);

      // Mouth movement (skipped for people who prefer reduced motion).
      let envelope: Envelope | null = null;
      let stopFollowing = () => {};
      if (!prefersReducedMotion()) {
        let pending = envelopesRef.current.get(text);
        if (!pending) {
          pending = computeEnvelope(blob);
          envelopesRef.current.set(text, pending);
        }
        void pending.then((result) => {
          envelope = result;
        });
        stopFollowing = followAudio(audio, () => envelope);
      }

      return new Promise<SayResult>((resolve) => {
        const finish = (result: SayResult) => {
          stopFollowing();
          audio.onended = null;
          audio.onerror = null;
          URL.revokeObjectURL(url);
          if (finishRef.current === finish) finishRef.current = null;
          setSpeaking(false);
          resolve(result);
        };
        finishRef.current = finish;
        audio.onended = () => finish("ended");
        audio.onerror = () => finish("failed");
        audio.src = url;
        audio
          .play()
          .then(() => setSpeaking(true))
          .catch((error: unknown) => {
            finish(error instanceof DOMException && error.name === "NotAllowedError" ? "blocked" : "failed");
          });
      });
    },
    [element, fetchAudio, stop, speakWithDevice],
  );

  /** Say the barista's last line again. */
  const replay = useCallback((): Promise<SayResult> => {
    const line = lastLineRef.current;
    return line ? say(line) : Promise.resolve("failed");
  }, [say]);

  useEffect(() => {
    const cache = cacheRef.current;
    const envelopes = envelopesRef.current;
    return () => {
      tokenRef.current += 1;
      audioRef.current?.pause();
      finishRef.current?.("interrupted");
      setMouth(0);
      cache.clear();
      envelopes.clear();
    };
  }, []);

  return { speaking, unlock, say, replay, stop };
}
