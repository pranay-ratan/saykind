import "server-only";

import { chatJson } from "../openai";
import { resolveProvider } from "../providers";
import { BARISTA_OUTPUT_SCHEMA, BARISTA_SCHEMA_TEXT, baristaOutputSchema, type BaristaOutput } from "./barista-output";
import { DEFAULT_CLAUDE_MODEL, LlmError, claudeJson, type ChatTurn } from "./claude";

/**
 * One barista turn from whichever conversation provider is set up: Claude by default, OpenAI only when its key
 * is set and Claude is not. The reply is validated the same way for both.
 */
export async function baristaChat(messages: readonly ChatTurn[]): Promise<BaristaOutput> {
  const provider = resolveProvider("converse", process.env);

  if (provider === "claude") {
    return claudeJson({
      apiKey: process.env.ANTHROPIC_API_KEY?.trim() ?? "",
      model: process.env.CLAUDE_MODEL?.trim() || DEFAULT_CLAUDE_MODEL,
      messages,
      schemaText: BARISTA_SCHEMA_TEXT,
      schema: baristaOutputSchema,
    });
  }

  if (provider === "openai") {
    const raw = await chatJson(messages, "barista_turn", BARISTA_OUTPUT_SCHEMA);
    const parsed = baristaOutputSchema.safeParse(raw);
    if (!parsed.success) throw new LlmError("bad_output", "The model reply did not match the expected shape.");
    return parsed.data;
  }

  throw new LlmError("upstream", "No conversation provider is set up.");
}
