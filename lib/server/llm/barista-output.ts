import { z } from "zod";
import { DRINK_IDS, PASTRY_IDS, SIZE_IDS } from "../../menu";

/**
 * The barista's reply contract, shared by every provider. The JSON Schema goes to OpenAI as a structured-output
 * schema and, as text, into Claude's system prompt. The zod schema validates Claude's reply. Both use the same
 * menu lists, so an unknown drink or pastry is rejected in one place.
 */

const DRINK_VALUES = ["unchanged", "none", ...DRINK_IDS] as [string, ...string[]];
const SIZE_VALUES = ["unchanged", ...SIZE_IDS] as [string, ...string[]];
const PASTRY_VALUES = [...PASTRY_IDS] as [string, ...string[]];

export const BARISTA_OUTPUT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "confidence",
    "asks_for_help",
    "drink",
    "size",
    "temperature",
    "add_extras",
    "remove_extras",
    "clear_order",
    "finish_order",
    "next_question",
    "reply",
  ],
  properties: {
    confidence: { type: "string", enum: ["clear", "unsure", "unclear"] },
    asks_for_help: { type: "boolean" },
    drink: { type: "string", enum: DRINK_VALUES },
    size: { type: "string", enum: SIZE_VALUES },
    temperature: { type: "string", enum: ["unchanged", "hot", "iced"] },
    add_extras: { type: "array", items: { type: "string", enum: PASTRY_VALUES } },
    remove_extras: { type: "array", items: { type: "string", enum: PASTRY_VALUES } },
    clear_order: { type: "boolean" },
    finish_order: { type: "boolean" },
    next_question: { type: "string", enum: ["drink", "size", "temperature", "extras", "none"] },
    reply: { type: "string" },
  },
} as const;

export const BARISTA_SCHEMA_TEXT = JSON.stringify(BARISTA_OUTPUT_SCHEMA);

export const baristaOutputSchema = z.object({
  confidence: z.enum(["clear", "unsure", "unclear"]),
  asks_for_help: z.boolean(),
  drink: z.enum(DRINK_VALUES),
  size: z.enum(SIZE_VALUES),
  temperature: z.enum(["unchanged", "hot", "iced"]),
  add_extras: z.array(z.enum(PASTRY_VALUES)),
  remove_extras: z.array(z.enum(PASTRY_VALUES)),
  clear_order: z.boolean(),
  finish_order: z.boolean(),
  next_question: z.enum(["drink", "size", "temperature", "extras", "none"]),
  reply: z.string().trim().min(1).max(300),
});

export type BaristaOutput = z.infer<typeof baristaOutputSchema>;
