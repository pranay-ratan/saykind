/**
 * TEMPORARY presentation tokens. The UI team will replace the look; the functional layer (lib/saykind) does not use any
 * of this. A small, bright, high-contrast palette (all text pairs are at least 4.5:1).
 */
export const color = {
  bg: "#FFFFFF",
  page: "#F4F7F6",
  surface: "#F1F5F3",
  surfaceStrong: "#E4ECE8",
  line: "#D5DED9",
  ink: "#1B2430",
  inkSoft: "#44505C",
  inkMuted: "#66727E",
  primary: "#1F7A5A",
  primaryDark: "#17614A",
  primarySoft: "#E3F2EC",
  onPrimary: "#FFFFFF",
  accent: "#B4530F",
  accentSoft: "#FDEFE0",
  danger: "#B3261E",
  dangerSoft: "#FBEAE8",
} as const;

/** One friendly sans-serif (DM Sans, loaded by next/font in app/layout.tsx). */
export const font = {
  ui: "var(--font-ui), system-ui, -apple-system, 'Segoe UI', sans-serif",
} as const;

/** iPhone notches and home indicators (0 everywhere else). */
export const safe = {
  top: "env(safe-area-inset-top, 0px)",
  bottom: "env(safe-area-inset-bottom, 0px)",
} as const;
