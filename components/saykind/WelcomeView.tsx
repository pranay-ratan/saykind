"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import type { ReactNode } from "react";
import { useReducedMotion } from "@/lib/use-presence";
import SplitText from "@/components/reactbits/SplitText";

// WebGL background: loaded only in the browser, never rendered on the server.
const SoftAurora = dynamic(() => import("@/components/reactbits/SoftAurora"), { ssr: false });

/** Still version of the aurora for people who prefer reduced motion: a lavender glow top right, a peach glow bottom left. */
const STATIC_GLOW =
  "radial-gradient(75% 65% at 100% 0%, rgba(191,165,212,0.5), transparent 70%), radial-gradient(75% 65% at 0% 100%, rgba(246,201,176,0.5), transparent 70%)";

const TAGLINE = "Find your words. At your pace.";
/** How present the aurora is at the start: it fills the whole screen behind the logo, the tagline and Start. */
const AURORA_OPACITY = 0.75;
/** The PNG is 1280 x 1276, so the box keeps that ratio (a mismatched box makes Next warn about the image). */
const LOGO_WIDTH = 168;
const LOGO_HEIGHT = 167;
/** Two lines of the tagline at its largest size, reserved up front so nothing moves when the font arrives. */
const TAGLINE_MIN_HEIGHT = 104;

/**
 * The first screen: three equal rows. The logo sits in the vertical middle; the tagline and Start sit in the lower third,
 * inside the safe area. Nothing else is said here.
 */
export default function WelcomeView({ onStart }: { onStart: () => void }) {
  const reduced = useReducedMotion();

  return (
    <div className="relative h-full w-full overflow-hidden" style={{ background: "var(--cream)" }}>
      <div aria-hidden="true" className="pointer-events-none absolute inset-0" style={{ opacity: AURORA_OPACITY }}>
        {reduced ? (
          <div className="absolute inset-0" style={{ background: STATIC_GLOW }} />
        ) : (
          <SoftAurora
            speed={0.25}
            scale={2.2}
            brightness={0.85}
            color1="#bfa5d4"
            color2="#f6c9b0"
            bandHeight={0.8}
            bandSpread={1}
            enableMouseInteraction={false}
            mouseInfluence={0}
            spectrum={0}
            colorSpeed={0.3}
            noiseFrequency={1.5}
            noiseAmplitude={0.6}
            clickPulse={false}
            lightMode={true}
          />
        )}
      </div>

      <div
        className="relative grid h-full w-full grid-rows-3"
        style={{ paddingTop: "env(safe-area-inset-top, 0px)", paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <div />
        <div className="flex items-center justify-center">
          {/* The logo has a white background; multiply lets the cream page and the glow show through it. */}
          <Image src="/saykind-logo.png" alt="Saykind" width={LOGO_WIDTH} height={LOGO_HEIGHT} priority style={{ mixBlendMode: "multiply" }} />
        </div>
        <div className="flex flex-col items-center justify-center gap-7 px-6 pb-4">
          <div className="flex w-full items-center justify-center" style={{ minHeight: TAGLINE_MIN_HEIGHT }}>
            <Tagline reduced={reduced} />
          </div>
          <button
            type="button"
            onClick={onStart}
            className="min-h-[64px] min-w-[200px] rounded-full bg-deep-coral px-8 text-xl font-bold text-white transition-colors hover:brightness-110 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-deep-teal"
          >
            Start
          </button>
        </div>
      </div>
    </div>
  );
}

const TAGLINE_CLASS = "font-display font-bold text-[clamp(32px,9cqw,44px)] leading-[1.15] max-w-[16ch] mx-auto";

/** The tagline animates word by word. Reduced motion gets plain text with the same size, so nothing shifts. */
function Tagline({ reduced }: { reduced: boolean }): ReactNode {
  if (reduced) {
    return (
      <h1 className={`${TAGLINE_CLASS} text-center`} style={{ color: "var(--plum)" }}>
        {TAGLINE}
      </h1>
    );
  }

  return (
    <SplitText
      text={TAGLINE}
      tag="h1"
      splitType="words"
      delay={150}
      duration={0.9}
      ease="power2.out"
      from={{ opacity: 0, y: 16 }}
      to={{ opacity: 1, y: 0 }}
      threshold={0.1}
      rootMargin="0px"
      textAlign="center"
      trigger="load"
      className={TAGLINE_CLASS}
      color="#2D1E2F"
    />
  );
}
