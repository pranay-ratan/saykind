import { DISCLAIMER, type SavedReport } from "@/lib/report/types";

const CARD = "rounded-[2rem] border border-plum/[0.06] bg-white p-6 shadow-[0_12px_32px_-8px_rgba(45,30,47,0.05)]";

function Block({ title, lines }: { title: string; lines: readonly string[] }) {
  if (lines.length === 0) return null;
  return (
    <section className={CARD}>
      <h2 className="font-display text-2xl font-bold text-plum">{title}</h2>
      <ul className="mt-3 space-y-3 text-xl leading-relaxed text-plum">
        {lines.map((line) => (
          <li key={line} className="flex gap-3">
            <span aria-hidden="true" className="mt-3 h-2 w-2 shrink-0 rounded-full bg-deep-teal" />
            <span>{line}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** The report itself, shared by the preview and the print view. */
export default function ReportBody({ report, includeTranscript }: { report: SavedReport; includeTranscript: boolean }) {
  const { content } = report;
  return (
    <div className="space-y-5" data-report-body>
      <section className={CARD}>
        <p className="text-xl font-bold text-muted">Practice on {report.input.date}</p>
        <p className="mt-2 text-xl leading-relaxed text-plum">{content.summary}</p>
      </section>
      <Block title="Strengths" lines={content.strengths} />
      <Block title="Where support may help" lines={content.needsSupport} />
      <Block title="Observations" lines={content.observations} />
      <Block title="Suggested focus" lines={content.suggestedFocus} />
      <section className={CARD}>
        <h2 className="font-display text-2xl font-bold text-plum">Limits</h2>
        <p className="mt-3 text-xl leading-relaxed text-plum">{content.limits}</p>
        <p className="mt-4 text-xl font-bold text-plum">{DISCLAIMER}</p>
        <p className="mt-1 text-xl text-muted">{report.source === "ai" ? "Written by an AI from the counts above." : "Written from a fixed template."}</p>
      </section>
      {includeTranscript && report.transcript.length > 0 && (
        <section className={CARD} aria-label="Café conversation">
          <h2 className="font-display text-2xl font-bold text-plum">Café conversation</h2>
          <ul className="mt-3 space-y-2 text-xl text-plum">
            {report.transcript.map((turn) => (
              <li key={`${turn.ts}-${turn.who}-${turn.text}`}>
                <span className="font-bold">{turn.who === "barista" ? "Barista" : "Me"}:</span> {turn.text}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

