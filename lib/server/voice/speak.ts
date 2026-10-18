import "server-only";

import { speech, type VoiceStyle } from "../openai";
import { resolveProvider, type Env } from "../providers";
import { DailyCharBudget, VoiceError, elevenLabsTextToSpeech } from "./elevenlabs";

/**
 * Text to speech for the café. Short lines are kept in memory after the first request, so repeats are instant and
 * cost nothing twice. The ElevenLabs path has a daily character budget; when it is used up, the route returns a
 * clear error and the browser speaks that line instead.
 */

const CACHE_MAX_BYTES = 24 * 1024 * 1024;
const DEFAULT_DAILY_CHARACTERS = 30_000;
const cache = new Map<string, ArrayBuffer>();
let cacheBytes = 0;

let budget: DailyCharBudget | null = null;
let budgetLimit = 0;

function dailyBudget(env: Env): DailyCharBudget {
  const configured = Number(env.ELEVENLABS_MAX_CHARS_PER_DAY);
  const limit = Number.isFinite(configured) && configured > 0 ? configured : DEFAULT_DAILY_CHARACTERS;
  if (!budget || budgetLimit !== limit) {
    budget = new DailyCharBudget(limit);
    budgetLimit = limit;
  }
  return budget;
}

function remember(key: string, audio: ArrayBuffer): void {
  cache.set(key, audio);
  cacheBytes += audio.byteLength;
  for (const [oldest, value] of cache) {
    if (cacheBytes <= CACHE_MAX_BYTES) break;
    cache.delete(oldest);
    cacheBytes -= value.byteLength;
  }
}

/** Returns mp3 bytes for a line. `style` is "word" for practice words, "barista" for the café voice. */
export async function synthesize(text: string, style: VoiceStyle, env: Env): Promise<ArrayBuffer> {
  const provider = resolveProvider("speak", env);
  const key = `${provider}:${style}:${text}`;
  const hit = cache.get(key);
  if (hit) return hit;

  if (provider === "elevenlabs") {
    if (!dailyBudget(env).reserve(text.length)) {
      throw new VoiceError("credits_guard", 429, "Today's spoken-audio limit has been reached.");
    }
    const audio = await elevenLabsTextToSpeech({
      apiKey: env.ELEVENLABS_API_KEY?.trim() ?? "",
      voiceId: env.ELEVENLABS_VOICE_ID?.trim(),
      text,
    });
    remember(key, audio);
    return audio;
  }

  if (provider === "openai") {
    const upstream = await speech(text, style);
    const audio = await upstream.arrayBuffer();
    remember(key, audio);
    return audio;
  }

  throw new VoiceError("not_configured", 503, "Spoken audio is not set up.");
}
