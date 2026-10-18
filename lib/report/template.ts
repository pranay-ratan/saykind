import type { ReportContent, ReportInput, WordPractice } from "./types";

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const sum = (words: readonly WordPractice[], pick: (word: WordPractice) => number) => words.reduce((total, word) => total + pick(word), 0);

const LIMITS =
  "Based only on what the app counted in this session. Speech recognition can mishear any voice and is not a measure of pronunciation, and the app does not judge how practice went.";

function summaryLine(input: ReportInput): string {
  const parts: string[] = [];
  if (input.level1.words.length > 0) parts.push(`practiced ${plural(input.level1.words.length, "word")} in Level 1`);
  if (input.level2.words.length > 0) parts.push(`looked at ${plural(input.level2.words.length, "object")} with the camera in Level 2`);
  if (input.cafe) parts.push(`had a café ordering conversation (${plural(input.cafe.turns, "turn")})`);
  if (parts.length === 0) return `No practice was recorded for ${input.date}.`;
  return `On ${input.date}, the person ${parts.join(", ")}.`;
}

function strengthsOf(input: ReportInput): string[] {
  const words = [...input.level1.words, ...input.level2.words];
  const attempts = sum(words, (word) => word.attempts);
  const selfReports = sum(words, (word) => word.selfReports);
  const listens = sum(words, (word) => word.replays + word.slowPlays);
  const lines: string[] = [];
  if (input.cafe?.completed) lines.push(`Finished a café order: ${input.cafe.order}.`);
  if (input.cafe?.menuHelpUsed) lines.push("Used the menu pictures to answer when a word was hard to find.");
  if (selfReports > 0) lines.push(`Said when they felt they had said a word (${plural(selfReports, "time")}).`);
  if (listens > 0) lines.push(`Listened to words again (${plural(listens, "time")}), a useful way to practice.`);
  if (attempts > 0) lines.push(`Kept going: ${plural(attempts, "speaking try", "speaking tries")} across ${plural(words.length, "word")}.`);
  return lines.slice(0, 4);
}

const needsHelp = (word: WordPractice) => word.attempts >= 3 || word.hints >= 2;

function needsSupportOf(input: ReportInput): string[] {
  const lines = [...input.level1.words, ...input.level2.words]
    .filter(needsHelp)
    .slice(0, 4)
    .map((word) => `For "${word.word}", the person used several tries or hints (${plural(word.attempts, "try", "tries")}, ${plural(word.hints, "hint")}).`);
  if (input.cafe && input.cafe.followUpsNeeded >= 2) lines.push(`The barista needed to ask again on ${plural(input.cafe.followUpsNeeded, "turn")}.`);
  if (input.cafe && input.cafe.helpRequests >= 1) lines.push(`Opened the Help sheet ${plural(input.cafe.helpRequests, "time")} in the café.`);
  return lines.slice(0, 6);
}

function observationsOf(input: ReportInput): string[] {
  const wordLine = (level: string, word: WordPractice) => {
    const parts = [plural(word.attempts, "try", "tries")];
    if (word.replays) parts.push(`listened ${plural(word.replays, "time")}`);
    if (word.slowPlays) parts.push(`slow audio ${plural(word.slowPlays, "time")}`);
    if (word.hints) parts.push(plural(word.hints, "hint"));
    if (word.selfReports) parts.push(`said it ${plural(word.selfReports, "time")}`);
    return `${level}, ${word.word}: ${parts.join(", ")}.`;
  };
  const lines = [
    ...input.level1.words.slice(0, 4).map((word) => wordLine("Level 1", word)),
    ...input.level2.words.slice(0, 3).map((word) => wordLine("Level 2", word)),
  ];
  if (input.level1.adaptiveLevel !== null) lines.push(`The app's practice level for Level 1 is ${input.level1.adaptiveLevel} (it moves up or down as practice goes).`);
  for (const note of input.level1.careNotes.slice(-2)) lines.push(`App note: ${note}`);
  if (input.cafe) lines.push(`Café: ${plural(input.cafe.turns, "turn")}, ${plural(input.cafe.followUpsNeeded, "follow-up question")}, menu pictures ${input.cafe.menuHelpUsed ? "used" : "not used"}.`);
  return lines.slice(0, 8);
}

function focusOf(input: ReportInput): string[] {
  const lines = [...input.level1.words, ...input.level2.words]
    .filter(needsHelp)
    .slice(0, 3)
    .map((word) => `Revisit "${word.word}" with the first sound or syllable hints.`);
  if (input.cafe && (input.cafe.followUpsNeeded > 0 || input.cafe.helpRequests > 0)) lines.push("Try the café order again with the menu pictures close by.");
  if (lines.length === 0) lines.push("Keep to short, untimed sessions at the person's own pace.");
  return lines.slice(0, 6);
}

/** The fixed report used whenever Anthropic is not available. The same input always gives the same report. */
export function buildTemplateReport(input: ReportInput): ReportContent {
  return {
    summary: summaryLine(input),
    strengths: strengthsOf(input),
    needsSupport: needsSupportOf(input),
    observations: observationsOf(input),
    suggestedFocus: focusOf(input),
    limits: LIMITS,
  };
}
