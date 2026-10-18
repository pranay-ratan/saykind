import { CAMERA_CONFIG } from '../../config/camera';
import { normalizeLabel } from './normalize';

/**
 * The confirm call: one tapped object, cropped, asked "what is this?" with a JSON schema answer that carries a
 * confidence and up to two alternatives. Verified live on 2026-10-18 (about 0.7 s). See docs/PERCEPTRON.md.
 */
export const CONFIRM_PROMPT =
  'What is the main everyday object in this photo? Answer with one common lowercase noun (1 or 2 words), up to 2 alternative nouns, and your confidence from 0 to 1.';

const CONFIRM_MAX_TOKENS = 200;
const MAX_ALTERNATIVES = 2;

export const CONFIRM_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['label', 'alternatives', 'confidence'],
  properties: {
    label: { type: 'string' },
    alternatives: { type: 'array', items: { type: 'string' }, maxItems: MAX_ALTERNATIVES },
    confidence: { type: 'number', minimum: 0, maximum: 1 },
  },
} as const;

export interface ConfirmResult {
  label: string;
  alternatives: string[];
  confidence: number;
}

export function buildConfirmBody(model: string, imageDataUrl: string): Record<string, unknown> {
  return {
    model,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: imageDataUrl } },
          { type: 'text', text: CONFIRM_PROMPT },
        ],
      },
    ],
    max_completion_tokens: CONFIRM_MAX_TOKENS,
    temperature: 0,
    reasoning_effort: 'none',
    response_format: { type: 'json_schema', json_schema: { name: 'object_name', strict: true, schema: CONFIRM_SCHEMA } },
  };
}

/**
 * Reads the schema answer. Labels are cleaned like detection labels (lowercase, no brackets, two words at most);
 * alternatives that repeat the label or each other are dropped. Returns null when nothing usable came back.
 */
export function parseConfirmReply(content: string): ConfirmResult | null {
  const start = content.indexOf('{');
  const end = content.lastIndexOf('}');
  if (start === -1 || end <= start) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(content.slice(start, end + 1));
  } catch {
    return null;
  }
  if (typeof parsed !== 'object' || parsed === null) return null;
  const record = parsed as Record<string, unknown>;
  const label = typeof record.label === 'string' ? normalizeLabel(record.label) : null;
  if (!label) return null;
  const confidence = typeof record.confidence === 'number' && Number.isFinite(record.confidence) ? Math.min(1, Math.max(0, record.confidence)) : 0;
  const alternatives: string[] = [];
  if (Array.isArray(record.alternatives)) {
    for (const item of record.alternatives) {
      const clean = typeof item === 'string' ? normalizeLabel(item) : null;
      if (clean && clean !== label && !alternatives.includes(clean)) alternatives.push(clean);
      if (alternatives.length >= MAX_ALTERNATIVES) break;
    }
  }
  return { label, alternatives, confidence };
}

/** True when the sheet should ask "Is it a ___?" rather than take the name as read. */
export function needsConfirmation(result: ConfirmResult): boolean {
  return result.confidence < CAMERA_CONFIG.lowConfidenceThreshold;
}
