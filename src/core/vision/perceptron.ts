import { DETECT_PROMPT } from './prompt';

/** OpenAI-compatible chat completions endpoint, per docs.perceptron.inc. Server only. */
const PERCEPTRON_CHAT_URL = 'https://api.perceptron.inc/v1/chat/completions';
const MAX_COMPLETION_TOKENS = 600;

export interface PerceptronCallOptions {
  apiKey: string;
  model: string;
  imageDataUrl: string;
  signal: AbortSignal;
}

export class ProviderHttpError extends Error {
  constructor(
    readonly providerName: string,
    readonly status: number,
  ) {
    super(`${providerName} responded with HTTP ${status}`);
    this.name = 'ProviderHttpError';
  }
}

export function buildPerceptronBody(model: string, imageDataUrl: string): Record<string, unknown> {
  return {
    model,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: imageDataUrl } },
          { type: 'text', text: DETECT_PROMPT },
        ],
      },
    ],
    max_completion_tokens: MAX_COMPLETION_TOKENS,
    temperature: 0,
  };
}

/** Returns the model's text reply. Parsing happens in parseModelOutput.ts. */
export async function detectWithPerceptron(options: PerceptronCallOptions): Promise<string> {
  const response = await fetch(PERCEPTRON_CHAT_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${options.apiKey}`,
    },
    body: JSON.stringify(buildPerceptronBody(options.model, options.imageDataUrl)),
    signal: options.signal,
  });

  if (!response.ok) {
    throw new ProviderHttpError('Perceptron', response.status);
  }

  const data: unknown = await response.json();
  return readAssistantText(data);
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
