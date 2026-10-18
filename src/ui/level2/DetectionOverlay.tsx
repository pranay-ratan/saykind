'use client';

import { useEffect, useRef, useState, type RefObject } from 'react';
import { chipAnchor, coverLayout, isOnScreen, mirrorBox, toScreenBox, type CoverLayout, type ScreenBox, type Size } from '../../core/camera/layout';
import type { TrackedObject } from '../../core/camera/trackBoxes';
import type { DetectedObject } from '../../core/vision/types';

interface DetectionOverlayProps {
  tracks: readonly TrackedObject[];
  media: Size;
  onSelect: (track: TrackedObject) => void;
  rawBoxes: readonly DetectedObject[] | null;
  hintVisible: boolean;
  /** The front camera preview is mirrored, so boxes are mirrored to match. */
  mirrored: boolean;
  /** Debug only: draws the rendered frame outline and a 3x3 calibration grid. */
  showGrid: boolean;
}

const MOTION_QUERY = '(prefers-reduced-motion: reduce)';
const MOVE_MS = 300;
const GRID_DIVISIONS = 3;
const CHIP_GAP_PX = 8;
const CHIP_HEIGHT_PX = 56;

/** Reads the reduced-motion preference after mount, so the first render matches the server. */
function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const query = window.matchMedia(MOTION_QUERY);
    const update = () => setReduced(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  return reduced;
}

/**
 * Tracks the overlay's own size. ResizeObserver fires on window resize, on
 * orientation change, and whenever the surrounding layout changes.
 */
function useElementSize(ref: RefObject<HTMLDivElement | null>): Size {
  const [size, setSize] = useState<Size>({ width: 0, height: 0 });
  useEffect(() => {
    const element = ref.current;
    if (!element) return undefined;
    const observer = new ResizeObserver(([entry]) => {
      setSize({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);
  return size;
}

/** Screen position of a 0..1 box, mirrored when needed, or null when it is fully off screen. */
function visibleScreenBox(
  box: { x: number; y: number; w: number; h: number },
  mirrored: boolean,
  layout: CoverLayout,
  container: Size,
): ScreenBox | null {
  const screen = toScreenBox(mirrorBox(box, mirrored), layout);
  return isOnScreen(screen, container) ? screen : null;
}

function CalibrationGrid({ frame }: { frame: ScreenBox }) {
  const lines: { x1: number; y1: number; x2: number; y2: number }[] = [];
  for (let step = 1; step < GRID_DIVISIONS; step += 1) {
    const x = frame.left + (frame.width * step) / GRID_DIVISIONS;
    const y = frame.top + (frame.height * step) / GRID_DIVISIONS;
    lines.push({ x1: x, y1: frame.top, x2: x, y2: frame.top + frame.height });
    lines.push({ x1: frame.left, y1: y, x2: frame.left + frame.width, y2: y });
  }
  return (
    <g aria-hidden="true">
      <rect x={frame.left} y={frame.top} width={frame.width} height={frame.height} fill="none" stroke="#38bdf8" strokeWidth={2} />
      {lines.map((line, index) => (
        <line key={index} {...line} stroke="#38bdf8" strokeOpacity={0.7} strokeWidth={1} />
      ))}
    </g>
  );
}

/**
 * Boxes and label chips for detected objects. The media uses object-fit: cover,
 * so coverLayout maps the 0..1 boxes onto the visible area. Boxes that fall outside
 * the screen are not drawn.
 */
export function DetectionOverlay({
  tracks,
  media,
  onSelect,
  rawBoxes,
  hintVisible,
  mirrored,
  showGrid,
}: DetectionOverlayProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const size = useElementSize(containerRef);
  const reduceMotion = useReducedMotion();
  const layout = coverLayout(size, media);
  const boxTransition = reduceMotion ? 'none' : `transform ${MOVE_MS}ms ease-out`;
  const chipTransition = reduceMotion ? 'none' : `left ${MOVE_MS}ms ease-out, top ${MOVE_MS}ms ease-out`;

  const visibleTracks = tracks.flatMap((track) => {
    const screen = visibleScreenBox(track, mirrored, layout, size);
    return screen ? [{ track, screen }] : [];
  });
  const visibleRaw = (rawBoxes ?? []).flatMap((raw, index) => {
    const screen = visibleScreenBox(raw, mirrored, layout, size);
    return screen ? [{ index, screen }] : [];
  });

  return (
    <div ref={containerRef} className="absolute inset-0 overflow-hidden pointer-events-none">
      <svg className="absolute inset-0 w-full h-full" aria-hidden="true">
        {showGrid && layout.renderedWidth > 0 && (
          <CalibrationGrid frame={{ left: layout.offsetX, top: layout.offsetY, width: layout.renderedWidth, height: layout.renderedHeight }} />
        )}

        {visibleRaw.map(({ index, screen }) => (
          <rect
            key={`raw-${index}`}
            x={screen.left}
            y={screen.top}
            width={screen.width}
            height={screen.height}
            fill="none"
            stroke="#facc15"
            strokeDasharray="6 4"
            strokeWidth={2}
          />
        ))}

        {visibleTracks.map(({ track, screen }) => (
          <g key={track.id} style={{ transform: `translate(${screen.left}px, ${screen.top}px)`, transition: boxTransition }}>
            <rect
              x={0}
              y={0}
              width={screen.width}
              height={screen.height}
              rx={12}
              fill="transparent"
              stroke="white"
              strokeWidth={4}
              className="pointer-events-auto cursor-pointer"
              onClick={() => onSelect(track)}
            />
          </g>
        ))}
      </svg>

      {visibleTracks.map(({ track, screen }) => (
        <button
          key={`chip-${track.id}`}
          type="button"
          onClick={() => onSelect(track)}
          aria-label={`${track.label}. Tap to practice`}
          className="pointer-events-auto absolute -translate-x-1/2 min-h-[56px] px-5 rounded-full bg-white/95 text-stone-900 text-2xl font-semibold shadow-lg hover:bg-white focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-sky-600"
          style={{
            left: chipAnchor(screen, size, CHIP_GAP_PX, CHIP_HEIGHT_PX).x,
            top: chipAnchor(screen, size, CHIP_GAP_PX, CHIP_HEIGHT_PX).y,
            transition: chipTransition,
          }}
        >
          {track.label}
        </button>
      ))}

      {hintVisible && (
        <div className="absolute inset-x-0 top-1/3 flex justify-center px-6 pointer-events-none">
          <p className="bg-white/90 backdrop-blur-sm px-6 py-4 rounded-2xl text-2xl text-stone-800 shadow-lg text-center">
            Move closer to one object.
          </p>
        </div>
      )}
    </div>
  );
}
