import { CAMERA_CONFIG } from '../../config/camera';
import type { DetectResponse, FrameSize } from './types';

export type DetectFailure = 'rate-limited' | 'timeout' | 'offline' | 'bad-photo' | 'failed';

export class DetectClientError extends Error {
  constructor(readonly failure: DetectFailure) {
    super(failure);
    this.name = 'DetectClientError';
  }
}

const DATA_URL_PATTERN = /^data:(image\/jpeg|image\/png);base64,(.+)$/;

export interface DetectInput {
  /** data:image/jpeg;base64,... or data:image/png;base64,... */
  imageDataUrl: string;
  frame: FrameSize | null;
}

function isDetectResponse(value: unknown): value is DetectResponse {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Record<string, unknown>;
  return Array.isArray(record.objects) && Array.isArray(record.raw) && typeof record.provider === 'string';
}

function failureFor(error: unknown): DetectFailure {
  if (error instanceof DetectClientError) return error.failure;
  if (error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError')) return 'timeout';
  if (typeof navigator !== 'undefined' && !navigator.onLine) return 'offline';
  return 'failed';
}

/**
 * Sends one frame to /api/detect. The key never reaches the browser. The server
 * holds it, and this call only sends the image and its size.
 */
export async function detectObjects(input: DetectInput): Promise<DetectResponse> {
  const match = DATA_URL_PATTERN.exec(input.imageDataUrl);
  if (!match) throw new DetectClientError('bad-photo');

  try {
    const response = await fetch('/api/detect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        imageBase64: match[2],
        mimeType: match[1],
        width: input.frame?.width,
        height: input.frame?.height,
      }),
      signal: AbortSignal.timeout(CAMERA_CONFIG.detectClientTimeoutMs),
    });

    if (response.status === 429) throw new DetectClientError('rate-limited');
    if (!response.ok) throw new DetectClientError('failed');

    const data: unknown = await response.json();
    if (!isDetectResponse(data)) throw new DetectClientError('failed');
    return data;
  } catch (error) {
    throw new DetectClientError(failureFor(error));
  }
}
