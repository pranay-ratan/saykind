import { SERVER_LIMITS } from '../../config/camera';
import { detectWithGemini } from './gemini';
import { normalizeDetections, toRawObjects } from './normalize';
import { parseModelOutput, ModelOutputError } from './parseModelOutput';
import { detectWithPerceptron, ProviderHttpError } from './perceptron';
import type { DetectRequest } from './requestBody';
import type { DetectResponse, RawDetection, VisionProvider } from './types';

export type DetectErrorCode = 'config' | 'timeout' | 'upstream' | 'rate-limited' | 'unreadable';

export class DetectError extends Error {
  constructor(
    readonly code: DetectErrorCode,
    readonly status: number,
    readonly userMessage: string,
  ) {
    super(code);
    this.name = 'DetectError';
  }
}

type Env = Readonly<Record<string, string | undefined>>;

interface ResolvedProvider {
  provider: VisionProvider;
  call: (signal: AbortSignal, request: DetectRequest) => Promise<string>;
}

/** Picks the provider from env. Keys are read here, on the server, and never returned. */
export function resolveProvider(env: Env): ResolvedProvider {
  const name = env.VISION_PROVIDER ?? 'perceptron';

  if (name === 'perceptron') {
    const apiKey = env.PERCEPTRON_API_KEY;
    if (!apiKey) throw new DetectError('config', 500, 'Looking is not set up yet.');
    const model = env.PERCEPTRON_MODEL || 'perceptron-mk1.5';
    return {
      provider: 'perceptron',
      call: (signal, request) =>
        detectWithPerceptron({
          apiKey,
          model,
          imageDataUrl: `data:${request.mimeType};base64,${request.imageBase64}`,
          signal,
        }),
    };
  }

  if (name === 'gemini') {
    const apiKey = env.GEMINI_API_KEY;
    if (!apiKey) throw new DetectError('config', 500, 'Looking is not set up yet.');
    const model = env.GEMINI_MODEL || 'gemini-2.5-flash';
    return {
      provider: 'gemini',
      call: (signal, request) =>
        detectWithGemini({
          apiKey,
          model,
          imageBase64: request.imageBase64,
          mimeType: request.mimeType,
          signal,
        }),
    };
  }

  throw new DetectError('config', 500, 'Looking is not set up yet.');
}

/** One provider call bounded by the server timeout. Network errors and 5xx are retried by the caller. */
async function callOnce(resolved: ResolvedProvider, request: DetectRequest): Promise<string> {
  const signal = AbortSignal.timeout(SERVER_LIMITS.detectTimeoutMs);
  try {
    return await resolved.call(signal, request);
  } catch (error) {
    if (isTimeout(error, signal)) {
      throw new DetectError('timeout', 504, 'Trying again.');
    }
    if (error instanceof ProviderHttpError && error.status === 429) {
      throw new DetectError('rate-limited', 503, 'Looking is busy right now. Try again in a moment.');
    }
    throw error;
  }
}

function isTimeout(error: unknown, signal: AbortSignal): boolean {
  return signal.aborted || (error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError'));
}

function isRetryable(error: unknown): boolean {
  if (error instanceof DetectError) return error.code === 'timeout';
  if (error instanceof ProviderHttpError) return error.status >= 500;
  return error instanceof TypeError;
}

async function callWithRetry(resolved: ResolvedProvider, request: DetectRequest): Promise<string> {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await callOnce(resolved, request);
    } catch (error) {
      const canRetry = attempt < SERVER_LIMITS.detectRetries && isRetryable(error);
      if (!canRetry) throw toDetectError(error);
    }
  }
}

function toDetectError(error: unknown): DetectError {
  if (error instanceof DetectError) return error;
  return new DetectError('upstream', 502, 'Trying again.');
}

/**
 * Runs one detection: provider call, parse, normalize. The image is never
 * stored or logged, and it does not leave this function except to the provider.
 */
export async function runDetection(request: DetectRequest, env: Env): Promise<DetectResponse> {
  const resolved = resolveProvider(env);
  const startedAt = Date.now();
  const content = await callWithRetry(resolved, request);

  let rawDetections: RawDetection[];
  try {
    rawDetections = parseModelOutput(content);
  } catch (error) {
    if (error instanceof ModelOutputError) {
      throw new DetectError('unreadable', 502, 'Trying again.');
    }
    throw error;
  }

  return {
    objects: normalizeDetections(rawDetections, request.frame),
    raw: toRawObjects(rawDetections, request.frame),
    provider: resolved.provider,
    latencyMs: Date.now() - startedAt,
  };
}
