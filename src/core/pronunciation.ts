/** Syllable breakdowns for common household objects. Also the set pre-warmed for speech. */
const SYLLABLE_DICTIONARY: Readonly<Record<string, readonly string[]>> = {
  cup: ['cup'],
  mug: ['mug'],
  bottle: ['bot', 'tle'],
  glass: ['glass'],
  plate: ['plate'],
  bowl: ['bowl'],
  fork: ['fork'],
  spoon: ['spoon'],
  knife: ['knife'],
  chair: ['chair'],
  table: ['ta', 'ble'],
  bed: ['bed'],
  sofa: ['so', 'fa'],
  lamp: ['lamp'],
  phone: ['phone'],
  book: ['book'],
  pen: ['pen'],
  pencil: ['pen', 'cil'],
  key: ['key'],
  door: ['door'],
  window: ['win', 'dow'],
  clock: ['clock'],
  shirt: ['shirt'],
  shoe: ['shoe'],
  hat: ['hat'],
  bag: ['bag'],
  box: ['box'],
  toothbrush: ['tooth', 'brush'],
  towel: ['tow', 'el'],
  soap: ['soap'],
  comb: ['comb'],
  jar: ['jar'],
  tray: ['tray'],
  plant: ['plant'],
  flower: ['flow', 'er'],
  picture: ['pic', 'ture'],
  remote: ['re', 'mote'],
  keyboard: ['key', 'board'],
  umbrella: ['um', 'brel', 'la'],
  backpack: ['back', 'pack'],
};

export const PRONUNCIATION_WORDS: readonly string[] = Object.keys(SYLLABLE_DICTIONARY);

/**
 * Splits a word into vowel-led chunks. A heuristic for words outside the dictionary:
 * "bottle" style splits can be off, so the dictionary covers the common objects.
 */
export function splitSyllablesFallback(word: string): string[] {
  const letters = word.toLowerCase().replace(/[^a-z]/g, '');
  if (letters.length === 0) return [];

  const chunks = letters.match(/[^aeiouy]*[aeiouy]+/g) ?? [];
  const consumed = chunks.join('').length;
  const trailingConsonants = letters.slice(consumed);

  if (chunks.length === 0) return [letters];
  if (trailingConsonants.length === 0) return chunks;

  return [...chunks.slice(0, -1), `${chunks[chunks.length - 1]}${trailingConsonants}`];
}

export function getSyllables(word: string): string[] {
  const key = word.toLowerCase().trim();
  const known = SYLLABLE_DICTIONARY[key];
  if (known) return [...known];

  const fallback = splitSyllablesFallback(key);
  return fallback.length > 0 ? fallback : [key];
}
