"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Order } from "@/lib/order";
import { choicesFor, questionFor, type Choice, type ChoiceSlot } from "@/lib/support";
import { DRINK_WORDS, PASTRY_WORDS, asChoice, wordsForChoices, type MenuWord } from "@/lib/menu-words";
import { subjectOfMenuWord } from "@/lib/saykind/menu-bridge";
import { logEvent } from "@/lib/saykind/log";
import { usePractice } from "@/lib/saykind/use-practice";
import { tap } from "@/lib/haptics";
import Art from "./Art";
import { CloseIcon, MicIcon, RestartIcon, SnailIcon, SpeakerIcon, StopIcon } from "./icons";

export type SheetMode = "help" | "menu";

type Props = {
  id: string;
  state: "open" | "closed";
  mode: SheetMode;
  /** What the barista is asking about right now, or "none". */
  slot: ChoiceSlot | "none";
  order: Order;
  /** True only on the patient's turn. */
  canAnswer: boolean;
  onChoose: (slot: ChoiceSlot, choice: Choice) => void;
  onClose: () => void;
};

function feedbackFor(recognition: "matches" | "differs" | "nothing" | "error" | null, heard: string, problem: string | null, word: string): string {
  const said = heard.replace(/[.!?]+$/, "");
  switch (recognition) {
    case "matches":
      return `I heard “${said}”. That matches. Recognition can be wrong, so trust your ears too.`;
    case "differs":
      return `I heard “${said}”, which is different from “${word}”, but the computer can mishear. Try again, or choose it anyway.`;
    case "nothing":
      return "I didn't hear anything. Try again whenever you're ready.";
    case "error":
      return problem ?? "I couldn't check that one. You can try again.";
    default:
      return "";
  }
}

/**
 * Help and the menu share one compact sheet that stops below the barista's face.
 * Pick a picture; its card offers: hear it, hear it slowly, a first-sound cue, saying it yourself, and choosing it.
 * Every item, drink or pastry or size, uses exactly this one card.
 */
