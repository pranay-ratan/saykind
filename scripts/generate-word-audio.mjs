// Makes the ready-made recordings in public/audio/words.
//
//   "<key>.mp3"       the clear voice, made by the app's own /api/speak route (so the API key stays on the server)
//   "<key>-slow.mp3"  the SNAIL version: the same recording, time-stretched with ffmpeg's `atempo` (WSOLA), which slows
//                     speech WITHOUT lowering its pitch or smearing it. (Asking the voice model itself to "speak slowly"
//                     was tried and is unreliable: some single words came out no slower, and one became unintelligible.)
//
//   node scripts/generate-word-audio.mjs [baseUrl]
//   FFMPEG=/path/to/ffmpeg node scripts/generate-word-audio.mjs     (to also (re)make the slow files; delete one to remake it)
//
// Existing files are kept. The app falls back to a pitch-preserving playback-rate slowdown if a slow file is missing.
import { mkdir, writeFile, access, readFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const BASE = process.argv[2] ?? "http://localhost:3000";
const OUT = new URL("../public/audio/words/", import.meta.url);
const FFMPEG = process.env.FFMPEG;
const WORD_TEMPO = 0.65; // single words: about 1.5x longer
const PHRASE_TEMPO = 0.75; // phrases: about 1.3x longer

const WORDS = {
  // Level 1 objects
  chair: "Chair", cookie: "Cookie", mug: "Mug", hat: "Hat", table: "Table", lamp: "Lamp",
  // Café words and menu
  coffee: "Coffee", latte: "Latte", americano: "Americano", tea: "Tea", water: "Water", please: "Please", thanks: "Thank you",
  espresso: "Espresso", cappuccino: "Cappuccino", mocha: "Mocha", "cold-brew": "Cold brew", "matcha-latte": "Matcha latte",
  "chai-latte": "Chai latte", cocoa: "Cocoa", "iced-tea": "Iced tea", "hot-tea": "Hot tea",
  croissant: "Croissant", muffin: "Muffin", danish: "Danish",
  small: "Small", medium: "Medium", large: "Large", hot: "Hot", iced: "Iced", none: "No, thank you",
};

// Phrases come straight from lib/saykind/phrases.ts, so the two can never drift apart.
const source = await readFile(new URL("../lib/saykind/phrases.ts", import.meta.url), "utf8");
for (const m of source.matchAll(/id: "([^"]+)", text: "((?:[^"\\]|\\.)*)"/g)) WORDS[`phrase-${m[1]}`] = m[2].replace(/\\"/g, '"');

const exists = (url) => access(url).then(() => true, () => false);
await mkdir(OUT, { recursive: true });
let made = 0;
for (const [id, text] of Object.entries(WORDS)) {
  const normal = new URL(`${id}.mp3`, OUT);
  if (!(await exists(normal))) {
    const response = await fetch(`${BASE}/api/speak`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text, style: "word" }) });
    if (!response.ok) throw new Error(`${id}: HTTP ${response.status}`);
    await writeFile(normal, Buffer.from(await response.arrayBuffer()));
    made += 1;
    console.log("made", id);
  }
  const slow = new URL(`${id}-slow.mp3`, OUT);
  if (FFMPEG && !(await exists(slow))) {
    const tempo = id.startsWith("phrase-") ? PHRASE_TEMPO : WORD_TEMPO;
    execFileSync(FFMPEG, ["-hide_banner", "-loglevel", "error", "-y", "-i", fileURLToPath(normal), "-filter:a", `atempo=${tempo}`, "-codec:a", "libmp3lame", "-q:a", "3", fileURLToPath(slow)]);
    made += 1;
    console.log("made", `${id}-slow`);
  }
}
console.log(`done: ${made} new file(s)`);
