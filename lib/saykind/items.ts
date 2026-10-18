/** Level 1: everyday objects. Syllables are standard dictionary divisions, never invented respellings. */
export type ObjectId = "chair" | "cookie" | "mug" | "hat" | "table" | "lamp";

export type LearnItem = {
  id: string;
  text: string;
  syllables: string[];
  /** The opening letters, as a written first-sound cue. */
  startsWith: string;
  /** General American pronunciation in IPA (dictionary-accurate; shown only as optional help). */
  ipa?: string;
  /** Which syllable is stressed (0-based), when there is more than one. */
  stressed?: number;
  /**
   * Written forms that count as 'matches the word' (plain inflections only). Never add likely mishearings here: a different
   * transcription is shown honestly as 'different', and the person can confirm it themselves.
   */
  accepted: string[];
  /** Which ready-made recording to play (public/audio/words/<key>.mp3); free text falls back to the server voice. */
  audioKey: string | null;
  /** The colour of the light in the room. */
  light: "terracotta" | "forest";
  /** Built-in drawing, or a photo the person took (Level 2). */
  art: { kind: "object"; id: ObjectId } | { kind: "photo"; uri: string } | { kind: "cafe"; id: string };
};

export const OBJECTS: LearnItem[] = [
  { id: "chair", text: "Chair", syllables: ["chair"], ipa: "/tʃɛr/", startsWith: "Ch", accepted: ["chair", "chairs"], audioKey: "chair", light: "terracotta", art: { kind: "object", id: "chair" } },
  { id: "cookie", text: "Cookie", syllables: ["cook", "ie"], ipa: "/ˈkʊk.i/", stressed: 0, startsWith: "Coo", accepted: ["cookie", "cookies"], audioKey: "cookie", light: "forest", art: { kind: "object", id: "cookie" } },
  { id: "mug", text: "Mug", syllables: ["mug"], ipa: "/mʌɡ/", startsWith: "M", accepted: ["mug", "mugs"], audioKey: "mug", light: "forest", art: { kind: "object", id: "mug" } },
  { id: "hat", text: "Hat", syllables: ["hat"], ipa: "/hæt/", startsWith: "H", accepted: ["hat", "hats"], audioKey: "hat", light: "terracotta", art: { kind: "object", id: "hat" } },
  { id: "table", text: "Table", syllables: ["ta", "ble"], ipa: "/ˈteɪ.bəl/", stressed: 0, startsWith: "Ta", accepted: ["table", "tables"], audioKey: "table", light: "terracotta", art: { kind: "object", id: "table" } },
  { id: "lamp", text: "Lamp", syllables: ["lamp"], ipa: "/læmp/", startsWith: "L", accepted: ["lamp", "lamps"], audioKey: "lamp", light: "forest", art: { kind: "object", id: "lamp" } },
];

/** A word from the café lesson, shaped for the same learning screen. */
import { WORDS } from "@/lib/words";

export const CAFE_WORDS: LearnItem[] = WORDS.map((word) => ({
  id: word.id,
  text: word.text,
  syllables: word.syllables,
  startsWith: word.startsWith,
  accepted: word.accepted,
  audioKey: word.id,
  light: word.light,
  art: { kind: "cafe", id: word.art },
}));
