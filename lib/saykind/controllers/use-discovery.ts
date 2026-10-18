"use client";

import { useState } from "react";
import { learnItemFromDiscovery, type DiscoveryInput } from "../discover";
import type { LearnItem } from "../items";
import { logEvent } from "../log";
import { useExercise, type ExerciseController } from "./use-exercise";

/**
 * LEVEL 2 CONTROLLER. The camera teammate calls `receiveDiscovery(...)` with the photo and the label; this hands back the
 * very same ExerciseController Level 1 uses, now holding that one object. So the UI for Level 2's practice screen can be
 * the Level 1 exercise screen, unchanged.
 */
export function useDiscovery(): {
  /** Same shape as Level 1's controller, for the photographed object. Only meaningful when `hasObject` is true. */
  exercise: ExerciseController;
  hasObject: boolean;
  receiveDiscovery: (input: DiscoveryInput) => LearnItem;
  clearDiscovery: () => void;
} {
  const [items, setItems] = useState<LearnItem[]>([PLACEHOLDER]);
  const [hasObject, setHasObject] = useState(false);
  const exercise = useExercise({ id: "level2", level: 2, items, persist: false });

  return {
    exercise,
    hasObject,
    receiveDiscovery: (input) => {
      const item = learnItemFromDiscovery(input);
      logEvent({ type: "activity", ts: Date.now(), level: 2, name: "object-received", detail: `${item.text}${input.correctedLabel ? " (corrected)" : ""}` });
      setItems([item]);
      setHasObject(true);
      exercise.restart();
      return item;
    },
    clearDiscovery: () => {
      setHasObject(false);
      setItems([PLACEHOLDER]);
      exercise.restart();
    },
  };
}

const PLACEHOLDER: LearnItem = { id: "none", text: "", syllables: [""], startsWith: "", accepted: [], audioKey: null, light: "forest", art: { kind: "photo", uri: "" } };
