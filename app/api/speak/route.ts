import { NextResponse } from "next/server";
import { failure, guard } from "@/lib/server/guard";
import type { VoiceStyle } from "@/lib/server/openai";
import { synthesize } from "@/lib/server/voice/speak";

// Hosted functions are cut off after this many seconds (the provider call itself times out at 45 s).
export const maxDuration = 60;

/** Text in, spoken audio (mp3) out. `style: "word"` is the clear single-word voice used for practice. */
export async function POST(request: Request) {
  const blocked = guard(request, "speak");
  if (blocked) return blocked;

  try {
    const body = (await request.json()) as { text?: unknown; style?: unknown };
    const text = typeof body.text === "string" ? body.text.replace(/\s+/g, " ").trim().slice(0, 500) : "";
    if (!text) return NextResponse.json({ error: "bad_request" }, { status: 400 });
    const style: VoiceStyle = body.style === "word" ? "word" : "barista";

    const audio = await synthesize(text, style, process.env);
    return new Response(audio, { headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-store" } });
  } catch (error) {
    return failure(error);
  }
}
