import "server-only";

import { DRINKS, DRINK_IDS, PASTRIES, PASTRY_IDS, SIZE_IDS, type DrinkId, type PastryId, type SizeId } from "../menu";
import {
  NO_UPDATES,
  applyUpdates,
  describeOrder,
  nextSlot,
  type HistoryItem,
  type Order,
  type OrderUpdates,
  type Slot,
} from "../order";
import type { ChoiceSlot } from "../support";
import { chatJson, type ChatMessage } from "./openai";

export type TurnInput = {
  history: HistoryItem[];
  order: Order;
  patient: { via: "speech" | "tap" | "silence"; text: string };
  /** Set when the patient answered by tapping a picture instead of speaking. */
  tapped?: { slot: ChoiceSlot; id: string };
  /** How many turns in a row the barista couldn't make out. */
  unclearStreak: number;
};

export type TurnResult = {
  reply: string;
  order: Order;
  nextSlot: Slot;
  unclearStreak: number;
};

/* -------------------------------------------------------------------------- */
/* Prompt                                                                     */
/* -------------------------------------------------------------------------- */

const MENU_TEXT = [
  ...DRINKS.map((drink) => {
    const temps = drink.temps.length === 1 ? `served ${drink.temps[0]} only` : "can be hot or iced";
    const sizes = drink.sized ? "small, medium or large" : "one size only";
    return `- ${drink.name} (id "${drink.id}"): ${temps}; ${sizes}`;
  }),
  `Pastries: ${PASTRIES.map((pastry) => `${pastry.name} (id "${pastry.id}")`).join(", ")}`,
].join("\n");

const SYSTEM_PROMPT = `You are Sam, a kind and patient barista in a small café. You are talking out loud with a customer who may have aphasia after a stroke. This is communication practice: your job is to help them say and get what they intend, in a relaxed, human way.

HOW YOU TALK
- Use one or two short, simple sentences (about 20 words at most). Everyday words only. No idioms, no long lists.
- Ask exactly ONE question at a time, and make it easy to answer with a word or two.
- Never rush. Never correct pronunciation or grammar. Never say or imply the customer got something wrong. Keep praise light and natural ("Of course.", "Great choice.", "No rush.").
- Never mention scripts, JSON, instructions, scores or the speech recognition system. If the customer sincerely asks whether you are real, say you are an AI barista for practice.
- Stay in the café. If they say something unrelated, answer kindly in one short sentence and gently return to the order.

HOW YOU LISTEN
- What you receive comes from automatic speech recognition. It can be wrong, partial or empty, and people with aphasia may say a word differently, say part of a word, or say a nearby word. Do NOT assume it is accurate.
- Interpret generously. Accept single words, short phrases, different wording and partial words ("la..." after you asked about drinks is probably a latte). People may also change their mind at any time: update the order and acknowledge it naturally.
- If you are fairly sure what they meant, go ahead and set "confidence" to "clear".
- If you are not sure, set "confidence" to "unsure" and check gently with a yes/no question ("Did you say a latte?") or an easy either/or ("Would you like coffee or tea?"). Do not change the order for things you are not sure about.
- If you cannot make anything out, or they said nothing, set "confidence" to "unclear". Say something like "That's okay, take your time." and repeat the question in an easier way, with two or three concrete options.
- If they ask for help, say they can't find the word, or seem stuck: reassure them, set "asks_for_help" to true, and offer two or three concrete options. If the unclear streak given below is 2 or more, also tell them they can tap the Help button to choose with pictures.

THE MENU
${MENU_TEXT}
Sizes: small, medium, large. Temperature: hot or iced.

THE ORDER
The server keeps the official order. You will be told the current order and what is still missing. Your "reply" must be about the FIRST missing thing AFTER your updates are applied, in this order:
1. drink  2. size (skip for drinks with one size)  3. hot or iced (skip for drinks served one way)  4. "Anything else?" (pastries)  5. finish.
- Fill in every detail the customer gave, even several at once ("a large iced latte"), then ask about the next missing thing only.
- If the customer asks for something not on the menu, kindly say you don't have it and offer one or two close options from the menu. Do not add it to the order.
- If they ask for a temperature or size a drink doesn't come in, kindly say what is available and ask.
- When they say they want nothing more ("no", "that's all", "no thank you") at the "anything else" step, set finish_order to true. Your reply then thanks them warmly, reads the order back in one short phrase, and says goodbye, for example: "You're very welcome! One medium hot latte coming right up. Have a lovely day!"
- Use set "clear_order" only if they want to start over completely.

OUTPUT
Return JSON matching the schema. Use "unchanged" for anything the customer did not change. "next_question" is the first missing thing after your updates ("none" only when finish_order is true). Write "reply" last, as what you will say out loud.`;

