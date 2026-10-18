import type { ReactNode } from "react";

/**
 * Flat illustrations for the menu and the picture choices, drawn to sit
 * comfortably next to the café artwork. Every one is 96 × 96 and decorative:
 * the written word is always shown beside it.
 */

const CERAMIC = "#FFFBF3";
const CERAMIC_SHADE = "#E9D6BA";
const PLATE = "#F4E6CE";
const PLATE_SHADE = "#DCC5A2";
const FOAM = "#FBEBD3";
const CREAM = "#C98F5E";

function Svg({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="9 9 78 78" className="size-full" aria-hidden="true" focusable="false">
      {children}
    </svg>
  );
}

/* ----------------------------- hot drinks (mug) ---------------------------- */

function Saucer() {
  return (
    <>
      <ellipse cx="48" cy="83" rx="33" ry="6" fill={PLATE_SHADE} />
      <ellipse cx="48" cy="81" rx="33" ry="6" fill={PLATE} />
    </>
  );
}

function MugBody({ liquid, ring }: { liquid: string; ring?: string }) {
  return (
    <>
      {/* handle */}
      <path d="M67 45h4.5a8.5 8.5 0 0 1 0 17H66" fill="none" stroke={CERAMIC_SHADE} strokeWidth="6" strokeLinecap="round" />
      <path d="M67 45h4.5a8.5 8.5 0 0 1 0 17H66" fill="none" stroke={CERAMIC} strokeWidth="3.4" strokeLinecap="round" />
      {/* body */}
      <path d="M23 38h46v20a22 22 0 0 1-22 22h-2a22 22 0 0 1-22-22z" fill={CERAMIC} />
      <path d="M57 38h12v20a22 22 0 0 1-22 22h-2c4-6 12-9 12-22z" fill={CERAMIC_SHADE} opacity=".7" />
      {/* rim and drink */}
      <ellipse cx="46" cy="38" rx="23" ry="6.5" fill={CERAMIC_SHADE} />
      <ellipse cx="46" cy="38.6" rx="20" ry="4.8" fill={liquid} />
      {ring && <ellipse cx="46" cy="38.6" rx="16.5" ry="3.4" fill="none" stroke={ring} strokeWidth="1.4" opacity=".9" />}
    </>
  );
}

function Mug({ liquid, ring, children }: { liquid: string; ring?: string; children?: ReactNode }) {
  return (
    <Svg>
      <Saucer />
      <MugBody liquid={liquid} ring={ring} />
      {children}
    </Svg>
  );
}

function Steam({ y = 24 }: { y?: number }) {
  return (
    <g fill="none" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" opacity=".85">
      <path d={`M38 ${y + 8}c-5-5 4-8-1-14`} />
      <path d={`M50 ${y + 10}c-5-6 4-9-1-16`} />
      <path d={`M62 ${y + 8}c-5-5 4-8-1-14`} />
    </g>
  );
}

/** A tiny latte-art heart, squashed to sit on the drink's surface. */
function Heart({ color, x = 46, y = 38.6 }: { color: string; x?: number; y?: number }) {
  return (
    <path
      d="M0 4C-6 0-4-4-1.500-4 0-4 0-3 0-2.600 0-3 0-4 1.500-4 4-4 6 0 0 4z"
      transform={`translate(${x} ${y}) scale(1.800 .75)`}
      fill={color}
    />
  );
}

function Espresso() {
  return (
    <Svg>
      <Saucer />
      <g transform="translate(48 81) scale(.74) translate(-48 -81)">
        <MugBody liquid="#3A1C0E" ring="#B9793F" />
      </g>
    </Svg>
  );
}

const Americano = () => (
  <Mug liquid="#3E1F10" ring="#A4693A">
    <Steam y={22} />
  </Mug>
);

const Latte = () => (
  <Mug liquid={CREAM}>
    <ellipse cx="46" cy="38.4" rx="15" ry="3.4" fill={FOAM} />
    <Heart color="#D9B287" />
  </Mug>
);

