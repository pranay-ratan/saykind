import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";

// Self-hosted from app/fonts (SIL OFL, see app/fonts/README.md): no request to Google at build time or run time.
// Atkinson Hyperlegible Next is built for legibility and is used for all body text. One variable file covers 400 to 700.
const body = localFont({
  src: "./fonts/AtkinsonHyperlegibleNext-latin.woff2",
  weight: "400 700",
  style: "normal",
  variable: "--font-ui",
  display: "swap",
  // A metric-matched stand-in (size-adjust, ascent and descent overrides computed from the font file), so text keeps
  // its size and line height while the real font arrives: no shift on the swap.
  adjustFontFallback: "Arial",
});

// Bricolage Grotesque for headings. A variable font, so one file covers the weights used on screen.
const display = localFont({
  src: "./fonts/BricolageGrotesque-latin.woff2",
  weight: "600 700",
  style: "normal",
  variable: "--font-display",
  display: "swap",
  adjustFontFallback: "Arial",
});

export const metadata: Metadata = {
  title: "Saykind",
  description: "Saykind: a calm, untimed place to practice everyday words, then use them in a real conversation.",
  applicationName: "Saykind",
  appleWebApp: { capable: true, title: "Saykind", statusBarStyle: "black-translucent" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#FDFBF7",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${body.variable} ${display.variable} h-full antialiased`}>
      <body className="h-full">{children}</body>
    </html>
  );
}
