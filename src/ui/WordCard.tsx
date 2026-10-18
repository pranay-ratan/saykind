"use client";

import { useState, type ReactNode } from "react";
import FlipCard from "../../components/reactbits/FlipCard";
import SpringCheck from "../../components/reactbits/SpringCheck";
import VoicePill from "../../components/reactbits/VoicePill";
import { useReducedMotion } from "../../lib/use-presence";

export interface WordCardProps {
  word: string;
  imageSrc: string;
  syllables: string[];
  onPlayNormal: () => void;
  onPlaySlow: () => void;
  onRecordStart: () => void;
  onRecordStop: () => void;
  isRecording: boolean;
  lastRecording?: string;
  onReplayLast?: () => void;
  /** Optional, added in Phase C: the "I said it" box. Receives true when the person ticks it. Logs nothing by itself. */
  onSaidIt?: (said: boolean) => void;
}

const INK = "#2D1E2F";
const MUTED = "#6B5C6D";
const CORAL_DEEP = "#9A442D";
const TEAL_DEEP = "#0E6967";
const CARD_WIDTH = 320;
const CARD_HEIGHT = 440;
const CARD_RADIUS = 32;

/** Stops a tap on a back-face control from reaching the card, so it does not flip. */
const stopFlip = (event: { stopPropagation: () => void }) => event.stopPropagation();

function PhotoFace({ word, imageSrc }: { word: string; imageSrc: string }): ReactNode {
  return (
    <div className="flex h-full w-full flex-col items-center justify-between p-5">
      <div className="relative w-full flex-1 overflow-hidden rounded-3xl bg-plum/5">
        {imageSrc ? (
          // eslint-disable-next-line @next/next/no-img-element -- data URL crop from the live camera
          <img src={imageSrc} alt={word} className="h-full w-full object-cover" />
        ) : (
          <div role="img" aria-label={`Photo of ${word} is loading`} className="h-full w-full animate-pulse bg-plum/10" />
        )}
      </div>
      <span className="mt-4 rounded-full bg-coral px-5 py-2 text-xl font-semibold text-plum">Tap to see the word</span>
    </div>
  );
}

function BackFace({
  word,
  imageSrc,
  syllables,
  onPlayNormal,
  onPlaySlow,
  onRecordStart,
  onRecordStop,
  isRecording,
  lastRecording,
  onReplayLast,
  onSaidIt,
}: WordCardProps): ReactNode {
  return (
    <div className="flex h-full w-full flex-col items-center gap-4 p-5" style={{ color: INK }}>
      <div className="flex w-full items-center gap-4" onClick={stopFlip}>
        <div className="h-16 w-16 flex-none overflow-hidden rounded-[2rem] bg-plum/5">
          {imageSrc ? (
            // eslint-disable-next-line @next/next/no-img-element -- data URL crop from the live camera
            <img src={imageSrc} alt="" className="h-full w-full object-cover" />
          ) : null}
        </div>
        <div className="min-w-0">
          <h2 className="text-4xl font-bold leading-tight" style={{ color: INK }}>
            {word}
          </h2>
          <p className="flex flex-wrap items-center gap-2 text-xl" style={{ color: MUTED }} aria-label={`Sounds: ${syllables.join(", ")}`}>
            {syllables.map((part, index) => (
              <span key={index} className="inline-flex items-center gap-1">
                <span aria-hidden="true" className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: CORAL_DEEP }} />
                {part}
              </span>
            ))}
          </p>
        </div>
      </div>

      <div className="flex w-full gap-3" onClick={stopFlip}>
        <button
          type="button"
          onClick={onPlayNormal}
          className="flex min-h-[64px] flex-1 items-center justify-center gap-2 rounded-[2rem] text-xl font-semibold text-white focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-deep-teal"
          style={{ background: CORAL_DEEP }}
          aria-label={`Say ${word} at normal speed`}
        >
          <svg className="h-7 w-7" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
          </svg>
          Speaker
        </button>
        <button
          type="button"
          onClick={onPlaySlow}
          className="flex min-h-[64px] flex-1 items-center justify-center gap-2 rounded-[2rem] text-xl font-semibold text-white focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-deep-teal"
          style={{ background: CORAL_DEEP }}
          aria-label={`Say ${word} slowly`}
        >
          <svg className="h-7 w-7" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M20.5 3l-.16.03L15 5.1 9 3 3.36 4.9c-.21.07-.36.25-.36.48V20.5c0 .28.22.5.5.5l.16-.03L9 18.9l6 2.1 5.64-1.9c.21-.07.36-.25.36-.48V3.5c0-.28-.22-.5-.5-.5zM15 19l-6-2.11V5l6 2.11V19z" />
          </svg>
          Snail
        </button>
      </div>

      <div className="flex w-full flex-col items-center gap-3" onClick={stopFlip}>
        <VoicePill
          listening={isRecording}
          mode="toggle"
          showTime={false}
          accentColor={CORAL_DEEP}
          onPressStart={() => (isRecording ? onRecordStop() : onRecordStart())}
          ariaLabel={isRecording ? "Stop recording" : "Record your pronunciation"}
        />
        {lastRecording && onReplayLast ? (
          <button
            type="button"
            onClick={onReplayLast}
            className="min-h-[64px] w-full rounded-[2rem] text-xl font-semibold focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-deep-teal"
            style={{ background: "var(--cream)", color: INK, border: "1px solid rgba(45,30,47,.12)" }}
            aria-label="Replay your recording"
          >
            Replay your try
          </button>
        ) : null}
      </div>

      <div className="flex min-h-[64px] w-full items-center justify-between rounded-[2rem] px-2" onClick={stopFlip}>
        <SpringCheck
          label="I said it"
          color={INK}
          fillColor={TEAL_DEEP}
          checkColor="#FFFFFF"
          boxSize={36}
          boxRadius={12}
          fontSize={22}
          bounce={0.15}
          strike="none"
          doneOpacity={1}
          onChange={(said) => onSaidIt?.(said)}
          ariaLabel="I said it"
        />
      </div>
    </div>
  );
}

