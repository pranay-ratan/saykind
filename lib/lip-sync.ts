"use client";

/**
 * Mouth movement for the barista, driven by the loudness of the voice itself.
 *
 * The audio is decoded once, off to the side, into a tiny loudness curve. The
 * audio element still does the actual playing, which keeps sound working with
 * the iPhone silent switch on. If anything here fails, the mouth just stays closed.
 */

const WINDOW_SECONDS = 0.033;

export type Envelope = { windowSeconds: number; levels: Uint8Array };

/** 0 = closed, 1 = slightly open, 2 = open, 3 = wide. */
export async function computeEnvelope(blob: Blob): Promise<Envelope | null> {
  let context: AudioContext | null = null;
  try {
    context = new AudioContext();
    const buffer = await context.decodeAudioData(await blob.arrayBuffer());
    const samples = buffer.getChannelData(0);
    const size = Math.max(1, Math.floor(buffer.sampleRate * WINDOW_SECONDS));
    const count = Math.ceil(samples.length / size);

    const rms = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      let sum = 0;
      const start = i * size;
      const end = Math.min(start + size, samples.length);
      for (let j = start; j < end; j++) sum += samples[j] * samples[j];
      rms[i] = Math.sqrt(sum / Math.max(1, end - start));
    }

    // Normalise against the loud parts, so quiet and loud voices both move.
    const sorted = Array.from(rms).sort((a, b) => a - b);
    const loud = sorted[Math.floor(sorted.length * 0.92)] || 1e-6;

    const levels = new Uint8Array(count);
    let held = 0;
    for (let i = 0; i < count; i++) {
      // Open quickly, close a little more slowly, like a real jaw.
      held = Math.max(rms[i] / loud, held * 0.55);
      levels[i] = held < 0.14 ? 0 : held < 0.4 ? 1 : held < 0.72 ? 2 : 3;
    }
    return { windowSeconds: WINDOW_SECONDS, levels };
  } catch {
    return null;
  } finally {
    void context?.close().catch(() => {});
  }
}

export function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function mouthElement(): HTMLElement | null {
  return document.querySelector<HTMLElement>("[data-barista-mouth]");
}

export function setMouth(level: number) {
  const element = mouthElement();
  if (element && element.dataset.mouth !== String(level)) element.dataset.mouth = String(level);
}

/**
 * Follow `audio` with the mouth until stopped. The envelope may arrive a moment
 * after playback starts; the mouth simply waits for it.
 */
export function followAudio(audio: HTMLAudioElement, getEnvelope: () => Envelope | null): () => void {
  let frame = 0;
  const tick = () => {
    const envelope = getEnvelope();
    if (envelope && !audio.paused && !audio.ended) {
      const index = Math.min(envelope.levels.length - 1, Math.floor(audio.currentTime / envelope.windowSeconds));
      setMouth(envelope.levels[Math.max(0, index)]);
    }
    frame = requestAnimationFrame(tick);
  };
  frame = requestAnimationFrame(tick);
  return () => {
    cancelAnimationFrame(frame);
    setMouth(0);
  };
}
