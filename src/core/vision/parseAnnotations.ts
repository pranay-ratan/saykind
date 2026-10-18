import type { RawDetection } from './types';

const MAX_ITEMS = 12;

/**
 * Perceptron's native box markup, per docs.perceptron.inc (concepts/annotations):
 *   <point_box mention="mug" asset_idx="0"> (120,340) (310,620) </point_box>
 * Coordinates are integers on a 0..1000 grid, top-left then bottom-right. The label is the mention attribute.
 * Prose around the tags is ignored. A box with no mention cannot be named, so it is skipped.
 */
const POINT_BOX = /<point_box\b([^>]*)>\s*\(\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*\)\s*\(\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*\)\s*<\/point_box>/g;
const MENTION = /\bmention\s*=\s*"([^"]*)"/;

function decodeEntities(text: string): string {
  return text
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

/** Every point_box in the reply, in order, as raw detections with no confidence (the markup carries none). */
export function parseBoxAnnotations(content: string): RawDetection[] {
  const found: RawDetection[] = [];
  for (const match of content.matchAll(POINT_BOX)) {
    const mention = MENTION.exec(match[1])?.[1];
    const label = mention ? decodeEntities(mention).trim() : '';
    if (!label) continue;
    const box = [Number(match[2]), Number(match[3]), Number(match[4]), Number(match[5])] as const;
    if (!box.every(Number.isFinite)) continue;
    found.push({ label, confidence: null, box: [box[0], box[1], box[2], box[3]] });
    if (found.length >= MAX_ITEMS) break;
  }
  return found;
}

/** True when the reply used the native markup at all (even if no box could be read). */
export function hasBoxMarkup(content: string): boolean {
  return /<point_box\b/.test(content);
}
