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
