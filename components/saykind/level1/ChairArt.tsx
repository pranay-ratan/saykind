/**
 * The chair, redrawn for the redesign: a simple wooden chair with a green seat cushion. Flat colour, two tones of wood, a
 * little detail (slats, rungs, a curved top rail) and no gradients or glow. Decorative: the word is always written beside it.
 */
export default function ChairArt() {
  const OAK = "#C98B4E";
  const OAK_LIGHT = "#DDA866";
  const OAK_DARK = "#9C6733";
  const CUSHION = "#2F9A74";
  const CUSHION_LIGHT = "#49B28B";
  return (
    <svg viewBox="0 0 320 320" width="100%" height="100%" focusable="false" aria-hidden="true" style={{ display: "block" }}>
      {/* ground shadow */}
      <ellipse cx="160" cy="286" rx="104" ry="11" fill="#1F2A37" opacity="0.1" />

      {/* back legs, in shade */}
      <rect x="104" y="186" width="13" height="92" rx="6" fill={OAK_DARK} />
      <rect x="203" y="186" width="13" height="92" rx="6" fill={OAK_DARK} />

      {/* backrest posts */}
      <path d="M99 190 L105 46 Q106 36 116 36 L124 36 Q133 36 132.5 46 L127 190 Z" fill={OAK} />
      <path d="M221 190 L215 46 Q214 36 204 36 L196 36 Q187 36 187.5 46 L193 190 Z" fill={OAK} />
      {/* curved top rail */}
      <path d="M100 52 Q160 30 220 52 L220 84 Q160 64 100 84 Z" fill={OAK_LIGHT} />
      <path d="M104 60 Q160 41 216 60" stroke="#FFFFFF" strokeOpacity="0.35" strokeWidth="4" strokeLinecap="round" fill="none" />
      {/* slats */}
      {[136, 154, 172].map((x) => (
        <rect key={x} x={x} y="88" width="12" height="82" rx="5" fill={OAK_LIGHT} />
      ))}

      {/* seat: frame, then cushion */}
      <rect x="84" y="196" width="152" height="20" rx="7" fill={OAK_DARK} />
      <rect x="74" y="168" width="172" height="36" rx="15" fill={CUSHION} />
      <rect x="82" y="173" width="156" height="9" rx="4.5" fill={CUSHION_LIGHT} opacity="0.85" />

      {/* front legs, slightly tapered */}
      <path d="M90 212 H112 L108 276 Q108 283 101 283 Q94 283 94 276 Z" fill={OAK} />
      <path d="M208 212 H230 L226 276 Q226 283 219 283 Q212 283 212 276 Z" fill={OAK} />
      <path d="M96 222 L98.5 268" stroke="#FFFFFF" strokeOpacity="0.28" strokeWidth="3" strokeLinecap="round" />
      <path d="M214 222 L216.5 268" stroke="#FFFFFF" strokeOpacity="0.28" strokeWidth="3" strokeLinecap="round" />

      {/* rungs */}
      <rect x="104" y="246" width="112" height="9" rx="4.5" fill={OAK_DARK} />
    </svg>
  );
}
