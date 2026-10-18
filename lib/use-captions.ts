"use client";

import { useCallback, useSyncExternalStore } from "react";

/** Captions are on by default. The choice is remembered on this device. */
const KEY = "cafe-captions";
const listeners = new Set<() => void>();

function subscribe(callback: () => void) {
  listeners.add(callback);
  window.addEventListener("storage", callback);
  return () => {
    listeners.delete(callback);
    window.removeEventListener("storage", callback);
  };
}

function read(): boolean {
  try {
    return window.localStorage.getItem(KEY) !== "off";
  } catch {
    return true;
  }
}

export function useCaptions(): [boolean, (on: boolean) => void] {
  const on = useSyncExternalStore(subscribe, read, () => true);
  const set = useCallback((next: boolean) => {
    try {
      window.localStorage.setItem(KEY, next ? "on" : "off");
    } catch {
      // Private mode: the choice just won't be remembered.
    }
    listeners.forEach((listener) => listener());
  }, []);
  return [on, set];
}
