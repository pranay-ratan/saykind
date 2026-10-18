"use client";

/**
 * Says single words and short phrases (practice words, menu items, the real-world card).
 *
 * Order of preference, so something always works:
 *   1. a ready-made recording in /audio/words (instant, no network round trip, no cost)
 *   2. the server's voice, from /api/speak (the same voice family as the barista)
 *   3. the browser's own speech synthesis
 *
 * Mobile Safari only plays sound that a tap started, on an element a tap started. So `unlockWordAudio()` is
 * called from a tap early on; after that the same element can play everything, even after a network wait.
 *
 * "Slowly" (the snail) plays a pre-made slow recording (public/audio/words/<key>-slow.mp3): the normal recording
 * time-stretched with a pitch-preserving algorithm (see scripts/generate-word-audio.mjs), so it is slower but not
 * lower. If that file is missing, it falls back to playing the normal one at a reduced rate with the browser's
 * pitch preservation explicitly switched on. Pitch is never lowered.
 */

const SILENCE = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=";
/** Only used when no pre-made slow recording exists. */
export const SLOW_RATE = 0.72;

export type WordPlayResult = "ended" | "interrupted" | "failed";

let element: HTMLAudioElement | null = null;
let token = 0;
let cancelCurrent: (() => void) | null = null;
const blobs = new Map<string, Blob>();

function audio(): HTMLAudioElement {
  if (!element) {
    element = new Audio();
    element.preload = "auto";
    element.setAttribute("playsinline", "");
  }
  return element;
}

/** Call synchronously from a tap or click handler. */
export function unlockWordAudio() {
  const el = audio();
  el.src = SILENCE;
  el.play().catch(() => {});
}

export function stopWordAudio() {
  token += 1;
  cancelCurrent?.();
  element?.pause();
  if (typeof window !== "undefined") window.speechSynthesis?.cancel();
}

async function fetchServerVoice(text: string): Promise<Blob | null> {
  const cached = blobs.get(text);
  if (cached) return cached;
  try {
    const response = await fetch("/api/speak", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, style: "word" }),
    });
    if (!response.ok) return null;
    const blob = await response.blob();
    if (!blob.type.startsWith("audio/")) return null;
    blobs.set(text, blob);
    return blob;
  } catch {
    return null;
  }
}

function playUrl(url: string, rate: number, mine: number): Promise<"ended" | "failed" | "interrupted"> {
  const el = audio();
  return new Promise((resolve) => {
    const done = (result: "ended" | "failed" | "interrupted") => {
      el.onended = null;
      el.onerror = null;
      if (cancelCurrent === cancel) cancelCurrent = null;
      resolve(result);
    };
    const cancel = () => done("interrupted");
    cancelCurrent = cancel;
    el.onended = () => done("ended");
    el.onerror = () => done("failed");
    el.src = url;
    el.defaultPlaybackRate = rate;
    el.playbackRate = rate;
    // Slow down without lowering the pitch (this is the default in modern browsers; be explicit, including Safari's prefix).
    el.preservesPitch = true;
    (el as HTMLAudioElement & { webkitPreservesPitch?: boolean }).webkitPreservesPitch = true;
    el.play().catch(() => done(mine === token ? "failed" : "interrupted"));
  });
}

function speakWithBrowser(text: string, slow: boolean, mine: number): Promise<WordPlayResult> {
  return new Promise((resolve) => {
    const synth = typeof window !== "undefined" ? window.speechSynthesis : undefined;
    if (!synth) return resolve("failed");
    synth.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.rate = slow ? 0.5 : 0.9;
    utterance.onend = () => resolve(mine === token ? "ended" : "interrupted");
    utterance.onerror = () => resolve(mine === token ? "failed" : "interrupted");
    synth.speak(utterance);
  });
}

/**
 * @param key  file name under /audio/words (e.g. "coffee"), or null for free text
 * @param text what to say if there is no recording
 */
export async function playWord(key: string | null, text: string, options: { slow?: boolean } = {}): Promise<WordPlayResult> {
  stopWordAudio();
  const mine = token;

  if (key) {
    // 1. The pre-made slow recording, at normal playback speed (it is already slow).
    if (options.slow) {
      const slow = await playUrl(`/audio/words/${key}-slow.mp3`, 1, mine);
      if (slow !== "failed" || mine !== token) return slow;
    }
    // 2. The normal recording (slowed by rate, pitch kept, if slow was asked for and there was no slow file).
    const result = await playUrl(`/audio/words/${key}.mp3`, options.slow ? SLOW_RATE : 1, mine);
    if (result !== "failed" || mine !== token) return result;
  }

  // 3. The server's voice.
  const blob = await fetchServerVoice(text);
  if (mine !== token) return "interrupted";
  if (blob) {
    const url = URL.createObjectURL(blob);
    const result = await playUrl(url, options.slow ? SLOW_RATE : 1, mine);
    URL.revokeObjectURL(url);
    if (result !== "failed" || mine !== token) return result;
  }

  // 4. The browser's own voice.
  return speakWithBrowser(text, !!options.slow, mine);
}
