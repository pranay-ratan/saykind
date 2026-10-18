/**
 * ElevenLabs text to speech and speech to text for the café. Pure functions over fetch, so they can be tested with a
 * mocked fetch. Only these two endpoints are called; the key is passed in and never logged.
 *
 * Hard-coded defaults are used when the environment leaves them out. Nothing here calls /v1/models,
 * /v1/voices, /v1/user or any other endpoint.
 *
 * Level 2's speech lives in src/core/tts/elevenlabs.ts and is separate on purpose.
 */

export const ELEVENLABS_BASE_URL = "https://api.elevenlabs.io/v1";
export const DEFAULT_VOICE_ID = "21m00Tcm4TlvDq8ikWAM";
export const DEFAULT_TTS_MODEL = "eleven_flash_v2_5";
export const DEFAULT_STT_MODEL = "scribe_v1";
const OUTPUT_FORMAT = "mp3_44100_128";
const REQUEST_TIMEOUT_MS = 20_000;

export type VoiceErrorCode =
  | "not_configured"
  | "elevenlabs_permission"
  | "out_of_credits"
  | "rate_limit"
  | "credits_guard"
  | "network"
  | "upstream";

/** An error that is safe to show, in code form. The provider's own text is never forwarded. */
export class VoiceError extends Error {
  constructor(
    readonly code: VoiceErrorCode,
    readonly httpStatus: number,
    message: string,
  ) {
    super(message);
    this.name = "VoiceError";
  }
}

/** Maps an ElevenLabs HTTP status to a safe error. Anything that is not an error status returns null. */
export function elevenLabsStatusError(status: number): VoiceError | null {
  if (status >= 200 && status < 300) return null;
  if (status === 401 || status === 403) {
    return new VoiceError(
      "elevenlabs_permission",
      502,
      "The ElevenLabs key is missing Text to Speech / Speech to Text permission.",
    );
  }
  if (status === 402) return new VoiceError("out_of_credits", 503, "The ElevenLabs account is out of credits.");
  if (status === 429) return new VoiceError("rate_limit", 429, "ElevenLabs is busy. Please wait a moment.");
  return new VoiceError("upstream", 502, "The voice service had a problem.");
}

/** Removes parenthetical audio-event tags such as "(laughs)" and collapses spaces. Never adds words. */
export function stripAudioEventTags(text: string): string {
  return text.replace(/\([^()]*\)/g, " ").replace(/\s+/g, " ").trim();
}

async function send(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  try {
    return await fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });
  } catch {
    throw new VoiceError("network", 502, "The voice service could not be reached.");
  }
}

/** Returns mp3 bytes for `text`. */
export async function elevenLabsTextToSpeech(options: {
  apiKey: string;
  voiceId?: string;
  model?: string;
  text: string;
}): Promise<ArrayBuffer> {
  const voiceId = options.voiceId || DEFAULT_VOICE_ID;
  const url = `${ELEVENLABS_BASE_URL}/text-to-speech/${encodeURIComponent(voiceId)}?output_format=${OUTPUT_FORMAT}`;
  const response = await send(
    url,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "audio/mpeg", "xi-api-key": options.apiKey },
      body: JSON.stringify({ text: options.text, model_id: options.model || DEFAULT_TTS_MODEL }),
    },
    REQUEST_TIMEOUT_MS,
  );
  const error = elevenLabsStatusError(response.status);
  if (error) throw error;
  return response.arrayBuffer();
}

/** Returns the transcript for an audio blob. Audio-event tags are removed; no words are invented. */
export async function elevenLabsSpeechToText(options: {
  apiKey: string;
  model?: string;
  audio: Blob;
  filename: string;
}): Promise<string> {
  const form = new FormData();
  form.append("file", options.audio, options.filename);
  form.append("model_id", options.model || DEFAULT_STT_MODEL);
  form.append("tag_audio_events", "false");
  const response = await send(
    `${ELEVENLABS_BASE_URL}/speech-to-text`,
    { method: "POST", headers: { "xi-api-key": options.apiKey }, body: form },
    REQUEST_TIMEOUT_MS,
  );
  const error = elevenLabsStatusError(response.status);
  if (error) throw error;
  const data = (await response.json()) as { text?: unknown };
  return typeof data.text === "string" ? stripAudioEventTags(data.text) : "";
}

/**
 * In-memory daily character budget for synthesis. When the day's total would pass the limit, reserve() returns
 * false and the caller falls back to the device voice for that line. The counter resets at the UTC day boundary.
 */
export class DailyCharBudget {
  private day = "";
  private spent = 0;

  constructor(
    private readonly limit: number,
    private readonly now: () => Date = () => new Date(),
  ) {}

  private roll(): void {
    const today = this.now().toISOString().slice(0, 10);
    if (today !== this.day) {
      this.day = today;
      this.spent = 0;
    }
  }

  reserve(characters: number): boolean {
    this.roll();
    if (this.spent + characters > this.limit) return false;
    this.spent += characters;
    return true;
  }

  used(): number {
    this.roll();
    return this.spent;
  }
}
