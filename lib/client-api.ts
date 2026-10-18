import type { HistoryItem, Order, Slot } from "./order";
import type { ChoiceSlot } from "./support";
import type { RecordedAudio } from "./use-audio-recorder";

/** Browser-side calls to our own API routes. No keys, no provider details. */

export class ApiError extends Error {
  constructor(
    public code: string,
    public status: number,
  ) {
    super(`${code} (${status})`);
  }
}

/** A short, honest sentence for the person, for any failure. */
export function describeApiError(error: unknown): string {
  const code = error instanceof ApiError ? error.code : "network";
  switch (code) {
    case "not_configured":
      return "The voice service isn't set up yet. The site owner can find what it needs in docs/SETUP.md.";
    case "auth":
      return "The voice service rejected its key. The site owner can check it in docs/SETUP.md.";
    case "elevenlabs_permission":
      return "The ElevenLabs key is missing Text to Speech / Speech to Text permission. The site owner can check it in docs/SETUP.md.";
    case "out_of_credits":
      return "The spoken-voice account is out of credits, so the device voice is being used for now.";
    case "voice_unavailable":
      return "That voice isn't available on this ElevenLabs plan, so the device voice is being used. The site owner can set ELEVENLABS_VOICE_ID to a premade voice.";
    case "credits_guard":
      return "Today's spoken-voice limit has been reached, so the device voice is being used for now.";
    case "bad_request":
      return "The voice service didn't accept a request. Please check the model names in .env.local.";
    case "rate_limit":
      return "The voice service is busy. Please wait a moment, then try again.";
    case "daily_limit":
      return "That's the limit for practice today. Please come back tomorrow.";
    case "busy":
      return "Lots of people are practicing right now. Please try again in a few minutes.";
    case "too_large":
      return "That was too long to send in one go. Please try again with a shorter turn.";
    case "network":
      return "Couldn't reach the server. Please check your connection and try again.";
    default:
      return "Something went wrong on our side. Please try again.";
  }
}

async function readError(response: Response): Promise<ApiError> {
  let code = "upstream";
  try {
    const data = (await response.json()) as { error?: unknown };
    if (typeof data.error === "string") code = data.error;
  } catch {
    // keep the generic code
  }
  if (response.status === 413) code = "too_large"; // the host itself refused an over-size upload
  return new ApiError(code, response.status);
}

async function call(input: string, init: RequestInit): Promise<Response> {
  let response: Response;
  try {
    response = await fetch(input, init);
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new ApiError("network", 0);
  }
  if (!response.ok) throw await readError(response);
  return response;
}

export async function fetchStatus(signal?: AbortSignal): Promise<{ configured: boolean; missing: string[] }> {
  const response = await call("/api/status", { cache: "no-store", signal });
  return response.json();
}

/** Sends the recording for transcription. Called only when the person finishes their turn. */
export async function transcribe(audio: RecordedAudio, signal?: AbortSignal): Promise<string> {
  const form = new FormData();
  form.append("audio", audio.blob, "speech");
  const response = await call("/api/transcribe", { method: "POST", body: form, signal });
  const data = (await response.json()) as { text?: unknown };
  return typeof data.text === "string" ? data.text : "";
}

export type ConverseRequest = {
  history: HistoryItem[];
  order: Order;
  patient: { via: "speech" | "tap" | "silence"; text: string };
  tapped?: { slot: ChoiceSlot; id: string };
  unclearStreak: number;
};

export type ConverseResponse = {
  reply: string;
  order: Order;
  nextSlot: Slot;
  unclearStreak: number;
};

export async function converse(body: ConverseRequest, signal?: AbortSignal): Promise<ConverseResponse> {
  const response = await call("/api/converse", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
  return response.json();
}
