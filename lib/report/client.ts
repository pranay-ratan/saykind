import { z } from "zod";
import { buildTemplateReport } from "./template";
import { reportContentSchema, type ReportContent, type ReportInput, type ReportSource } from "./types";

const responseSchema = z.object({ content: reportContentSchema, source: z.enum(["ai", "template"]) });
const REQUEST_TIMEOUT_MS = 30_000;

/** Asks the server to write the report. On any failure the same fixed template is built here, on the device. */
export async function requestReport(input: ReportInput): Promise<{ content: ReportContent; source: ReportSource }> {
  try {
    const response = await fetch("/api/report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ input }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!response.ok) throw new Error(`report ${response.status}`);
    const parsed = responseSchema.safeParse(await response.json());
    if (!parsed.success) throw new Error("report reply was not in the expected shape");
    return parsed.data;
  } catch {
    return { content: buildTemplateReport(input), source: "template" };
  }
}
