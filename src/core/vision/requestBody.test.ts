import { describe, expect, it } from 'vitest';
import { SERVER_LIMITS } from '../../config/camera';
import { parseDetectRequest } from './requestBody';

const JPEG_BASE64 = '/9j/4AAQSkZJRgABAQ==';
const PNG_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

describe('parseDetectRequest', () => {
  it('accepts a raw JPEG payload and detects its type from the bytes', () => {
    const result = parseDetectRequest({ imageBase64: JPEG_BASE64, mimeType: 'image/png' });
    expect(result).toEqual({
      ok: true,
      value: { imageBase64: JPEG_BASE64, mimeType: 'image/jpeg', frame: null },
    });
  });

  it('strips a data URL prefix and keeps the PNG type', () => {
    const result = parseDetectRequest({ imageBase64: `data:image/png;base64,${PNG_BASE64}` });
    expect(result.ok && result.value.mimeType).toBe('image/png');
    expect(result.ok && result.value.imageBase64).toBe(PNG_BASE64);
  });

  it('reads the frame size when both dimensions are positive numbers', () => {
    const result = parseDetectRequest({ imageBase64: JPEG_BASE64, width: 640, height: 480 });
    expect(result.ok && result.value.frame).toEqual({ width: 640, height: 480 });
  });

  it('ignores a frame size with a missing or invalid dimension', () => {
    const result = parseDetectRequest({ imageBase64: JPEG_BASE64, width: 640, height: 0 });
    expect(result.ok && result.value.frame).toBeNull();
  });

  it('rejects a body with no image', () => {
    expect(parseDetectRequest({})).toMatchObject({ ok: false });
    expect(parseDetectRequest(null)).toMatchObject({ ok: false });
  });

  it('rejects formats other than JPEG and PNG', () => {
    const gif = 'R0lGODlhAQABAIAAAP///wAAACwAAAAAAQABAAACAkQBADs=';
    expect(parseDetectRequest({ imageBase64: gif })).toMatchObject({ ok: false });
  });

  it('rejects payloads that are not base64', () => {
    expect(parseDetectRequest({ imageBase64: `${JPEG_BASE64} not base64!` })).toMatchObject({ ok: false });
  });

  it('rejects images over the size limit', () => {
    const oversize = `/9j/${'A'.repeat(Math.ceil((SERVER_LIMITS.maxImageBytes * 4) / 3) + 8)}`;
    expect(parseDetectRequest({ imageBase64: oversize })).toMatchObject({ ok: false });
  });
});
