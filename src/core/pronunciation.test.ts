import { describe, expect, it } from 'vitest';
import { getSyllables, PRONUNCIATION_WORDS, splitSyllablesFallback } from './pronunciation';

describe('getSyllables', () => {
  it('returns the dictionary breakdown for a known object', () => {
    expect(getSyllables('Bottle')).toEqual(['bot', 'tle']);
  });

  it('splits an unknown word on vowel groups', () => {
    expect(getSyllables('banana')).toEqual(['ba', 'na', 'na']);
  });

  it('never returns an empty list', () => {
    expect(getSyllables('123')).toEqual(['123']);
  });
});

describe('splitSyllablesFallback', () => {
  it('attaches trailing consonants to the last syllable', () => {
    expect(splitSyllablesFallback('cat')).toEqual(['cat']);
  });

  it('returns nothing for an empty word', () => {
    expect(splitSyllablesFallback('')).toEqual([]);
  });
});

describe('PRONUNCIATION_WORDS', () => {
  it('lists the forty practice objects', () => {
    expect(PRONUNCIATION_WORDS).toHaveLength(40);
    expect(new Set(PRONUNCIATION_WORDS).size).toBe(40);
  });
});