/**
 * The practice card: photo on the front ("Tap to see the word"), word and controls on the back. Taps on the back
 * controls never flip the card. With reduced motion, the two faces crossfade instead of turning.
 */
export function WordCard(props: WordCardProps) {
  const reduced = useReducedMotion();
  const { word, imageSrc } = props;

  if (reduced) {
    return <CrossfadeCard {...props} />;
  }

  return (
    <div className="flex w-full justify-center py-4">
      <FlipCard
        axis="y"
        flipOnClick
        draggable={false}
        tilt={false}
        glare={false}
        hoverScale={1}
        perspective={1100}
        stiffness={120}
        damping={24}
        width={CARD_WIDTH}
        height={CARD_HEIGHT}
        radius={CARD_RADIUS}
        background="#FDFBF7"
        color={INK}
        shadow
        shadowColor={INK}
        shadowOpacity={0.08}
        ariaLabel="Flip to see the word"
        front={<PhotoFace word={word} imageSrc={imageSrc} />}
        back={<BackFace {...props} />}
      />
    </div>
  );
}

/** Reduced motion: no turning. Tapping the front shows the back, and the two faces crossfade. */
function CrossfadeCard(props: WordCardProps) {
  const { word, imageSrc } = props;
  const [showBack, setShowBack] = useState(false);
  return (
    <div className="flex w-full justify-center py-4">
      <div
        className="relative overflow-hidden"
        style={{ width: CARD_WIDTH, minHeight: CARD_HEIGHT, borderRadius: CARD_RADIUS, background: "var(--cream)", color: INK, boxShadow: "0 12px 32px -8px rgba(45,30,47,.08), 0 4px 16px -2px rgba(45,30,47,.02)", border: "1px solid rgba(45,30,47,.06)" }}
      >
        <div style={{ opacity: showBack ? 0 : 1, transition: "opacity 200ms", pointerEvents: showBack ? "none" : "auto", minHeight: CARD_HEIGHT }}>
          <button type="button" className="h-full w-full text-left" style={{ minHeight: CARD_HEIGHT }} onClick={() => setShowBack(true)} aria-label="Show the word">
            <PhotoFace word={word} imageSrc={imageSrc} />
          </button>
        </div>
        <div style={{ position: "absolute", inset: 0, opacity: showBack ? 1 : 0, transition: "opacity 200ms", pointerEvents: showBack ? "auto" : "none" }}>
          <BackFace {...props} />
        </div>
      </div>
    </div>
  );
}

