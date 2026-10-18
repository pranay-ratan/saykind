// Calls Perceptron once with a local photo and prints the raw reply, the normalized boxes, and the latency.
// Usage: npm run check:perceptron -- path/to/photo.jpg
// Reads PERCEPTRON_API_KEY and PERCEPTRON_MODEL from .env.local (or the shell environment).
// Standalone on purpose: no extra dependencies. Mirrors src/core/vision/prompt.ts and normalize.ts.

import { readFileSync, existsSync } from 'node:fs';
import { extname, resolve } from 'node:path';

const ENDPOINT = 'https://api.perceptron.inc/v1/chat/completions';
const DEFAULT_MODEL = 'perceptron-mk1.5';
const GRID_SIZE = 1000;
const MIN_CONFIDENCE = 0.4;
const MAX_OBJECTS = 6;

const PROMPT = [
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

function loadEnvLocal() {
  const path = resolve(process.cwd(), '.env.local');
  if (!existsSync(path)) return {};
  const values = {};
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const match = /^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*?)\s*$/.exec(line);
    if (match && !match[2].startsWith('#')) values[match[1]] = match[2].replace(/^["']|["']$/g, '');
  }
  return values;
}

function mimeFor(file) {
  const extension = extname(file).toLowerCase();
  if (extension === '.png') return 'image/png';
  if (extension === '.jpg' || extension === '.jpeg') return 'image/jpeg';
  return null;
}

function extractContent(data) {
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) return content.map((part) => part?.text ?? '').join('');
  return '';
}

function parseBoxes(content) {
  const start = content.indexOf('[');
  const end = content.lastIndexOf(']');
  if (start === -1 || end <= start) throw new Error('No JSON array in the model reply');
  const items = JSON.parse(content.slice(start, end + 1));
  return items.flatMap((item) => {
    const box = item.box ?? item.bbox;
    if (typeof item.label !== 'string' || !Array.isArray(box) || box.length !== 4) return [];
    const confidence = typeof item.confidence === 'number' ? item.confidence : 1;
    return [{ label: item.label.trim().toLowerCase(), confidence, box }];
  });
}

// Same rules as toCorners() in src/core/vision/normalize.ts, except pixel boxes
// (any value above 1000) are skipped here because this script does not read image size.
function toNormalized(box) {
  const largest = Math.max(...box);
  let scaled;
  if (largest <= 1) scaled = box;
  else if (largest <= GRID_SIZE) scaled = box.map((value) => value / GRID_SIZE);
  else return null;
  const [x1, y1, x2, y2] = scaled.map((value) => Math.min(1, Math.max(0, value)));
  if (x2 <= x1 || y2 <= y1) return null;
  return { x: x1, y: y1, w: x2 - x1, h: y2 - y1 };
}

function round(value) {
  return Math.round(value * 1000) / 1000;
}

async function main() {
  const photoArg = process.argv[2];
  if (!photoArg) {
    console.error('Usage: npm run check:perceptron -- path/to/photo.jpg');
    process.exit(1);
  }

  const env = { ...loadEnvLocal(), ...process.env };
  const apiKey = env.PERCEPTRON_API_KEY;
  if (!apiKey) {
    console.error('PERCEPTRON_API_KEY is not set. Add it to .env.local in the project root.');
    process.exit(1);
  }
  const model = env.PERCEPTRON_MODEL || DEFAULT_MODEL;

  const photoPath = resolve(process.cwd(), photoArg);
  const mime = mimeFor(photoPath);
  if (!mime || !existsSync(photoPath)) {
    console.error(`Could not read a .jpg or .png at ${photoPath}`);
    process.exit(1);
  }
  const imageDataUrl = `data:${mime};base64,${readFileSync(photoPath).toString('base64')}`;

  const body = {
    model,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: imageDataUrl } },
          { type: 'text', text: PROMPT },
        ],
      },
    ],
    max_completion_tokens: 600,
    temperature: 0,
  };

  console.log(`Model: ${model}`);
  const startedAt = Date.now();
  const response = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify(body),
  });
  const latencyMs = Date.now() - startedAt;
  const rawText = await response.text();

  console.log(`\nHTTP ${response.status}  latency ${latencyMs} ms`);
  console.log('\n--- raw response ---');
  console.log(rawText);

  if (!response.ok) {
    console.error('\nPerceptron rejected the request. Check the key, the model name, and the raw response above.');
    process.exit(1);
  }

  let content;
  try {
    content = extractContent(JSON.parse(rawText));
    const parsed = parseBoxes(content);
    console.log('\n--- normalized boxes (0..1 of the photo) ---');
    if (parsed.length === 0) console.log('(none)');
    const kept = parsed
      .filter((item) => item.confidence >= MIN_CONFIDENCE)
      .slice(0, MAX_OBJECTS);
    for (const item of parsed) {
      const box = toNormalized(item.box);
      const shown = box
        ? `x=${round(box.x)} y=${round(box.y)} w=${round(box.w)} h=${round(box.h)}`
        : 'skipped (not a usable box)';
      const status = kept.includes(item) ? 'shown' : 'dropped (low confidence or over the cap)';
      console.log(`${item.label.padEnd(16)} conf=${item.confidence}  ${shown}  [${status}]`);
    }
  } catch (error) {
    console.error(`\nCould not read boxes from the reply: ${error.message}`);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(`Check failed: ${error.message}`);
  process.exit(1);
});