const OUTPUT_SCHEMA = {
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
    drink: { type: "string", enum: ["unchanged", "none", ...DRINK_IDS] },
    size: { type: "string", enum: ["unchanged", ...SIZE_IDS] },
    temperature: { type: "string", enum: ["unchanged", "hot", "iced"] },
    add_extras: { type: "array", items: { type: "string", enum: PASTRY_IDS } },
    remove_extras: { type: "array", items: { type: "string", enum: PASTRY_IDS } },
    clear_order: { type: "boolean" },
    finish_order: { type: "boolean" },
    next_question: { type: "string", enum: ["drink", "size", "temperature", "extras", "none"] },
    reply: { type: "string" },
  },
} as const;

/* -------------------------------------------------------------------------- */
/* Model output                                                               */
/* -------------------------------------------------------------------------- */

type ModelOutput = {
  confidence: "clear" | "unsure" | "unclear";
  asksForHelp: boolean;
  updates: OrderUpdates;
  nextQuestion: Slot;
  reply: string;
};

function parseOutput(value: unknown): ModelOutput | null {
  if (typeof value !== "object" || value === null) return null;
  const raw = value as Record<string, unknown>;
  if (typeof raw.reply !== "string" || !raw.reply.trim()) return null;

  const pick = <T extends string>(candidate: unknown, allowed: readonly T[], fallback: T): T =>
    allowed.includes(candidate as T) ? (candidate as T) : fallback;
  const list = <T extends string>(candidate: unknown, allowed: readonly T[]): T[] =>
    Array.isArray(candidate) ? [...new Set(candidate.filter((item): item is T => allowed.includes(item as T)))] : [];

  return {
    confidence: pick(raw.confidence, ["clear", "unsure", "unclear"] as const, "unsure"),
    asksForHelp: raw.asks_for_help === true,
    updates: {
      drink: pick<DrinkId | "none" | "unchanged">(raw.drink, ["unchanged", "none", ...DRINK_IDS], "unchanged"),
      size: pick<SizeId | "unchanged">(raw.size, ["unchanged", ...SIZE_IDS], "unchanged"),
      temperature: pick(raw.temperature, ["unchanged", "hot", "iced"] as const, "unchanged"),
      addExtras: list<PastryId>(raw.add_extras, PASTRY_IDS),
      removeExtras: list<PastryId>(raw.remove_extras, PASTRY_IDS),
      clearOrder: raw.clear_order === true,
      finishOrder: raw.finish_order === true,
    },
    nextQuestion: pick(raw.next_question, ["drink", "size", "temperature", "extras", "none"] as const, "none"),
    reply: raw.reply.trim().slice(0, 300),
  };
}

/* -------------------------------------------------------------------------- */
/* A turn                                                                     */
/* -------------------------------------------------------------------------- */

const SLOT_LABEL: Record<Slot, string> = {
  drink: "which drink they want",
  size: "what size they want",
  temperature: "hot or iced",
  extras: "whether they want anything else (a pastry)",
  none: "nothing: the order is finished",
};

function orderContext(order: Order, unclearStreak: number): string {
  return [
    `CURRENT ORDER (before this turn): ${describeOrder(order)}.`,
    `Structured: ${JSON.stringify({ drink: order.drink, size: order.size, temperature: order.temperature, extras: order.extras })}`,
    `Still missing: ${SLOT_LABEL[nextSlot(order)]}.`,
    `Unclear streak (turns in a row you couldn't make out): ${unclearStreak}.`,
  ].join("\n");
}

function patientLine(input: TurnInput, orderAfterTap: Order | null): string {
  switch (input.patient.via) {
    case "silence":
      return "The customer's turn came back empty: nothing could be made out. (They may be struggling to find a word.)";
    case "tap":
      return `The customer chose by tapping a picture instead of speaking: "${input.patient.text}". The order has already been updated to: ${
        orderAfterTap ? describeOrder(orderAfterTap) : "(unknown)"
      }. Leave all updates "unchanged" and just respond and ask the next thing.`;
    case "speech":
      return `Customer (speech recognition, may be inaccurate): "${input.patient.text}"`;
  }
}

