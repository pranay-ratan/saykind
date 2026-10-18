import { NextResponse } from "next/server";
import { z } from "zod";
import { adaptRequest } from "../../../src/core/adaptive/claude";
import { MAX_LEVEL, MIN_LEVEL, type AdaptRequest } from "../../../src/core/adaptive/types";

const MAX_EVENTS = 10;
const MAX_WORD_CHARS = 60;

const AttemptSchema = z.object({
  word: z.string().min(1).max(MAX_WORD_CHARS),
  level: z.number().int().min(MIN_LEVEL).max(MAX_LEVEL),
  replays: z.number().int().min(0).max(100),
  slowPlays: z.number().int().min(0).max(100),
  hintUsed: z.boolean(),
  attempts: z.number().int().min(0).max(100),
  transcript: z.string().max(MAX_WORD_CHARS).optional(),
  closeness: z.number().min(0).max(1),
  sttConfidence: z.number().min(0).max(1).optional(),
  abandoned: z.boolean(),
});

const RequestSchema = z.object({
  recent: z.array(AttemptSchema).max(MAX_EVENTS),
  currentLevel: z.number().int().min(MIN_LEVEL).max(MAX_LEVEL),
});

/** POST {recent, currentLevel} -> {decision, source}. Only the text and numbers listed in the schema are read; extra fields are dropped. */
export async function POST(request: Request): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Send the recent attempts as JSON." }, { status: 400 });
  }

  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "The attempt summary was not in the expected shape." }, { status: 400 });
  }

  const payload: AdaptRequest = parsed.data;
  const result = await adaptRequest(payload, process.env);
  return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
}
