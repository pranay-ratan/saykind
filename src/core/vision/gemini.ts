import { DETECT_PROMPT } from './prompt';
import { ProviderHttpError, type PerceptronCallOptions } from './perceptron';
import type { ImageMime } from './requestBody';

/** Development fallback only. Server side. The key goes in a header, never in the URL. */
const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
const MAX_OUTPUT_TOKENS = 600;

export interface GeminiCallOptions extends Omit<PerceptronCallOptions, 'imageDataUrl' | 'model'> {
  model: string;
  imageBase64: string;
  mimeType: ImageMime;
}

export async function detectWithGemini(options: GeminiCallOptions): Promise<string> {
  const response = await fetch(`${GEMINI_BASE_URL}/${encodeURIComponent(options.model)}:generateContent`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': options.apiKey,
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { text: DETECT_PROMPT },
            { inline_data: { mime_type: options.mimeType, data: options.imageBase64 } },
          ],
        },
      ],
      generationConfig: { temperature: 0, maxOutputTokens: MAX_OUTPUT_TOKENS },
    }),
    signal: options.signal,
  });

  if (!response.ok) {
    throw new ProviderHttpError('Gemini', response.status);
  }

  const data: unknown = await response.json();
  return readCandidateText(data);
}

function readCandidateText(data: unknown): string {
  if (typeof data !== 'object' || data === null) return '';
  const candidates = (data as { candidates?: unknown }).candidates;
  if (!Array.isArray(candidates) || candidates.length === 0) return '';
  const parts = (candidates[0] as { content?: { parts?: unknown } } | null)?.content?.parts;
  if (!Array.isArray(parts)) return '';
  return parts.map((part) => (typeof part?.text === 'string' ? part.text : '')).join('');
}
