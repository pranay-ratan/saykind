import "server-only";

import { containsBannedLanguage } from "../report/language";
import { buildTemplateReport } from "../report/template";
import { DISCLAIMER, reportContentSchema, type ReportContent, type ReportInput, type ReportSource } from "../report/types";
import { DEFAULT_CLAUDE_MODEL, LlmError, claudeJson, type ChatTurn } from "./llm/claude";

const REPORT_MAX_TOKENS = 900;
const REPORT_TIMEOUT_MS = 20_000;

const SCHEMA_TEXT = JSON.stringify({
  type: "object",
  additionalProperties: false,
  required: ["summary", "strengths", "needsSupport", "observations", "suggestedFocus", "limits"],
  properties: {
    summary: { type: "string", description: "Two or three plain sentences about this session." },
    strengths: { type: "array", maxItems: 4, items: { type: "string" } },
    needsSupport: { type: "array", maxItems: 4, items: { type: "string" } },
    observations: { type: "array", maxItems: 6, items: { type: "string" } },
    suggestedFocus: { type: "array", maxItems: 4, items: { type: "string" } },
    limits: { type: "string", description: "One or two sentences on what these observations cannot tell." },
  },
});

const SYSTEM_PROMPT = `You write a short practice note for a speech-language pathologist or doctor, from counts an app recorded while a person with aphasia practiced words and ordering in a café. The person will read it and decide whether to share it.

RULES
- Describe what happened, in plain language. Use only the numbers and words you are given. Never invent details.
- No scores, percentages, grades or rankings. No diagnostic language: do not name conditions, severity or prognosis.
- Never call anything wrong, a failure, poor or bad. Describe tries, hints and help as ordinary ways of practicing.
- Speech recognition in the app can be wrong, so never judge how a word was pronounced.
- Be kind and neutral. Short sentences. Each list item is one sentence. Leave a list empty if there is nothing true to say.
- Person-first, strength-based language: "the person", "they practiced", "what helped". Never "struggles", "unable", "poor", "patronising praise" ("good job"), pity ("don't worry") or any comment on slowness or ability. Describe help and repeats as ordinary parts of practice.
- "limits" says what these observations cannot tell (for example, they come from one short session and from automatic counts).
- Do not write the line "${DISCLAIMER}"; it is added for you.`;

/**
 * Makes the report text. With no key, or on any error, or if the model's words break the language rules, a fixed
 * template is returned instead, so the person always gets a report. The input is never logged.
 */
export async function generateReport(
  input: ReportInput,
  env: Readonly<Record<string, string | undefined>>,
): Promise<{ content: ReportContent; source: ReportSource }> {
  const fallback = { content: buildTemplateReport(input), source: "template" as const };
  const apiKey = env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) return fallback;

  const messages: ChatTurn[] = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: `Session data (JSON):\n${JSON.stringify(input)}` },
  ];
  try {
    const content = await claudeJson({
      apiKey,
      model: env.CLAUDE_MODEL?.trim() || DEFAULT_CLAUDE_MODEL,
      messages,
      schemaText: SCHEMA_TEXT,
      schema: reportContentSchema,
      maxTokens: REPORT_MAX_TOKENS,
      timeoutMs: REPORT_TIMEOUT_MS,
    });
    if (containsBannedLanguage(content)) {
      // The rule only, never the words: the report text is private.
      console.error("[report] using the template: the language rule rejected the model's report");
      return fallback;
    }
    return { content, source: "ai" };
  } catch (error) {
    // Name, code and the shape message (field paths and codes) only; never the input or any reply text.
    const detail = error instanceof LlmError ? `${error.code}: ${error.message}` : error instanceof Error ? error.name : "error";
    console.error(`[report] using the template: ${detail}`);
    return fallback;
  }
}
