export interface Size {
  width: number;
  height: number;
}

export interface CoverLayout {
  scale: number;
  offsetX: number;
  offsetY: number;
  /** Rendered media size in CSS pixels, after object-fit: cover. */
  renderedWidth: number;
  renderedHeight: number;
}

/**
 * Maps 0..1 frame coordinates onto the screen for object-fit: cover.
 * The media is scaled to fill the container and the overflow is cropped equally on both sides.
 */
export function coverLayout(container: Size, media: Size): CoverLayout {
  if (container.width <= 0 || container.height <= 0 || media.width <= 0 || media.height <= 0) {
    return { scale: 1, offsetX: 0, offsetY: 0, renderedWidth: 0, renderedHeight: 0 };
  }

  const scale = Math.max(container.width / media.width, container.height / media.height);
  const renderedWidth = media.width * scale;
  const renderedHeight = media.height * scale;
  return {
    scale,
    offsetX: (container.width - renderedWidth) / 2,
    offsetY: (container.height - renderedHeight) / 2,
    renderedWidth,
    renderedHeight,
  };
}

export interface ScreenBox {
  left: number;
  top: number;
  width: number;
  height: number;
}

export function toScreenBox(box: { x: number; y: number; w: number; h: number }, layout: CoverLayout): ScreenBox {
  return {
    left: layout.offsetX + box.x * layout.renderedWidth,
    top: layout.offsetY + box.y * layout.renderedHeight,
    width: box.w * layout.renderedWidth,
    height: box.h * layout.renderedHeight,
  };
}

/**
 * The front camera is shown mirrored, so a box must be mirrored too. The
 * detection frame itself is not mirrored, so only the display side changes.
 */
export function mirrorBox<T extends { x: number; w: number }>(box: T, mirrored: boolean): T {
  return mirrored ? { ...box, x: 1 - box.x - box.w } : box;
}

/** True when some part of the box lies inside the visible container. */
export function isOnScreen(box: ScreenBox, container: Size): boolean {
  if (box.width <= 0 || box.height <= 0) return false;
  return (
    box.left < container.width &&
    box.top < container.height &&
    box.left + box.width > 0 &&
    box.top + box.height > 0
  );
}

/** Keeps a label chip inside the screen. Centred under the visible part of the box, above the screen bottom. */
export function chipAnchor(box: ScreenBox, container: Size, chipGap: number, chipHeight: number): { x: number; y: number } {
  const visibleLeft = Math.max(0, box.left);
  const visibleRight = Math.min(container.width, box.left + box.width);
  const visibleBottom = Math.min(container.height, box.top + box.height);
  const belowBox = visibleBottom + chipGap;
  return {
    x: (visibleLeft + visibleRight) / 2,
    y: Math.max(chipGap, Math.min(belowBox, container.height - chipHeight - chipGap)),
  };
}
