import "server-only";

/**
 * Server-only access to the speech and language provider (OpenAI).
 *
 * The API key is read from the environment here and nowhere else. Nothing in
 * this file is ever bundled into the browser (see the `server-only` import).
 */

export type ProviderErrorCode = "not_configured" | "auth" | "rate_limit" | "bad_request" | "upstream";

export class ProviderError extends Error {
  constructor(
    public code: ProviderErrorCode,
    message: string,
    public httpStatus: number,
  ) {
    super(message);
  }
}

const DEFAULTS = {
  baseUrl: "https://api.openai.com/v1",
  // Models are configurable because providers retire them. See README.
  sttModel: "gpt-4o-mini-transcribe",
  chatModel: "gpt-4o-mini",
  ttsModel: "gpt-4o-mini-tts",
  ttsVoice: "cedar",
};

export function providerConfig() {
  return {
    apiKey: process.env.OPENAI_API_KEY?.trim() ?? "",
    baseUrl: (process.env.OPENAI_BASE_URL?.trim() || DEFAULTS.baseUrl).replace(/\/$/, ""),
    sttModel: process.env.OPENAI_STT_MODEL?.trim() || DEFAULTS.sttModel,
    chatModel: process.env.OPENAI_CHAT_MODEL?.trim() || DEFAULTS.chatModel,
    ttsModel: process.env.OPENAI_TTS_MODEL?.trim() || DEFAULTS.ttsModel,
    ttsVoice: process.env.OPENAI_TTS_VOICE?.trim() || DEFAULTS.ttsVoice,
  };
}

export function missingConfig(): string[] {
  return providerConfig().apiKey ? [] : ["OPENAI_API_KEY"];
}

async function request(path: string, init: RequestInit): Promise<Response> {
  const config = providerConfig();
  if (!config.apiKey) {
    throw new ProviderError("not_configured", "OPENAI_API_KEY is not set.", 503);
  }

  let response: Response;
  try {
    response = await fetch(`${config.baseUrl}${path}`, {
      ...init,
      headers: { ...init.headers, Authorization: `Bearer ${config.apiKey}` },
      signal: AbortSignal.timeout(45_000),
    });
  } catch (error) {
    console.error(`[provider] ${path} request failed:`, error instanceof Error ? error.message : error);
    throw new ProviderError("upstream", "The voice service could not be reached.", 502);
  }

  if (response.ok) return response;

  // Log the provider's explanation for the developer; never forward it to the browser.
  const detail = await response.text().catch(() => "");
  console.error(`[provider] ${path} -> ${response.status}: ${detail.slice(0, 500)}`);

  if (response.status === 401 || response.status === 403) {
    throw new ProviderError("auth", "The voice service rejected the API key.", 502);
  }
  if (response.status === 429) {
    throw new ProviderError("rate_limit", "The voice service is busy.", 429);
  }
  if (response.status === 400 || response.status === 404) {
    throw new ProviderError("bad_request", "The voice service rejected the request (check model names).", 502);
  }
  throw new ProviderError("upstream", "The voice service had a problem.", 502);
}

/** Speech to text. */
export async function transcribe(audio: Blob, filename: string, vocabularyHint: string): Promise<string> {
  const config = providerConfig();
  const body = new FormData();
  body.append("file", audio, filename);
  body.append("model", config.sttModel);
  body.append("language", "en");
  body.append("response_format", "json");
  body.append("temperature", "0");
  body.append("prompt", vocabularyHint);

  const response = await request("/audio/transcriptions", { method: "POST", body });
  const data = (await response.json()) as { text?: unknown };
  return typeof data.text === "string" ? data.text.trim() : "";
}

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

/** A chat completion constrained to a JSON schema. Returns the parsed object. */
export async function chatJson(messages: ChatMessage[], schemaName: string, schema: object): Promise<unknown> {
  const config = providerConfig();
  const response = await request("/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: config.chatModel,
      messages,
      response_format: {
        type: "json_schema",
        json_schema: { name: schemaName, strict: true, schema },
      },
      max_completion_tokens: 500,
    }),
  });
  const data = (await response.json()) as { choices?: { message?: { content?: unknown } }[] };
  const content = data.choices?.[0]?.message?.content;
  if (typeof content !== "string") {
    throw new ProviderError("upstream", "The language model returned nothing.", 502);
  }
  try {
    return JSON.parse(content);
  } catch {
    throw new ProviderError("upstream", "The language model returned something unreadable.", 502);
  }
}

const VOICE_STYLES = {
  barista:
    "Voice: a warm, friendly, relaxed café barista. Pace: slow and clear, with natural short pauses between sentences. " +
    "Tone: kind, calm and encouraging. Never hurried, never patronizing.",
  // For practice words: one clean, unhurried model of the word, with nothing added to it.
  word:
    "Say exactly the given word or short phrase, once, in clear standard American English. Pace: calm and unhurried, " +
    "every sound distinct, a gentle natural tone. Do not add anything and do not change the words.",
} as const;

export type VoiceStyle = keyof typeof VOICE_STYLES;

/** Text to speech. Returns the provider's audio response (mp3). */
export async function speech(text: string, style: VoiceStyle = "barista"): Promise<Response> {
  const config = providerConfig();
  return request("/audio/speech", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: config.ttsModel,
      voice: config.ttsVoice,
      input: text,
      instructions: VOICE_STYLES[style],
      response_format: "mp3",
    }),
  });
}
