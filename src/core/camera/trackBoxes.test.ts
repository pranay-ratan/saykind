import { describe, expect, it } from 'vitest';
import type { DetectedObject } from '../vision/types';
import { mergeTracks, pruneTracks, type TrackedObject } from './trackBoxes';

function object(label: string, x: number, y = 0.1, w = 0.2, h = 0.2): DetectedObject {
  return { label, confidence: 0.9, x, y, w, h };
}

describe('mergeTracks', () => {
  it('keeps the id of a box that moved slightly with the same label', () => {
    const first = mergeTracks([], [object('mug', 0.1)], 1000);
    const second = mergeTracks(first, [object('mug', 0.12)], 1500);
    expect(second).toHaveLength(1);
    expect(second[0].id).toBe(first[0].id);
    expect(second[0].lastSeenAt).toBe(1500);
  });

  it('gives a new id to a box with a different label', () => {
    const first = mergeTracks([], [object('mug', 0.1)], 1000);
    const second = mergeTracks(first, [object('bottle', 0.1)], 1500);
    expect(second.some((track) => track.label === 'bottle' && track.id !== first[0].id)).toBe(true);
  });

  it('keeps an unseen box for the persist window, then drops it', () => {
    const first = mergeTracks([], [object('mug', 0.1)], 1000);
    const stillShown = mergeTracks(first, [], 2000, 2500);
    const gone = mergeTracks(stillShown, [], 4000, 2500);
    expect(stillShown).toHaveLength(1);
    expect(gone).toHaveLength(0);
  });

  it('does not match one previous box to two new detections', () => {
    const first = mergeTracks([], [object('cup', 0.1)], 1000);
    const second = mergeTracks(first, [object('cup', 0.1), object('cup', 0.12)], 1500);
    const ids = new Set(second.map((track) => track.id));
    expect(second).toHaveLength(2);
    expect(ids.size).toBe(2);
  });
});

describe('pruneTracks', () => {
  it('returns the same array when nothing has expired', () => {
    const tracks: TrackedObject[] = [{ ...object('mug', 0.1), id: 'a', lastSeenAt: 1000 }];
    expect(pruneTracks(tracks, 2000, 2500)).toBe(tracks);
  });

  it('removes boxes older than the persist window', () => {
    const tracks: TrackedObject[] = [
      { ...object('mug', 0.1), id: 'a', lastSeenAt: 1000 },
      { ...object('cup', 0.5), id: 'b', lastSeenAt: 3000 },
    ];
    expect(pruneTracks(tracks, 4000, 2500).map((track) => track.id)).toEqual(['b']);
  });
});
