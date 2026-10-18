import Anthropic from "@anthropic-ai/sdk";
import type { ZodType } from "zod";

/**
 * Claude for the café conversation, through the official SDK. No temperature, top_p, top_k or response prefill is
 * sent. Output is one JSON object, validated with zod. Pure over the SDK, so it can be tested with a mocked fetch.
 */

export const DEFAULT_CLAUDE_MODEL = "claude-haiku-5-5";
export const CLAUDE_TIMEOUT_MS = 8000;
const MAX_TOKENS = 500;

export type LlmErrorCode = "timeout" | "bad_output" | "auth" | "rate_limit" | "upstream";

export class LlmError extends Error {
  constructor(
    readonly code: LlmErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "LlmError";
  }
}

export type ChatTurn = { role: "system" | "user" | "assistant"; content: string };

const OPENING_TURN = "(The customer has just come into the café.)";

/**
 * Claude takes the system text separately and needs user and assistant turns that alternate and start with the
 * user. This folds the system messages into one string and merges neighbours that share a role.
 */
export function splitForClaude(messages: readonly ChatTurn[]): {
  system: string;
  turns: { role: "user" | "assistant"; content: string }[];
} {
  const system = messages
    .filter((message) => message.role === "system")
    .map((message) => message.content)
    .join("\n\n");

  const turns: { role: "user" | "assistant"; content: string }[] = [];
  for (const message of messages) {
    if (message.role === "system") continue;
    const last = turns[turns.length - 1];
    if (last && last.role === message.role) {
      last.content = `${last.content}\n${message.content}`;
    } else {
      turns.push({ role: message.role, content: message.content });
    }
  }
  if (turns.length === 0 || turns[0].role !== "user") turns.unshift({ role: "user", content: OPENING_TURN });
  return { system, turns };
}

/** Reads the first JSON object in the reply. Code fences and a little prose around it are tolerated. */
export function extractJsonObject(text: string): unknown {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) throw new LlmError("bad_output", "No JSON object in the model reply.");
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    throw new LlmError("bad_output", "The model reply was not valid JSON.");
  }
}

function errorFor(error: unknown): LlmError {
  if (error instanceof Anthropic.APIConnectionTimeoutError) {
    return new LlmError("timeout", "The language model took too long.");
  }
  if (error instanceof Anthropic.AuthenticationError || error instanceof Anthropic.PermissionDeniedError) {
    return new LlmError("auth", "The language model rejected the API key.");
  }
  if (error instanceof Anthropic.RateLimitError) return new LlmError("rate_limit", "The language model is busy.");
  return new LlmError("upstream", "The language model had a problem.");
}

/** One JSON reply from Claude, validated against `schema`. Throws LlmError on any failure. */
export async function claudeJson<T>(options: {
  apiKey: string;
  model?: string;
  messages: readonly ChatTurn[];
  schemaText: string;
  schema: ZodType<T>;
  /** Defaults suit one short café turn. A longer reply, such as a report, passes its own. */
  maxTokens?: number;
  timeoutMs?: number;
}): Promise<T> {
  const { system, turns } = splitForClaude(options.messages);
  const client = new Anthropic({ apiKey: options.apiKey });

  let text: string;
  try {
    const response = await client.messages.create(
      {
        model: options.model || DEFAULT_CLAUDE_MODEL,
        max_tokens: options.maxTokens ?? MAX_TOKENS,
        system: `${system}\n\nReturn only one JSON object that matches this JSON Schema. No prose, no code fences.\n${options.schemaText}`,
        messages: turns,
      },
      { timeout: options.timeoutMs ?? CLAUDE_TIMEOUT_MS },
    );
    text = response.content.map((block) => (block.type === "text" ? block.text : "")).join("");
  } catch (error) {
    throw errorFor(error);
  }

  const parsed = options.schema.safeParse(extractJsonObject(text));
  if (!parsed.success) {
    // Which fields failed and how (paths and zod codes only, never the text), so a fallback can be explained.
    const issues = parsed.error.issues.map((issue) => `${issue.path.join(".") || "root"}:${issue.code}`).join(", ");
    throw new LlmError("bad_output", `The model reply did not match the expected shape (${issues}).`);
  }
  return parsed.data;
}
