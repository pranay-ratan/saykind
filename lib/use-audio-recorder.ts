"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";

/**
 * Microphone recording for one turn at a time.
 *
 * Recording only ends when the person taps to finish: there is no silence
 * detection and no time limit, because pauses are part of how someone with
 * aphasia speaks. The audio stays in memory and is only handed out by `finish()`.
 */

export type RecorderStatus = "idle" | "requesting" | "recording";

export type MicProblem = "unsupported" | "insecure" | "denied" | "no-device" | "busy" | "failed";

export const MIC_MESSAGES: Record<MicProblem, string> = {
  unsupported: "This browser can't record audio. You can still answer by tapping pictures in Help.",
  insecure: "The microphone needs a secure (https) page. You can still answer by tapping pictures in Help.",
  denied: "The microphone is off for this site. Allow it in your browser settings to speak, or tap pictures in Help.",
  "no-device": "No microphone was found. You can still answer by tapping pictures in Help.",
  busy: "Another app is using the microphone. Close it and try again.",
  failed: "The microphone had a problem. Please try again.",
};

export type RecordedAudio = { blob: Blob; mimeType: string };

export type MicPermission = "granted" | MicProblem;

const MIME_CANDIDATES = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"];

function pickMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined" || !MediaRecorder.isTypeSupported) return undefined;
  return MIME_CANDIDATES.find((type) => MediaRecorder.isTypeSupported(type));
}

function problemFromException(error: unknown): MicProblem {
  switch (error instanceof DOMException ? error.name : "") {
    case "NotAllowedError":
    case "SecurityError":
    case "PermissionDeniedError":
      return "denied";
    case "NotFoundError":
    case "DevicesNotFoundError":
    case "OverconstrainedError":
      return "no-device";
    case "NotReadableError":
    case "TrackStartError":
    case "AbortError":
      return "busy";
    default:
      return "failed";
  }
}

function environmentProblem(): MicProblem | null {
  if (!window.isSecureContext) return "insecure";
  if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") return "unsupported";
  return null;
}

type Session = {
  stream: MediaStream;
  recorder: MediaRecorder;
  chunks: Blob[];
  mimeType: string;
  audioContext: AudioContext | null;
  frame: number;
  /** Set while finish() is waiting for the recorder to flush. */
  resolve: ((audio: RecordedAudio | null) => void) | null;
  discard: boolean;
};

/**
 * @param levelTarget element whose `--level` CSS variable (0 to 1) follows the
 *   microphone volume. It is written directly, so the page doesn't re-render 60 times a second.
 */
