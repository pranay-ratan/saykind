import { SERVER_LIMITS } from '../../config/camera';
import { detectWithGemini } from './gemini';
import { normalizeDetections, toRawObjects } from './normalize';
import { hasBoxMarkup, parseBoxAnnotations } from './parseAnnotations';
import { parseModelOutput, ModelOutputError } from './parseModelOutput';
import { detectWithPerceptron, isModelRejected, ProviderHttpError, type PerceptronMode } from './perceptron';
import type { DetectRequest } from './requestBody';
import type { DetectPurpose, DetectResponse, RawDetection, VisionProvider } from './types';

export type DetectErrorCode = 'config' | 'timeout' | 'upstream' | 'rate-limited' | 'unreadable';

/** The only Perceptron model on the API today (perceptron-mk1 also exists; the Isaac models are retired). */
export const DEFAULT_PERCEPTRON_MODEL = 'perceptron-mk1.5';

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
  /** The model asked for first. */
  model: string;
  /** Used instead when the API says `model` does not exist. The same name when there is no second choice. */
  fallbackModel: string;
  mode: PerceptronMode;
  call: (signal: AbortSignal, request: DetectRequest, model: string) => Promise<string>;
}

/** Model names the API refused (404 model_not_found) in this process. They are never asked for again. */
const rejectedModels = new Set<string>();

export function rejectedModelNames(): readonly string[] {
  return [...rejectedModels];
}

/** For tests. */
export function forgetRejectedModels(): void {
  rejectedModels.clear();
}

/**
 * Two model slots: PERCEPTRON_MODEL_LIVE for the camera loop and PERCEPTRON_MODEL_CONFIRM for a tapped object. Each
 * falls back to PERCEPTRON_MODEL (default perceptron-mk1.5) when unset or when the API rejected its name.
 */
export function perceptronModels(env: Env, purpose: DetectPurpose): { model: string; fallbackModel: string } {
  const base = env.PERCEPTRON_MODEL || DEFAULT_PERCEPTRON_MODEL;
  const wanted = (purpose === 'confirm' ? env.PERCEPTRON_MODEL_CONFIRM : env.PERCEPTRON_MODEL_LIVE) || base;
  return { model: rejectedModels.has(wanted) ? base : wanted, fallbackModel: base };
}

/** The live loop uses native boxes (fast) unless PERCEPTRON_BOX_MODE=json; a confirm call always wants a confidence. */
export function perceptronMode(env: Env, purpose: DetectPurpose): PerceptronMode {
  if (purpose === 'confirm') return 'json';
  return env.PERCEPTRON_BOX_MODE === 'json' ? 'json' : 'box';
}

/** Picks the provider from env. Keys are read here, on the server, and never returned. */
export function resolveProvider(env: Env, purpose: DetectPurpose = 'live'): ResolvedProvider {
  const name = env.VISION_PROVIDER ?? 'perceptron';

  if (name === 'perceptron') {
    const apiKey = env.PERCEPTRON_API_KEY;
    if (!apiKey) throw new DetectError('config', 500, 'Looking is not set up yet.');
    const { model, fallbackModel } = perceptronModels(env, purpose);
    const mode = perceptronMode(env, purpose);
    return {
      provider: 'perceptron',
      model,
      fallbackModel,
      mode,
      call: (signal, request, chosenModel) =>
        detectWithPerceptron({
          apiKey,
          model: chosenModel,
          mode,
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
      model,
      fallbackModel: model,
      mode: 'json',
      call: (signal, request, chosenModel) =>
        detectWithGemini({
          apiKey,
          model: chosenModel,
          imageBase64: request.imageBase64,
          mimeType: request.mimeType,
          signal,
        }),
    };
  }

  throw new DetectError('config', 500, 'Looking is not set up yet.');
}

/** One provider call bounded by the server timeout. Network errors and 5xx are retried by the caller. */
async function callOnce(resolved: ResolvedProvider, request: DetectRequest, model: string): Promise<string> {
  const signal = AbortSignal.timeout(SERVER_LIMITS.detectTimeoutMs);
  try {
    return await resolved.call(signal, request, model);
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

/**
 * Calls the provider, retrying timeouts and 5xx once. A rejected model name is remembered and the call is repeated
 * with the fallback model straight away (that repeat does not count as a retry). Returns the reply and the model used.
 */
async function callWithRetry(resolved: ResolvedProvider, request: DetectRequest): Promise<{ content: string; model: string }> {
  let model = resolved.model;
  for (let attempt = 0; ; attempt += 1) {
    try {
      return { content: await callOnce(resolved, request, model), model };
    } catch (error) {
      if (isModelRejected(error) && model !== resolved.fallbackModel) {
        rejectedModels.add(model);
        console.error(`detect: model ${model} was rejected; using ${resolved.fallbackModel}`);
        model = resolved.fallbackModel;
        attempt -= 1;
        continue;
      }
      const canRetry = attempt < SERVER_LIMITS.detectRetries && isRetryable(error);
      if (!canRetry) throw toDetectError(error);
    }
  }
}

function toDetectError(error: unknown): DetectError {
  if (error instanceof DetectError) return error;
  return new DetectError('upstream', 502, 'Trying again.');
}

/** Box mode reads the native markup; a reply with no markup at all is tried as JSON, and plain prose means nothing seen. */
function parseReply(content: string, mode: PerceptronMode): RawDetection[] {
  if (mode === 'box') {
    if (hasBoxMarkup(content)) return parseBoxAnnotations(content);
    try {
      return parseModelOutput(content);
    } catch (error) {
      if (error instanceof ModelOutputError) return [];
      throw error;
    }
  }
  try {
    return parseModelOutput(content);
  } catch (error) {
    if (error instanceof ModelOutputError) throw new DetectError('unreadable', 502, 'Trying again.');
    throw error;
  }
}

/**
 * Runs one detection: provider call, parse, normalize. The image is never
 * stored or logged, and it does not leave this function except to the provider.
 */
export async function runDetection(request: DetectRequest, env: Env): Promise<DetectResponse> {
  const resolved = resolveProvider(env, request.purpose ?? 'live');
  const startedAt = Date.now();
  const { content, model } = await callWithRetry(resolved, request);
  const rawDetections = parseReply(content, resolved.mode);

  return {
    objects: normalizeDetections(rawDetections, request.frame),
    raw: toRawObjects(rawDetections, request.frame),
    provider: resolved.provider,
    latencyMs: Date.now() - startedAt,
    model,
    mode: resolved.mode,
  };
}
