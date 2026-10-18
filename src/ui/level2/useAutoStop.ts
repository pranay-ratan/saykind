'use client';

import { useEffect, useRef, type RefObject } from 'react';
import { AUTO_STOP, autoStopReason, readLevel, type AutoStopReason } from '../../core/autoStop';

interface AutoStopOptions {
  /** True while a recording is running. */
  active: boolean;
  /** The element the recorder writes its live level to (the CSS variable --level). */
  levelRef: RefObject<HTMLElement | null>;
  onStop: (reason: Exclude<AutoStopReason, null>) => void;
}

/**
 * Ends a recording by itself after 2.5 s of silence once the person has spoken, or at 15 s. It reads the same live
 * level the ring uses, so there is no second microphone path and nothing on screen counts down.
 */
export function useAutoStop({ active, levelRef, onStop }: AutoStopOptions): void {
  const onStopRef = useRef(onStop);
  useEffect(() => {
    onStopRef.current = onStop;
  }, [onStop]);

  useEffect(() => {
    if (!active) return undefined;
    const startedAt = Date.now();
    let lastLoudAt: number | null = null;
    let frame = 0;
    let stopped = false;

    const tick = () => {
      if (stopped) return;
      const now = Date.now();
      if (readLevel(levelRef.current) >= AUTO_STOP.speechLevel) lastLoudAt = now;
      const reason = autoStopReason({ now, startedAt, lastLoudAt });
      if (reason) {
        stopped = true;
        onStopRef.current(reason);
        return;
      }
      frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);

    return () => {
      stopped = true;
      window.cancelAnimationFrame(frame);
    };
  }, [active, levelRef]);
}
