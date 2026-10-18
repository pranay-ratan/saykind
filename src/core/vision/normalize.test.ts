import { describe, expect, it } from 'vitest';
import { normalizeDetections, normalizeLabel, toCorners } from './normalize';
import type { RawDetection } from './types';

const FRAME = { width: 640, height: 480 };

function raw(label: string, box: [number, number, number, number], confidence: number | null = 0.9): RawDetection {
  return { label, confidence, box };
}

describe('toCorners', () => {
  it('reads a 0..1000 grid box as normalized coordinates', () => {
    const corners = toCorners(raw('mug', [500, 250, 750, 750]), FRAME);
    expect(corners).toEqual({ x1: 0.5, y1: 0.25, x2: 0.75, y2: 0.75 });
  });

  it('keeps boxes that are already 0..1', () => {
    const corners = toCorners(raw('mug', [0.1, 0.2, 0.3, 0.4]), FRAME);
    expect(corners).toEqual({ x1: 0.1, y1: 0.2, x2: 0.3, y2: 0.4 });
  });

  it('converts pixel boxes using the frame size when values exceed the grid', () => {
    const fullHd = { width: 1920, height: 1080 };
    const corners = toCorners(raw('mug', [192, 108, 1152, 864]), fullHd);
    expect(corners).toEqual({ x1: 0.1, y1: 0.1, x2: 0.6, y2: 0.8 });
  });

  it('drops pixel boxes when no frame size is known', () => {
    expect(toCorners(raw('mug', [64, 48, 1200, 1100]), null)).toBeNull();
  });

  it('drops boxes with zero or negative area', () => {
    expect(toCorners(raw('mug', [500, 500, 500, 700]), FRAME)).toBeNull();
    expect(toCorners(raw('mug', [700, 500, 500, 700]), FRAME)).toBeNull();
  });

  it('clamps boxes that run past the frame edge', () => {
    const corners = toCorners(raw('mug', [-50, 400, 1000, 1000]), FRAME);
    expect(corners).toEqual({ x1: 0, y1: 0.4, x2: 1, y2: 1 });
  });
});

describe('normalizeLabel', () => {
  it('lowercases, trims, and keeps at most two words', () => {
    expect(normalizeLabel('  Water Bottle Holder ')).toBe('water bottle');
  });

  it('returns null for empty or symbol-only labels', () => {
    expect(normalizeLabel('   ')).toBeNull();
    expect(normalizeLabel('123')).toBeNull();
  });
});

describe('normalizeDetections', () => {
  it('drops detections below the confidence threshold', () => {
    const result = normalizeDetections(
      [raw('mug', [100, 100, 300, 300], 0.9), raw('lamp', [400, 100, 600, 300], 0.2)],
      FRAME,
    );
    expect(result.map((object) => object.label)).toEqual(['mug']);
  });

  it('keeps the most confident of duplicate boxes with the same label', () => {
    const result = normalizeDetections(
      [raw('mug', [100, 100, 300, 300], 0.6), raw('mug', [105, 102, 302, 305], 0.95)],
      FRAME,
    );
    expect(result).toHaveLength(1);
    expect(result[0].confidence).toBe(0.95);
  });

  it('keeps boxes with the same shape when labels differ', () => {
    const result = normalizeDetections(
      [raw('mug', [100, 100, 300, 300], 0.9), raw('bottle', [100, 100, 300, 300], 0.8)],
      FRAME,
    );
    expect(result.map((object) => object.label).sort()).toEqual(['bottle', 'mug']);
  });

  it('caps the result at six objects, highest confidence first', () => {
    const labels = ['cup', 'mug', 'pen', 'box', 'bag', 'key', 'hat', 'fan', 'jar'];
    const many = labels.map((label, index) =>
      raw(label, [index * 100, 0, index * 100 + 50, 50], 0.5 + index * 0.01),
    );
    const result = normalizeDetections(many, FRAME);
    expect(result).toHaveLength(6);
    expect(result[0].label).toBe('jar');
  });

  it('treats a missing confidence as fully confident', () => {
    const result = normalizeDetections([raw('cup', [100, 100, 300, 300], null)], FRAME);
    expect(result[0].confidence).toBe(1);
  });
});
