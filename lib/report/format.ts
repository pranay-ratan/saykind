import { DISCLAIMER, type SavedReport } from "./types";

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const MAILTO_BODY_CHARS = 1200;

export const isEmail = (value: string): boolean => EMAIL.test(value.trim());

export const reportFileName = (report: SavedReport, extension = "txt"): string => `saykind-report-${report.input.date}.${extension}`;

function section(title: string, lines: readonly string[]): string[] {
  return lines.length === 0 ? [] : [title, ...lines.map((line) => `- ${line}`), ""];
}

/** The report as plain text, for Copy, Share and the file. The conversation is included only when asked for. */
export function reportToText(report: SavedReport, includeTranscript: boolean): string {
  const { content } = report;
  const lines = [
    `Saykind practice report, ${report.input.date}`,
    "",
    content.summary,
    "",
    ...section("Strengths", content.strengths),
    ...section("Where support may help", content.needsSupport),
    ...section("Observations", content.observations),
    ...section("Suggested focus", content.suggestedFocus),
    `Limits: ${content.limits}`,
    DISCLAIMER,
  ];
  if (includeTranscript && report.transcript.length > 0) {
    lines.push("", "Café conversation");
    for (const turn of report.transcript) lines.push(`${turn.who === "barista" ? "Barista" : "Me"}: ${turn.text}`);
  }
  return lines.join("\n");
}

/** A mailto link with a short body. Mail links cannot carry files, so the body asks for the saved file to be attached. */
export function reportToMailto(report: SavedReport, doctor: { name: string; email: string }): string {
  const greeting = doctor.name.trim() ? `Hello ${doctor.name.trim()},` : "Hello,";
  const body = [greeting, "", report.content.summary, "", "[Please attach the saved Saykind report file before sending.]", "", DISCLAIMER].join("\n").slice(0, MAILTO_BODY_CHARS);
  const subject = `Saykind practice report, ${report.input.date}`;
  const to = isEmail(doctor.email) ? encodeURIComponent(doctor.email.trim()) : "";
  return `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export const printPath = (report: SavedReport, includeTranscript: boolean): string => `/report/print?id=${encodeURIComponent(report.id)}&t=${includeTranscript ? "1" : "0"}`;
