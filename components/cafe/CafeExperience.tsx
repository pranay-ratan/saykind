"use client";

import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { useCaptions } from "@/lib/use-captions";
import type { CafeController } from "@/lib/saykind";
import type { Order } from "@/lib/order";
import { useHeld, usePresence } from "@/lib/use-presence";
import { Button, MicButton, type MicVisual } from "@/components/saykind/kit";
import Dialogue from "./Dialogue";
import { logEvent } from "@/lib/saykind/log";
import { BackIcon, CaptionsIcon, CloseIcon, CupIcon, HelpIcon, InfoIcon, PhoneIcon, SpeakerIcon } from "./icons";
import ItemSheet from "./ItemSheet";

type SheetKind = "help" | "menu";
const IDS = { help: "help-sheet", menu: "menu-sheet" } as const;

/** How long the closing words stay in view before the summary appears. No pressure: it is only a pause. */
const COMPLETE_DELAY_MS = 2200;
/** How long the small "Got it" badge stays. */
const ACK_MS = 3000;

function Pill({
  label,
  icon,
  expanded,
  controls,
  attention,
  onClick,
  buttonRef,
}: {
  label: string;
  icon: ReactNode;
  expanded: boolean;
  controls: string;
  attention?: boolean;
  onClick: () => void;
  buttonRef: RefObject<HTMLButtonElement | null>;
}) {
  return (
    <button ref={buttonRef} type="button" aria-expanded={expanded} aria-controls={controls} onClick={onClick} className={`pill ${attention ? "pill-attention" : ""}`}>
      {icon}
      {label}
    </button>
  );
}

function Toast({ message, show, onDismiss }: { message: string | null; show: boolean; onDismiss: () => void }) {
  const held = useHeld(message);
  const presence = usePresence(show && !!message);
  if (!presence.mounted || !held) return null;
  return (
    <div className="toast" role="status" data-presence="rise" data-state={presence.state}>
      <InfoIcon className="size-6" />
      <p>{held}</p>
      <button type="button" className="icon-button" onClick={onDismiss} aria-label="Dismiss message" style={{ width: "2.5rem", height: "2.5rem" }}>
        <CloseIcon className="size-5" />
      </button>
    </div>
  );
}

/**
 * The café: the unchanged artwork, with the conversation controls around it.
 * The conversation itself (the barista, the microphone, the order) lives one level up, so it can begin the
 * moment the café appears and survive between screens.
 */
