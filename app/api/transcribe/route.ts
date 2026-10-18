import { NextResponse } from "next/server";
import { failure, guard } from "@/lib/server/guard";
import { transcribeAudio } from "@/lib/server/voice/transcribe";

// Hosted functions are cut off after this many seconds (the provider call itself times out at 45 s).
export const maxDuration = 60;

const MAX_BYTES = 4 * 1024 * 1024; // hosts like Vercel refuse request bodies over ~4.5 MB; the provider's own limit is 25 MB
const MIN_BYTES = 1_500; // anything smaller is just a click, not speech

const EXTENSIONS: Record<string, string> = {
  "audio/webm": "webm",
  "audio/mp4": "mp4",
  "audio/ogg": "ogg",
  "audio/wav": "wav",
  "audio/mpeg": "mp3",
};

// Helps the OpenAI recogniser with menu words without telling it what the person said. ElevenLabs takes no prompt.
const VOCABULARY_HINT =
  "A customer ordering at a café. The speaker may have a speech or language difficulty: transcribe exactly what is said, " +
  "including partial words, and never guess. Menu words: espresso, americano, latte, cappuccino, mocha, cold brew, " +
  "matcha latte, chai latte, cocoa, iced tea, hot tea, croissant, muffin, cookie, danish, small, medium, large, hot, iced, " +
  "coffee, tea, water, please, thank you.";

/**
 * Receives the recording only when the person taps to finish their turn, sends it to the speech-to-text provider,
 * and returns the text. The audio is never stored or logged. Silence or a fragment returns an empty or partial text.
 */
export async function POST(request: Request) {
  const blocked = guard(request, "transcribe");
  if (blocked) return blocked;

  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > MAX_BYTES + 100_000) return NextResponse.json({ error: "too_large" }, { status: 413 });

  try {
    const form = await request.formData();
    const audio = form.get("audio");
    if (!(audio instanceof Blob)) return NextResponse.json({ error: "bad_request" }, { status: 400 });
    if (audio.size > MAX_BYTES) return NextResponse.json({ error: "too_large" }, { status: 413 });
    if (audio.size < MIN_BYTES) return NextResponse.json({ text: "" });

    const type = audio.type.split(";")[0].trim().toLowerCase();
    const text = await transcribeAudio(audio, `speech.${EXTENSIONS[type] ?? "webm"}`, VOCABULARY_HINT, process.env);
    return NextResponse.json({ text }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return failure(error);
  }
}
