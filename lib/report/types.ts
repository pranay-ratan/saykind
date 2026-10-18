import { z } from "zod";
import type { SessionTurn } from "../cafe-session";

/** Printed on every report, fixed. The model never writes it and cannot change it. */
export const DISCLAIMER = "AI observations, not a diagnosis.";

const MAX_WORDS = 12;
const shortText = z.string().trim().min(1).max(60);

const wordPracticeSchema = z.object({
  word: shortText,
  attempts: z.number().int().min(0).max(500),
  replays: z.number().int().min(0).max(500),
  slowPlays: z.number().int().min(0).max(500),
  hints: z.number().int().min(0).max(500),
  selfReports: z.number().int().min(0).max(500),
});

/**
 * The compact data a report is made from: counts and short words only. No audio, no images, no recordings and
 * no conversation text. This is the only thing /api/report ever receives.
 */
export const reportInputSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  level1: z.object({
    words: z.array(wordPracticeSchema).max(MAX_WORDS),
    adaptiveLevel: z.number().int().min(1).max(5).nullable(),
    careNotes: z.array(z.string().trim().min(1).max(200)).max(5),
  }),
  level2: z.object({ words: z.array(wordPracticeSchema).max(MAX_WORDS) }),
  cafe: z
    .object({
      order: z.string().max(120),
      completed: z.boolean(),
      turns: z.number().int().min(0).max(200),
      followUpsNeeded: z.number().int().min(0).max(200),
      helpRequests: z.number().int().min(0).max(200),
      menuHelpUsed: z.boolean(),
    })
    .nullable(),
});

export type ReportInput = z.infer<typeof reportInputSchema>;
export type WordPractice = z.infer<typeof wordPracticeSchema>;

const line = z.string().trim().min(1).max(240);

/** What the report says. Written by Anthropic when it can be, by a fixed template when it cannot. */
export const reportContentSchema = z.object({
  summary: z.string().trim().min(1).max(500),
  strengths: z.array(line).max(6),
  needsSupport: z.array(line).max(6),
  observations: z.array(line).max(8),
  suggestedFocus: z.array(line).max(6),
  limits: z.string().trim().min(1).max(300),
});

export type ReportContent = z.infer<typeof reportContentSchema>;

export type ReportSource = "ai" | "template";

/** A report kept on this device. Nothing is stored on a server. */
export type SavedReport = {
  id: string;
  createdAt: number;
  source: ReportSource;
  input: ReportInput;
  content: ReportContent;
  disclaimer: typeof DISCLAIMER;
  /** The café conversation, kept only here. It is part of an exported report only when the person switches it on. */
  transcript: SessionTurn[];
};
