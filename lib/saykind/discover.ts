/**
 * LEVEL 2: DISCOVER OBJECTS. The integration contract for the teammate building object recognition.
 *
 * The camera screen (components/saykind/Discover.tsx) opens the browser camera, takes a still, and hands it to
 * whatever recogniser has been registered here. It does not recognise anything itself. When no recogniser is
 * registered it says so honestly and lets the person pick the object by hand, so the rest of the flow
 * (picture, word, audio, snail, speaking practice, practice record) can already be reviewed.
 *
 * To plug yours in, call `registerRecognizer(...)` once on the client, for example from
 * components/saykind/Discover.tsx or any module it imports. See docs/LEVEL2_INTEGRATION.md.
 */
export type RecognitionResult =
  | {
      status: "ok";
      /** What it is, as a plain word the app can show and say, e.g. "Chair". */
      label: string;
      /** Optional dictionary syllables, e.g. ["ta", "ble"]. If omitted the whole word is shown as one part. */
      syllables?: string[];
      /** Optional 0 to 1. The UI never turns this into a score; it only decides whether to ask "is this right?". */
      confidence?: number;
      /** Other things it might be, offered as choices if the person says it is not right. */
      alternatives?: string[];
    }
  /** Nothing recognisable was found in the picture. */
  | { status: "none" }
  /** The recogniser could not run (offline, error, not installed). */
  | { status: "unavailable"; reason?: string };

export interface ObjectRecognizer {
  /**
   * @param image a JPEG of what the camera saw (the person pressed the shutter; nothing is captured automatically)
   * @param options.signal aborted if the person leaves or retakes
   */
  identify(image: Blob, options: { signal: AbortSignal }): Promise<RecognitionResult>;
}

let registered: ObjectRecognizer | null = null;

export function registerRecognizer(recognizer: ObjectRecognizer | null) {
  registered = recognizer;
}

export const hasRecognizer = () => registered !== null;

export async function recognizeObject(image: Blob, signal: AbortSignal): Promise<RecognitionResult> {
  if (!registered) return { status: "unavailable", reason: "not-connected" };
  try {
    return await registered.identify(image, { signal });
  } catch (error) {
    if (signal.aborted) throw error;
    return { status: "unavailable", reason: error instanceof Error ? error.message : "failed" };
  }
}

/* -------------------------------------------------------------------------------------------------------------
 * THE ONE FUNCTION THE CAMERA TEAMMATE CALLS WITH A RESULT.
 *
 * Whoever owns the camera and the recogniser gathers: the photo, what it thinks the object is, how sure it is,
 * and (if the person corrected it) the corrected word. Hand them to `receiveDiscovery` from useDiscovery()
 * (lib/saykind/controllers/use-discovery.ts); Level 2 then reuses the Level 1 exercise exactly: same audio, slow audio,
 * syllables, recording, feedback and practice record. No separate audio code exists for Level 2.
 * ------------------------------------------------------------------------------------------------------------- */
import type { LearnItem } from "./items";
import { OBJECTS } from "./items";

export type DiscoveryInput = {
  /** The captured photo: an object URL, data URL, or https URL the browser can show. */
  image: string;
  /** What the recogniser thinks it is, e.g. "table". */
  label: string;
  /** Optional 0 to 1. Only used to decide whether to ask "is this right?"; never shown as a score. */
  confidence?: number;
  /** If the person corrected the identification, the word they chose. It wins over `label`. */
  correctedLabel?: string;
  /** Optional dictionary syllables. If omitted the word is shown as one part (never guessed). */
  syllables?: string[];
};

const titleCase = (text: string) => text.trim().charAt(0).toUpperCase() + text.trim().slice(1).toLowerCase();

/** Turns a discovery into the same item shape Level 1 uses. Built-in words reuse their ready-made recordings. */
export function learnItemFromDiscovery(input: DiscoveryInput): LearnItem {
  const text = titleCase(input.correctedLabel?.trim() || input.label);
  const known = OBJECTS.find((object) => object.text.toLowerCase() === text.toLowerCase());
  return {
    id: `discover-${text.toLowerCase().replace(/[^a-z]+/g, "-")}`,
    text,
    syllables: input.syllables?.length ? input.syllables : (known?.syllables ?? [text.toLowerCase()]),
    ipa: known?.ipa,
    stressed: known?.stressed,
    startsWith: known?.startsWith ?? text.slice(0, 2),
    accepted: known?.accepted ?? [text.toLowerCase()],
    audioKey: known?.audioKey ?? null, // null: the server's voice says it; slow plays pitch-preserved
    light: "forest",
    art: { kind: "photo", uri: input.image },
  };
}
