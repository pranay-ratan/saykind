export interface RateLimitDecision {
  allowed: boolean;
  retryAfterSeconds: number;
}

export interface FixedWindowLimiter {
  check(key: string, now: number): RateLimitDecision;
}

interface WindowState {
  count: number;
  resetAt: number;
}

export function createFixedWindowLimiter(options: {
  limit: number;
  windowMs: number;
  maxKeys: number;
}): FixedWindowLimiter {
  const windows = new Map<string, WindowState>();

  function pruneExpired(now: number): void {
    for (const [key, state] of windows) {
      if (now >= state.resetAt) windows.delete(key);
    }
  }

  return {
    check(key, now) {
      if (windows.size >= options.maxKeys) pruneExpired(now);

      const current = windows.get(key);
      if (!current || now >= current.resetAt) {
        windows.set(key, { count: 1, resetAt: now + options.windowMs });
        return { allowed: true, retryAfterSeconds: 0 };
      }

      if (current.count >= options.limit) {
        return { allowed: false, retryAfterSeconds: Math.ceil((current.resetAt - now) / 1000) };
      }

      current.count += 1;
      return { allowed: true, retryAfterSeconds: 0 };
    },
  };
}
