/**
 * The café menu. Shared by the server (to validate and describe orders) and the
 * client (menu sheet, picture choices). Prices mirror the board in the artwork.
 */

export type Temperature = "hot" | "iced";
export type SizeId = "small" | "medium" | "large";

export type Drink = {
  id: string;
  name: string;
  price: number;
  group: "Coffee" | "Tea & More";
  /** Temperatures this drink is served at. One entry means it isn't a question. */
  temps: readonly Temperature[];
  /** Whether the drink comes in different sizes. */
  sized: boolean;
  /** Sound cue for word finding. */
  startsWith: string;
};

export const DRINKS = [
  { id: "espresso", name: "Espresso", price: 3.0, group: "Coffee", temps: ["hot"], sized: false, startsWith: "Es…" },
  { id: "americano", name: "Americano", price: 3.5, group: "Coffee", temps: ["hot", "iced"], sized: true, startsWith: "A-mer…" },
  { id: "latte", name: "Latte", price: 4.5, group: "Coffee", temps: ["hot", "iced"], sized: true, startsWith: "Lat…" },
  { id: "cappuccino", name: "Cappuccino", price: 4.5, group: "Coffee", temps: ["hot", "iced"], sized: true, startsWith: "Cap…" },
  { id: "mocha", name: "Mocha", price: 4.75, group: "Coffee", temps: ["hot", "iced"], sized: true, startsWith: "Mo…" },
  { id: "cold-brew", name: "Cold Brew", price: 4.25, group: "Coffee", temps: ["iced"], sized: true, startsWith: "Cold…" },
  { id: "matcha-latte", name: "Matcha Latte", price: 4.75, group: "Tea & More", temps: ["hot", "iced"], sized: true, startsWith: "Mat…" },
  { id: "chai-latte", name: "Chai Latte", price: 4.5, group: "Tea & More", temps: ["hot", "iced"], sized: true, startsWith: "Chai…" },
  { id: "cocoa", name: "Cocoa", price: 4.25, group: "Tea & More", temps: ["hot"], sized: true, startsWith: "Co…" },
  { id: "iced-tea", name: "Iced Tea", price: 3.5, group: "Tea & More", temps: ["iced"], sized: true, startsWith: "Iced…" },
  { id: "hot-tea", name: "Hot Tea", price: 3.0, group: "Tea & More", temps: ["hot"], sized: true, startsWith: "Hot…" },
] as const satisfies readonly Drink[];

export type DrinkId = (typeof DRINKS)[number]["id"];

export const DRINK_IDS = DRINKS.map((drink) => drink.id) as DrinkId[];

export function getDrink(id: string): Drink | undefined {
  return DRINKS.find((drink) => drink.id === id);
}

export type Pastry = { id: string; name: string; startsWith: string };

export const PASTRIES = [
  { id: "croissant", name: "Croissant", startsWith: "Cro…" },
  { id: "muffin", name: "Muffin", startsWith: "Muf…" },
  { id: "cookie", name: "Cookie", startsWith: "Coo…" },
  { id: "danish", name: "Danish", startsWith: "Dan…" },
] as const satisfies readonly Pastry[];

export type PastryId = (typeof PASTRIES)[number]["id"];

export const PASTRY_IDS = PASTRIES.map((pastry) => pastry.id) as PastryId[];

export function getPastry(id: string): Pastry | undefined {
  return PASTRIES.find((pastry) => pastry.id === id);
}

export const SIZES = [
  { id: "small", name: "Small", startsWith: "Sm…" },
  { id: "medium", name: "Medium", startsWith: "Med…" },
  { id: "large", name: "Large", startsWith: "Lar…" },
] as const satisfies readonly { id: SizeId; name: string; startsWith: string }[];

export const SIZE_IDS = SIZES.map((size) => size.id) as SizeId[];

export const TEMPERATURES = [
  { id: "hot", name: "Hot", startsWith: "Ho…" },
  { id: "iced", name: "Iced", startsWith: "Ic…" },
] as const satisfies readonly { id: Temperature; name: string; startsWith: string }[];

export function formatPrice(price: number): string {
  return `$${price.toFixed(2)}`;
}

/** What the barista says first. Spoken with the same voice as every other line. */
export const GREETING = "Hi there! What can I get for you today?";