const Cappuccino = () => (
  <Mug liquid={CREAM}>
    <path d="M26 38c-2-11 10-17 20-17s22 6 20 17c-7 4-33 4-40 0z" fill={FOAM} />
    <path d="M26 38c7 4 33 4 40 0l.200-3c-8 4-32 4-40.200 0z" fill="#EBD3AF" />
    <g fill="#8A4F2A">
      <circle cx="40" cy="30" r="1.1" />
      <circle cx="47" cy="27" r="1.1" />
      <circle cx="54" cy="31" r="1.1" />
      <circle cx="46" cy="33" r="1.1" />
    </g>
  </Mug>
);

const Mocha = () => (
  <Mug liquid="#5C301B">
    <path d="M30 36c-2-5 4-8 9-8 1-6 8-9 14-6 5 1 9 5 7 9 4 1 6 4 3 6-6 3-27 3-33-1z" fill="#FFFFFF" />
    <path d="M32 36c6 2 25 2 31 0l.400 1.200c-6 3-26 3-32 0z" fill="#EFE2CE" />
    <path d="M36 31c8 3 16 3 24 0M38 27c6 2 12 2 18 0" fill="none" stroke="#5C301B" strokeWidth="2" strokeLinecap="round" />
  </Mug>
);

const MatchaLatte = () => (
  <Mug liquid="#8DB254">
    <ellipse cx="46" cy="38.2" rx="15" ry="3.4" fill="#B5D17C" />
    <Heart color="#E3F0C0" />
  </Mug>
);

const ChaiLatte = () => (
  <Mug liquid="#C88B55">
    <ellipse cx="46" cy="38.4" rx="14" ry="3" fill="#E8C79B" />
    <g>
      <rect x="40" y="14" width="7" height="32" rx="3.500" transform="rotate(26 43 30)" fill="#8B4A24" />
      <ellipse cx="33" cy="14.500" rx="3" ry="3.200" fill="#B26A3A" />
      
    </g>
    <g fill="#E9B15C" opacity=".95">
      <path d="M55 33.500l1.200 2.400 2.600.3-1.900 1.800.5 2.600-2.400-1.300-2.300 1.300.4-2.600-1.900-1.800 2.600-.3z" />
    </g>
  </Mug>
);

const Cocoa = () => (
  <Mug liquid="#5A2D1A">
    <g fill="#FFFFFF">
      <rect x="31" y="28.500" width="11" height="10" rx="3.500" transform="rotate(-8 36 33)" />
      <rect x="42" y="25.500" width="11" height="11" rx="3.500" transform="rotate(6 47 31)" />
      <rect x="53" y="29" width="10" height="9.500" rx="3.500" transform="rotate(-4 58 33)" />
    </g>
    <g fill="#F1E3CF">
      <rect x="31" y="34.500" width="11" height="4" rx="2" transform="rotate(-8 36 36)" />
      <rect x="42" y="32" width="11" height="4.500" rx="2" transform="rotate(6 47 34)" />
      <rect x="53" y="34.500" width="10" height="4" rx="2" />
    </g>
    <Steam y={10} />
  </Mug>
);

const HotTea = () => (
  <Mug liquid="#D4872F" ring="#E9A650">
    <path d="M30 36c-4-4-6-8-5-13" fill="none" stroke="#8E5B34" strokeWidth="1.400" strokeLinecap="round" />
    <rect x="19" y="14" width="11" height="11" rx="2" fill="#D6403A" transform="rotate(-8 24 19)" />
    <rect x="21.500" y="17" width="6" height="2" rx="1" fill="#FFF1E6" transform="rotate(-8 24 19)" />
    <Steam y={16} />
  </Mug>
);

/* ------------------------------ cold drinks (glass) ------------------------ */

