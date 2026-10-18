import { NextResponse } from "next/server";
import { failure, guard } from "@/lib/server/guard";
import { speech, type VoiceStyle } from "@/lib/server/openai";

// Hosted functions are cut off after this many seconds (the provider call itself times out at 45 s).
export const maxDuration = 60;

/**
 * Short lines are said again and again (the greeting, practice words, "No, thank you"), so the audio for each
 * is kept in memory after the first request. That makes repeats instant and means they never cost twice.
 */
const CACHE_MAX_BYTES = 24 * 1024 * 1024;
const cache = new Map<string, ArrayBuffer>();
let cacheBytes = 0;

function remember(key: string, audio: ArrayBuffer) {
  cache.set(key, audio);
  cacheBytes += audio.byteLength;
  for (const [oldest, value] of cache) {
    if (cacheBytes <= CACHE_MAX_BYTES) break;
    cache.delete(oldest);
    cacheBytes -= value.byteLength;
  }
}

/** Text in, spoken audio (mp3) out. `style: "word"` is the clear single-word voice used for practice. */
export async function POST(request: Request) {
  const blocked = guard(request);
  if (blocked) return blocked;

  try {
    const body = (await request.json()) as { text?: unknown; style?: unknown };
    const text = typeof body.text === "string" ? body.text.replace(/\s+/g, " ").trim().slice(0, 500) : "";
    if (!text) return NextResponse.json({ error: "bad_request" }, { status: 400 });
    const style: VoiceStyle = body.style === "word" ? "word" : "barista";

    const key = `${style}:${text}`;
    const hit = cache.get(key);
    if (hit) return new Response(hit, { headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-store" } });

    const upstream = await speech(text, style);
    const audio = await upstream.arrayBuffer();
    remember(key, audio);
    return new Response(audio, {
      headers: { "Content-Type": upstream.headers.get("content-type") ?? "audio/mpeg", "Cache-Control": "no-store" },
    });
  } catch (error) {
    return failure(error);
  }
}
