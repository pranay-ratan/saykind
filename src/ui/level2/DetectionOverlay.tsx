'use client';

import { useEffect, useRef, useState, type RefObject } from 'react';
import { coverLayout, toScreenBox, type Size } from '../../core/camera/layout';
import type { TrackedObject } from '../../core/camera/trackBoxes';
import type { DetectedObject } from '../../core/vision/types';

interface DetectionOverlayProps {
  tracks: readonly TrackedObject[];
  media: Size;
  onSelect: (track: TrackedObject) => void;
  rawBoxes: readonly DetectedObject[] | null;
  hintVisible: boolean;
}

const MOTION_QUERY = '(prefers-reduced-motion: reduce)';
const MOVE_MS = 300;

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

/**
 * Boxes and label chips for detected objects. The media uses object-fit: cover,
 * so coverLayout maps the 0..1 boxes exactly onto the visible area.
 */
export function DetectionOverlay({ tracks, media, onSelect, rawBoxes, hintVisible }: DetectionOverlayProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const size = useElementSize(containerRef);
  const reduceMotion = useReducedMotion();
  const layout = coverLayout(size, media);
  const boxTransition = reduceMotion ? 'none' : `transform ${MOVE_MS}ms ease-out`;
  const chipTransition = reduceMotion ? 'none' : `left ${MOVE_MS}ms ease-out, top ${MOVE_MS}ms ease-out`;

  return (
    <div ref={containerRef} className="absolute inset-0 pointer-events-none">
      <svg className="absolute inset-0 w-full h-full overflow-visible" aria-hidden="true">
        {rawBoxes?.map((raw, index) => {
          const box = toScreenBox(raw, layout);
          return (
            <rect
              key={`raw-${index}`}
              x={box.left}
              y={box.top}
              width={box.width}
              height={box.height}
              fill="none"
              stroke="#facc15"
              strokeDasharray="6 4"
              strokeWidth={2}
            />
          );
        })}

        {tracks.map((track) => {
          const box = toScreenBox(track, layout);
          return (
            <g key={track.id} style={{ transform: `translate(${box.left}px, ${box.top}px)`, transition: boxTransition }}>
              <rect
                x={0}
                y={0}
                width={box.width}
                height={box.height}
                rx={12}
                fill="transparent"
                stroke="white"
                strokeWidth={4}
                className="pointer-events-auto cursor-pointer"
                onClick={() => onSelect(track)}
              />
            </g>
          );
        })}
      </svg>

      {tracks.map((track) => {
        const box = toScreenBox(track, layout);
        return (
          <button
            key={`chip-${track.id}`}
            type="button"
            onClick={() => onSelect(track)}
            aria-label={`${track.label}. Tap to practice`}
            className="pointer-events-auto absolute -translate-x-1/2 min-h-[56px] px-5 rounded-full bg-white/95 text-stone-900 text-2xl font-semibold shadow-lg hover:bg-white focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-sky-600"
            style={{
              left: box.left + box.width / 2,
              top: box.top + box.height + 8,
              transition: chipTransition,
            }}
          >
            {track.label}
          </button>
        );
      })}

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
