import { NextResponse } from "next/server";
import { guard } from "../../../lib/server/guard";
import { generateReport } from "../../../lib/server/report";
import { buildTemplateReport } from "../../../lib/report/template";
import { reportInputSchema } from "../../../lib/report/types";

// Hosted functions are cut off after this many seconds (the model call itself times out at 20 s).
export const maxDuration = 30;

/** The input is a few hundred bytes of counts and short words; anything much larger is not a real report. */
const MAX_BODY_CHARS = 16_000;

/**
 * POST {input} -> {content, source}. `input` is the compact report data (see lib/report/types.ts). Content is never
 * logged or stored. Without a key, when a limit is hit, or on any model error, the fixed template is returned.
 */
export async function POST(request: Request) {
  if (Number(request.headers.get("content-length") ?? 0) > MAX_BODY_CHARS) {
    return NextResponse.json({ error: "too_large" }, { status: 413 });
  }
  let text: string;
  try {
    text = await request.text();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  if (text.length > MAX_BODY_CHARS) return NextResponse.json({ error: "too_large" }, { status: 413 });

  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const parsed = reportInputSchema.safeParse((body as { input?: unknown } | null)?.input);
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  const input = parsed.data;

  // The spending guard only applies when a model call would happen.
  if (process.env.ANTHROPIC_API_KEY?.trim() && guard(request, "converse")) {
    return NextResponse.json({ content: buildTemplateReport(input), source: "template" }, { headers: { "Cache-Control": "no-store" } });
  }
  const result = await generateReport(input, process.env);
  return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
}
