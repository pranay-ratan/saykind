const clean = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/**
 * Does what the recogniser returned plausibly contain this word?
 *
 * IMPORTANT: this is NOT a pronunciation score. Speech recognition is not a reliable judge of speech
 * affected by aphasia. The result only chooses which kind sentence to show; it never blocks anyone,
 * and the patient can always say "that's what I meant" or simply continue.
 */
export function heardAny(accepted: string[], transcript: string): boolean {
  const heard = clean(transcript);
  if (!heard) return false;
  return accepted.some((candidate) => heard.includes(clean(candidate)));
}
