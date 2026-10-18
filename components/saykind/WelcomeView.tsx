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
  "radial-gradient(60% 50% at 100% 0%, rgba(191,165,212,0.25), transparent 70%), radial-gradient(60% 50% at 0% 100%, rgba(246,201,176,0.25), transparent 70%)";

const HEADLINE = "Find your words. At your pace.";

export default function WelcomeView({ onStart }: { onStart: () => void }) {
  const reduced = useReducedMotion();

  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center gap-8 overflow-hidden px-6 text-center" style={{ background: "var(--cream)" }}>
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-[0.55]">
        {reduced ? (
          <div className="absolute inset-0" style={{ background: STATIC_GLOW, opacity: 1 }} />
        ) : (
          <SoftAurora
            speed={0.25}
            scale={1.5}
            brightness={0.7}
            color1="#bfa5d4"
            color2="#f6c9b0"
            bandHeight={0.5}
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

      <div className="relative flex flex-col items-center gap-8">
        {/* The logo has a white background; multiply lets the cream page show through it. */}
        <Image src="/saykind-logo.png" alt="Saykind" width={128} height={128} priority style={{ mixBlendMode: "multiply" }} />

        <Headline reduced={reduced} />

        <button
          type="button"
          onClick={onStart}
          className="min-h-[64px] min-w-[200px] rounded-full px-8 text-xl font-bold text-white transition-colors hover:brightness-110 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-deep-teal bg-deep-coral"
        >
          Start
        </button>
      </div>
    </div>
  );
}

/** The headline animates word by word. Reduced motion gets plain text with the same size, so nothing shifts. */
function Headline({ reduced }: { reduced: boolean }): ReactNode {
  const sizing =
    "text-[38px] leading-[44px] md:text-[64px] md:leading-[72px] font-bold max-w-[16ch] mx-auto";

  if (reduced) {
    return (
      <h1 className={sizing} style={{ color: "var(--plum)", fontFamily: "var(--font-display), Georgia, serif" }}>
        {HEADLINE}
      </h1>
    );
  }

  return (
    <SplitText
      text={HEADLINE}
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
      className={sizing}
      color="#2D1E2F"
    />
  );
}
