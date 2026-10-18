import type { Metadata, Viewport } from "next";
import { Atkinson_Hyperlegible_Next, Bricolage_Grotesque } from "next/font/google";
import "./globals.css";

// Self-hosted by Next at build time (no runtime request to Google). Atkinson Hyperlegible Next is built for legibility and is used for all body text.
const body = Atkinson_Hyperlegible_Next({
  variable: "--font-ui",
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
  // Next has no fallback metrics for this font, so it cannot size a stand-in. Layout shift is measured in the README.
  adjustFontFallback: false,
});

// Bricolage Grotesque for headings. A variable font, so one file covers the weights used on screen.
const display = Bricolage_Grotesque({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["600", "700"],
  display: "swap",
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
