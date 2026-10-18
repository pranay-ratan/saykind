/**
 * The first lesson: the words a patient will want at the café counter.
 * Syllables are standard dictionary divisions (never invented respellings), and the audio always says the
 * real word itself.
 */
export type IllustrationKind = "coffee" | "latte" | "americano" | "tea" | "water" | "please" | "thanks";

export type Word = {
  id: string;
  text: string;
  syllables: string[];
  /** The opening letters, as a written first-sound cue. */
  startsWith: string;
  art: IllustrationKind;
  /** What the recogniser might return that still means this word. Used only to word the feedback kindly. */
  accepted: string[];
  /** The colour of the light in the room while this word is on screen. */
  light: "terracotta" | "forest";
};

export const WORDS: Word[] = [
  { id: "coffee", text: "Coffee", syllables: ["cof", "fee"], startsWith: "Cof", art: "coffee", accepted: ["coffee", "coffe", "cofee", "kofi"], light: "terracotta" },
  { id: "latte", text: "Latte", syllables: ["lat", "te"], startsWith: "Lat", art: "latte", accepted: ["latte", "lattay", "lotte", "latey"], light: "terracotta" },
  { id: "americano", text: "Americano", syllables: ["a", "mer", "i", "ca", "no"], startsWith: "Ame", art: "americano", accepted: ["americano", "american o", "americana"], light: "forest" },
  { id: "tea", text: "Tea", syllables: ["tea"], startsWith: "Te", art: "tea", accepted: ["tea", "t", "tee"], light: "forest" },
  { id: "water", text: "Water", syllables: ["wa", "ter"], startsWith: "Wa", art: "water", accepted: ["water", "wadder", "wata"], light: "forest" },
  { id: "please", text: "Please", syllables: ["please"], startsWith: "Pl", art: "please", accepted: ["please", "pleas", "plees"], light: "terracotta" },
  { id: "thanks", text: "Thank You", syllables: ["thank", "you"], startsWith: "Th", art: "thanks", accepted: ["thank you", "thanks", "thankyou", "thank"], light: "terracotta" },
];
