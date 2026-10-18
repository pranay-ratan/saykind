import { describe, expect, it } from 'vitest';
import { createFixedWindowLimiter } from './rateLimiter';

describe('createFixedWindowLimiter', () => {
  it('allows up to the limit within one window', () => {
    const limiter = createFixedWindowLimiter({ limit: 2, windowMs: 60000, maxKeys: 100 });
    expect(limiter.check('a', 0).allowed).toBe(true);
    expect(limiter.check('a', 1000).allowed).toBe(true);
    expect(limiter.check('a', 2000).allowed).toBe(false);
  });

  it('reports how many seconds until the window resets', () => {
    const limiter = createFixedWindowLimiter({ limit: 1, windowMs: 60000, maxKeys: 100 });
    limiter.check('a', 0);
    expect(limiter.check('a', 10000)).toEqual({ allowed: false, retryAfterSeconds: 50 });
  });

  it('resets the count after the window ends', () => {
    const limiter = createFixedWindowLimiter({ limit: 1, windowMs: 60000, maxKeys: 100 });
    limiter.check('a', 0);
    expect(limiter.check('a', 60000).allowed).toBe(true);
  });

  it('keeps separate counts per key', () => {
    const limiter = createFixedWindowLimiter({ limit: 1, windowMs: 60000, maxKeys: 100 });
    limiter.check('a', 0);
    expect(limiter.check('b', 0).allowed).toBe(true);
  });

  it('forgets expired keys once the table is full', () => {
    const limiter = createFixedWindowLimiter({ limit: 1, windowMs: 1000, maxKeys: 2 });
    limiter.check('a', 0);
    limiter.check('b', 0);
    expect(limiter.check('c', 5000).allowed).toBe(true);
    expect(limiter.check('a', 5000).allowed).toBe(true);
  });
});
