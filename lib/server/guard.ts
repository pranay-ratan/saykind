import "server-only";

import { NextResponse } from "next/server";
import { ProviderError } from "./openai";
import { keysNeededFor, resolveProvider, type Capability } from "./providers";
import { VoiceError } from "./voice/elevenlabs";
import { LlmError } from "./llm/claude";

/**
 * Spending protection, so a shared link can't be used to run up the provider bill. Three layers, all in memory
 * per server instance (enough for a prototype), all tunable from the environment:
 *
 *   per minute, per visitor   RATE_LIMIT_PER_MINUTE  (default 90: far above any real conversation)
 *   per day, per visitor      DAILY_LIMIT_PER_CLIENT (default 600)
 *   per hour, whole app       HOURLY_LIMIT_GLOBAL    (default 2000)
 *
 * Only requests that reach the provider are counted: practice words are ready-made files and never come here.
 * Behind a host or proxy that sets x-forwarded-for the visitor is told apart by address; locally everyone is one visitor.
 */
const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const number = (name: string, fallback: number) => {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
};

const limits = () => ({
  perMinute: number("RATE_LIMIT_PER_MINUTE", 90),
  perDay: number("DAILY_LIMIT_PER_CLIENT", 600),
  perHourGlobal: number("HOURLY_LIMIT_GLOBAL", 2000),
});

const visitors = new Map<string, number[]>();
let global: number[] = [];

function clientKey(request: Request): string {
  // On Vercel, x-vercel-forwarded-for is set by the platform and can't be spoofed by the visitor.
  const headers = request.headers;
  return (
    headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip")?.trim() ||
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "local"
  );
}

/**
 * Returns a response to send back instead of handling the request, or null to continue.
 * A capability with no usable key answers 503 with the names of the keys it needs (never values).
 */
export function guard(request: Request, capability: Capability): NextResponse | null {
  if (resolveProvider(capability, process.env) === "none") {
    return NextResponse.json({ error: "not_configured", missing: keysNeededFor(capability) }, { status: 503 });
  }

  const max = limits();
  const now = Date.now();

  global = global.filter((time) => now - time < HOUR);
  if (global.length >= max.perHourGlobal) {
    return NextResponse.json({ error: "busy" }, { status: 429, headers: { "Retry-After": "600" } });
  }

  const key = clientKey(request);
  const today = (visitors.get(key) ?? []).filter((time) => now - time < DAY);
  if (today.length >= max.perDay) {
    return NextResponse.json({ error: "daily_limit" }, { status: 429, headers: { "Retry-After": "3600" } });
  }
  if (today.filter((time) => now - time < MINUTE).length >= max.perMinute) {
    return NextResponse.json({ error: "rate_limit" }, { status: 429, headers: { "Retry-After": "30" } });
  }

  today.push(now);
  visitors.set(key, today);
  global.push(now);

  if (visitors.size > 2000) {
    for (const [existing, times] of visitors) {
      if (times.every((time) => now - time >= DAY)) visitors.delete(existing);
    }
  }
  return null;
}

/** Maps any failure to a safe response. Details were already logged server-side. */
export function failure(error: unknown): NextResponse {
  if (error instanceof ProviderError) {
    return NextResponse.json({ error: error.code }, { status: error.httpStatus });
  }
  if (error instanceof VoiceError) {
    return NextResponse.json({ error: error.code }, { status: error.httpStatus });
  }
  if (error instanceof LlmError) {
    const status = error.code === "rate_limit" ? 429 : 502;
    return NextResponse.json({ error: error.code }, { status });
  }
  console.error("[api] unexpected error:", error instanceof Error ? error.message : error);
  return NextResponse.json({ error: "upstream" }, { status: 500 });
}
