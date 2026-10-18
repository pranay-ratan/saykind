export interface AudioCacheOptions {
  maxEntries: number;
  ttlMs: number;
  now?: () => number;
}

export interface AudioCache {
  get(key: string): ArrayBuffer | undefined;
  set(key: string, audio: ArrayBuffer): void;
  size(): number;
}

interface CacheEntry {
  audio: ArrayBuffer;
  storedAt: number;
}

/** Bounded in-memory cache. Oldest entries go first once maxEntries is reached. */
export function createAudioCache(options: AudioCacheOptions): AudioCache {
  const entries = new Map<string, CacheEntry>();
  const now = options.now ?? Date.now;

  function evictExpiredAndOldest(): void {
    const cutoff = now() - options.ttlMs;
    for (const [key, entry] of entries) {
      if (entry.storedAt < cutoff) entries.delete(key);
    }
    while (entries.size > options.maxEntries) {
      const oldestKey = entries.keys().next().value;
      if (oldestKey === undefined) break;
      entries.delete(oldestKey);
    }
  }

  return {
    get(key) {
      const entry = entries.get(key);
      if (!entry) return undefined;
      if (now() - entry.storedAt >= options.ttlMs) {
        entries.delete(key);
        return undefined;
      }
      return entry.audio;
    },
    set(key, audio) {
      entries.delete(key);
      entries.set(key, { audio, storedAt: now() });
      evictExpiredAndOldest();
    },
    size() {
      return entries.size;
    },
  };
}
