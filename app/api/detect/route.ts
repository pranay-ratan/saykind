import { NextResponse } from 'next/server';
import { SERVER_LIMITS } from '../../../src/config/camera';
import { createFixedWindowLimiter } from '../../../src/core/http/rateLimiter';
import { DetectError, runConfirm, runDetection } from '../../../src/core/vision/runDetection';
import { parseDetectRequest } from '../../../src/core/vision/requestBody';

export const maxDuration = 60;

const ONE_MINUTE_MS = 60 * 1000;
const MAX_TRACKED_CLIENTS = 10000;
/** Base64 grows the body by about a third, so this allows the 2 MB image plus JSON overhead. */
const MAX_BODY_BYTES = Math.ceil((SERVER_LIMITS.maxImageBytes * 4) / 3) + 4096;

// In-memory on purpose: per-instance limit, reset on restart. See README-level2.md.
const limiter = createFixedWindowLimiter({
  limit: SERVER_LIMITS.detectRequestsPerMinute,
  windowMs: ONE_MINUTE_MS,
  maxKeys: MAX_TRACKED_CLIENTS,
});

function clientKey(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  return forwarded?.split(',')[0]?.trim() || 'unknown';
}

function errorResponse(status: number, message: string, headers?: Record<string, string>): NextResponse {
  return NextResponse.json({ error: message }, { status, headers: { 'Cache-Control': 'no-store', ...headers } });
}

export async function POST(request: Request): Promise<NextResponse> {
  const decision = limiter.check(clientKey(request), Date.now());
  if (!decision.allowed) {
    return errorResponse(429, 'Looking is resting for a moment. Try again shortly.', {
      'Retry-After': String(decision.retryAfterSeconds),
    });
  }

  const declaredLength = Number(request.headers.get('content-length') ?? 0);
  if (declaredLength > MAX_BODY_BYTES) {
    return errorResponse(413, 'That photo is too large. Try a smaller one.');
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse(400, 'Send a photo to look at.');
  }

  const parsed = parseDetectRequest(body);
  if (!parsed.ok) {
    return errorResponse(400, parsed.error);
  }

  try {
    // purpose "confirm": name one tapped object (its crop) with a confidence; otherwise find boxes in a frame.
    const result = parsed.value.purpose === 'confirm' ? await runConfirm(parsed.value, process.env) : await runDetection(parsed.value, process.env);
    return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    // Log the failure code only. Never log the request, the image, or provider response bodies.
    if (error instanceof DetectError) {
      console.error(`detect failed: ${error.code} (${error.status})`);
      return errorResponse(error.status, error.userMessage);
    }
    console.error('detect failed: unexpected error');
    return errorResponse(500, 'Trying again.');
  }
}
