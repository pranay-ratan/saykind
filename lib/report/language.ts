import type { ReportContent } from "./types";

/** Words a report must never contain: scores, percentages, judgement, and diagnostic language. */
const BANNED =
  /\d+\s?%|percent|\bscor(e|es|ed|ing)\b|\bgrad(e|ed|ing)\b|\bwrong\b|\bincorrect(ly)?\b|\bfail(s|ed|ure)?\b|\bpoor(ly)?\b|\bbad\b|diagnos|disorder|severe|severity|impair|deficit|prognos|\bsymptom|\bstruggl|\bunable\b|\bsuffer|\baphasic\b|\bgood job\b|\bwell done\b|\bdon'?t worry\b|\btoo slow\b|\bso slow\b|\bslowly\b.*\bperson\b/i;

/** "Not a diagnosis" is the fixed disclaimer's own wording, so it is allowed to appear. */
const stripAllowed = (text: string) => text.replace(/not a diagnosis/gi, "");

export function containsBannedLanguage(content: ReportContent): boolean {
  const text = [content.summary, content.limits, ...content.strengths, ...content.needsSupport, ...content.observations, ...content.suggestedFocus].join("\n");
  return BANNED.test(stripAllowed(text));
}
