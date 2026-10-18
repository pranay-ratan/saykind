"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

function subscribe(callback: () => void) {
  const media = window.matchMedia(QUERY);
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
}

/** True when the person has asked their device for less motion. */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, () => window.matchMedia(QUERY).matches, () => false);
}

/**
 * Lets something fade out instead of vanishing. Keep rendering while `mounted`,
 * and style `[data-state="open"]` / `[data-state="closed"]`. With reduced motion
 * the exit is instant.
 */
export function usePresence(show: boolean, exitMs = 240) {
  const reduced = useReducedMotion();
  const [mounted, setMounted] = useState(show);
  if (show && !mounted) setMounted(true);

  useEffect(() => {
    if (show || !mounted) return;
    const timer = setTimeout(() => setMounted(false), reduced ? 0 : exitMs);
    return () => clearTimeout(timer);
  }, [show, mounted, reduced, exitMs]);

  return { mounted: show || mounted, state: show ? ("open" as const) : ("closed" as const) };
}

/** The last non-empty value, so content can stay on screen while it fades out. */
export function useHeld<T>(value: T | null | undefined | ""): T | null {
  const [held, setHeld] = useState<T | null>(value || null);
  if (value && value !== held) setHeld(value);
  return value || held;
}
