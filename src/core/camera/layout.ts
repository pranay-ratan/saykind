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
