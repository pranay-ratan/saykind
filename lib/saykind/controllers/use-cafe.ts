"use client";

import { useMemo, type RefObject } from "react";
import { DRINK_WORDS, PASTRY_WORDS, SIZE_WORDS, TEMP_WORDS, wordsForChoices, type MenuWord } from "@/lib/menu-words";
import { choicesFor, questionFor, type Choice, type ChoiceSlot } from "@/lib/support";
import { useConversation, type ConversationMessage, type Phase } from "@/lib/use-conversation";
import type { CafeSession } from "@/lib/cafe-session";
import type { Order } from "@/lib/order";
import { subjectOfMenuWord } from "../menu-bridge";
import { usePractice } from "../use-practice";

/**
 * CAFÉ CONTROLLER: the AI barista conversation plus the data and actions for the menu. No visuals.
 * The animated café artwork (components/cafe/CafeScene) is separate and must not be changed; any controls you build
 * around it can bind to this.
 *
 * Endpoints it uses (all on our own server, no keys in the browser):
 *   GET /api/status, POST /api/transcribe, POST /api/converse, POST /api/speak
 */
export type CafeController = {
  /* ---- the conversation ---- */
  phase: Phase;
  /** The barista's latest words (the caption). */
  caption: string;
  /** The whole dialogue so far, oldest first. */
  messages: ConversationMessage[];
  /** What has been ordered so far. */
  order: Order;
  /** Which question the barista is waiting on: drink, size, temperature, extras, or "none" when the order is complete. */
  slot: ChoiceSlot | "none";
  isBaristaSpeaking: boolean;
  isRecording: boolean;
  isProcessing: boolean;
  /** True on the person's turn, when they can speak or tap an answer. */
  isMyTurn: boolean;
  isMicRequesting: boolean;
  /** A short message about something that went wrong (mic blocked, voice failed, network), or null. */
  notice: string | null;
  /** The small "Got it: Medium Hot Latte" acknowledgement after the order changes, or null. */
  acknowledgement: { id: number; text: string } | null;
  micLevelRef: RefObject<HTMLDivElement | null>;
  /** Unclear turns in a row; the UI can offer picture help when this reaches 2. */
  unclearStreak: number;

  /* ---- actions ---- */
  /** Begin the conversation. Call it straight from a tap, so the browser allows sound and the microphone. */
  start: (options?: { whenReady?: Promise<void> }) => void;
  /** Unlock audio from a tap (call once early; start() also does it). */
  unlockAudio: () => void;
  toggleMic: () => Promise<void>;
  /** Answer by choosing instead of speaking. */
  choose: (slot: ChoiceSlot, choice: Choice) => void;
  hearBaristaAgain: () => void;
  dismissNotice: () => void;
  /** Leave the café: stops the voice and the microphone and forgets this conversation. */
  exit: () => void;
  /** Counts a Help sheet opening in this visit's session. */
  noteHelpRequest: () => void;
  /** Counts the menu pictures being opened in this visit's session. */
  noteMenuUsed: () => void;
  /** This visit so far (turns, order, help and follow-up counts). Kept in memory; written to the practice log on confirm or exit. */
  getSession: () => CafeSession;

  /* ---- the menu ---- */
  menu: {
    drinks: MenuWord[];
    pastries: MenuWord[];
    sizes: MenuWord[];
    temperatures: MenuWord[];
    /** The picture-choices for whatever the barista is asking right now. */
    currentChoices: MenuWord[];
    currentQuestion: string | null;
  };
};

export type MenuItemController = ReturnType<typeof useMenuItem>;

/**
 * Pronunciation practice for ONE menu item (the same engine as Level 1): normal and slow audio, speaking practice, and
 * attempt logging. Call `selectItem` from the controller above to choose the item without speaking.
 */
export function useMenuItem(levelRef: RefObject<HTMLElement | null>) {
  const practice = usePractice(3, levelRef);
  return {
    ...practice,
    subjectOf: subjectOfMenuWord,
    playItem: (word: MenuWord) => practice.play(subjectOfMenuWord(word), false),
    playItemSlowly: (word: MenuWord) => practice.play(subjectOfMenuWord(word), true),
    practiceItem: (word: MenuWord) => practice.toggle(subjectOfMenuWord(word)),
  };
}

export function useCafe(): CafeController {
  const micLevelRef = useRefOf();
  const convo = useConversation(micLevelRef);
  const slot = convo.slot;

  const menu = useMemo(() => {
    const currentChoices = slot === "none" ? [] : wordsForChoices(choicesFor(slot, convo.order), slot);
    return { drinks: DRINK_WORDS, pastries: PASTRY_WORDS, sizes: SIZE_WORDS, temperatures: TEMP_WORDS, currentChoices, currentQuestion: slot === "none" ? null : questionFor(slot) };
  }, [slot, convo.order]);

  return {
    phase: convo.phase,
    caption: convo.caption,
    messages: convo.messages,
    order: convo.order,
    slot,
    isBaristaSpeaking: convo.phase === "speaking",
    isRecording: convo.phase === "recording",
    isProcessing: convo.phase === "thinking" || convo.phase === "starting",
    isMyTurn: convo.phase === "yourTurn" || convo.phase === "recording",
    isMicRequesting: convo.micRequesting,
    notice: convo.notice,
    acknowledgement: convo.ack,
    micLevelRef,
    unclearStreak: convo.unclearStreak,
    start: convo.start,
    unlockAudio: convo.unlockAudio,
    toggleMic: convo.toggleMic,
    choose: convo.choose,
    hearBaristaAgain: convo.hearAgain,
    dismissNotice: convo.dismissNotice,
    exit: convo.exit,
    noteHelpRequest: convo.noteHelpRequest,
    noteMenuUsed: convo.noteMenuUsed,
    getSession: convo.getSession,
    menu,
  };
}

import { useRef } from "react";
function useRefOf() {
  return useRef<HTMLDivElement>(null);
}

/**
 * ORDER CARD CONTROLLER: the finished order as a sentence the person can show or play aloud in a real café, e.g.
 * "Can I have a medium hot latte, please?". No visuals.
 */
import { describeOrder, orderLines } from "@/lib/order";
import { playWord, stopWordAudio } from "@/lib/word-audio";
import { logEvent } from "../log";
import { useState } from "react";

export function useOrderCard(order: Order) {
  const [playing, setPlaying] = useState<"normal" | "slow" | null>(null);
  const spoken = describeOrder(order);
  const hasOrder = spoken !== "nothing yet";
  const sentence = hasOrder ? `Can I have ${spoken}, please?` : "";
  const play = (slow = false) => {
    if (!hasOrder) return;
    logEvent({ type: "activity", ts: Date.now(), level: 3, name: slow ? "order-card-slow" : "order-card-played", detail: sentence });
    setPlaying(slow ? "slow" : "normal");
    void playWord(null, sentence, { slow }).then(() => setPlaying(null));
  };
  return { hasOrder, sentence, lines: orderLines(order), play: () => play(false), playSlowly: () => play(true), stop: () => { stopWordAudio(); setPlaying(null); }, isPlayingAudio: playing === "normal", isPlayingSlowAudio: playing === "slow" };
}
