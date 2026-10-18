/** How many edits away two words may be and still count as close, as a share of the longer word. */
const FIRST_SOUND_BOOST = 0.15;
const CLOSE_ENOUGH_RATIO = 0.8;

/** Lowercases, drops punctuation, and collapses spaces, so "Coffee!" and "coffee" compare equal. */
export function normalizeWord(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Classic Levenshtein edit distance, computed row by row to keep memory small. */
export function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  let previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let row = 1; row <= a.length; row += 1) {
    const current = [row];
    for (let column = 1; column <= b.length; column += 1) {
      const substitution = previous[column - 1] + (a[row - 1] === b[column - 1] ? 0 : 1);
      current.push(Math.min(previous[column] + 1, current[column - 1] + 1, substitution));
    }
    previous = current;
  }
  return previous[b.length];
}

/**
 * Lenient 0..1 closeness between the target word and what was heard. Exact or contained matches score 1.
 * A matching first letter adds a small boost, because people often get the start right and the rest blurred.
 */
export function closenessScore(target: string, heard: string): number {
  const expected = normalizeWord(target);
  const actual = normalizeWord(heard);
  if (expected.length === 0 || actual.length === 0) return 0;
  if (actual === expected || actual.includes(expected)) return 1;

  const longest = Math.max(expected.length, actual.length);
  const similarity = 1 - editDistance(expected, actual) / longest;
  const firstSoundMatches = expected[0] === actual[0];
  const boosted = firstSoundMatches && similarity < CLOSE_ENOUGH_RATIO ? similarity + FIRST_SOUND_BOOST : similarity;
  return Math.min(1, Math.max(0, boosted));
}