export default function CafeExperience({
  scene,
  cafe: convo,
  onComplete,
  onRetryStart,
  onExit,
  onCaregiver,
}: {
  scene: ReactNode;
  cafe: CafeController;
  onComplete: (order: Order) => void;
  /** Used only if the conversation could not begin (for example, the voice service isn't set up). */
  onRetryStart: () => void;
  /** Leave the café and go home. */
  onExit: () => void;
  /** Open the caregiver help sheet. */
  onCaregiver: () => void;
}) {
  const [captionsOn, setCaptionsOn] = useCaptions();
  const [openSheet, setOpenSheet] = useState<"none" | SheetKind>("none");
  const [hiddenAck, setHiddenAck] = useState<number | null>(null);

  const helpButtonRef = useRef<HTMLButtonElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const returnFocusRef = useRef<SheetKind | null>(null);

  const { phase, slot } = convo;
  const conversing = phase === "speaking" || phase === "yourTurn" || phase === "recording" || phase === "thinking";
  const canAnswer = phase === "yourTurn" || phase === "recording";

  // Which sheet, if any, is wanted right now.
  const wanted: SheetKind | null = openSheet === "menu" ? "menu" : openSheet === "help" && conversing && slot !== "none" ? "help" : null;
  const sheetPresence = usePresence(wanted !== null);
  const heldSheet = useHeld<SheetKind>(wanted);
  const sheetOpen = wanted !== null;

  // After the barista's closing words, pause a moment, then move on to the summary.
  const completeRef = useRef(onComplete);
  useEffect(() => {
    completeRef.current = onComplete;
  });
  useEffect(() => {
    if (phase !== "ended") return;
    const timer = setTimeout(() => completeRef.current(convo.order), COMPLETE_DELAY_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // The "Got it" badge fades by itself.
  useEffect(() => {
    if (!convo.acknowledgement) return;
    const id = convo.acknowledgement.id;
    const timer = setTimeout(() => setHiddenAck(id), ACK_MS);
    return () => clearTimeout(timer);
  }, [convo.acknowledgement]);
  const ackText = convo.acknowledgement && hiddenAck !== convo.acknowledgement.id ? convo.acknowledgement.text : null;

  // When a sheet closes, hand keyboard focus back to the button that opened it.
  useEffect(() => {
    if (openSheet !== "none" || !returnFocusRef.current) return;
    const target = returnFocusRef.current === "help" ? helpButtonRef : menuButtonRef;
    returnFocusRef.current = null;
    target.current?.focus();
  }, [openSheet]);

  const closeSheet = (which: SheetKind) => {
    returnFocusRef.current = which;
    setOpenSheet("none");
  };
  const toggleSheet = (which: SheetKind) => {
    if (openSheet === which) closeSheet(which);
    else {
      setOpenSheet(which);
      logEvent({ type: "help", ts: Date.now(), level: 3, itemId: which === "menu" ? "menu" : `help-${slot}`, itemText: which === "menu" ? "Menu" : `Picture help (${slot})`, kind: which === "menu" ? "menu" : "picture-help" });
    }
  };

  // While a sheet is open it takes the room the controls would use; the sheet has its own Close.
  const showControls = phase !== "idle" && phase !== "ended" && !sheetOpen;
  const canReplay = phase === "yourTurn" || phase === "ended";

  const micState: MicVisual = phase === "yourTurn" ? "ready" : phase === "recording" ? "recording" : phase === "thinking" || phase === "starting" ? "processing" : "waiting";
  const micCaption = convo.isMicRequesting ? "Allow the microphone" : { ready: "Your turn", recording: "Tap when you're done", processing: "One moment…", waiting: "Sam is speaking" }[micState];

  return (
    <div className="cafe-frame" data-sheet={sheetOpen ? "open" : "closed"}>
      {scene}

      <div className="cafe-corner">
        <button type="button" className="round-btn glass" onClick={onExit} aria-label="Leave the café and go back">
          <BackIcon className="size-6" />
        </button>
        <button type="button" className="round-btn glass" onClick={onCaregiver} aria-label="Call or message my caregiver">
          <PhoneIcon className="size-6" />
        </button>
      </div>

      <button type="button" aria-pressed={captionsOn} onClick={() => setCaptionsOn(!captionsOn)} className="round-btn glass captions-toggle">
        <CaptionsIcon className="size-6" off={!captionsOn} />
        <span className="sr-only">Captions</span>
      </button>

      <div className="scrim" aria-hidden="true" />

      {/* Read aloud by screen readers whether or not captions are showing. */}
      <p className="sr-only" aria-live="polite">
        {convo.caption}
      </p>

      <div className="bottom-stack">
        {sheetPresence.mounted && heldSheet && (
          <ItemSheet
            id={IDS[heldSheet]}
            mode={heldSheet}
            state={sheetPresence.state}
            slot={slot}
            order={convo.order}
            canAnswer={canAnswer}
            onChoose={(chosenSlot, choice) => {
              convo.choose(chosenSlot, choice);
              closeSheet(heldSheet);
            }}
            onClose={() => closeSheet(heldSheet)}
          />
        )}

        <Toast message={convo.notice} show={!sheetOpen} onDismiss={convo.dismissNotice} />

        <Dialogue
          caption={convo.caption}
          show={captionsOn && !sheetOpen}
          speaking={convo.isBaristaSpeaking}
          canReplay={canReplay}
          onReplay={convo.hearBaristaAgain}
          acknowledgement={sheetOpen ? null : ackText}
        />

        {!captionsOn && !sheetOpen && canReplay && convo.caption && (
          <button type="button" className="pill self-center" onClick={convo.hearBaristaAgain}>
            <SpeakerIcon className="size-5" />
            Hear that again
          </button>
        )}

        {/* Only if the conversation could not begin by itself: one clear thing to do. */}
        {phase === "idle" && (
          <div className="flex flex-col items-center gap-4" data-presence="rise" data-state="open">
            <Button label="Start Conversation" onPress={onRetryStart} />
            <Pill label="Menu" icon={<CupIcon className="size-6" />} expanded={openSheet === "menu"} controls={IDS.menu} onClick={() => toggleSheet("menu")} buttonRef={menuButtonRef} />
          </div>
        )}

        {/* During it: the mic leads; Help and Menu stay close but quiet. */}
        {showControls && (
          <div className="controls">
            <div className="side side-start">
              {conversing && (
                <Pill
                  label="Help"
                  icon={<HelpIcon className="size-6" />}
                  expanded={openSheet === "help"}
                  controls={IDS.help}
                  attention={convo.unclearStreak >= 2 && openSheet !== "help"}
                  onClick={() => toggleSheet("help")}
                  buttonRef={helpButtonRef}
                />
              )}
            </div>

            <div className="mic-slot">
              <MicButton state={micState} levelRef={convo.micLevelRef} busy={convo.isMicRequesting} size={72} onPress={() => void convo.toggleMic()} />
              <p className="mic-caption" aria-live="polite">
                {micCaption}
              </p>
            </div>

            <div className="side side-end">
              <Pill label="Menu" icon={<CupIcon className="size-6" />} expanded={openSheet === "menu"} controls={IDS.menu} onClick={() => toggleSheet("menu")} buttonRef={menuButtonRef} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
