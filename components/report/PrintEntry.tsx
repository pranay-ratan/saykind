"use client";

import { useState } from "react";
import { getReport } from "@/lib/report/store";
import ReportBody from "./ReportBody";

const PILL = "inline-flex min-h-16 items-center justify-center rounded-full px-8 text-xl font-bold focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-deep-teal";

/** A clean, print-friendly page. "Save as PDF" opens the device's print dialog, where PDF is one of the choices. */
export default function PrintEntry() {
  // Rendered only in the browser (see PrintLoader), so the address and saved reports can be read straight away.
  const [state] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return { report: getReport(params.get("id") ?? "") ?? null, transcript: params.get("t") === "1" };
  });

  return (
    <main className="min-h-dvh bg-cream px-4 py-8 font-sans text-plum">
      <div className="mx-auto max-w-2xl space-y-6">
        <h1 className="font-display text-4xl font-bold">Saykind practice report</h1>
        {state.report ? (
          <>
            <div className="print:hidden">
              <button type="button" className={`${PILL} bg-deep-coral text-white`} onClick={() => window.print()}>
                Save as PDF
              </button>
              <p className="mt-2 text-xl text-muted">In the print window, choose &quot;Save as PDF&quot; as the destination.</p>
            </div>
            <ReportBody report={state.report} includeTranscript={state.transcript} />
          </>
        ) : (
          <p className="text-xl">That report is not on this device any more.</p>
        )}
      </div>
    </main>
  );
}
