import { CAMERA_CONFIG } from '../../config/camera';
import type { DetectedObject, FrameSize, RawDetection } from './types';

/** Models that answer on a 0..1000 grid (the Perceptron SDK convention). */
const GRID_SIZE = 1000;
const MAX_LABEL_WORDS = 2;

interface Corners {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

/**
 * Works out which coordinate space the model used and maps the box to 0..1.
 * Order of checks: already normalized, then 0..1000 grid, then pixels (needs frame size).
 */
export function toCorners(raw: RawDetection, frame: FrameSize | null): Corners | null {
  const [a, b, c, d] = raw.box;
  if (![a, b, c, d].every(Number.isFinite)) return null;

  const largest = Math.max(a, b, c, d);
  let scaled: [number, number, number, number] | null = null;

  if (largest <= 1) {
    scaled = [a, b, c, d];
  } else if (largest <= GRID_SIZE) {
    scaled = [a / GRID_SIZE, b / GRID_SIZE, c / GRID_SIZE, d / GRID_SIZE];
  } else if (frame && frame.width > 0 && frame.height > 0) {
    scaled = [a / frame.width, b / frame.height, c / frame.width, d / frame.height];
  }

  if (!scaled) return null;

  const [x1, y1, x2, y2] = scaled.map(clamp01);
  if (x2 <= x1 || y2 <= y1) return null;
  return { x1, y1, x2, y2 };
}

export function normalizeLabel(label: string): string | null {
  const words = label
    // "glass (drink container)" -> "glass": the model sometimes adds a category in brackets.
    .replace(/\([^)]*\)/g, ' ')
    .toLowerCase()
    .replace(/[^a-z\s-]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) return null;
  return words.slice(0, MAX_LABEL_WORDS).join(' ');
}

export function iou(a: DetectedObject, b: DetectedObject): number {
  const left = Math.max(a.x, b.x);
  const top = Math.max(a.y, b.y);
  const right = Math.min(a.x + a.w, b.x + b.w);
  const bottom = Math.min(a.y + a.h, b.y + b.h);
  if (right <= left || bottom <= top) return 0;

  const intersection = (right - left) * (bottom - top);
  const union = a.w * a.h + b.w * b.h - intersection;
  return union > 0 ? intersection / union : 0;
}

function toDetectedObject(label: string, confidence: number, corners: Corners): DetectedObject {
  return {
    label,
    confidence,
    x: corners.x1,
    y: corners.y1,
    w: corners.x2 - corners.x1,
    h: corners.y2 - corners.y1,
  };
}

/** Every box with a usable label and shape. No confidence filter, no de-duplication. */
export function toRawObjects(raws: readonly RawDetection[], frame: FrameSize | null): DetectedObject[] {
  return raws.flatMap((raw) => {
    const label = normalizeLabel(raw.label);
    const corners = toCorners(raw, frame);
    if (!label || !corners) return [];
    return [toDetectedObject(label, raw.confidence ?? 1, corners)];
  });
}

/**
 * Final objects for the UI: drops low confidence, keeps the most confident of
 * near-duplicate boxes with the same label, and caps the count.
 */
export function normalizeDetections(raws: readonly RawDetection[], frame: FrameSize | null): DetectedObject[] {
  const confident = toRawObjects(raws, frame)
    .filter((object) => object.confidence >= CAMERA_CONFIG.confidenceThreshold)
    .sort((a, b) => b.confidence - a.confidence);

  const kept: DetectedObject[] = [];
  for (const candidate of confident) {
    const isDuplicate = kept.some(
      (existing) =>
        existing.label === candidate.label && iou(existing, candidate) > CAMERA_CONFIG.duplicateIouThreshold,
    );
    if (!isDuplicate) kept.push(candidate);
  }
  return kept.slice(0, CAMERA_CONFIG.maxObjects);
}
