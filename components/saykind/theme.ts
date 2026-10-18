/**
 * TEMPORARY presentation tokens. The UI team will replace the look; the functional layer (lib/saykind) does not use any
 * of this. A small, bright, high-contrast palette (all text pairs are at least 4.5:1).
 */
export const color = {
  bg: "#FDFBF7",
  page: "#FDFBF7",
  surface: "#FFFFFF",
  surfaceStrong: "rgba(45,30,47,0.05)",
  line: "rgba(45,30,47,0.06)",
  /** Borders on controls (buttons, fields), strong enough to see. Cards use `line`. */
  control: "rgba(45,30,47,0.25)",
  ink: "#2D1E2F",
  inkSoft: "#6B5C6D",
  inkMuted: "#6B5C6D",
  primary: "#0E6967",
  primaryDark: "#0E6967",
  primarySoft: "rgba(191,165,212,0.25)",
  onPrimary: "#FFFFFF",
  accent: "#9A442D",
  accentSoft: "rgba(224,122,95,0.18)",
  danger: "#9A442D",
  dangerSoft: "rgba(224,122,95,0.18)",
} as const;

/** Body text: Atkinson Hyperlegible Next. Headings: Bricolage Grotesque (both loaded by next/font in app/layout.tsx). */
export const font = {
  ui: "var(--font-ui), system-ui, -apple-system, 'Segoe UI', sans-serif",
} as const;

/** iPhone notches and home indicators (0 everywhere else). */
export const safe = {
  top: "env(safe-area-inset-top, 0px)",
  bottom: "env(safe-area-inset-bottom, 0px)",
} as const;