export function useAudioRecorder(levelTarget: RefObject<HTMLElement | null>) {
  const [status, setStatus] = useState<RecorderStatus>("idle");
  const sessionRef = useRef<Session | null>(null);
  const pendingRef = useRef(false);
  const generationRef = useRef(0);

  const teardown = useCallback(
    (session: Session) => {
      cancelAnimationFrame(session.frame);
      session.stream.getTracks().forEach((track) => track.stop());
      void session.audioContext?.close().catch(() => {});
      levelTarget.current?.style.setProperty("--level", "0");
      if (sessionRef.current === session) sessionRef.current = null;
    },
    [levelTarget],
  );

  /** Begin recording. Resolves with `null` on success, or what went wrong. */
  const start = useCallback(async (): Promise<MicProblem | null> => {
    if (sessionRef.current || pendingRef.current) return null;
    const problem = environmentProblem();
    if (problem) return problem;

    const generation = ++generationRef.current;
    pendingRef.current = true;
    setStatus("requesting");

    // Created now, inside the tap, so Safari lets it run.
    let audioContext: AudioContext | null = null;
    try {
      audioContext = new AudioContext();
      void audioContext.resume().catch(() => {});
    } catch {
      audioContext = null;
    }

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      });
    } catch (error) {
      pendingRef.current = false;
      void audioContext?.close().catch(() => {});
      if (generation === generationRef.current) setStatus("idle");
      return problemFromException(error);
    }
    pendingRef.current = false;

    if (generation !== generationRef.current) {
      stream.getTracks().forEach((track) => track.stop());
      void audioContext?.close().catch(() => {});
      return null;
    }

    const preferred = pickMimeType();
    let recorder: MediaRecorder;
    try {
      recorder = new MediaRecorder(stream, preferred ? { mimeType: preferred } : undefined);
    } catch {
      stream.getTracks().forEach((track) => track.stop());
      void audioContext?.close().catch(() => {});
      setStatus("idle");
      return "failed";
    }

    const session: Session = {
      stream,
      recorder,
      chunks: [],
      mimeType: recorder.mimeType || preferred || "audio/webm",
      audioContext,
      frame: 0,
      resolve: null,
      discard: false,
    };
    sessionRef.current = session;

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) session.chunks.push(event.data);
    };
    recorder.onstop = () => {
      const result = session.discard || session.chunks.length === 0 ? null : { blob: new Blob(session.chunks, { type: session.mimeType }), mimeType: session.mimeType };
      session.resolve?.(result);
      session.resolve = null;
      teardown(session);
      setStatus("idle");
    };
    recorder.onerror = () => {
      session.discard = true;
      if (recorder.state !== "inactive") recorder.stop();
    };
    // If the microphone disappears mid-turn, keep what was captured.
    stream.getAudioTracks().forEach((track) => {
      track.onended = () => {
        if (recorder.state === "recording") recorder.stop();
      };
    });

    // Live volume, for the glowing ring around the mic button.
    if (audioContext) {
      try {
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 512;
        audioContext.createMediaStreamSource(stream).connect(analyser); // not connected to the speakers
        const samples = new Uint8Array(analyser.fftSize);
        let smoothed = 0;
        const tick = () => {
          analyser.getByteTimeDomainData(samples);
          let sum = 0;
          for (const sample of samples) sum += ((sample - 128) / 128) ** 2;
          const rms = Math.sqrt(sum / samples.length);
          smoothed = smoothed * 0.8 + Math.min(rms * 4, 1) * 0.2;
          levelTarget.current?.style.setProperty("--level", smoothed.toFixed(3));
          session.frame = requestAnimationFrame(tick);
        };
        session.frame = requestAnimationFrame(tick);
      } catch {
        // The ring just stays still; recording is unaffected.
      }
    }

    try {
      recorder.start();
      setStatus("recording");
      return null;
    } catch {
      teardown(session);
      setStatus("idle");
      return "failed";
    }
  }, [levelTarget, teardown]);

  /** End the turn and hand over what was said. `null` if nothing was captured. */
  const finish = useCallback((): Promise<RecordedAudio | null> => {
    const session = sessionRef.current;
    if (!session || session.recorder.state === "inactive") return Promise.resolve(null);
    return new Promise((resolve) => {
      session.resolve = resolve;
      session.recorder.stop();
    });
  }, []);

  /** Throw away whatever is being recorded. */
  const cancel = useCallback(() => {
    generationRef.current += 1;
    const session = sessionRef.current;
    if (!session) {
      pendingRef.current = false;
      setStatus("idle");
      return;
    }
    session.discard = true;
    if (session.recorder.state !== "inactive") session.recorder.stop();
    else teardown(session);
  }, [teardown]);

  /**
   * Ask for microphone permission up front (inside the Start tap) and release
   * the microphone straight away, so the prompt never interrupts a conversation.
   */
  const checkPermission = useCallback(async (): Promise<MicPermission> => {
    const problem = environmentProblem();
    if (problem) return problem;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
      return "granted";
    } catch (error) {
      return problemFromException(error);
    }
  }, []);

  useEffect(() => {
    return () => {
      generationRef.current += 1;
      const session = sessionRef.current;
      if (session) {
        session.discard = true;
        session.recorder.onstop = null;
        if (session.recorder.state !== "inactive") session.recorder.stop();
        session.resolve?.(null);
        session.stream.getTracks().forEach((track) => track.stop());
        cancelAnimationFrame(session.frame);
        void session.audioContext?.close().catch(() => {});
        sessionRef.current = null;
      }
    };
  }, []);

  return { status, start, finish, cancel, checkPermission };
}
