"use client";

import { useEffect, useRef, useState } from "react";
import { isEmail, printPath, reportFileName, reportToMailto, reportToText } from "@/lib/report/format";
import { makeReport } from "@/lib/report/make";
import { getReport } from "@/lib/report/store";
import type { SavedReport } from "@/lib/report/types";
import { setDoctor, useSettings } from "@/lib/saykind";
import ReportBody from "./ReportBody";

const PILL = "inline-flex min-h-16 items-center justify-center rounded-full px-8 text-center text-xl font-bold focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-deep-teal";
const PRIMARY = `${PILL} bg-deep-coral text-white`;
const SECONDARY = `${PILL} border-2 border-deep-teal bg-cream text-plum`;
const FIELD = "min-h-16 w-full rounded-[1.25rem] border-2 border-plum/[0.15] bg-white px-5 text-xl text-plum placeholder:text-muted";

type Loaded = { status: "making" } | { status: "ready"; report: SavedReport };

/**
 * The report preview. It makes (or opens) a report, shows it, and offers Email, Share, Download PDF and Copy. Making the
 * report sends only compact counts to be written up. Nothing goes to the doctor until a button here is tapped.
 */
export default function ReportSheet({ onClose, reportId }: { onClose: () => void; reportId?: string }) {
  const settings = useSettings();
  const [loaded, setLoaded] = useState<Loaded>(() => {
    const existing = reportId ? getReport(reportId) : undefined;
    return existing ? { status: "ready", report: existing } : { status: "making" };
  });
  const [includeTranscript, setIncludeTranscript] = useState(false);
  const [note, setNote] = useState("");
  const [canShare] = useState(() => typeof navigator !== "undefined" && typeof navigator.share === "function");
  const startedRef = useRef(false);
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (loaded.status !== "making" || startedRef.current) return;
    startedRef.current = true;
    void makeReport().then((report) => setLoaded({ status: "ready", report }));
  }, [loaded.status]);

  // Focus moves to the heading once, when the preview opens. The close handler is read through a ref so a parent
  // re-render never pulls focus away from the field being typed in.
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  });
  useEffect(() => {
    headingRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeRef.current();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const report = loaded.status === "ready" ? loaded.report : null;
  const hasTranscript = (report?.transcript.length ?? 0) > 0;

  const share = async () => {
    if (!report) return;
    const text = reportToText(report, includeTranscript);
    const file = new File([text], reportFileName(report), { type: "text/plain" });
    try {
      if (navigator.canShare?.({ files: [file] })) await navigator.share({ title: "Saykind practice report", files: [file] });
      else await navigator.share({ title: "Saykind practice report", text });
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) setNote("Sharing didn't work here. You can copy the report instead.");
    }
  };

  const copy = async () => {
    if (!report) return;
    try {
      await navigator.clipboard.writeText(reportToText(report, includeTranscript));
      setNote("Copied.");
    } catch {
      setNote("Couldn't copy. You can select the text on this page instead.");
    }
  };

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="report-title" className="fixed inset-0 z-[80] overflow-y-auto bg-cream font-sans text-plum">
      <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 pb-16 pt-8" style={{ paddingTop: "max(2rem, env(safe-area-inset-top))" }}>
        <header className="flex items-start justify-between gap-4">
          <div>
            <h1 id="report-title" ref={headingRef} tabIndex={-1} className="font-display text-4xl font-bold leading-tight outline-none">
              Report for my doctor
            </h1>
            <p className="mt-2 text-xl text-muted">Nothing is sent until you tap.</p>
          </div>
          <button type="button" onClick={onClose} className={SECONDARY}>
            Close
          </button>
        </header>

        {!report ? (
          <p role="status" className="rounded-[2rem] border border-plum/[0.06] bg-white p-6 text-xl shadow-[0_12px_32px_-8px_rgba(45,30,47,0.05)]">
            Putting your report together…
          </p>
        ) : (
          <>
            <ReportBody report={report} includeTranscript={includeTranscript} />

            {hasTranscript && (
              <button type="button" role="switch" aria-checked={includeTranscript} onClick={() => setIncludeTranscript((on) => !on)} className={`${SECONDARY} justify-between gap-4`}>
                <span>Include conversation transcript</span>
                <span className="text-deep-teal">{includeTranscript ? "On" : "Off"}</span>
              </button>
            )}

            <section className="space-y-4 rounded-[2rem] border border-plum/[0.06] bg-white p-6 shadow-[0_12px_32px_-8px_rgba(45,30,47,0.05)]" aria-label="Your doctor">
              <h2 className="font-display text-2xl font-bold">Your doctor</h2>
              <label className="block text-xl font-bold text-muted">
                Doctor&apos;s name
                <input className={`${FIELD} mt-2`} value={settings.doctorName} onChange={(event) => setDoctor(event.target.value, settings.doctorEmail)} placeholder="For example, Dr. Lee" autoComplete="off" />
              </label>
              <label className="block text-xl font-bold text-muted">
                Doctor&apos;s email
                <input className={`${FIELD} mt-2`} type="email" value={settings.doctorEmail} onChange={(event) => setDoctor(settings.doctorName, event.target.value)} placeholder="doctor@example.com" autoComplete="off" />
              </label>
              <p className="text-xl text-muted">Kept only on this device. Tip: tap Download PDF first, then attach it to the email.</p>
            </section>

            <div className="flex flex-col gap-3">
              <a
                className={PRIMARY}
                href={reportToMailto(report, { name: settings.doctorName, email: settings.doctorEmail })}
                aria-label={isEmail(settings.doctorEmail) ? "Email to my doctor" : "Email to my doctor (no address saved yet)"}
              >
                Email to my doctor
              </a>
              {canShare && (
                <button type="button" className={SECONDARY} onClick={() => void share()}>
                  Share
                </button>
              )}
              <a className={SECONDARY} href={printPath(report, includeTranscript)} target="_blank" rel="noopener">
                Download PDF
              </a>
              <button type="button" className={SECONDARY} onClick={() => void copy()}>
                Copy
              </button>
              <p role="status" aria-live="polite" className="min-h-7 text-xl text-muted">
                {note}
              </p>
              <p className="text-xl text-muted">Saved on this device. You can find it again in the caregiver view, and delete it there.</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
