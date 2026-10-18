import { SERVER_LIMITS } from '../../config/camera';
import type { DetectPurpose, FrameSize } from './types';

export type ImageMime = 'image/jpeg' | 'image/png';

export interface DetectRequest {
  imageBase64: string;
  mimeType: ImageMime;
  frame: FrameSize | null;
  /** Missing means live. */
  purpose?: DetectPurpose;
}

export type ParseResult = { ok: true; value: DetectRequest } | { ok: false; error: string };

const JPEG_BASE64_MAGIC = '/9j/';
const PNG_BASE64_MAGIC = 'iVBORw0KGgo';
const BASE64_PATTERN = /^[A-Za-z0-9+/]+={0,2}$/;

/** Validates the JSON body of POST /api/detect. Never echoes the image back. */
export function parseDetectRequest(body: unknown): ParseResult {
  if (!isRecord(body) || typeof body.imageBase64 !== 'string') {
    return { ok: false, error: 'Send a photo to look at.' };
  }

  const payload = stripDataUrl(body.imageBase64);
  const mimeType = detectMime(payload);
  if (!mimeType) {
    return { ok: false, error: 'Only JPEG and PNG photos are supported.' };
  }
  if (!BASE64_PATTERN.test(payload)) {
    return { ok: false, error: 'The photo could not be read. Try again.' };
  }
  if (decodedByteLength(payload) > SERVER_LIMITS.maxImageBytes) {
    return { ok: false, error: 'That photo is too large. Try a smaller one.' };
  }

  const purpose = body.purpose === 'confirm' ? 'confirm' : undefined;
  return {
    ok: true,
    value: purpose ? { imageBase64: payload, mimeType, frame: readFrame(body), purpose } : { imageBase64: payload, mimeType, frame: readFrame(body) },
  };
}

function stripDataUrl(value: string): string {
  const commaIndex = value.indexOf(',');
  return value.startsWith('data:') && commaIndex !== -1 ? value.slice(commaIndex + 1) : value;
}

function detectMime(payload: string): ImageMime | null {
  if (payload.startsWith(JPEG_BASE64_MAGIC)) return 'image/jpeg';
  if (payload.startsWith(PNG_BASE64_MAGIC)) return 'image/png';
  return null;
}

function decodedByteLength(payload: string): number {
  const padding = payload.endsWith('==') ? 2 : payload.endsWith('=') ? 1 : 0;
  return Math.floor((payload.length * 3) / 4) - padding;
}

function readFrame(body: Record<string, unknown>): FrameSize | null {
  const { width, height } = body;
  if (typeof width !== 'number' || typeof height !== 'number') return null;
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return null;
  return { width, height };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
