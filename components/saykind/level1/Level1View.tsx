"use client";

import { useCallback, useEffect, useRef } from "react";
import { MenuIcon, PhoneIcon, SnailIcon, SpeakerIcon } from "@/components/cafe/icons";
import BlurText from "@/components/reactbits/BlurText";
import ClickSpark, { type ClickSparkHandle } from "@/components/reactbits/ClickSpark";
import StatusMark from "@/components/reactbits/StatusMark";
import VoicePill from "@/components/reactbits/VoicePill";
import type { ExerciseController } from "@/lib/saykind";
import { useReducedMotion } from "@/lib/use-presence";
import ChairArt from "./ChairArt";

/**
 * LEVEL 1, redesigned (Chair first). Pure presentation: every value comes from the ExerciseController and every control
 * calls one of its functions, exactly like the previous screen, so nothing about recording, audio, recognition, feedback,
 * progress or the practice record changes.
 *
 * React Bits pieces used (see docs/LEVEL1_REACTBITS.md):
 *   Status Mark  the progress row, and the "checking" and "heard it" marks
 *   Blur Text    the word, resolving into focus once when it appears
 *   Voice Pill   the microphone (live waveform while recording; driven by our own recorder)
 *   Click Spark  a small spark when the computer heard the word
 */
const INK = "#1F2A37";
const MUTED = "#5B6675";
const GREEN = "#1F7A5A";
const GREEN_DARK = "#17614A";
const GREEN_SOFT = "#E4F3EC";
const AMBER_SOFT = "#FFF0CC";
const AMBER_RING = "#E7A92B";
const LINE = "#E7E2D6";

const FONT = "var(--font-friendly), var(--font-ui), system-ui, sans-serif";

