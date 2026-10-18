import { relativeTime, summarise, type PracticeEvent } from "./log";

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/**
 * A short, plain message the person can read, edit and choose to send. It lists only what happened (words and
 * numbers of tries); it says nothing about how well anything was pronounced, because that is not something the
 * app can know.
 */
export function buildHelpSummary(events: PracticeEvent[], now = Date.now()): string {
  const recent = events.filter((event) => now - event.ts < 1000 * 60 * 60 * 24);
  const words = summarise(recent).filter((word) => word.attempts > 0 || word.helpUses > 0).slice(0, 5);
  if (words.length === 0) return "Hi, I'd like some help. I'm using Saykind (speech practice).";
  const list = words.map((word) => `${word.itemText} (${plural(word.attempts, "try", "tries")})`).join(", ");
  const slow = words.filter((word) => word.slowPlays > 0).map((word) => word.itemText);
  const last = Math.max(...words.map((word) => word.lastTs));
  return [
    `Hi, I'd like some help. I'm using Saykind (speech practice).`,
    `Today I practiced: ${list}.`,
    slow.length ? `I needed the slower audio for: ${slow.join(", ")}.` : "",
    `Last practice: ${relativeTime(last, now)}.`,
  ]
    .filter(Boolean)
    .join(" ");
}

/** The plain-text version of the caregiver report, for "copy". */
export function buildReportText(events: PracticeEvent[], flags: { progress: boolean; assistance: boolean }, name: string): string {
  const words = summarise(events);
  const lines = [`Saykind practice summary${name ? ` for ${name}` : ""}`, "Automatic speech recognition is uncertain and is not a clinical measure of pronunciation.", ""];
  if (!flags.progress) return lines.concat("Practice details are not being shared.").join("\n");
  for (const word of words) {
    const parts = [`${word.itemText}: ${plural(word.attempts, "try", "tries")}`];
    if (word.retries) parts.push(plural(word.retries, "retry", "retries"));
    if (flags.assistance) {
      if (word.normalPlays) parts.push(`heard ${word.normalPlays}x`);
      if (word.slowPlays) parts.push(`slow audio ${word.slowPlays}x`);
      if (word.helpUses) parts.push(`help ${word.helpUses}x`);
    }
    if (word.heard.length) parts.push(`computer heard (uncertain): ${word.heard.map((h) => `“${h.text}”`).join(", ")}`);
    lines.push(`- ${parts.join("; ")}`);
  }
  return lines.join("\n");
}
