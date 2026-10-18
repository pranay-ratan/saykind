import { describe, expect, it } from 'vitest';
import { coverLayout, toScreenBox } from './layout';

describe('coverLayout', () => {
  it('fills the container width and crops top and bottom for a taller container', () => {
    const layout = coverLayout({ width: 400, height: 800 }, { width: 1280, height: 720 });
    expect(layout.scale).toBeCloseTo(800 / 720);
    expect(layout.renderedHeight).toBeCloseTo(800);
    expect(layout.offsetX).toBeCloseTo((400 - 1280 * (800 / 720)) / 2);
    expect(layout.offsetY).toBeCloseTo(0);
  });

  it('crops left and right for a wider container', () => {
    const layout = coverLayout({ width: 800, height: 400 }, { width: 720, height: 1280 });
    expect(layout.offsetY).toBeLessThan(0);
    expect(layout.renderedWidth).toBeCloseTo(800);
  });

  it('returns an empty layout until both sizes are known', () => {
    const layout = coverLayout({ width: 0, height: 0 }, { width: 1280, height: 720 });
    expect(layout.renderedWidth).toBe(0);
  });
});

describe('toScreenBox', () => {
  it('maps a 0..1 box onto the rendered frame, not the container', () => {
    const layout = coverLayout({ width: 400, height: 400 }, { width: 200, height: 100 });
    const box = toScreenBox({ x: 0.5, y: 0.5, w: 0.25, h: 0.5 }, layout);
    expect(box.left).toBeCloseTo(layout.offsetX + 0.5 * layout.renderedWidth);
    expect(box.top).toBeCloseTo(layout.offsetY + 0.5 * layout.renderedHeight);
    expect(box.width).toBeCloseTo(0.25 * layout.renderedWidth);
    expect(box.height).toBeCloseTo(0.5 * layout.renderedHeight);
  });
});
