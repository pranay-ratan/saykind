# Saykind Level 2: Live Camera

A full-screen camera view for people with aphasia to practice everyday object names. Point the phone at objects, labelled boxes appear over them, tap one to see a photo of that object, hear the word, and practice saying it.

- Route: `/level-2`
- Stack: Next.js App Router (16.x), TypeScript strict, Tailwind v4, browser APIs only (getUserMedia, canvas, MediaRecorder, speechSynthesis)
- API keys live only in server code and environment variables. The browser never receives them.

## Quick start

```bash
npm install
cp .env.example .env.local   # then fill in the keys you need
npm run dev
```

Open `http://localhost:3000/level-2`. Camera access needs HTTPS on a real phone (see [Phone testing](#phone-testing)).

## Environment variables

Every variable is listed in `.env.example`. Nothing in this table is exposed to the browser except the numeric limits and the TTS mode, which the page passes to the client as props.

| Variable | Default | Purpose |
| --- | --- | --- |
| `VISION_PROVIDER` | `perceptron` | `perceptron` or `gemini` (development fallback) |
| `PERCEPTRON_API_KEY` | none | Required for `perceptron` |
| `PERCEPTRON_MODEL` | `perceptron-mk1.5` | Model name, see [Perceptron setup](#perceptron-setup) |
| `GEMINI_API_KEY` | none | Required for `gemini` |
| `GEMINI_MODEL` | `gemini-2.5-flash` | Gemini model name |
| `TTS_PROVIDER` | `browser` | `browser` (Web Speech API) or `elevenlabs` (server route) |
| `ELEVENLABS_API_KEY` | none | Required for `elevenlabs` |
| `ELEVENLABS_VOICE_ID` | none | Required for `elevenlabs` |
| `TTS_PREWARM_SECRET` | empty | Enables `GET /api/tts?prewarm=1` (header `x-prewarm-secret`). It spends ElevenLabs credits, so it stays closed unless set. |
| `LIVE_MAX_CALLS` | `150` | Detection calls allowed before the "Keep looking" pause |
| `LIVE_INTERVAL_MS` | `1500` | Default time between live checks |

Limits that are not env-driven (timeouts, image size, thresholds) live in `src/config/camera.ts`.

## Perceptron setup

Verified against the Perceptron docs:

- Endpoint: `POST https://api.perceptron.inc/v1/chat/completions`
- Auth: `Authorization: Bearer <PERCEPTRON_API_KEY>`
- Default model: `perceptron-mk1.5`. The SDK also lists `isaac-0.3-fast`, which you can try if latency is high. Check model names in the docs before you change them.
- The SDK returns boxes as corner points (`top_left`, `bottom_right`) on a **0 to 1000 integer grid**.

Not verified: the raw HTTP format for boxes. The docs pages I could reach describe boxes through the SDK, not the chat endpoint. The adapter therefore asks the model for JSON boxes `[x1, y1, x2, y2]` on the 0 to 1000 grid. `src/core/vision/normalize.ts` also accepts 0 to 1 values and pixel values (using the frame size), and `src/core/vision/parseModelOutput.ts` accepts `box`, `bbox`, or `top_left`/`bottom_right`. To confirm alignment on a real phone, open `/level-2?debug=1` and turn on **Show raw boxes**. The dashed yellow boxes are the model's boxes before filtering.

If the raw boxes are offset or scaled, change the grid assumption in `toCorners()` in `src/core/vision/normalize.ts`. Nothing else depends on it.

## How live detection works

Every `LIVE_INTERVAL_MS` (1s, 1.5s or 3s from settings), one detection runs only when all of these are true:

1. Live mode is on, and the camera is live.
2. The tab is visible.
3. The object sheet is closed.
4. No request is in flight.
5. The session budget (`LIVE_MAX_CALLS`) is not used up.
6. The scene changed (a 32x32 grayscale signature differs by more than the threshold), or 8 seconds passed since the last call.

Each frame is drawn at 640px wide as JPEG at quality 0.7. Responses carry a sequence number, so a slow reply never overwrites a newer one. When the budget runs out, the loop pauses and shows **Keep looking**.

Boxes stay on screen for 2.5 seconds after their last sighting, and they move with a CSS transition unless the user prefers reduced motion. After 6 seconds with no objects, the screen shows "Move closer to one object."

## Object sheet

Tapping a box or its label:

- freezes the live preview and captures a 1024px frame
- crops to the box with 12% padding
- speaks the word once (when auto-speak is on)
- offers a normal-speed speaker, a slow snail (rate 0.5), and a mic with a visible Stop button and a replay of the last attempt

If confidence is below 0.5, the sheet asks "I think this might be a ___. Is that right?" with **Yes** and **Not quite**. **Not quite** offers the other detected labels as large buttons, plus a small typing field.

Practice events go to `localStorage` through `logPracticeEvent`. Read them with `getPracticeEvents()` in `src/core/practiceLog.ts`, or swap the sink with `setSink()`.

## Speech

- `speak(text, { rate, provider })` in `src/core/speech.ts`. `browser` cancels any current speech and prefers an English voice.
- `elevenlabs` calls `POST /api/tts`. Normal is speed 1.0. Slow (0.5) is clamped to 0.7, the lowest speed ElevenLabs accepts. Audio is cached on the server (bounded, 30 minutes) and in the browser.
- The ElevenLabs field names (`voice_settings.speed`, `output_format` as a query parameter) follow the public API reference, but they have not been exercised against a live account. Check the first response when you turn it on.

## Errors (no red, no blame)

| Situation | What the user sees |
| --- | --- |
| Camera denied | Plain steps for iPhone and Android, plus **Choose a photo instead** |
| No camera | A short explanation plus **Choose a photo instead** |
| Camera fails to start | A short explanation plus a retry |
| Offline | A calm banner. Live checks pause and resume when back online. |
| Detection fails or times out | "Trying again." The last boxes stay on screen. |
| Rate limited (429) | "Looking is resting for a moment." |
| Photo fallback fails | A plain message with the option to choose another photo |

**Choose a photo instead** uses `<input type="file" accept="image/*" capture="environment">` and runs a single detection.

## API routes

`POST /api/detect` takes `{ imageBase64, mimeType?, width?, height? }`. `imageBase64` can be raw base64 or a data URL. The route:

- accepts JPEG and PNG only, detected from the bytes, and rejects images over 2 MB
- sends the image to the provider with a 12-second timeout and retries once on network errors and 5xx responses
- limits each IP to 60 requests per minute (in memory, so the limit is per server instance)
- never stores or logs the image or the provider's response body. Logs contain the error code only.

Response: `{ objects, raw, provider, latencyMs }`. `objects` are the boxes shown on screen (0 to 1 coordinates, at most 6, confidence at least 0.4, duplicates merged). `raw` are the unfiltered boxes for debug mode.

`POST /api/tts` takes `{ text, rate }` (text up to 60 characters). It returns `audio/mpeg`, or a JSON error when ElevenLabs is not configured.

## Phone testing

Camera access needs HTTPS, and iOS needs a tap to start the camera (the "Open camera" button does this).

1. Deploy a preview build to Vercel:

   ```bash
   npx vercel
   ```

   Set the environment variables from the table above in the Vercel project. Use the preview URL with `/level-2` on your phone.

2. Open `https://<your-preview>.vercel.app/level-2?debug=1`.
3. Tap **Open camera**, point at a mug and a bottle, in portrait and then landscape.
4. Check that boxes sit on the objects. Use **Show raw boxes** to compare.
5. Tap a box. Check the photo, the auto-spoken word, the speaker, the snail, and the mic.
6. Hide the tab for a few seconds and check the debug panel shows `tab-hidden`. Open the sheet and check the loop shows `sheet-open`.

On iOS use Safari. The Level 2 page is not tested in other iOS browsers.

## Measured latency

Not measured yet. This build was made without a Perceptron key and without a phone. Record it here after the phone test, from the debug panel's Latency value, for each model you try.

## Debug mode

`?debug=1` shows the provider, the latency of the last call, calls used against the budget, the loop status, the last failure, and a toggle for raw boxes.

## Development

```bash
npm run typecheck   # tsc --noEmit
npm run lint        # eslint
npm test            # vitest (unit tests for the pure logic)
npm run build
```

Unit tests cover the box normalization, model output parsing, request validation, rate limiting, box tracking, the live-loop gates, the overlay layout, pronunciation, and the TTS helpers.

### Known build issue

With Next 16.4.2 and the existing `next.config.ts`, the default Turbopack build fails in some sandboxed environments when its Tailwind CSS loader cannot bind a local port (`Operation not permitted`). The webpack build (`npx next build --webpack`) compiles and typechecks cleanly. Run the default build on a normal machine to confirm.

## File map

```
app/
  level-2/page.tsx           server page: reads env, passes numbers and TTS mode to the client
  api/detect/route.ts        POST /api/detect
  api/tts/route.ts           POST /api/tts, GET ?prewarm=1
src/
  config/camera.ts           every tunable (client and server)
  config/clientConfig.ts     the only env values that reach the browser
  core/camera/               useCamera, useLiveDetection, frames, trackBoxes, liveGate, layout
  core/vision/               detectObjects (client); perceptron, gemini, runDetection, normalize,
                             parseModelOutput, requestBody, prompt (server and shared)
  core/tts/                  speed, audioCache, elevenlabs (server)
  core/http/rateLimiter.ts   fixed-window limiter
  core/speech.ts             speak() behind one interface
  core/pronunciation.ts      syllables for 40 household objects, plus a fallback splitter
  core/practiceLog.ts        practice events
  core/settings.ts           Level 2 settings in localStorage
  ui/WordCard.tsx            shared with Level 1
  ui/level2/                 LiveCamera, DetectionOverlay, ObjectSheet, SettingsSheet,
                             StartScreen, DebugPanel
```