function Glass({ liquid, top = 34, children }: { liquid: string; top?: number; children?: ReactNode }) {
  return (
    <Svg>
      <ellipse cx="48" cy="86" rx="22" ry="4" fill={PLATE_SHADE} opacity=".7" />
      {/* straw (behind) */}
      <path d="M58 6L50 66" stroke="#C9302C" strokeWidth="5" strokeLinecap="round" />
      <path d="M58 6L50 66" stroke="#FFFFFF" strokeWidth="1.600" strokeDasharray="4 6" strokeLinecap="round" />
      {/* empty glass */}
      <path d="M28 18h40l-4.500 63a4 4 0 0 1-4 3.600H36.500a4 4 0 0 1-4-3.600z" fill="#FFFFFF" opacity=".55" />
      {/* drink */}
      <clipPath id={`glass-${top}`}>
        <path d="M28 18h40l-4.500 63a4 4 0 0 1-4 3.600H36.500a4 4 0 0 1-4-3.600z" />
      </clipPath>
      <g clipPath={`url(#glass-${top})`}>
        <rect x="24" y={top} width="48" height="60" fill={liquid} />
        <rect x="24" y={top} width="48" height="4" fill="#FFFFFF" opacity=".28" />
        {children}
      </g>
      {/* sheen */}
      <path d="M34 24l3 52" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" opacity=".5" />
      <path d="M28 18h40" stroke={CERAMIC_SHADE} strokeWidth="2.400" strokeLinecap="round" />
    </Svg>
  );
}

function Ice({ y = 32 }: { y?: number }) {
  return (
    <g fill="#FFFFFF" opacity=".62">
      <rect x="35" y={y} width="15" height="15" rx="3.500" transform={`rotate(-12 42 ${y + 7})`} />
      <rect x="49" y={y + 5} width="15" height="15" rx="3.500" transform={`rotate(10 56 ${y + 12})`} />
      <rect x="39" y={y + 17} width="14" height="14" rx="3.500" transform={`rotate(6 46 ${y + 24})`} />
    </g>
  );
}

const ColdBrew = () => (
  <Glass liquid="#3A1D10" top={30}>
    <Ice y={32} />
    <path d="M30 56c8-6 14 4 22-2s12 2 16-2v34H30z" fill="#6A3D24" opacity=".55" />
  </Glass>
);

function IcedTea() {
  return (
    <Svg>
      <ellipse cx="48" cy="86" rx="22" ry="4" fill={PLATE_SHADE} opacity=".7" />
      <path d="M58 6L50 66" stroke="#C9302C" strokeWidth="5" strokeLinecap="round" />
      <path d="M58 6L50 66" stroke="#FFFFFF" strokeWidth="1.600" strokeDasharray="4 6" strokeLinecap="round" />
      <path d="M28 18h40l-4.500 63a4 4 0 0 1-4 3.600H36.500a4 4 0 0 1-4-3.600z" fill="#FFFFFF" opacity=".55" />
      <clipPath id="tea-glass">
        <path d="M28 18h40l-4.500 63a4 4 0 0 1-4 3.600H36.500a4 4 0 0 1-4-3.600z" />
      </clipPath>
      <g clipPath="url(#tea-glass)">
        <rect x="24" y="30" width="48" height="60" fill="#D4872F" />
        <rect x="24" y="30" width="48" height="4" fill="#FFFFFF" opacity=".28" />
        <Ice y={32} />
      </g>
      <path d="M34 24l3 52" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" opacity=".5" />
      <path d="M28 18h40" stroke={CERAMIC_SHADE} strokeWidth="2.400" strokeLinecap="round" />
      {/* lemon on the rim */}
      <circle cx="68" cy="22" r="11" fill="#F6D548" />
      <circle cx="68" cy="22" r="8.500" fill="#FBEB8A" />
      <path d="M68 13.500v17M59.500 22h17M62 16l12 12M74 16L62 28" stroke="#F6D548" strokeWidth="1.300" />
    </Svg>
  );
}

/* ---------------------------- pastries (on a plate) ------------------------ */

