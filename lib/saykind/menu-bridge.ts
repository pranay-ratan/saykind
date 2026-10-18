import type { MenuWord } from "@/lib/menu-words";
import type { Subject } from "./use-practice";

/** A menu item, shaped for the shared practice hook. */
export const subjectOfMenuWord = (word: MenuWord): Subject => ({
  id: word.id,
  text: word.id === "none" ? "No, thank you" : word.name,
  accepted: word.accepted,
  audioKey: word.id,
});
