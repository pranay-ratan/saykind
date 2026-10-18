import Image from "next/image";

/*
 * Mouth shapes, drawn in the barista PNG's own pixel space (850 x 1850) so they
 * sit exactly on his painted smile. The upper edge of every shape IS his existing
 * mouth line; only the lower jaw drops. Level 0 (closed) draws nothing, so the
 * original artwork shows untouched. Which level shows is set from audio loudness
 * by lib/lip-sync.ts (data-mouth on the root), never by React.
 */
const MOUTH_UPPER = "M436 806C452 814 470 821 490 821.5S514 820 521 816";
const MOUTH_LEVELS = [
  { level: 1, open: 8, teeth: false },
  { level: 2, open: 18, teeth: true },
  { level: 3, open: 28, teeth: true },
] as const;

function BaristaMouth() {
  return (
    <svg
      className="barista-mouth"
      viewBox="0 0 850 1850"
      preserveAspectRatio="none"
      aria-hidden="true"
      data-barista-mouth=""
      data-mouth="0"
    >
      {MOUTH_LEVELS.map(({ level, open, teeth }) => {
        const lower = `M521 816C510 ${822 + open} 462 ${826 + open} 436 806`;
        const lens = `${MOUTH_UPPER}C510 ${822 + open} 462 ${826 + open} 436 806Z`;
        return (
          <g key={level} data-level={level}>
            <clipPath id={`mouth-clip-${level}`}>
              <path d={lens} />
            </clipPath>
            <path d={lens} fill="#240b05" />
            <g clipPath={`url(#mouth-clip-${level})`}>
              <ellipse cx="484" cy={822 + open * 0.85} rx="22" ry={Math.max(3, open * 0.34)} fill="#8f3328" />
              {teeth && <path d={MOUTH_UPPER} fill="none" stroke="#efe0c8" strokeWidth="5" />}
            </g>
            <path d={MOUTH_UPPER} fill="none" stroke="#1a0803" strokeWidth="2.2" strokeLinecap="round" />
            <path d={lower} fill="none" stroke="#b96039" strokeWidth="4" strokeLinecap="round" />
            <path d={lower} fill="none" stroke="#7a3a22" strokeWidth="1.2" strokeLinecap="round" transform="translate(0 3)" opacity=".7" />
          </g>
        );
      })}
    </svg>
  );
}

/**
 * The illustrated café.
 *
 * Everything lives in a 390 × 844 "stage" (the original mobile composition) and
 * every layer is positioned in percentages of it, so proportions never drift
 * between phones, tablets and desktop. Placement was measured against
 * full-scene-reference.png, which is intentionally NOT rendered here.
 *
 * Layers, back to front:
 *   1. cafe-background.png  – static
 *   2. barista-male.png     – the only animated layer (see .barista-bob)
 *   3. cafe-background.png  – static, clipped to the register so it sits in
 *                              front of the barista, as in the original artwork
 */
export default function CafeScene() {
  return (
    <div
      className="scene"
      role="img"
      aria-label="An illustrated café counter. A friendly barista in a red apron smiles, ready to take your order."
    >
      <div className="scene-stage">
        <div className="scene-layer scene-bg">
          <Image
            src="/images/cafe-background.png"
            alt=""
            fill
            preload
            quality={90}
            sizes="(min-width: 768px) 60vh, 110vw"
            className="select-none"
            draggable={false}
          />
        </div>

        <div className="scene-layer scene-barista">
          <div className="barista-bob">
            <Image
              src="/images/barista-male.png"
              alt=""
              fill
              preload
              quality={90}
              sizes="(min-width: 768px) 32vh, 60vw"
              className="select-none"
              draggable={false}
            />
            <BaristaMouth />
          </div>
        </div>

        <div className="scene-layer scene-bg scene-register" aria-hidden="true">
          <Image
            src="/images/cafe-background.png"
            alt=""
            fill
            quality={90}
            sizes="(min-width: 768px) 60vh, 110vw"
            className="select-none"
            draggable={false}
          />
        </div>
      </div>
    </div>
  );
}
