import "server-only";

import { transcribe } from "../openai";
import { resolveProvider, type Env } from "../providers";
import { VoiceError, elevenLabsSpeechToText } from "./elevenlabs";

/**
 * Speech to text for the café. ElevenLabs is the default; OpenAI is used only when chosen or when it is the
 * only key set. Audio is passed through and never stored or logged here.
 */
export async function transcribeAudio(audio: Blob, filename: string, vocabularyHint: string, env: Env): Promise<string> {
  const provider = resolveProvider("transcribe", env);

  if (provider === "elevenlabs") {
    return elevenLabsSpeechToText({
      apiKey: env.ELEVENLABS_API_KEY?.trim() ?? "",
      model: env.ELEVENLABS_STT_MODEL?.trim() || undefined,
      audio,
      filename,
    });
  }

  if (provider === "openai") return transcribe(audio, filename, vocabularyHint);

  throw new VoiceError("not_configured", 503, "Speech to text is not set up.");
}
