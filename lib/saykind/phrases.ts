/** Level 4: ready-made phrases for real places. Every one plays at normal and slow speed. */
export type Phrase = {
  id: string;
  /** The words, exactly as spoken. */
  text: string;
  /** A short name for the list. */
  label: string;
  group: "Ordering" | "Asking for help" | "Everyday";
};

export const PHRASES: Phrase[] = [
  { id: "order-latte", text: "Can I have a latte, please?", label: "Order a drink", group: "Ordering" },
  { id: "large-coffee", text: "I would like a large coffee.", label: "Order a coffee", group: "Ordering" },
  { id: "water", text: "Could I have a glass of water, please?", label: "Ask for water", group: "Ordering" },
  { id: "pay", text: "Could I have the check, please?", label: "Ask for the check", group: "Ordering" },
  { id: "menu-pictures", text: "Do you have a menu with pictures?", label: "Ask for a picture menu", group: "Ordering" },
  { id: "again", text: "Could you say that again?", label: "Ask to hear it again", group: "Asking for help" },
  { id: "more-time", text: "Can I have a little more time?", label: "Ask for more time", group: "Asking for help" },
  { id: "slow", text: "Could you please speak more slowly?", label: "Ask someone to slow down", group: "Asking for help" },
  { id: "aphasia", text: "I have aphasia. It can take me a moment to find my words. Thank you for waiting.", label: "Explain aphasia", group: "Asking for help" },
  { id: "help", text: "I need some help, please.", label: "Ask for help", group: "Asking for help" },
  { id: "thanks", text: "Thank you.", label: "Say thank you", group: "Everyday" },
  { id: "restroom", text: "Where is the restroom, please?", label: "Ask where the restroom is", group: "Everyday" },
];

export const phraseAudioKey = (phrase: Phrase) => `phrase-${phrase.id}`;
