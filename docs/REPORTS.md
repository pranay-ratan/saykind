# Session reports for the doctor

Saved on the device, shared only when the person taps. Nothing is stored on a server and nothing is sent silently.

## What goes in

Counts and short words from the last 24 hours, taken from the practice log and the café session: the date; Level 1 and Level 2 words with tries, listens, slow listens, hints and "I said it" self-reports; the adaptive level and its care notes; the café order, turn count, follow-ups needed, Help and menu use. **Never** audio, images or recordings. The café conversation is kept apart (see below).

## How it is written

`POST /api/report` receives only that compact JSON (validated with zod, body capped at 16 KB, never logged) and asks Claude (`ANTHROPIC_API_KEY`, `CLAUDE_MODEL`) for `{summary, strengths, needsSupport, observations[], suggestedFocus[], limits}`. The reply is validated, then checked for scores, percentages and diagnostic or judging words. With no key, on any error, a rate limit, or a failed check, a fixed template (`lib/report/template.ts`) builds the report instead; the browser builds the same template if the route cannot be reached. Every report ends with the fixed line **"AI observations, not a diagnosis."**

## The preview

Opened after a café order ("See my report"), and from the caregiver view ("Make a report for my doctor"). It offers:

- **Include conversation transcript**: off by default; the café turns are included in the preview, the copy, the shared file and the PDF only when switched on.
- **Email to my doctor**: a `mailto:` link with a subject, a short body and a note to attach the file (mail links cannot carry files). Doctor name and email are set in Settings or in the preview, and stay on the device.
- **Share**: the Web Share API with a `.txt` file where the browser supports files, with text only otherwise. Hidden when the browser has no Web Share.
- **Download PDF**: a print-friendly page (`/report/print`); "Save as PDF" opens the print dialog, where PDF is a destination.
- **Copy**.

Saved reports (id and date) are listed in the caregiver view with **Open** and **Delete**. Settings > "Delete my history" removes them too.

## Not built

Server-side email (sending the report from the app without the person's mail app) is planned and **not done**. It would need an email provider, a verified sender and a record of consent.

## Tests

`lib/report/report.test.ts` (assembly, template, language rules, sharing text), `lib/server/report.test.ts` (model and fallback), `app/api/report/route.test.ts` (validation, size cap, no logging) and `tests/e2e/report.mjs` (café end, preview, transcript switch, Email, Share stub, Copy, print page, saved list and Delete, template fallback).
