import type { ObjectId } from "@/lib/saykind/items";

/**
 * TEMPORARY flat illustrations for the Level 1 objects: solid colours, no gradients or shadows, one consistent style.
 * The UI team can replace them: LearnItem.art can also point at any image (see lib/saykind/items.ts).
 */
export default function ObjectArt({ id }: { id: ObjectId }) {
  return (
    <svg viewBox="0 0 320 320" width="100%" height="100%" focusable="false" aria-hidden="true" style={{ display: "block" }}>
      <ellipse cx="160" cy="286" rx={id === "hat" ? 128 : 104} ry="12" fill="#000" opacity="0.08" />
      {id === "chair" && <Chair />}
      {id === "cookie" && <Cookie />}
      {id === "mug" && <Mug />}
      {id === "hat" && <Hat />}
      {id === "table" && <Table />}
      {id === "lamp" && <Lamp />}
    </svg>
  );
}

const WOOD = "#C98B4E";
const WOOD_DARK = "#A56B33";

function Chair() {
  return (
    <g>
      <rect x="96" y="40" width="16" height="140" rx="6" fill={WOOD_DARK} />
      <rect x="208" y="40" width="16" height="140" rx="6" fill={WOOD_DARK} />
      <rect x="96" y="40" width="128" height="30" rx="10" fill={WOOD} />
      <rect x="108" y="92" width="104" height="14" rx="6" fill={WOOD} />
      <rect x="108" y="122" width="104" height="14" rx="6" fill={WOOD} />
      <path d="M78 176H242L258 206H62Z" fill="#E1A86A" />
      <rect x="62" y="204" width="196" height="20" rx="6" fill={WOOD} />
      <rect x="70" y="222" width="16" height="58" rx="6" fill={WOOD_DARK} />
      <rect x="234" y="222" width="16" height="58" rx="6" fill={WOOD_DARK} />
      <rect x="104" y="224" width="12" height="46" rx="5" fill={WOOD_DARK} opacity="0.7" />
      <rect x="204" y="224" width="12" height="46" rx="5" fill={WOOD_DARK} opacity="0.7" />
    </g>
  );
}

function Cookie() {
  return (
    <g>
      <ellipse cx="160" cy="262" rx="120" ry="20" fill="#E4EAE7" />
      <circle cx="160" cy="170" r="104" fill="#D9A15B" />
      <circle cx="160" cy="170" r="104" fill="none" stroke="#B87F3C" strokeWidth="6" />
      {[
        [118, 130, 14],
        [196, 118, 12],
        [226, 178, 15],
        [150, 196, 13],
        [100, 192, 11],
        [190, 226, 12],
        [164, 150, 10],
        [232, 130, 9],
      ].map(([x, y, r], i) => (
        <circle key={i} cx={x} cy={y} r={r} fill="#5A3A22" />
      ))}
    </g>
  );
}

function Mug() {
  return (
    <g>
      <path d="M226 118C286 108 292 206 224 214" stroke="#2E8B68" strokeWidth="22" strokeLinecap="round" fill="none" />
      <path d="M92 90H228V232C228 252 210 264 160 264C110 264 92 252 92 232Z" fill="#3FA67F" />
      <ellipse cx="160" cy="90" rx="68" ry="18" fill="#2E8B68" />
      <ellipse cx="160" cy="92" rx="56" ry="12" fill="#6B3F24" />
      <rect x="100" y="150" width="120" height="14" fill="#FFFFFF" opacity="0.9" />
    </g>
  );
}

function Hat() {
  return (
    <g>
      <ellipse cx="160" cy="218" rx="136" ry="36" fill="#B9742F" />
      <path d="M98 214C92 150 108 98 144 84C158 78 172 80 184 86C208 98 226 134 224 214C198 232 124 232 98 214Z" fill="#D98A3D" />
      <path d="M99 204C130 224 194 224 223 204L224 176C196 198 128 198 98 176Z" fill="#3D2B1F" />
      <path d="M140 86C150 98 170 98 184 86" stroke="#B9742F" strokeWidth="6" strokeLinecap="round" fill="none" />
    </g>
  );
}

function Table() {
  return (
    <g>
      <rect x="146" y="150" width="28" height="112" fill="#7A5A3A" />
      <ellipse cx="160" cy="268" rx="76" ry="12" fill="#5C4329" />
      <ellipse cx="160" cy="146" rx="128" ry="34" fill="#A56B33" />
      <ellipse cx="160" cy="132" rx="128" ry="34" fill="#D9A066" />
      <path d="M70 128C110 116 150 114 190 118" stroke="#B9824A" strokeWidth="4" strokeLinecap="round" fill="none" />
    </g>
  );
}

function Lamp() {
  return (
    <g>
      <ellipse cx="160" cy="270" rx="64" ry="12" fill="#4A5560" />
      <rect x="150" y="150" width="20" height="120" rx="6" fill="#5B6770" />
      <path d="M96 150L124 52H196L224 150Z" fill="#F2C14E" />
      <path d="M96 150L124 52H160V150Z" fill="#F7D57E" />
      <rect x="92" y="146" width="136" height="12" rx="6" fill="#D9A52F" />
    </g>
  );
}

/** A camera lens, for Level 2. */
export function LensArt() {
  return (
    <svg viewBox="0 0 320 320" width="100%" height="100%" focusable="false" aria-hidden="true" style={{ display: "block" }}>
      <circle cx="160" cy="160" r="116" fill="#44505C" />
      <circle cx="160" cy="160" r="92" fill="#1B2430" />
      <circle cx="160" cy="160" r="70" fill="#1F7A5A" />
      <circle cx="160" cy="160" r="34" fill="#17614A" />
      <circle cx="132" cy="128" r="16" fill="#FFFFFF" opacity="0.55" />
    </svg>
  );
}
