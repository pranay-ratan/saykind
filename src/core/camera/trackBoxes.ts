import { CAMERA_CONFIG } from '../../config/camera';
import { iou } from '../vision/normalize';
import type { DetectedObject } from '../vision/types';

export interface TrackedObject extends DetectedObject {
  id: string;
  lastSeenAt: number;
}

let trackCounter = 0;

function nextTrackId(): string {
  trackCounter += 1;
  return `track-${trackCounter}`;
}

function findMatch(
  previous: readonly TrackedObject[],
  detection: DetectedObject,
  claimedIds: ReadonlySet<string>,
): TrackedObject | undefined {
  let best: TrackedObject | undefined;
  let bestOverlap: number = CAMERA_CONFIG.trackMatchIouThreshold;

  for (const track of previous) {
    if (claimedIds.has(track.id) || track.label !== detection.label) continue;
    const overlap = iou(track, detection);
    if (overlap > bestOverlap) {
      best = track;
      bestOverlap = overlap;
    }
  }
  return best;
}

/** True when no edge or size moved by stableMoveRatio or more, so the box is treated as unchanged. */
export function isStillInPlace(
  before: DetectedObject,
  after: DetectedObject,
  ratio: number = CAMERA_CONFIG.stableMoveRatio,
): boolean {
  const largestMove = Math.max(
    Math.abs(before.x - after.x),
    Math.abs(before.y - after.y),
    Math.abs(before.w - after.w),
    Math.abs(before.h - after.h),
  );
  return largestMove < ratio;
}

/**
 * Combines a fresh detection result with the boxes already on screen. A box that
 * matches an earlier one (same label, overlapping) keeps its id so CSS can animate
 * it, and if it moved less than stableMoveRatio it keeps its old position so it
 * does not jitter. Earlier boxes not seen again stay for boxPersistMs after their last sighting.
 */
export function mergeTracks(
  previous: readonly TrackedObject[],
  detections: readonly DetectedObject[],
  now: number,
  persistMs: number = CAMERA_CONFIG.boxPersistMs,
): TrackedObject[] {
  const claimedIds = new Set<string>();

  const updated = detections.map((detection) => {
    const match = findMatch(previous, detection, claimedIds);
    const id = match?.id ?? nextTrackId();
    if (match) claimedIds.add(match.id);
    const geometry = match && isStillInPlace(match, detection) ? match : detection;
    return { label: detection.label, confidence: detection.confidence, x: geometry.x, y: geometry.y, w: geometry.w, h: geometry.h, id, lastSeenAt: now };
  });

  const kept = previous.filter((track) => !claimedIds.has(track.id) && now - track.lastSeenAt <= persistMs);
  return [...updated, ...kept];
}

/**
 * Marks every box as seen now. Used while the scene is unchanged: a still camera
 * still shows the same objects, so they must not expire between detection calls.
 */
export function refreshTracks(tracks: readonly TrackedObject[], now: number): TrackedObject[] {
  return tracks.map((track) => ({ ...track, lastSeenAt: now }));
}

/** Drops boxes older than boxPersistMs. Returns the same array when nothing expired. */
export function pruneTracks(
  tracks: readonly TrackedObject[],
  now: number,
  persistMs: number = CAMERA_CONFIG.boxPersistMs,
): TrackedObject[] {
  const alive = tracks.filter((track) => now - track.lastSeenAt <= persistMs);
  return alive.length === tracks.length ? (tracks as TrackedObject[]) : alive;
}
