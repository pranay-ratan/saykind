import { describe, expect, it } from 'vitest';
import type { DetectedObject } from '../vision/types';
import { chipAnchor, coverLayout, isOnScreen, mirrorBox, toScreenBox } from "./layout";
import { isStillInPlace, mergeTracks, refreshTracks } from './trackBoxes';

describe('mirrorBox', () => {
  it('flips the box across the vertical axis when mirrored', () => {
    const box = { x: 0.1, y: 0.2, w: 0.3, h: 0.4 };
    const mirrored = mirrorBox(box, true);
    expect(mirrored.x).toBeCloseTo(0.6);
    expect(mirrored.y).toBe(0.2);
    expect(mirrored.w).toBe(0.3);
  });

  it('leaves the box unchanged when not mirrored', () => {
    const box = { x: 0.1, y: 0.2, w: 0.3, h: 0.4 };
    expect(mirrorBox(box, false)).toBe(box);
  });

  it('keeps a box centred in the frame in the same place', () => {
    expect(mirrorBox({ x: 0.35, y: 0, w: 0.3, h: 1 }, true).x).toBeCloseTo(0.35);
  });
});

describe('mirrored boxes on a cover-fitted preview', () => {
  it('places a box on the left of the frame on the right of the screen when mirrored', () => {
    const layout = coverLayout({ width: 400, height: 400 }, { width: 400, height: 400 });
    const plain = toScreenBox({ x: 0, y: 0, w: 0.2, h: 0.2 }, layout);
    const mirrored = toScreenBox(mirrorBox({ x: 0, y: 0, w: 0.2, h: 0.2 }, true), layout);
    expect(plain.left).toBeCloseTo(0);
    expect(mirrored.left).toBeCloseTo(320);
  });
});

describe('isOnScreen', () => {
  const container = { width: 400, height: 800 };

  it('accepts a box that is partly visible', () => {
    expect(isOnScreen({ left: -20, top: 10, width: 60, height: 60 }, container)).toBe(true);
  });

  it('rejects a box entirely to the left of the screen', () => {
    expect(isOnScreen({ left: -200, top: 10, width: 100, height: 60 }, container)).toBe(false);
  });

  it('rejects a box entirely below the screen', () => {
    expect(isOnScreen({ left: 10, top: 900, width: 100, height: 60 }, container)).toBe(false);
  });

  it('rejects an empty box', () => {
    expect(isOnScreen({ left: 10, top: 10, width: 0, height: 60 }, container)).toBe(false);
  });
});

function object(x: number, y: number, w: number, h: number): DetectedObject {
  return { label: 'mug', confidence: 0.9, x, y, w, h };
}

describe('isStillInPlace', () => {
  it('treats a move of under 1.5% on every edge as unchanged', () => {
    expect(isStillInPlace(object(0.5, 0.5, 0.2, 0.2), object(0.51, 0.505, 0.2, 0.2))).toBe(true);
  });

  it('treats a move of 1.5% or more as a real change', () => {
    expect(isStillInPlace(object(0.5, 0.5, 0.2, 0.2), object(0.515, 0.5, 0.2, 0.2))).toBe(false);
  });
});

describe('chipAnchor keeps the label on screen', () => {
  const screen = { width: 375, height: 812 };

  it('centres the chip under a fully visible box', () => {
    const anchor = chipAnchor({ left: 50, top: 100, width: 200, height: 100 }, screen, 8, 56);
    expect(anchor.x).toBe(150);
    expect(anchor.y).toBe(208);
  });

  it('centres the chip under the visible part of a box cut off on the left', () => {
    const anchor = chipAnchor({ left: -184, top: 250, width: 338, height: 270 }, screen, 8, 56);
    expect(anchor.x).toBeCloseTo(77);
    expect(anchor.y).toBeCloseTo(528);
  });

  it('keeps the chip above the bottom of the screen for a box running off the bottom', () => {
    const anchor = chipAnchor({ left: 20, top: 700, width: 100, height: 300 }, screen, 8, 56);
    expect(anchor.y).toBe(748);
  });
});

describe('mergeTracks keeps still boxes steady', () => {
  it('keeps the previous position for a small jitter', () => {
    const first = mergeTracks([], [object(0.5, 0.5, 0.2, 0.2)], 1000);
    const second = mergeTracks(first, [object(0.508, 0.502, 0.2, 0.2)], 1500);
    expect(second[0].x).toBe(0.5);
    expect(second[0].y).toBe(0.5);
  });

  it('follows a real move', () => {
    const first = mergeTracks([], [object(0.5, 0.5, 0.2, 0.2)], 1000);
    const second = mergeTracks(first, [object(0.56, 0.5, 0.2, 0.2)], 1500);
    expect(second[0].x).toBe(0.56);
  });
});

describe('refreshTracks keeps still boxes on screen', () => {
  it('marks every box as seen now, so they do not expire while the scene is still', () => {
    const first = mergeTracks([], [object(0.5, 0.5, 0.2, 0.2)], 1000);
    const refreshed = refreshTracks(first, 3800);
    expect(refreshed[0].lastSeenAt).toBe(3800);
    expect(refreshed[0].id).toBe(first[0].id);
  });
});