export default function Level1View({ exercise: x, onMenu, onCaregiver }: { exercise: ExerciseController; onMenu: () => void; onCaregiver: () => void }) {
  const reduced = useReducedMotion();
  const sparks = useRef<ClickSparkHandle>(null);
  const feedback = x.latestFeedback;
  const word = x.currentWord;
  const parts = x.pronunciation.syllables;

  // A result appears: bring it into view, and (only when the computer heard the word) a small spark once the card has settled.
  const resultRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (!feedback) return;
    resultRef.current?.scrollIntoView({ block: "nearest", behavior: reduced ? "auto" : "smooth" });
    if (feedback.kind !== "heard-match" || reduced) return;
    const timer = window.setTimeout(() => sparks.current?.spark(40, 36), 420);
    return () => window.clearTimeout(timer);
  }, [feedback, reduced]);

  // The recorder writes the live voice level to this element as the CSS variable --level; the waveform reads it every frame.
  const { micLevelRef } = x;
  const getLevel = useCallback(() => {
    const raw = micLevelRef.current?.style.getPropertyValue("--level");
    const value = raw ? parseFloat(raw) : 0;
    return Number.isFinite(value) ? value : 0;
  }, [micLevelRef]);

  const status = x.isRecording ? "Listening… tap the square when you're done." : x.isProcessing ? "Checking what I heard…" : x.isRequestingMic ? "Please allow the microphone." : "Tap the microphone and say the word.";

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", background: "#FCFBF7", color: INK, fontFamily: FONT }}>
      {/* top: menu, progress, caregiver */}
      <header style={{ display: "flex", alignItems: "center", gap: 12, padding: "calc(env(safe-area-inset-top, 0px) + 12px) 16px 6px" }}>
        <IconBtn label="Open menu" onClick={onMenu}>
          <MenuIcon className="size-6" />
        </IconBtn>
        <ol aria-label={`Word ${x.currentExerciseIndex + 1} of ${x.total}`} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 14, margin: 0, padding: 0, listStyle: "none" }}>
          {x.items.map((item, i) => {
            const done = x.completedIds.includes(item.id);
            const current = i === x.currentExerciseIndex;
            return (
              <li key={item.id} style={{ display: "grid", placeItems: "center", color: current ? INK : "#9AA3AF" }}>
                <StatusMark
                  status={done ? "done" : current ? "running" : "pending"}
                  progress={current && !done ? (x.attemptCount > 0 ? 0.65 : 0.3) : undefined}
                  size={26}
                  strokeWidth={2.4}
                  dashes={9}
                  color={current ? INK : "#9AA3AF"}
                  doneColor={GREEN}
                  strike={false}
                />
                <span style={visuallyHidden}>{`${item.text}: ${done ? "practiced" : current ? "now" : "to come"}`}</span>
              </li>
            );
          })}
        </ol>
        <IconBtn label="Call or message my caregiver" onClick={onCaregiver}>
          <PhoneIcon className="size-6" />
        </IconBtn>
      </header>

      {/* middle: the picture, the word, how to say it, how to hear it */}
      <main style={{ flex: 1, minHeight: 0, overflowY: "auto", display: "flex", flexDirection: "column", alignItems: "center", padding: "6px 20px 12px" }}>
        <div style={{ margin: "auto 0", width: "100%", display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
        {!feedback ? (
          <p aria-live="polite" className="[@media(max-height:700px)]:hidden" style={{ margin: "6px 0 0", fontSize: 17, fontWeight: 700, color: MUTED }}>
            Listen, then say the word
          </p>
        ) : null}

        <div key={`art-${word.id}`} className={feedback ? "l1-enter [@media(max-height:700px)]:hidden" : "l1-enter"} style={{ width: feedback ? "min(34vw, 130px, 13vh)" : "min(62vw, 250px, max(27vh, 150px))", aspectRatio: "1", borderRadius: "50%", background: "#FFF3DA", display: "grid", placeItems: "center", flex: "none", transition: "width 300ms, max-height 300ms" }}>
          <div style={{ width: "80%", height: "80%" }}>
            <ChairArt />
          </div>
        </div>

        <h1 style={{ margin: 0, lineHeight: 1 }} aria-label={word.text}>
          <BlurText key={word.id} text={word.text} animateBy="letters" trigger="load" delay={45} stepDuration={0.32} blur={7} distance={14} className="justify-center !text-[clamp(50px,7.6vh,64px)] !font-extrabold !leading-[1.05] !tracking-tight" color={INK} />
        </h1>

        {/* accurate pronunciation guidance, always visible */}
        <p style={{ margin: 0, display: "flex", alignItems: "center", gap: 10, fontSize: 19, fontWeight: 700, color: MUTED }} aria-label={`Pronunciation: ${parts.join(", ")}${x.pronunciation.ipa ? `, ${x.pronunciation.ipa}` : ""}`}>
          <span>{parts.map((p, i) => (i === x.pronunciation.stressed ? p.toUpperCase() : p)).join(" · ")}</span>
          {x.pronunciation.ipa ? <span style={{ fontWeight: 600, color: "#7A8594", letterSpacing: 0.5 }}>{x.pronunciation.ipa}</span> : null}
        </p>

        {x.adaptiveMessage ? (
          <p aria-live="polite" style={{ margin: 0, fontSize: 16, fontWeight: 600, color: MUTED, textAlign: "center", maxWidth: 360 }}>{x.adaptiveMessage}</p>
        ) : null}

        {/* hear it */}
        <div style={{ display: "flex", gap: 30, marginTop: 6 }}>
          <RoundAction label={`Hear ${word.text}`} caption="Listen" active={x.isPlayingAudio} onClick={x.playPronunciation} bg={GREEN} fg="#FFFFFF" ring={GREEN_DARK}>
            <SpeakerIcon className="size-8" />
          </RoundAction>
          <RoundAction label="Hear it slowly" caption="Slowly" active={x.isPlayingSlowAudio} onClick={x.playSlowPronunciation} bg={AMBER_SOFT} fg={INK} ring={AMBER_RING}>
            <SnailIcon className="size-9" />
          </RoundAction>
        </div>

        {/* optional help */}
        <div style={{ display: feedback ? "none" : "flex", gap: 8, flexWrap: "wrap", justifyContent: "center", marginTop: 2 }}>
          <Chip label="Syllables" on={x.syllablesShown} onClick={x.toggleSyllables} />
          <Chip label="First sound" on={x.firstSoundShown} onClick={x.toggleFirstSound} />
        </div>
        {!feedback && (x.syllablesShown || x.firstSoundShown) ? (
          <div style={{ width: "100%", maxWidth: 420, margin: "0 auto", padding: "12px 16px", borderRadius: 18, background: GREEN_SOFT, display: "grid", gap: 6, fontSize: 18, fontWeight: 700 } as React.CSSProperties}>
            {x.syllablesShown ? <span>Parts: {parts.join(" · ")}</span> : null}
            {x.firstSoundShown ? <span>It starts with “{x.pronunciation.startsWith}…”</span> : null}
          </div>
        ) : null}

        {/* what happened */}
        {feedback ? (
          <ClickSpark ref={sparks} sparkColor={[GREEN, "#F2B33D"]} sparkSize={9} sparkRadius={26} sparkCount={9} sparkWidth={2.5} duration={600} easing="ease-out" disabled={reduced} style={{ alignSelf: "stretch", maxWidth: 440, margin: "0 auto", width: "100%" }}>
            <section ref={resultRef} key={`${feedback.kind}-${feedback.heard}`} className="l1-enter" role="status" style={{ display: "flex", gap: 14, alignItems: "flex-start", padding: "14px 16px", borderRadius: 20, background: "#FFFFFF", border: `2px solid ${feedback.kind === "heard-match" ? GREEN : LINE}` }}>
              <div style={{ flex: "none", width: 40, height: 40, display: "grid", placeItems: "center" }}>
                {feedback.kind === "heard-match" ? <StatusMark status="done" size={34} strokeWidth={2.4} doneColor={GREEN} strike={false} /> : <HeardBubble />}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 22, fontWeight: 800, lineHeight: 1.2 }}>{feedback.title}</div>
                <div style={{ marginTop: 4, fontSize: 17, lineHeight: 1.4, fontWeight: 600, color: INK }}>{feedback.detail}</div>
                {feedback.caveat ? <div style={{ marginTop: 6, fontSize: 14, lineHeight: 1.35, color: MUTED }}>{feedback.caveat}</div> : null}
              </div>
            </section>
          </ClickSpark>
        ) : null}
        </div>
      </main>

      {/* bottom: the microphone, or what to do next */}
      <footer style={{ padding: "12px 20px calc(env(safe-area-inset-bottom, 0px) + 14px)", borderTop: `1px solid ${LINE}`, background: "#FFFFFF" }}>
        {feedback ? (
          <div style={{ display: "grid", gap: 10 }}>
            <BigButton label={x.isLast ? "Finish" : "Continue"} onClick={x.continueToNextWord} primary />
            <div style={{ display: "flex", gap: 10 }}>
              <BigButton label="Try again" onClick={x.retryWord} grow={feedback.canConfirm ? 0.8 : 1} />
              {feedback.canConfirm ? <BigButton label="That's what I said" onClick={x.confirmHeard} grow={1.4} hint="You know best. This moves on and is noted." /> : null}
            </div>
          </div>
        ) : (
          <div>
            <p aria-live="polite" style={{ margin: "0 0 10px", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, minHeight: 26, fontSize: 16, fontWeight: 700, color: MUTED, textAlign: "center" }}>
              {x.isProcessing ? <StatusMark status="running" size={20} strokeWidth={2.4} color={GREEN} /> : null}
              {status}
            </p>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", minHeight: 76 }}>
              <button
                type="button"
                onClick={x.skipWord}
                aria-label={x.isLast ? "Skip, finish" : "Skip this word"}
                style={{ minHeight: 48, padding: "0 6px", border: 0, background: "none", color: MUTED, fontFamily: FONT, fontSize: 16, fontWeight: 700, textDecoration: "underline", opacity: x.isRecording || x.isProcessing ? 0 : 1, pointerEvents: x.isRecording || x.isProcessing ? "none" : "auto", transition: "opacity 150ms" }}
              >
                {x.isLast ? "Skip, finish" : "Skip this word"}
              </button>
              <div ref={micLevelRef} style={{ display: "grid", placeItems: "center" }}>
                <VoicePill
                  size={72}
                  shape="pill"
                  mode="toggle"
                  background={GREEN}
                  iconColor="#FFFFFF"
                  accentColor="#FFFFFF"
                  showTime={false}
                  slideToCancel={false}
                  waveform
                  sensitivity={1.5}
                  listening={x.isRecording}
                  getLevel={getLevel}
                  disabled={x.isProcessing || x.isRequestingMic}
                  ariaLabel={x.isRecording ? "Finish speaking" : "Tap to speak"}
                  onPressStart={() => void x.startRecording()}
                  onPressStop={() => void x.stopRecording()}
                />
              </div>
            </div>
          </div>
        )}
      </footer>
    </div>
  );
}

