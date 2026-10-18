"use client";

import { useState } from "react";
import { deleteReport, useReports } from "@/lib/report/store";
import ReportSheet from "./ReportSheet";

const PILL = "inline-flex min-h-16 items-center justify-center rounded-full px-8 text-center text-xl font-bold focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-deep-teal";
const CARD = "rounded-[2rem] border border-plum/[0.06] bg-white p-6 shadow-[0_12px_32px_-8px_rgba(45,30,47,0.05)]";

type Sheet = { id?: string } | null;

/** "Make a report for my doctor", and the reports already saved on this device, each with Open and Delete. */
export default function ReportsPanel() {
  const reports = useReports();
  const [sheet, setSheet] = useState<Sheet>(null);

  return (
    <section aria-label="Reports for my doctor" className="space-y-4 font-sans text-plum">
      <h2 className="font-display text-3xl font-bold">Reports for my doctor</h2>
      <p className="text-xl text-muted">A short summary of recent practice. Saved only on this device. Nothing is sent until you tap.</p>
      <button type="button" className={`${PILL} bg-deep-coral text-white`} onClick={() => setSheet({})}>
        Make a report for my doctor
      </button>

      {reports.length === 0 ? (
        <p className="text-xl text-muted">No saved reports yet.</p>
      ) : (
        <ul className="space-y-3">
          {reports.map((report) => (
            <li key={report.id} className={`${CARD} flex flex-wrap items-center gap-3`}>
              <div className="min-w-40 flex-1">
                <p className="text-xl font-bold">Report, {report.input.date}</p>
                <p className="text-lg text-muted">{report.source === "ai" ? "Written by an AI" : "Written from a template"}</p>
              </div>
              <button type="button" className={`${PILL} border-2 border-deep-teal bg-cream text-plum`} onClick={() => setSheet({ id: report.id })} aria-label={`Open the report from ${report.input.date}`}>
                Open
              </button>
              <button type="button" className={`${PILL} border-2 border-deep-teal bg-cream text-plum`} onClick={() => deleteReport(report.id)} aria-label={`Delete the report from ${report.input.date}`}>
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}

      {sheet && <ReportSheet reportId={sheet.id} onClose={() => setSheet(null)} />}
    </section>
  );
}
