import { afterEach, describe, expect, it, vi } from "vitest";
import { DailyCharBudget, elevenLabsSpeechToText, elevenLabsStatusError, elevenLabsTextToSpeech, stripAudioEventTags } from "./voice/elevenlabs";
import { claudeJson, extractJsonObject, LlmError, splitForClaude } from "./llm/claude";
import { baristaOutputSchema } from "./llm/barista-output";
import { keysNeededFor, providerStatus, resolveProvider } from "./providers";

/** Mocked network: every call goes through this stub, so no request leaves the test. */
function stubFetch(handler: (url: string, init: RequestInit) => Response | Promise<Response>) {
  const mock = vi.fn(async (input: string | URL | Request, init?: RequestInit) =>
    handler(String(input), init ?? {}),
  );
  vi.stubGlobal("fetch", mock);
  return mock;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("ElevenLabs status mapping", () => {
  it("names the missing permission on 401 and 403 without echoing the provider text", () => {
    expect(elevenLabsStatusError(401)?.message).toBe("The ElevenLabs key is missing Text to Speech / Speech to Text permission.");
    expect(elevenLabsStatusError(403)?.code).toBe("elevenlabs_permission");
  });

  it("reports out of credits on 402", () => {
    expect(elevenLabsStatusError(402)?.message).toBe("The ElevenLabs account is out of credits.");
  });

  it("asks the caller to back off on 429", () => {
    expect(elevenLabsStatusError(429)?.code).toBe("rate_limit");
  });

  it("returns nothing for a success status", () => {
    expect(elevenLabsStatusError(200)).toBeNull();
  });
});

describe("ElevenLabs speech to text", () => {
  it("removes audio-event tags and never adds words", async () => {
    stubFetch(() => new Response(JSON.stringify({ text: "(laughs) I would like a latte (coughs)" }), { status: 200 }));
    const text = await elevenLabsSpeechToText({ apiKey: "test-key", audio: new Blob(["x"]), filename: "a.webm" });
    expect(text).toBe("I would like a latte");
  });

  it("returns an empty transcript when the provider sends no text", async () => {
    stubFetch(() => new Response(JSON.stringify({}), { status: 200 }));
    expect(await elevenLabsSpeechToText({ apiKey: "test-key", audio: new Blob(["x"]), filename: "a.webm" })).toBe("");
  });

  it("sends the key in a header, not in the URL, and asks for no audio-event tags", async () => {
    const mock = stubFetch(() => new Response(JSON.stringify({ text: "hi" }), { status: 200 }));
    await elevenLabsSpeechToText({ apiKey: "test-key", audio: new Blob(["x"]), filename: "a.webm" });
    const [url, init] = mock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.elevenlabs.io/v1/speech-to-text");
    expect(url).not.toContain("test-key");
    expect((init.headers as Record<string, string>)["xi-api-key"]).toBe("test-key");
    expect((init.body as FormData).get("tag_audio_events")).toBe("false");
    expect((init.body as FormData).get("model_id")).toBe("scribe_v1");
  });
});

describe("ElevenLabs text to speech", () => {
  it("uses the hard-coded default voice and model when the environment leaves them out", async () => {
    const mock = stubFetch(() => new Response(new Uint8Array([1, 2, 3]), { status: 200 }));
    const audio = await elevenLabsTextToSpeech({ apiKey: "test-key", text: "Hello" });
    const [url, init] = mock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toContain("/text-to-speech/21m00Tcm4TlvDq8ikWAM");
    expect(url).toContain("output_format=mp3_44100_128");
    expect(JSON.parse(String(init.body)).model_id).toBe("eleven_flash_v2_5");
    expect(audio.byteLength).toBe(3);
  });

  it("throws the permission error on 401", async () => {
    stubFetch(() => new Response("denied", { status: 401 }));
    await expect(elevenLabsTextToSpeech({ apiKey: "bad", text: "Hi" })).rejects.toMatchObject({
      code: "elevenlabs_permission",
    });
  });
});

describe("daily character budget", () => {
  it("allows spending up to the limit and refuses past it", () => {
    const budget = new DailyCharBudget(10, () => new Date("2026-10-18T09:00:00Z"));
    expect(budget.reserve(6)).toBe(true);
    expect(budget.reserve(5)).toBe(false);
    expect(budget.used()).toBe(6);
  });

  it("resets at the next UTC day", () => {
    let now = new Date("2026-10-18T23:59:00Z");
    const budget = new DailyCharBudget(10, () => now);
    budget.reserve(10);
    now = new Date("2026-10-19T00:01:00Z");
    expect(budget.reserve(10)).toBe(true);
  });
});

describe("audio-event tags", () => {
  it("collapses the space left behind", () => {
    expect(stripAudioEventTags("Yes (laughs) please")).toBe("Yes please");
  });
});

describe("provider choice", () => {
  it("prefers ElevenLabs for speech when its key is set, even if OpenAI is set too", () => {
    expect(resolveProvider("speak", { ELEVENLABS_API_KEY: "k", OPENAI_API_KEY: "o" })).toBe("elevenlabs");
  });

  it("uses OpenAI for speech only when ElevenLabs has no key", () => {
    expect(resolveProvider("speak", { OPENAI_API_KEY: "o" })).toBe("openai");
  });

  it("uses Claude for conversation by default and OpenAI only when Claude has no key", () => {
    expect(resolveProvider("converse", { ANTHROPIC_API_KEY: "a", OPENAI_API_KEY: "o" })).toBe("claude");
    expect(resolveProvider("converse", { OPENAI_API_KEY: "o" })).toBe("openai");
  });

  it("honours an explicit provider only when its key is set", () => {
    expect(resolveProvider("transcribe", { TRANSCRIBE_PROVIDER: "openai", ELEVENLABS_API_KEY: "e" })).toBe("elevenlabs");
    expect(resolveProvider("transcribe", { TRANSCRIBE_PROVIDER: "openai", OPENAI_API_KEY: "o" })).toBe("openai");
  });

  it("returns none with no keys, and never an error", () => {
    expect(resolveProvider("speak", {})).toBe("none");
    expect(keysNeededFor("converse")).toEqual(["ANTHROPIC_API_KEY", "OPENAI_API_KEY"]);
  });

  it("status reports key names and yes or no, never a value", () => {
    const status = providerStatus({ ELEVENLABS_API_KEY: "SECRET-VALUE-123" });
    expect(JSON.stringify(status)).not.toContain("SECRET-VALUE-123");
    expect(status.keysPresent.ELEVENLABS_API_KEY).toBe(true);
    expect(status.keysPresent.OPENAI_API_KEY).toBe(false);
    expect(status.configured).toBe(false);
    expect(status.missing).toContain("ANTHROPIC_API_KEY");
  });

  it("status is configured when every capability has a provider", () => {
    const status = providerStatus({ ELEVENLABS_API_KEY: "e", ANTHROPIC_API_KEY: "a" });
    expect(status.configured).toBe(true);
    expect(status.providers).toEqual({ speak: "elevenlabs", transcribe: "elevenlabs", converse: "claude" });
  });
});

describe("Claude message shaping", () => {
  it("moves system text out and merges neighbours that share a role", () => {
    const { system, turns } = splitForClaude([
      { role: "system", content: "Be kind." },
      { role: "system", content: "Stay in the café." },
      { role: "user", content: "Hi" },
      { role: "user", content: "Coffee please" },
      { role: "assistant", content: "Hot or iced?" },
    ]);
    expect(system).toBe("Be kind.\n\nStay in the café.");
    expect(turns).toEqual([
      { role: "user", content: "Hi\nCoffee please" },
      { role: "assistant", content: "Hot or iced?" },
    ]);
  });

  it("starts with a user turn when the history opens with the barista", () => {
    const { turns } = splitForClaude([{ role: "assistant", content: "Welcome!" }]);
    expect(turns[0].role).toBe("user");
    expect(turns[1]).toEqual({ role: "assistant", content: "Welcome!" });
  });
});

describe("Claude reply parsing", () => {
  it("reads a JSON object wrapped in a code fence", () => {
    expect(extractJsonObject('```json\n{"a": 1}\n```')).toEqual({ a: 1 });
  });

  it("throws bad_output when there is no object", () => {
    expect(() => extractJsonObject("I'm sorry, no.")).toThrow(LlmError);
  });
});

describe("Claude call", () => {
  const messages = [{ role: "user" as const, content: "Hi" }];
  const reply = (text: string) =>
    new Response(
      JSON.stringify({
        id: "m",
        type: "message",
        role: "assistant",
        content: [{ type: "text", text }],
        model: "x",
        stop_reason: "end_turn",
        usage: { input_tokens: 1, output_tokens: 1 },
      }),
      { status: 200, headers: { "content-type": "application/json" } },
    );

  it("returns the validated object when the reply matches", async () => {
    stubFetch(() => reply(JSON.stringify({ reply: "Hello there" })));
    const schema = baristaOutputSchema.pick({ reply: true });
    await expect(claudeJson({ apiKey: "test", messages, schemaText: "{}", schema })).resolves.toEqual({ reply: "Hello there" });
  });

  it("sends no temperature, top_p, top_k or prefill", async () => {
    const mock = stubFetch(() => reply(JSON.stringify({ reply: "Hi" })));
    await claudeJson({ apiKey: "test", messages, schemaText: "{}", schema: baristaOutputSchema.pick({ reply: true }) });
    const body = JSON.parse(String((mock.mock.calls[0] as unknown as [string, RequestInit])[1].body));
    expect(body).not.toHaveProperty("temperature");
    expect(body).not.toHaveProperty("top_p");
    expect(body).not.toHaveProperty("top_k");
    expect(body.messages.at(-1).role).toBe("user");
  });

  it("maps a reply that does not match the schema to bad_output", async () => {
    stubFetch(() => reply(JSON.stringify({ reply: 42 })));
    await expect(
      claudeJson({ apiKey: "test", messages, schemaText: "{}", schema: baristaOutputSchema.pick({ reply: true }) }),
    ).rejects.toMatchObject({ code: "bad_output" });
  });

  it("maps a rejected key to auth", async () => {
    stubFetch(
      () =>
        new Response(JSON.stringify({ type: "error", error: { type: "authentication_error", message: "no" } }), {
          status: 401,
          headers: { "content-type": "application/json" },
        }),
    );
    await expect(
      claudeJson({ apiKey: "bad", messages, schemaText: "{}", schema: baristaOutputSchema.pick({ reply: true }) }),
    ).rejects.toMatchObject({ code: "auth" });
  });
});

describe("barista output schema", () => {
  const valid = {
    confidence: "clear",
    asks_for_help: false,
    drink: "unchanged",
    size: "unchanged",
    temperature: "unchanged",
    add_extras: [],
    remove_extras: [],
    clear_order: false,
    finish_order: false,
    next_question: "drink",
    reply: "What can I get you?",
  };

  it("accepts a well-formed reply", () => {
    expect(baristaOutputSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects a drink that is not on the menu", () => {
    expect(baristaOutputSchema.safeParse({ ...valid, drink: "unicorn-latte" }).success).toBe(false);
  });
});