function Plate({ children }: { children: ReactNode }) {
  return (
    <Svg>
      <ellipse cx="48" cy="80" rx="38" ry="9" fill={PLATE_SHADE} />
      <ellipse cx="48" cy="77.500" rx="38" ry="9" fill={PLATE} />
      <ellipse cx="48" cy="77.500" rx="28" ry="5.500" fill="none" stroke={PLATE_SHADE} strokeWidth="1.200" opacity=".7" />
      {children}
    </Svg>
  );
}

const Croissant = () => {
  const segments: [number, number, number, number, number][] = [
    [22, 64, 8, 6, -55],
    [31, 53, 10, 8, -35],
    [48, 47, 13, 10, 0],
    [65, 53, 10, 8, 35],
    [74, 64, 8, 6, 55],
  ];
  return (
    <Plate>
      <g transform="translate(0 -1)">
        {segments.map(([cx, cy, rx, ry, rot], i) => (
          <ellipse key={`s${i}`} cx={cx} cy={cy + 2.500} rx={rx} ry={ry} transform={`rotate(${rot} ${cx} ${cy})`} fill="#B9701E" />
        ))}
        {segments.map(([cx, cy, rx, ry, rot], i) => (
          <ellipse key={i} cx={cx} cy={cy} rx={rx} ry={ry} transform={`rotate(${rot} ${cx} ${cy})`} fill="#E8A53E" />
        ))}
        {segments.map(([cx, cy, rx, ry, rot], i) => (
          <ellipse key={`h${i}`} cx={cx - 1.500} cy={cy - 3} rx={rx * 0.55} ry={ry * 0.3} transform={`rotate(${rot} ${cx} ${cy})`} fill="#F5C76A" opacity=".85" />
        ))}
      </g>
    </Plate>
  );
};

const Muffin = () => (
  <Plate>
    <path d="M30 56h36l-4.500 21h-27z" fill="#E4CB9C" />
    <path d="M36 56l1.500 21M44 56l.5 21M52 56l-.5 21M60 56l-1.500 21" stroke="#C9AB75" strokeWidth="1.500" />
    <path d="M24 58c-5-20 11-30 24-30s29 10 24 30z" fill="#C88A46" />
    <path d="M24 58c-1-4-1.500-8-.5-11 8 8 40 8 49 0 1 3 .5 7-.500 11z" fill="#B0702F" opacity=".7" />
    <g fill="#3A4A92">
      <circle cx="38" cy="42" r="3" />
      <circle cx="52" cy="36" r="3" />
      <circle cx="60" cy="48" r="2.800" />
      <circle cx="45" cy="50" r="2.600" />
    </g>
    <g fill="#F1CE8E" opacity=".9">
      <circle cx="33" cy="50" r="1.100" />
      <circle cx="57" cy="40" r="1.100" />
      <circle cx="47" cy="42" r="1.100" />
      <circle cx="64" cy="53" r="1.100" />
    </g>
  </Plate>
);

const Cookie = () => (
  <Plate>
    <ellipse cx="48" cy="62" rx="30" ry="22" fill="#A8692F" />
    <ellipse cx="48" cy="58" rx="30" ry="22" fill="#D39A57" />
    <ellipse cx="48" cy="58" rx="24" ry="17" fill="#DDA865" />
    <g fill="#4A2917">
      <path d="M32 54l5-2 2 5-5 2z" />
      <path d="M50 44l6-1 1 5-6 2z" />
      <path d="M60 58l6 0 0 5-6 1z" />
      <path d="M40 66l5-1 1 5-5 1z" />
      <path d="M52 56l5 1-1 5-5-1z" />
      <path d="M68 50l4 2-2 4-4-2z" />
      <path d="M28 62l4 1-1 4-4-1z" />
    </g>
  </Plate>
);

