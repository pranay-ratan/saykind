import type { RawDetection } from './types';

const MAX_ITEMS = 12;

export class ModelOutputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ModelOutputError';
  }
}

/**
 * Pulls the JSON array out of a model reply. Tolerates code fences and prose around it.
 * Accepts boxes as [x1, y1, x2, y2] under `box` or `bbox`, or as top_left / bottom_right points.
 */
export function parseModelOutput(content: string): RawDetection[] {
  const start = content.indexOf('[');
  const end = content.lastIndexOf(']');
  if (start === -1 || end <= start) {
    throw new ModelOutputError('No JSON array in model reply');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(content.slice(start, end + 1));
  } catch {
    throw new ModelOutputError('Model reply was not valid JSON');
  }
  if (!Array.isArray(parsed)) {
    throw new ModelOutputError('Model reply was not an array');
  }

  return parsed.slice(0, MAX_ITEMS).flatMap((item) => toRawDetection(item));
}

function toRawDetection(item: unknown): RawDetection[] {
  if (!isRecord(item) || typeof item.label !== 'string') return [];

  const box = readBox(item);
  if (!box) return [];

  return [{ label: item.label, confidence: readConfidence(item.confidence), box }];
}

function readBox(item: Record<string, unknown>): [number, number, number, number] | null {
  const flat = item.box ?? item.bbox;
  if (isNumberQuad(flat)) return [flat[0], flat[1], flat[2], flat[3]];

  const topLeft = item.top_left;
  const bottomRight = item.bottom_right;
  if (isPoint(topLeft) && isPoint(bottomRight)) {
    return [topLeft.x, topLeft.y, bottomRight.x, bottomRight.y];
  }
  return null;
}

function readConfidence(value: unknown): number | null {
  const parsed = typeof value === 'string' ? Number.parseFloat(value) : value;
  return typeof parsed === 'number' && Number.isFinite(parsed) ? parsed : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isNumberQuad(value: unknown): value is [number, number, number, number] {
  return Array.isArray(value) && value.length === 4 && value.every((n) => typeof n === 'number');
}

function isPoint(value: unknown): value is { x: number; y: number } {
  return isRecord(value) && typeof value.x === 'number' && typeof value.y === 'number';
}
