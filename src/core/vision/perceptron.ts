import { BOX_PROMPT, DETECT_PROMPT } from './prompt';

/** OpenAI-compatible chat completions endpoint, per docs.perceptron.inc. Server only. */
const PERCEPTRON_CHAT_URL = 'https://api.perceptron.inc/v1/chat/completions';
const MAX_COMPLETION_TOKENS = 600;
/** Native boxes cost about 20 tokens each, so six boxes fit easily; a small budget keeps the answer quick. */
const BOX_MODE_MAX_TOKENS = 320;

/**
 * json: the model writes a JSON array (label, confidence, box). box: Perceptron's native point_box markup, no
 * reasoning, fastest. See docs/PERCEPTRON.md.
 */
export type PerceptronMode = 'json' | 'box';

export interface PerceptronCallOptions {
  apiKey: string;
  model: string;
  imageDataUrl: string;
  signal: AbortSignal;
  mode?: PerceptronMode;
}

export class ProviderHttpError extends Error {
  constructor(
    readonly providerName: string,
    readonly status: number,
    /** Perceptron's error.code when the body carried one (for example model_not_found). */
    readonly code?: string,
  ) {
    super(`${providerName} responded with HTTP ${status}${code ? ` (${code})` : ''}`);
    this.name = 'ProviderHttpError';
  }
}

/** True when the API says the model name does not exist (404 model_not_found, or a renamed id). */
export function isModelRejected(error: unknown): boolean {
  if (!(error instanceof ProviderHttpError)) return false;
  return error.code === 'model_not_found' || error.code === 'model_renamed' || error.status === 404;
}

export function buildPerceptronBody(model: string, imageDataUrl: string, mode: PerceptronMode = 'json'): Record<string, unknown> {
  const messages = [
    {
      role: 'user',
      content: [
        { type: 'image_url', image_url: { url: imageDataUrl } },
        { type: 'text', text: mode === 'box' ? BOX_PROMPT : DETECT_PROMPT },
      ],
    },
  ];
  if (mode === 'box') {
    return {
      model,
      messages,
      max_completion_tokens: BOX_MODE_MAX_TOKENS,
      temperature: 0,
      reasoning_effort: 'none',
      vision_config: { annotation_format: 'box' },
    };
  }
  return { model, messages, max_completion_tokens: MAX_COMPLETION_TOKENS, temperature: 0 };
}

/** Returns the model's text reply. Parsing happens in parseModelOutput.ts (json) or parseAnnotations.ts (box). */
export async function detectWithPerceptron(options: PerceptronCallOptions): Promise<string> {
  const response = await fetch(PERCEPTRON_CHAT_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${options.apiKey}`,
    },
    body: JSON.stringify(buildPerceptronBody(options.model, options.imageDataUrl, options.mode)),
    signal: options.signal,
  });

  if (!response.ok) {
    throw new ProviderHttpError('Perceptron', response.status, await readErrorCode(response));
  }

  const data: unknown = await response.json();
  return readAssistantText(data);
}

/** The error code only: never the body, which could echo the request. */
async function readErrorCode(response: Response): Promise<string | undefined> {
  try {
    const data = (await response.json()) as { error?: { code?: unknown } };
    return typeof data?.error?.code === 'string' ? data.error.code : undefined;
  } catch {
    return undefined;
  }
}

function readAssistantText(data: unknown): string {
  if (typeof data !== 'object' || data === null) return '';
  const choices = (data as { choices?: unknown }).choices;
  if (!Array.isArray(choices) || choices.length === 0) return '';
  const message = (choices[0] as { message?: { content?: unknown } } | null)?.message;
  const content = message?.content;
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => (typeof part?.text === 'string' ? part.text : ''))
      .join('');
  }
  return '';
}