export default function ItemSheet({ id, state, mode, slot, order, canAnswer, onChoose, onClose }: Props) {
  const levelRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const practice = usePractice(3, levelRef);
  const [tab, setTab] = useState<"drinks" | "treats">("drinks");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showFirst, setShowFirst] = useState(false);

  useEffect(() => {
    titleRef.current?.focus({ preventScroll: true });
  }, [mode]);

  const words: MenuWord[] = useMemo(() => {
    if (mode === "menu") return tab === "drinks" ? DRINK_WORDS : PASTRY_WORDS;
    if (slot === "none") return [];
    return wordsForChoices(choicesFor(slot, order), slot);
  }, [mode, tab, slot, order]);

  const selected = words.find((w) => w.id === selectedId) ?? words[0] ?? null;
  const title = mode === "menu" ? "Menu" : slot === "none" ? "Help" : questionFor(slot);
  const canChoose = canAnswer && !!selected && slot !== "none" && selected.slot === slot;

  const select = (word: MenuWord) => {
    practice.reset();
    setShowFirst(false);
    setSelectedId(word.id);
  };

  const subject = selected ? subjectOfMenuWord(selected) : null;
  const sayState = practice.status;
  const sayLabel = sayState === "recording" ? "Done" : sayState === "processing" ? "One moment" : sayState === "idle" ? "Say it" : "Try again";

  return (
    <section
      id={id}
      role="dialog"
      aria-modal="false"
      aria-labelledby={`${id}-title`}
      data-presence="rise"
      data-state={state}
      className="sheet"
      data-mode={mode}
      onKeyDown={(event) => {
        if (event.key === "Escape") onClose();
      }}
    >
      <div className="sheet-header">
        <h2 id={`${id}-title`} ref={titleRef} tabIndex={-1} className="sheet-title">
          {title}
        </h2>
        {mode === "menu" && (
          <div className="tabs" role="group" aria-label="Menu sections">
            {(["drinks", "treats"] as const).map((key) => (
              <button
                key={key}
                type="button"
                className="chip"
                aria-pressed={tab === key}
                onClick={() => {
                  setTab(key);
                  setSelectedId(null);
                  practice.reset();
                }}
              >
                {key === "drinks" ? "Drinks" : "Treats"}
              </button>
            ))}
          </div>
        )}
        <button type="button" className="icon-button" onClick={onClose} aria-label={`Close ${mode}`}>
          <CloseIcon className="size-5" />
        </button>
      </div>

      <div className="sheet-body">
        <ul className="strip" aria-label="Pictures">
          {words.map((word) => (
            <li key={word.id}>
              <button type="button" className="tile" aria-pressed={word.id === selected?.id} aria-label={word.name} onClick={() => select(word)}>
                <span className="tile-art">
                  <Art id={word.id} />
                </span>
                <span className="tile-label">{word.name}</span>
              </button>
            </li>
          ))}
        </ul>

        {selected && (
          <div className="item" ref={levelRef}>
            <div className="item-top">
              <div className="item-art">
                <Art id={selected.id} />
              </div>
              <div className="min-w-0">
                <p className="item-name">{selected.name}</p>
                {selected.price && <p className="item-price">{selected.price}</p>}
                <div className="syll" data-show="true" role="group" aria-label={`Syllables: ${selected.syllables.join(", ")}`} style={{ justifyContent: "flex-start", marginTop: 0, minHeight: "1.75rem" }}>
                  {selected.syllables.map((part, i) => (
                    <span key={i}>
                      {part}
                    </span>
                  ))}
                </div>
                {showFirst && <p className="item-first">Starts with “{selected.startsWith}”</p>}
              </div>
            </div>

            <div className="item-actions">
              <button type="button" className="chip light" onClick={() => { tap(); if (subject) practice.play(subject, false); }}>
                <SpeakerIcon className="size-5" />
                Hear it
              </button>
              <button type="button" className="chip" aria-label="Hear it slowly" data-snail onClick={() => { tap(); if (subject) practice.play(subject, true); }}>
                <SnailIcon className="size-6" />
                Slowly
              </button>
              <button
                type="button"
                className="chip"
                aria-pressed={showFirst}
                onClick={() => {
                  if (!showFirst && subject) practice.help(subject, "first-sound");
                  setShowFirst((on) => !on);
                }}
              >
                First sound
              </button>
            </div>

            <div className="item-say">
              <button
                type="button"
                className="say-btn"
                data-live={sayState === "recording"}
                disabled={sayState === "processing" || practice.requesting}
                aria-label={sayState === "recording" ? "Finish speaking" : `Say ${selected.name}`}
                onClick={() => {
                  tap(14);
                  if (sayState === "result") practice.another();
                  else if (subject) void practice.toggle(subject);
                }}
              >
                {sayState === "recording" ? <StopIcon /> : sayState === "idle" || sayState === "processing" ? <MicIcon /> : <RestartIcon />}
                {sayLabel}
              </button>
              <p className="say-feedback" aria-live="polite">
                {feedbackFor(practice.outcome?.recognition ?? null, practice.outcome?.heard ?? "", practice.problemText, selected.name) || `Try: “${selected.sentence}”`}
              </p>
            </div>

            <button
              type="button"
              className="choose-btn"
              disabled={!canChoose}
              aria-label={canChoose ? `Choose ${selected.name}` : `Choose ${selected.name}, available when it is your turn to answer that question`}
              onClick={() => {
                if (slot === "none" || !subject) return;
                tap(14);
                practice.stop();
                logEvent({ type: "select", ts: Date.now(), level: 3, itemId: subject.id, itemText: subject.text, via: "tap" });
                practice.complete(subject, "continued");
                onChoose(slot, asChoice(selected));
              }}
            >
              {canChoose ? `Choose ${selected.name}` : slot === "none" ? "Your order is complete" : !canAnswer ? "You can choose when it's your turn" : "Sam is asking about something else"}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