/* ---------------------------------------------------------------- small pieces */

/** A neutral "here is what I heard" mark: not a tick, not a cross, and not a loading ring. */
function HeardBubble() {
  return (
    <span aria-hidden="true" style={{ width: 34, height: 34, borderRadius: "50%", background: AMBER_SOFT, display: "grid", placeItems: "center", color: "#8A5A00" }}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 5.5h16v10H12l-4.5 4v-4H4z" />
        <path d="M8.5 10.5h.01M12 10.5h.01M15.5 10.5h.01" />
      </svg>
    </span>
  );
}

const visuallyHidden: React.CSSProperties = { position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)", whiteSpace: "nowrap" };

function IconBtn({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" aria-label={label} onClick={onClick} className="l1-press" style={{ width: 48, height: 48, flex: "none", display: "grid", placeItems: "center", borderRadius: "50%", border: `2px solid ${LINE}`, background: "#FFFFFF", color: INK }}>
      {children}
    </button>
  );
}

function RoundAction({ label, caption, active, onClick, bg, fg, ring, children }: { label: string; caption: string; active: boolean; onClick: () => void; bg: string; fg: string; ring: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "grid", justifyItems: "center", gap: 6 }}>
      <button
        type="button"
        aria-label={label}
        onClick={onClick}
        className="l1-press"
        style={{ width: "clamp(66px, 9vh, 76px)", height: "clamp(66px, 9vh, 76px)", display: "grid", placeItems: "center", borderRadius: "50%", border: 0, background: bg, color: fg, boxShadow: active ? `0 0 0 4px ${ring}55` : "0 2px 0 rgba(31,42,55,0.12)", transition: "box-shadow 160ms" }}
      >
        {children}
      </button>
      <span style={{ fontSize: 15, fontWeight: 800, color: MUTED }}>{caption}</span>
    </div>
  );
}

function Chip({ label, on, onClick }: { label: string; on: boolean; onClick: () => void }) {
  return (
    <button type="button" aria-pressed={on} onClick={onClick} className="l1-press" style={{ minHeight: 44, padding: "0 18px", borderRadius: 22, border: `2px solid ${on ? GREEN : LINE}`, background: on ? GREEN_SOFT : "#FFFFFF", color: on ? GREEN_DARK : INK, fontFamily: FONT, fontSize: 16, fontWeight: 800 }}>
      {label}
    </button>
  );
}

function BigButton({ label, onClick, primary, hint, grow = 1 }: { label: string; onClick: () => void; primary?: boolean; hint?: string; grow?: number }) {
  return (
    <button type="button" aria-label={label} title={hint} onClick={onClick} className="l1-press" style={{ flex: grow, minHeight: primary ? 58 : 52, padding: "0 12px", whiteSpace: "nowrap", borderRadius: 29, border: primary ? 0 : `2px solid ${LINE}`, background: primary ? GREEN : "#FFFFFF", color: primary ? "#FFFFFF" : INK, fontFamily: FONT, fontSize: 18, fontWeight: 800 }}>
      {label}
    </button>
  );
}
