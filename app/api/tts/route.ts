import { timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { SERVER_LIMITS } from '../../../src/config/camera';
import { createAudioCache } from '../../../src/core/tts/audioCache';
import { synthesizeSpeech } from '../../../src/core/tts/elevenlabs';
import { clampRate, isValidSpeechText, rateToElevenLabsSpeed } from '../../../src/core/tts/speed';
import { PRONUNCIATION_WORDS } from '../../../src/core/pronunciation';

/** Speeds to pre-generate: normal, and the snail speed after ElevenLabs clamping. */
const PREWARM_RATES = [1.0, 0.5] as const;
const SPEECH_TIMEOUT_MS = 12000;

const audioCache = createAudioCache({
  maxEntries: SERVER_LIMITS.speechCacheEntries,
  ttlMs: SERVER_LIMITS.speechCacheTtlMs,
});

type Env = Readonly<Record<string, string | undefined>>;
interface Credentials {
  apiKey: string;
  voiceId: string;
}

function audioResponse(audio: ArrayBuffer): NextResponse {
  return new NextResponse(audio, {
    headers: {
      'Content-Type': 'audio/mpeg',
      'Cache-Control': 'private, max-age=1800',
    },
  });
}

function jsonError(status: number, message: string): NextResponse {
  return NextResponse.json({ error: message }, { status, headers: { 'Cache-Control': 'no-store' } });
}

function elevenLabsCredentials(env: Env): Credentials | null {
  if (env.TTS_PROVIDER !== 'elevenlabs') return null;
  const apiKey = env.ELEVENLABS_API_KEY;
  const voiceId = env.ELEVENLABS_VOICE_ID;
  return apiKey && voiceId ? { apiKey, voiceId } : null;
}

function cacheKey(voiceId: string, speed: number, text: string): string {
  return `${voiceId}|${speed.toFixed(2)}|${text.trim().toLowerCase()}`;
}

/** Returns cached or fresh audio for one phrase at one rate. */
async function speechFor(credentials: Credentials, text: string, rate: number): Promise<ArrayBuffer> {
  const speed = rateToElevenLabsSpeed(rate);
  const key = cacheKey(credentials.voiceId, speed, text);
  const cached = audioCache.get(key);
  if (cached) return cached;

  const audio = await synthesizeSpeech({
    apiKey: credentials.apiKey,
    voiceId: credentials.voiceId,
    text: text.trim(),
    speed,
    signal: AbortSignal.timeout(SPEECH_TIMEOUT_MS),
  });
  audioCache.set(key, audio);
  return audio;
}

export async function POST(request: Request): Promise<NextResponse> {
  const credentials = elevenLabsCredentials(process.env);
  if (!credentials) {
    return jsonError(404, 'Spoken audio is not turned on.');
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, 'Send a word to say.');
  }

  const { text, rate } = (body ?? {}) as { text?: unknown; rate?: unknown };
  if (!isValidSpeechText(text)) {
    return jsonError(400, 'Send a short word or phrase to say.');
  }
  const requestedRate = typeof rate === 'number' && Number.isFinite(rate) ? clampRate(rate) : 1.0;

  try {
    return audioResponse(await speechFor(credentials, text, requestedRate));
  } catch (error) {
    console.error('tts failed:', error instanceof Error ? error.name : 'unknown');
    return jsonError(502, 'Trying again.');
  }
}

/**
 * GET with header x-prewarm-secret generates audio for the practice words.
 * It spends ElevenLabs credits, so it stays closed unless TTS_PREWARM_SECRET is set.
 */
export async function GET(request: Request): Promise<NextResponse> {
  const credentials = elevenLabsCredentials(process.env);
  const expectedSecret = process.env.TTS_PREWARM_SECRET;
  if (!credentials || !expectedSecret) {
    return jsonError(404, 'Not found.');
  }
  if (!matchesSecret(request.headers.get('x-prewarm-secret'), expectedSecret)) {
    return jsonError(401, 'Not allowed.');
  }

  let warmed = 0;
  let failed = 0;
  for (const word of PRONUNCIATION_WORDS) {
    for (const rate of PREWARM_RATES) {
      try {
        await speechFor(credentials, word, rate);
        warmed += 1;
      } catch {
        failed += 1;
      }
    }
  }
  return NextResponse.json({ warmed, failed }, { headers: { 'Cache-Control': 'no-store' } });
}

function matchesSecret(provided: string | null, expected: string): boolean {
  if (provided === null) return false;
  const providedBuffer = Buffer.from(provided);
  const expectedBuffer = Buffer.from(expected);
  return providedBuffer.length === expectedBuffer.length && timingSafeEqual(providedBuffer, expectedBuffer);
}
