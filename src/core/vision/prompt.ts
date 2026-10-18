/** JSON mode: the model writes a JSON array with a confidence per object. Used for "confirm" calls and as a fallback. */
export const DETECT_PROMPT = [
  'Find the distinct, clearly visible, everyday physical objects in this photo.',
  'Return at most 6 objects.',
  'For each object give:',
  '- "label": a common everyday noun in lowercase, 1 or 2 words (for example "mug", "water bottle").',
  '- "confidence": a number from 0 to 1.',
  '- "box": the tight bounding box as [x1, y1, x2, y2] using integers from 0 to 1000,',
  '  where [0, 0] is the top-left corner of the photo and [1000, 1000] is the bottom-right corner.',
  'Reply with only a JSON array, for example:',
  '[{"label": "mug", "confidence": 0.92, "box": [120, 340, 310, 620]}]',
  'If nothing clear is visible, reply with [].',
].join('\n');

/**
 * Box mode: Perceptron's native annotations (vision_config.annotation_format = "box"), answered in a few tokens
 * with no reasoning, so the live loop is fast. The label travels in the mention attribute. Measured on
 * 2026-10-18: about 0.7 to 1.2 s per frame against 2.6 s for the JSON prompt (see docs/PERCEPTRON.md).
 */
export const BOX_PROMPT =
  'Point out up to 6 everyday objects in this photo with one point_box each. Use a common lowercase noun (1 or 2 words) as the mention.';
