/**
 * The structured order. This is the single source of truth for what the
 * customer has asked for. The AI only *proposes* changes (`OrderUpdates`);
 * everything here validates and applies them, so the order is always
 * consistent no matter how the conversation wanders.
 */

import {
  DRINK_IDS,
  PASTRY_IDS,
  SIZE_IDS,
  getDrink,
  getPastry,
  type DrinkId,
  type PastryId,
  type SizeId,
  type Temperature,
} from "./menu";

export type Order = {
  /** `"none"` means the customer doesn't want a drink. */
  drink: DrinkId | "none" | null;
  size: SizeId | null;
  temperature: Temperature | null;
  extras: PastryId[];
  /** True once the customer has said they want nothing more. */
  finished: boolean;
};

export type Slot = "drink" | "size" | "temperature" | "extras" | "none";

export const EMPTY_ORDER: Order = {
  drink: null,
  size: null,
  temperature: null,
  extras: [],
  finished: false,
};

export type OrderUpdates = {
  drink: DrinkId | "none" | "unchanged";
  size: SizeId | "unchanged";
  temperature: Temperature | "unchanged";
  addExtras: PastryId[];
  removeExtras: PastryId[];
  clearOrder: boolean;
  finishOrder: boolean;
};

export const NO_UPDATES: OrderUpdates = {
  drink: "unchanged",
  size: "unchanged",
  temperature: "unchanged",
  addExtras: [],
  removeExtras: [],
  clearOrder: false,
  finishOrder: false,
};

/** The one thing the barista should ask about next. */
export function nextSlot(order: Order): Slot {
  if (order.finished) return "none";
  if (order.drink === null) return "drink";
  if (order.drink !== "none") {
    const drink = getDrink(order.drink);
    if (drink?.sized && order.size === null) return "size";
    if (order.temperature === null) return "temperature";
  }
  return "extras";
}

export type ApplyResult = { order: Order; issues: string[] };

/** Apply proposed changes, rejecting anything the menu doesn't allow. */
export function applyUpdates(current: Order, updates: OrderUpdates): ApplyResult {
  const issues: string[] = [];
  let order: Order = { ...current, extras: [...current.extras] };

  if (updates.clearOrder) order = { ...EMPTY_ORDER, extras: [] };

  if (updates.drink !== "unchanged") {
    order.drink = updates.drink;
    order.finished = false;
    if (updates.drink === "none") {
      order.size = null;
      order.temperature = null;
    } else {
      const drink = getDrink(updates.drink);
      if (drink && !drink.sized) order.size = null;
      if (drink && order.temperature && !drink.temps.includes(order.temperature)) order.temperature = null;
    }
  }

  const drink = order.drink && order.drink !== "none" ? getDrink(order.drink) : undefined;

  if (updates.size !== "unchanged") {
    if (drink && !drink.sized) issues.push(`${drink.name} only comes in one size.`);
    else if (order.drink === "none") issues.push("The customer doesn't want a drink, so there is no size.");
    else order.size = updates.size;
  }

  if (updates.temperature !== "unchanged") {
    if (drink && !drink.temps.includes(updates.temperature)) {
      issues.push(`${drink.name} is only served ${drink.temps[0]}.`);
    } else if (order.drink === "none") {
      issues.push("The customer doesn't want a drink, so there is no temperature.");
    } else {
      order.temperature = updates.temperature;
    }
  }

  // Drinks served one way never need a question.
  if (drink && drink.temps.length === 1) order.temperature = drink.temps[0];

  for (const id of updates.addExtras) {
    if (!order.extras.includes(id)) order.extras.push(id);
  }
  order.extras = order.extras.filter((id) => !updates.removeExtras.includes(id)).slice(0, 6);

  if (updates.finishOrder) {
    const slot = nextSlot(order);
    if (slot === "extras") order.finished = true;
    else issues.push(`The order can't be finished yet: the customer still needs to choose the ${slot}.`);
  }

  return { order, issues };
}

/** "a medium hot latte and a croissant" — used in prompts and for read-backs. */
export function describeOrder(order: Order): string {
  const parts: string[] = [];

  if (order.drink && order.drink !== "none") {
    const drink = getDrink(order.drink);
    if (drink) {
      const words: string[] = [];
      if (order.size) words.push(order.size);
      // Don't say "iced iced tea".
      if (order.temperature && drink.temps.length > 1) words.push(order.temperature);
      words.push(drink.name.toLowerCase());
      parts.push(withArticle(words.join(" ")));
    }
  }
  for (const id of order.extras) {
    const pastry = getPastry(id);
    if (pastry) parts.push(withArticle(pastry.name.toLowerCase()));
  }
  if (parts.length === 0) return "nothing yet";
  return parts.length === 1 ? parts[0] : `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;
}

function withArticle(phrase: string): string {
  return `${/^[aeiou]/.test(phrase) ? "an" : "a"} ${phrase}`;
}

/** Defensive parse of an order that came from the browser. */
export function sanitizeOrder(value: unknown): Order {
  if (typeof value !== "object" || value === null) return { ...EMPTY_ORDER, extras: [] };
  const raw = value as Record<string, unknown>;
  const drink =
    raw.drink === "none" ? "none" : DRINK_IDS.includes(raw.drink as DrinkId) ? (raw.drink as DrinkId) : null;
  const size = SIZE_IDS.includes(raw.size as SizeId) ? (raw.size as SizeId) : null;
  const temperature = raw.temperature === "hot" || raw.temperature === "iced" ? raw.temperature : null;
  const extras = Array.isArray(raw.extras)
    ? [...new Set(raw.extras.filter((id): id is PastryId => PASTRY_IDS.includes(id as PastryId)))].slice(0, 6)
    : [];
  return { drink, size, temperature, extras, finished: raw.finished === true };
}

/** One line of the conversation so far, sent back to the server each turn. */
export type HistoryItem = { role: "barista" | "patient"; text: string; via?: "speech" | "tap" | "silence" };

export type OrderLine = {
  /** Which illustration to show beside the line. */
  art: string;
  text: string;
};

const capitalise = (word: string) => word.charAt(0).toUpperCase() + word.slice(1);

/** The order as short readable lines with a picture each: "Medium Hot Latte", "Croissant". */
export function orderLines(order: Order): OrderLine[] {
  const lines: OrderLine[] = [];
  if (order.drink === "none") {
    lines.push({ art: "none", text: "No drink" });
  } else if (order.drink) {
    const drink = getDrink(order.drink);
    if (drink) {
      const words = [
        order.size ? capitalise(order.size) : null,
        order.temperature && drink.temps.length > 1 ? capitalise(order.temperature) : null,
        drink.name,
      ].filter(Boolean);
      lines.push({ art: drink.id, text: words.join(" ") });
    }
  }
  for (const id of order.extras) {
    const pastry = getPastry(id);
    if (pastry) lines.push({ art: pastry.id, text: pastry.name });
  }
  return lines;
}

/**
 * What to show in the small "Got it" badge after a turn: the part of the order that
 * just changed. Based on the validated order, never on how the speech was transcribed.
 */
export function acknowledgement(before: Order, after: Order): string | null {
  const added = after.extras.find((id) => !before.extras.includes(id));
  if (added) return getPastry(added)?.name ?? null;
  const drinkChanged =
    after.drink !== before.drink || after.size !== before.size || after.temperature !== before.temperature;
  if (after.drink && drinkChanged) return orderLines(after)[0]?.text ?? null;
  return null;
}
