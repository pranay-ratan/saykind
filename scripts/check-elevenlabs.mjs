// One tiny text-to-speech call, then speech-to-text on the audio it returned. Prints PASS or FAIL for each step.
// Usage: npm run check:elevenlabs
// Reads ELEVENLABS_API_KEY (and optionally ELEVENLABS_VOICE_ID) from .env.local or the shell. Never prints the key.
// Calls only the two endpoints the app uses: text-to-speech and speech-to-text.

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const BASE = "https://api.elevenlabs.io/v1";
const DEFAULT_VOICE_ID = "JBFqnCBsd6RMkjVDRZzb";
const TTS_MODEL = "eleven_flash_v2_5";
const STT_MODEL = "scribe_v1";
const PHRASE = "Hello, thank you.";
const TIMEOUT_MS = 20_000;

function loadEnvLocal() {
  const path = resolve(process.cwd(), ".env.local");
  if (!existsSync(path)) return {};
  const values = {};
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const match = /^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*?)\s*$/.exec(line);
    if (match && !match[2].startsWith("#")) values[match[1]] = match[2].replace(/^["']|["']$/g, "");
  }
  return values;
}

/** The message for a failed status. Never includes the provider's response text, which could echo the key. */
function hintFor(status, paidPlan = false) {
  if (status === 401 || status === 403) {
    return "The key is missing Text to Speech / Speech to Text permission. Check the key's permissions in ElevenLabs.";
  }
  if (status === 402 && paidPlan) {
    return "That voice isn't available on this ElevenLabs plan. Set ELEVENLABS_VOICE_ID to a premade voice.";
  }
  if (status === 402) return "The ElevenLabs account is out of credits.";
  if (status === 429) return "ElevenLabs is busy. Wait a minute and try again.";
  return `The request failed with HTTP ${status}.`;
}

/** True when a 402 body says the voice needs a paid plan. Only the status word is read. */
async function paidPlanRequired(response) {
  if (response.status !== 402) return false;
  try {
    const data = await response.json();
    return data?.detail?.status === "paid_plan_required" || data?.detail?.code === "paid_plan_required";
  } catch {
    return false;
  }
}

function report(step, ok, detail) {
  console.log(`${ok ? "PASS" : "FAIL"}  ${step}${detail ? `: ${detail}` : ""}`);
}

async function main() {
  const env = { ...loadEnvLocal(), ...process.env };
  const apiKey = env.ELEVENLABS_API_KEY?.trim();
  if (!apiKey) {
    report("setup", false, "ELEVENLABS_API_KEY is not set. Add it to .env.local in the project root.");
    process.exit(1);
  }
  const voiceId = env.ELEVENLABS_VOICE_ID?.trim() || DEFAULT_VOICE_ID;

  let audio;
  try {
    const response = await fetch(`${BASE}/text-to-speech/${encodeURIComponent(voiceId)}?output_format=mp3_44100_128`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "audio/mpeg", "xi-api-key": apiKey },
      body: JSON.stringify({ text: PHRASE, model_id: TTS_MODEL }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) {
      report("text to speech", false, hintFor(response.status, await paidPlanRequired(response)));
      process.exit(1);
    }
    audio = Buffer.from(await response.arrayBuffer());
    report("text to speech", audio.length > 0, `${audio.length} bytes of mp3`);
    if (audio.length === 0) process.exit(1);
  } catch {
    report("text to speech", false, "Could not reach ElevenLabs. Check the connection.");
    process.exit(1);
  }

  try {
    const form = new FormData();
    form.append("file", new Blob([audio], { type: "audio/mpeg" }), "check.mp3");
    form.append("model_id", STT_MODEL);
    form.append("tag_audio_events", "false");
    const response = await fetch(`${BASE}/speech-to-text`, {
      method: "POST",
      headers: { "xi-api-key": apiKey },
      body: form,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) {
      report("speech to text", false, hintFor(response.status, await paidPlanRequired(response)));
      process.exit(1);
    }
    const data = await response.json();
    const transcript = typeof data.text === "string" ? data.text.trim() : "";
    report("speech to text", true, transcript ? `heard "${transcript}"` : "no text back (an empty result is still a working call)");
  } catch {
    report("speech to text", false, "Could not reach ElevenLabs. Check the connection.");
    process.exit(1);
  }
}

main();