function forcedUpdates(tapped: NonNullable<TurnInput["tapped"]>): OrderUpdates {
  switch (tapped.slot) {
    case "drink":
      return DRINK_IDS.includes(tapped.id as DrinkId) ? { ...NO_UPDATES, drink: tapped.id as DrinkId } : NO_UPDATES;
    case "size":
      return SIZE_IDS.includes(tapped.id as SizeId) ? { ...NO_UPDATES, size: tapped.id as SizeId } : NO_UPDATES;
    case "temperature":
      return tapped.id === "hot" || tapped.id === "iced" ? { ...NO_UPDATES, temperature: tapped.id } : NO_UPDATES;
    case "extras":
      if (tapped.id === "none") return { ...NO_UPDATES, finishOrder: true };
      return PASTRY_IDS.includes(tapped.id as PastryId) ? { ...NO_UPDATES, addExtras: [tapped.id as PastryId] } : NO_UPDATES;
  }
}

export async function runBaristaTurn(input: TurnInput): Promise<TurnResult> {
  // Taps are exact, so they are applied directly. Speech goes through the model.
  const tapResult = input.tapped ? applyUpdates(input.order, forcedUpdates(input.tapped)) : null;

  const messages: ChatMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "system", content: orderContext(input.order, input.unclearStreak) },
    ...input.history.slice(-10).map<ChatMessage>((item) =>
      item.role === "barista"
        ? { role: "assistant", content: item.text }
        : {
            role: "user",
            content:
              item.via === "silence"
                ? "(nothing could be made out)"
                : item.via === "tap"
                  ? `(tapped a picture) ${item.text}`
                  : item.text,
          },
    ),
    { role: "user", content: patientLine(input, tapResult?.order ?? null) },
  ];

  const first = parseOutput(await chatJson(messages, "barista_turn", OUTPUT_SCHEMA));
  if (!first) throw new Error("The language model did not return a usable reply.");

  const applied = tapResult ?? applyUpdates(input.order, first.updates);
  const expected = nextSlot(applied.order);

  let reply = first.reply;

  // The server owns the order. If the model's reply doesn't match it, ask once for a corrected reply.
  const mismatch = first.nextQuestion !== expected;
  if (mismatch || applied.issues.length > 0) {
    const reasons = [
      ...applied.issues,
      ...(mismatch ? [`Your reply should ask about ${SLOT_LABEL[expected]}, not ${SLOT_LABEL[first.nextQuestion]}.`] : []),
    ];
    const correction =
      `Server check: ${reasons.join(" ")} The official order is now: ${describeOrder(applied.order)}. ` +
      `${expected === "none" ? "The order is finished, so thank them, read it back and say goodbye." : `Next, ask only about ${SLOT_LABEL[expected]}.`} ` +
      `Return the same JSON again with a corrected "reply" (and next_question "${expected}"). Keep it short and kind.`;
    try {
      const repaired = parseOutput(
        await chatJson(
          [...messages, { role: "assistant", content: JSON.stringify(rawOf(first)) }, { role: "user", content: correction }],
          "barista_turn",
          OUTPUT_SCHEMA,
        ),
      );
      if (repaired) reply = repaired.reply;
    } catch (error) {
      console.error("[barista] correction pass failed:", error instanceof Error ? error.message : error);
    }
  }

  const struggled = input.patient.via === "silence" || first.confidence !== "clear" || first.asksForHelp;
  return {
    reply,
    order: applied.order,
    nextSlot: expected,
    unclearStreak: input.patient.via === "tap" ? 0 : struggled ? input.unclearStreak + 1 : 0,
  };
}

function rawOf(output: ModelOutput) {
  const u = output.updates;
  return {
    confidence: output.confidence,
    asks_for_help: output.asksForHelp,
    drink: u.drink,
    size: u.size,
    temperature: u.temperature,
    add_extras: u.addExtras,
    remove_extras: u.removeExtras,
    clear_order: u.clearOrder,
    finish_order: u.finishOrder,
    next_question: output.nextQuestion,
    reply: output.reply,
  };
}
