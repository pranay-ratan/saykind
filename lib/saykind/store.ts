"use client";

import { useSyncExternalStore } from "react";

/**
 * A tiny local store: one JSON value in localStorage, readable from React. Everything Saykind remembers
 * about practice lives on this device only. Nothing here is ever sent to a server.
 */
export function createLocalStore<T>(key: string, initial: T) {
  const listeners = new Set<() => void>();
  let cache: { raw: string | null; value: T } | null = null;

  const read = (): T => {
    let raw: string | null = null;
    try {
      raw = window.localStorage.getItem(key);
    } catch {
      return cache?.value ?? initial;
    }
    if (cache && cache.raw === raw) return cache.value;
    let value = initial;
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        value = Array.isArray(initial) ? (parsed as T) : ({ ...initial, ...parsed } as T);
      } catch {
        value = initial;
      }
    }
    cache = { raw, value };
    return value;
  };

  const write = (next: T) => {
    const raw = JSON.stringify(next);
    try {
      window.localStorage.setItem(key, raw);
    } catch {
      // Private mode: it works for this visit, but is not remembered.
    }
    cache = { raw, value: next };
    listeners.forEach((listener) => listener());
  };

  const subscribe = (listener: () => void) => {
    listeners.add(listener);
    const onStorage = (event: StorageEvent) => {
      if (event.key === key) listener();
    };
    window.addEventListener("storage", onStorage);
    return () => {
      listeners.delete(listener);
      window.removeEventListener("storage", onStorage);
    };
  };

  return {
    get: read,
    set: write,
    update: (change: (current: T) => T) => write(change(read())),
    use: (): T => useSyncExternalStore(subscribe, read, () => initial),
  };
}
