import { DRINKS, PASTRIES, SIZES, TEMPERATURES, formatPrice } from "@/lib/menu";
import { exampleForChoice, type Choice, type ChoiceSlot } from "@/lib/support";

/**
 * Everything the pronunciation card needs to know about one menu word. Syllables are standard dictionary
 * divisions, never invented respellings; the audio always speaks the real word.
 */
export type MenuWord = {
  id: string;
  name: string;
  syllables: string[];
  startsWith: string;
  /** A short sentence to hear it used. */
  sentence: string;
  /** Spellings the recogniser may return that still mean this word (used only to word feedback kindly). */
  accepted: string[];
  price?: string;
  /** Which question this word answers, so "Choose this" only works when Sam is asking about it. */
  slot: ChoiceSlot;
};

const SYLLABLES: Record<string, string[]> = {
  espresso: ["es", "pres", "so"],
  americano: ["a", "mer", "i", "ca", "no"],
  latte: ["lat", "te"],
  cappuccino: ["cap", "puc", "ci", "no"],
  mocha: ["mo", "cha"],
  "cold-brew": ["cold", "brew"],
  "matcha-latte": ["mat", "cha", "lat", "te"],
  "chai-latte": ["chai", "lat", "te"],
  cocoa: ["co", "coa"],
  "iced-tea": ["iced", "tea"],
  "hot-tea": ["hot", "tea"],
  croissant: ["crois", "sant"],
  muffin: ["muf", "fin"],
  cookie: ["cook", "ie"],
  danish: ["dan", "ish"],
  small: ["small"],
  medium: ["me", "di", "um"],
  large: ["large"],
  hot: ["hot"],
  iced: ["iced"],
  none: ["no"],
};

const ALSO_ACCEPTED: Record<string, string[]> = {
  espresso: ["expresso", "espreso"],
  americano: ["american o", "americana"],
  latte: ["lattay", "lotte", "latey"],
  cappuccino: ["capuccino", "cappucino", "cap of cheeno"],
  mocha: ["moca", "mocka"],
  "matcha-latte": ["macha latte", "matcha lattay"],
  "chai-latte": ["tie latte", "chai lattay"],
  cocoa: ["coco"],
  croissant: ["croissants", "quasar"],
  none: ["no", "no thank you", "no thanks"],
};

function build(choice: Choice, slot: ChoiceSlot, price?: number): MenuWord {
  const name = choice.id === "none" ? "No, thank you" : choice.label;
  const base = choice.label.toLowerCase();
  return {
    id: choice.id,
    name,
    syllables: SYLLABLES[choice.id] ?? [choice.label.toLowerCase()],
    startsWith: choice.startsWith,
    sentence: exampleForChoice(slot, choice),
    accepted: [base, base.replace(/\s+/g, ""), ...(ALSO_ACCEPTED[choice.id] ?? [])],
    price: price !== undefined ? formatPrice(price) : undefined,
    slot,
  };
}

export const DRINK_WORDS: MenuWord[] = DRINKS.map((d) => build({ id: d.id, label: d.name, startsWith: d.startsWith }, "drink", d.price));
export const PASTRY_WORDS: MenuWord[] = PASTRIES.map((p) => build({ id: p.id, label: p.name, startsWith: p.startsWith }, "extras"));
export const SIZE_WORDS: MenuWord[] = SIZES.map((s) => build({ id: s.id, label: s.name, startsWith: s.startsWith }, "size"));
export const TEMP_WORDS: MenuWord[] = TEMPERATURES.map((t) => build({ id: t.id, label: t.name, startsWith: t.startsWith }, "temperature"));
export const NO_THANKS: MenuWord = build({ id: "none", label: "No, thank you", startsWith: "No…" }, "extras");

/** The words that answer a given question, from the same choices the web Help sheet offers. */
export function wordsForChoices(choices: Choice[], slot: ChoiceSlot): MenuWord[] {
  const all = [...DRINK_WORDS, ...PASTRY_WORDS, ...SIZE_WORDS, ...TEMP_WORDS, NO_THANKS];
  return choices.map((choice) => all.find((w) => w.id === choice.id && w.slot === slot) ?? build(choice, slot));
}

export function asChoice(word: MenuWord): Choice {
  return { id: word.id, label: word.id === "none" ? "No, thank you" : word.name, startsWith: word.startsWith };
}
