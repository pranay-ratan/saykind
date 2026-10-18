"use client";

import dynamic from "next/dynamic";

/**
 * The app is rendered in the browser only: it measures the screen, uses the microphone and plays sound, so
 * there is nothing useful to pre-render on the server. The page background is already the app's night colour.
 */
const SaykindApp = dynamic(() => import("./SaykindApp"), { ssr: false });

export default function Entry() {
  return <SaykindApp />;
}
