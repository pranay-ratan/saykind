import { describe, expect, it } from 'vitest';
import { createAudioCache } from './audioCache';
import { clampRate, isValidSpeechText, rateToElevenLabsSpeed } from './speed';

describe('rateToElevenLabsSpeed', () => {
  it('maps the snail rate into the ElevenLabs range', () => {
    expect(rateToElevenLabsSpeed(0.5)).toBe(0.7);
  });

  it('keeps normal speed unchanged', () => {
    expect(rateToElevenLabsSpeed(1)).toBe(1);
  });

  it('caps the fastest setting at 1.2', () => {
    expect(rateToElevenLabsSpeed(1.3)).toBe(1.2);
  });
});

describe('clampRate', () => {
  it('limits rates to the supported 0.5 to 1.5 range', () => {
    expect(clampRate(0.1)).toBe(0.5);
    expect(clampRate(9)).toBe(1.5);
  });
});

describe('isValidSpeechText', () => {
  it('accepts short non-empty text', () => {
    expect(isValidSpeechText('mug')).toBe(true);
  });

  it('rejects blank or overlong text', () => {
    expect(isValidSpeechText('   ')).toBe(false);
    expect(isValidSpeechText('x'.repeat(61))).toBe(false);
    expect(isValidSpeechText(42)).toBe(false);
  });
});

describe('createAudioCache', () => {
  it('returns stored audio until the entry expires', () => {
    let clock = 0;
    const cache = createAudioCache({ maxEntries: 10, ttlMs: 1000, now: () => clock });
    const audio = new ArrayBuffer(4);
    cache.set('k', audio);
    expect(cache.get('k')).toBe(audio);
    clock = 1000;
    expect(cache.get('k')).toBeUndefined();
  });

  it('evicts the oldest entry once the limit is reached', () => {
    const cache = createAudioCache({ maxEntries: 2, ttlMs: 60000 });
    cache.set('a', new ArrayBuffer(1));
    cache.set('b', new ArrayBuffer(1));
    cache.set('c', new ArrayBuffer(1));
    expect(cache.size()).toBe(2);
    expect(cache.get('a')).toBeUndefined();
    expect(cache.get('c')).toBeDefined();
  });
});
