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

/**
 * Combines a fresh detection result with the boxes already on screen. A box that
 * matches an earlier one (same label, overlapping) keeps its id so CSS can animate
 * it. Earlier boxes not seen again stay for boxPersistMs after their last sighting.
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
    return { ...detection, id, lastSeenAt: now };
  });

  const kept = previous.filter((track) => !claimedIds.has(track.id) && now - track.lastSeenAt <= persistMs);
  return [...updated, ...kept];
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
