import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { clampLevel, decideNextStep } from "./rules";
import type { AdaptRequest, AdaptResponse, AdaptiveDecision, AttemptEvent } from "./types";

/** Server only. Claude gets text and numbers, never audio, images or personal data. */
const DEFAULT_MODEL = "claude-haiku-5-5";
const TIMEOUT_MS = 8000;
const MAX_EVENTS = 10;
const MAX_TOKENS = 400;

const SYSTEM_PROMPT = [
  "You support people practicing words after aphasia. You never score, grade or judge the person, and you never say they were wrong.",
  "You receive recent practice attempts as JSON. Reply with JSON only, no prose, in exactly this shape:",
  '{"nextLevel": number, "cueSupport": "none" | "firstSound" | "syllables", "autoSlow": boolean, "message": string, "careNote": string}',
  "nextLevel changes by at most one step from currentLevel and stays between 1 and 5.",
  "message is short, warm and true. It is the only text the person sees. careNote is a short factual note for their care team.",
].join("\n");

const DecisionSchema = z.object({
  nextLevel: z.number().int(),
  cueSupport: z.enum(["none", "firstSound", "syllables"]),
  autoSlow: z.boolean(),
  message: z.string().min(1).max(240),
  careNote: z.string().min(1).max(400),
});

/** Keeps only the fields the model needs, and only the most recent events. */
export function compactEvents(recent: readonly AttemptEvent[]): Record<string, unknown>[] {
  return recent.slice(-MAX_EVENTS).map((event) => ({
    word: event.word,
    level: event.level,
    replays: event.replays,
    slowPlays: event.slowPlays,
    hintUsed: event.hintUsed,
    attempts: event.attempts,
    transcript: event.transcript,
    closeness: event.closeness,
    sttConfidence: event.sttConfidence,
    abandoned: event.abandoned,
  }));
}

/** Parses the model's reply, validates it, and keeps the level within one step of where the person is. */
export function parseDecision(text: string, currentLevel: number): AdaptiveDecision {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) throw new Error("No JSON object in model reply");

  const parsed = DecisionSchema.parse(JSON.parse(text.slice(start, end + 1)));
  const level = clampLevel(currentLevel);
  const nextLevel = clampLevel(Math.min(level + 1, Math.max(level - 1, parsed.nextLevel)));
  return { ...parsed, nextLevel };
}

async function askClaude(request: AdaptRequest, apiKey: string, model: string): Promise<AdaptiveDecision> {
  const client = new Anthropic({ apiKey });
  const response = await client.messages.create(
    {
      model,
      max_tokens: MAX_TOKENS,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: JSON.stringify({ currentLevel: request.currentLevel, recent: compactEvents(request.recent) }),
        },
      ],
    },
    { timeout: TIMEOUT_MS },
  );

  const text = response.content
    .map((block) => (block.type === "text" ? block.text : ""))
    .join("");
  return parseDecision(text, request.currentLevel);
}

/**
 * Asks Claude when ADAPTIVE_PROVIDER=claude and a key is set. Any problem (no key, timeout,
 * bad reply, API error) falls back to the rules silently, so the person never sees a failure.
 */
export async function adaptRequest(
  request: AdaptRequest,
  env: Readonly<Record<string, string | undefined>>,
): Promise<AdaptResponse> {
  const recent = request.recent.slice(-MAX_EVENTS);
  const safeRequest = { ...request, recent };
  const fallback = (): AdaptResponse => ({ decision: decideNextStep(recent, request.currentLevel), source: "rules" });

  if (env.ADAPTIVE_PROVIDER !== "claude" || !env.ANTHROPIC_API_KEY) return fallback();

  try {
    const decision = await askClaude(safeRequest, env.ANTHROPIC_API_KEY, env.CLAUDE_MODEL || DEFAULT_MODEL);
    return { decision, source: "claude" };
  } catch (error) {
    console.error("adaptive: falling back to rules", error instanceof Error ? error.name : "unknown");
    return fallback();
  }
}
