import type { Metadata, Viewport } from "next";
import { DM_Sans, Nunito } from "next/font/google";
import "./globals.css";

// Self-hosted by Next at build time (no runtime request to Google). One friendly, legible sans-serif for everything.
const ui = DM_Sans({
  variable: "--font-ui",
  subsets: ["latin"],
  display: "swap",
});

// A rounded, friendly sans-serif for the redesigned Level 1 screen.
const friendly = Nunito({
  variable: "--font-friendly",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
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
  themeColor: "#FFFFFF",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${ui.variable} ${friendly.variable} h-full antialiased`}>
      <body className="h-full">{children}</body>
    </html>
  );
}