const Danish = () => (
  <Plate>
    <rect x="20" y="40" width="56" height="36" rx="10" fill="#B9701E" transform="skewX(-6) translate(6 3)" />
    <rect x="20" y="36" width="56" height="36" rx="10" fill="#E8B05C" transform="skewX(-6) translate(6 0)" />
    <rect x="28" y="42" width="40" height="24" rx="7" fill="#F4D08A" transform="skewX(-6) translate(6 0)" />
    <circle cx="48" cy="54" r="7" fill="#B83240" />
    <circle cx="46" cy="52" r="2.200" fill="#E0707B" />
    <path d="M26 46l8-3 8 3 8-3 8 3 8-3" fill="none" stroke="#FFFFFF" strokeWidth="2.600" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M26 62l8-3 8 3 8-3 8 3 8-3" fill="none" stroke="#FFFFFF" strokeWidth="2.600" strokeLinecap="round" strokeLinejoin="round" />
  </Plate>
);

/* ------------------------------- sizes and more ---------------------------- */

function TakeawayCup({ height }: { height: number }) {
  const top = 84 - height;
  const topHalf = 17 + height * 0.06;
  const bottomHalf = topHalf - 4.500;
  const band1 = top + height * 0.34;
  const band2 = top + height * 0.66;
  return (
    <Svg>
      <ellipse cx="48" cy="86" rx="24" ry="3.500" fill={PLATE_SHADE} opacity=".7" />
      <path d={`M${48 - topHalf} ${top}h${topHalf * 2}l-4.500 ${height}h-${topHalf * 2 - 9}z`} fill={CERAMIC} />
      <clipPath id={`cup-${height}`}>
        <path d={`M${48 - topHalf} ${top}h${topHalf * 2}l-4.500 ${height}h-${topHalf * 2 - 9}z`} />
      </clipPath>
      <g clipPath={`url(#cup-${height})`}>
        <rect x="20" y={band1} width="56" height={(band2 - band1) * 0.9} fill="#B01F28" />
        <rect x={48 + bottomHalf * 0.4} y={top} width="20" height={height} fill="#E9D6BA" opacity=".55" />
      </g>
      <rect x={48 - topHalf - 2.500} y={top - 6} width={topHalf * 2 + 5} height="7" rx="3.200" fill="#3B2218" />
      <rect x={48 - topHalf + 3} y={top - 9.500} width={topHalf * 2 - 6} height="5" rx="2.400" fill="#4E2F22" />
    </Svg>
  );
}

const Small = () => <TakeawayCup height={36} />;
const Medium = () => <TakeawayCup height={50} />;
const Large = () => <TakeawayCup height={64} />;

const Hot = () => (
  <Mug liquid="#B4532B">
    <ellipse cx="46" cy="38.200" rx="14" ry="3" fill="#D98A5C" />
    <Steam y={12} />
  </Mug>
);

const Iced = () => (
  <Glass liquid="#BFE2F0" top={28}>
    <Ice y={30} />
    <g fill="none" stroke="#FFFFFF" strokeWidth="1.600" strokeLinecap="round" opacity=".8">
      <path d="M40 66l6 4M44 62l2 6M56 66l-6 4" />
    </g>
  </Glass>
);

const None = () => (
  <Svg>
    <circle cx="48" cy="48" r="28" fill="none" stroke="#9A7560" strokeWidth="7" />
    <path d="M28 68L68 28" stroke="#9A7560" strokeWidth="7" strokeLinecap="round" />
  </Svg>
);

const ART: Record<string, () => ReactNode> = {
  espresso: Espresso,
  americano: Americano,
  latte: Latte,
  cappuccino: Cappuccino,
  mocha: Mocha,
  "cold-brew": ColdBrew,
  "matcha-latte": MatchaLatte,
  "chai-latte": ChaiLatte,
  cocoa: Cocoa,
  "iced-tea": IcedTea,
  "hot-tea": HotTea,
  croissant: Croissant,
  muffin: Muffin,
  cookie: Cookie,
  danish: Danish,
  small: Small,
  medium: Medium,
  large: Large,
  hot: Hot,
  iced: Iced,
  none: None,
};

/** The picture for a menu item or choice id. Fills the box you give it. */
export default function Art({ id }: { id: string }) {
  const Component = ART[id];
  return Component ? <>{Component()}</> : null;
}
