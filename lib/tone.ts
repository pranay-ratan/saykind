/**
 * Dignity-first voice: every line the app or its models say to the person speaks to a capable adult, politely and
 * warmly. This is the one place that lists what must never reach them, so the barista, the adaptive layer, the
 * report and the Level 2 sheet can all check against it. See docs/TONE.md.
 */

/**
 * Phrases that talk down, cheer, pity, blame the person or hurry them. Checked on whole sentences, case-insensitively.
 * Kept conservative: ordinary café words ("iced", "slow drip"?) are not matched; "slow" only as a comment on the person.
 */
export const UNDIGNIFIED =
  /\b(perfect(ly)?|wrong|incorrect(ly)?|mistakes?|scor(e|es|ed|ing)|good job|great job|nice job|well done|good girl|good boy|you did it|don'?t worry|no worries|i (can'?t|cannot|couldn'?t|could not|don'?t|do not|didn'?t|did not) understand( you)?|hurry( up)?|quickly|simply|obviously|just\b|too slow|so slow|slow down|very slow|you'?re slow|try harder|at least|big (girl|boy)|sweetie|honey|dear\b|buddy|champ|struggl(e|es|ed|ing)|unable to|aphasic)\b/i;

/** True when a line would not pass the dignity rules. */
export function hasUndignifiedLanguage(text: string): boolean {
  return UNDIGNIFIED.test(text);
}

/** Keeps the sentences of `text` that pass, dropping the rest. Returns "" when nothing passes. */
export function politeSentences(text: string): string {
  if (!hasUndignifiedLanguage(text)) return text;
  const sentences = text.match(/[^.!?]+[.!?]*/g) ?? [text];
  return sentences
    .filter((sentence) => !hasUndignifiedLanguage(sentence))
    .join("")
    .trim();
}

/** The voice, in a form prompts can quote. */
export const TONE_RULES = [
  "Speak to the person as a capable adult, politely and warmly: 'please', 'thank you', 'of course', 'take your time', used naturally.",
  "Never baby talk, cheering ('good job', 'well done', 'you did it'), pity ('don't worry'), blame ('I can't understand you') or hurry ('just', 'simply', 'obviously', 'quickly').",
  "Never comment on the person's slowness or ability. Never call anything wrong or a mistake. No scores, levels or grades.",
  "If something was not understood, put it on yourself ('Let me check I have that right'), offer the pictures, and ask one question at a time. Never finish the person's words for them.",
].join("\n");
