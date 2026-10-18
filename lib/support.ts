/**
 * What the Help sheet offers for each question the barista can ask: pictures,
 * written words, an optional first-sound cue, a spoken example, and a way to
 * answer by tapping.
 */

import { DRINKS, PASTRIES, SIZES, TEMPERATURES, getDrink } from "./menu";
import type { Order, Slot } from "./order";

export type Choice = {
  /** Also the key of the illustration to show. */
  id: string;
  label: string;
  startsWith: string;
};

export type ChoiceSlot = Exclude<Slot, "none">;

export function choicesFor(slot: ChoiceSlot, order: Order): Choice[] {
  switch (slot) {
    case "drink":
      return DRINKS.map((drink) => ({ id: drink.id, label: drink.name, startsWith: drink.startsWith }));
    case "size":
      return SIZES.map((size) => ({ id: size.id, label: size.name, startsWith: size.startsWith }));
    case "temperature": {
      const drink = order.drink && order.drink !== "none" ? getDrink(order.drink) : undefined;
      const allowed = drink?.temps ?? ["hot", "iced"];
      return TEMPERATURES.filter((temp) => (allowed as readonly string[]).includes(temp.id)).map((temp) => ({
        id: temp.id,
        label: temp.name,
        startsWith: temp.startsWith,
      }));
    }
    case "extras":
      return [
        ...PASTRIES.map((pastry) => ({ id: pastry.id, label: pastry.name, startsWith: pastry.startsWith })),
        { id: "none", label: "No, thank you", startsWith: "No…" },
      ];
  }
}

/** A short sentence the patient can hear and then say in their own way. */
export function exampleFor(slot: ChoiceSlot): string {
  switch (slot) {
    case "drink":
      return "I'd like a latte, please.";
    case "size":
      return "A medium, please.";
    case "temperature":
      return "Hot, please.";
    case "extras":
      return "No, thank you.";
  }
}

function withArticle(label: string): string {
  const lower = label.toLowerCase();
  return `${/^[aeiou]/.test(lower) ? "an" : "a"} ${lower}`;
}

function sentenceCase(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** A sentence for one specific choice, to hear and then say in their own way. */
export function exampleForChoice(slot: ChoiceSlot, choice: Choice): string {
  switch (slot) {
    case "drink":
      return `I'd like ${withArticle(choice.label)}, please.`;
    case "size":
      return `${sentenceCase(withArticle(choice.label))}, please.`;
    case "temperature":
      return `${choice.label}, please.`;
    case "extras":
      return choice.id === "none" ? "No, thank you." : `${sentenceCase(withArticle(choice.label))}, please.`;
  }
}

/** The title shown above the choices, so the question stays in view. */
export function questionFor(slot: ChoiceSlot): string {
  switch (slot) {
    case "drink":
      return "Choose a drink";
    case "size":
      return "Choose a size";
    case "temperature":
      return "Hot or iced?";
    case "extras":
      return "Anything else?";
  }
}

/** What a tapped choice means as a plain sentence for the barista. */
export function tappedPhrase(slot: ChoiceSlot, choice: Choice): string {
  if (slot === "extras" && choice.id === "none") return "No, thank you.";
  return choice.label;
}
