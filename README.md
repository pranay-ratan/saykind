# Saykind

A calm, untimed place for adults with aphasia to practice everyday words and use them in real conversations. A website that feels like a phone app: Next.js, TypeScript, React, and React Native Web (no Expo, no native project). It opens in a normal browser on iPhone Safari, Android Chrome and desktop.

**It opens straight into Level 1, Exercise 1** (a chair: hear it, hear it slowly with the snail, say it). A small menu button reaches all four levels and never disturbs progress.

> **For the UI team:** read `docs/UI_INTEGRATION.md`. The functionality is in `lib/saykind/` (controllers, no visuals); the current screens in `components/saykind/` are temporary and meant to be replaced. The café artwork must not change.

## Status

Each line says what has been checked and how. Nothing here has been run against live providers or on a phone.

| Area | Status | What was checked |
| --- | --- | --- |
| Café speech (ElevenLabs by default; OpenAI optional) | **Prototype** | Unit tests with stubbed `fetch`. `npm run check:elevenlabs` written but not run (no key in this build). |
| Café conversation (Claude by default; OpenAI optional) | **Prototype** | Unit tests with stubbed `fetch`, including validation, timeout-style fallback and no sampling parameters. Not run against Claude. |
| Spoken-audio credit guard (`ELEVENLABS_MAX_CHARS_PER_DAY`) | **Working** in tests | Daily budget and reset tested. |
| Welcome screen: aurora, word-by-word headline, Start | **Working** in Chrome | Browser smoke run; reduced motion removes the aurora and keeps the plain headline. The logo file is not in the repo. |
| Atkinson Hyperlegible Next and Bricolage Grotesque; Warm palette | **Working** | Build and browser check. Next warns that Atkinson has no fallback metrics, so a small reflow on font swap is possible. |
| Level 1: adaptive difficulty | **Prototype** | Rules and route tested. Events are sent from the Level 1 controller only. Nothing has been run with a real recording. Level changes are saved but do not yet choose different words, because the word list has no difficulty levels. |
| Level 1: flip card with mic and "I said it" | **Built on the Level 2 sheet, not on Level 1** | The card (`src/ui/WordCard.tsx`) is used by the Level 2 object sheet. Dev's Level 1 screen keeps its own layout; putting the card there would replace it, which is Dev's decision. |
| Level 2 live camera | **Prototype** | Stand-in camera feed and fixed detections in Chrome: box alignment, mirroring, orientation, off-screen boxes, still-scene persistence. Not run with a real camera or a live Perceptron key. |
| Level 2 colours: coral boxes, cream chips, deep-coral start button | **Working** | Browser check. |
| Get Help sheet: deep-coral button and Orb | **Working** | Browser smoke run. The Orb's look has not been reviewed on a phone. |
| Caregiver view: Count Up on the two counts | **Working** | Browser smoke run; plain numbers under reduced motion. |
| Caregiver view: Spotlight Card and soft cards | **Not done** | |
| Café menu panel and buttons restyle | **Not done** | |
| Level menu scrim and caregiver scrim: axe role fix | **Working** | Axe run finds no serious violations on the screens checked. |
| Browser smoke and accessibility suite (`npm run test:e2e`) | **Working** | 13 checks: axe (WCAG A and AA) on Welcome, Level 1, café menu, caregiver view, Get Help and Level 2 start; reduced motion on Welcome; Level 2 full-bleed at 1280px. Mocks answer every `/api` call. This is a smoke run, not full coverage of every flow. |
| Provider check scripts | `check:env` **working**; `check:elevenlabs` and `check:perceptron` **not run** (no keys) | See [`docs/SETUP.md`](docs/SETUP.md). |

## Privacy

- **Providers:** ElevenLabs (spoken audio in and out, when enabled), Anthropic (the café conversation), Perceptron (Level 2 photos, when enabled). OpenAI is an optional fallback and is never required.
- **We store nothing on our servers.** Audio and photos pass to the provider only to get a result. The server keeps two in-memory caches of spoken lines (audio of phrases, not of people) and a daily character counter. Neither holds anything a person said or photographed.
- **On the device:** practice records and the caregiver details are kept in the browser's storage on that device.
- **Keys** are read on the server only and never sent to the browser. `npm run check:env` prints names and yes or no, never values.

## Run it

```bash
cp .env.example .env.local     # add the keys you need; see the env table below
npm install
npm run dev                    # http://localhost:3000
```

Level 2 is at `http://localhost:3000/level-2?debug=1`. The camera needs `https` or `localhost`.

Production-like: `npm run build && npm start`.

## Checks

```bash
npm run typecheck      # tsc --noEmit
npm run lint
npm test               # vitest: camera geometry, vision parsing, rate limit, TTS helpers, adaptive engine
npm run build
npm run check:perceptron -- path/to/photo.jpg   # one live Perceptron call: raw reply, boxes, latency
npm run check:elevenlabs                         # one text to speech call, then speech to text: PASS or FAIL
npm run check:env                                # which variables are SET or MISSING (never values)
npm run test:e2e                                 # browser and axe smoke suite (needs npm run build && npm start on BASE_URL)
```

## Environment variables

Every variable is in `.env.example`, marked REQUIRED or OPTIONAL. Keys are read only on the server.

| Variable | Required when | Get it from |
| --- | --- | --- |
| `OPENAI_API_KEY` | Optional. A fallback only, used when no ElevenLabs or Claude key is set, or when chosen with a `*_PROVIDER` variable | https://platform.openai.com/api-keys |
| `PERCEPTRON_API_KEY` | Level 2 with the default provider | https://docs.perceptron.inc |
| `GEMINI_API_KEY` | `VISION_PROVIDER=gemini` | https://aistudio.google.com/app/apikey |
| `ELEVENLABS_API_KEY` | The café's spoken audio and listening (needs Text to Speech and Speech to Text permission) | https://elevenlabs.io |
| `ANTHROPIC_API_KEY` | The café's conversation (Claude is the default) | https://console.anthropic.com/ |
| `ELEVENLABS_VOICE_ID` | Optional for the café (a stock voice is used); required for Level 2 speech when `TTS_PROVIDER=elevenlabs` | ElevenLabs voice library |

Optional with defaults: `VISION_PROVIDER` (perceptron), `PERCEPTRON_MODEL`, `GEMINI_MODEL`, `TTS_PROVIDER` (browser), `TTS_PREWARM_SECRET`, `LIVE_MAX_CALLS`, `LIVE_INTERVAL_MS`, `ADAPTIVE_PROVIDER` (rules), `CLAUDE_MODEL` (claude-haiku-5-5), and the OpenAI and rate-limit settings from Dev's original template.

## Deploy to Vercel (for a phone test)

1. Go to https://vercel.com/new and import the GitHub repository.
2. In the project settings, add the environment variables from the table above for the environments you need.
3. Deploy. Open the preview URL on a phone at `/level-2`. Camera and microphone need that `https` address.

Dev's `npm run deploy` (see `docs/DEPLOY.md`) publishes to the existing private Vercel project; use it only after the variables are set there.

## Built before vs during the event

See [`docs/AUTHORSHIP.md`](docs/AUTHORSHIP.md). Short version: the git history starts at the "as deployed" baseline commit, which is timestamped after the 12:30 PT cutoff, so git cannot show what predates the event. The merged Level 2 work is attributed to the repository owner. The 20 largest tracked files and their introducing commits are listed there.

## Credits

- Dev's Saykind app, the café artwork, the Level 1 to 4 screens, the controllers and the audio: Devvrat Vaishnav's repository (`devvratvaishnav14/Saykind`) and its contributors.
- React Bits components (SoftAurora and SplitText, copied from Dev's experiment branch; the others in `components/reactbits` are from the baseline): React Bits, https://reactbits.dev.
- Fonts: Atkinson Hyperlegible Next and Bricolage Grotesque, loaded by `next/font` from Google Fonts.
- Perceptron (vision), ElevenLabs (speech), Anthropic (conversation and adaptive), OpenAI (optional fallback), Google Gemini (development fallback).
- Level 2 camera, merge, Welcome screen and adaptive engine: this repository's owner, with an AI coding assistant.

The key is read only on the server (`lib/server/openai.ts`) and never reaches the browser. The microphone and camera need **https** (or `localhost`); this repo publishes and tunnels nothing, so decide how to serve it over https separately.

## The four levels

| Level | What it is | Status |
| --- | --- | --- |
| 1. Learn Objects | Chair, Cookie, Mug, Hat, Table, Lamp: picture, word, syllables and IPA, speaker, snail (slow), speaking practice, unlimited tries, continue | **Working** |
| 2. Discover Objects | Camera screen and the hand-off function `receiveDiscovery(...)`; the practice screen is the Level 1 exercise | **Prototype**: camera and hand-off work; recognition is a teammate's and is *not* built |
| 3. At the Café | The original animated café and AI barista; a Menu where every drink and pastry has picture, name, syllables, speaker, snail, practice and "choose without speaking" | **Working** |
| 4. In the Real World | Twelve ready phrases (normal and slow audio, practice, a large "show someone" card that plays aloud) and a consented recording session | **Working** |
| Contact caregiver | A call button (`tel:`) and an optional message the person reads, edits and sends from their own phone | **Working as a hand-off only**; Saykind never sends or confirms anything |
| Caregiver view (`/caregiver`) | A separate report page of what the person has authorized | **Prototype**: this device only |

## Honest limits

- **Speech recognition is not a pronunciation test.** It is unreliable for speech affected by aphasia. Saykind never scores or grades, and never says "perfect", "correct" or "wrong". It shows what the computer heard, with a caveat, and lets the person try again, listen again, say "that's what I said", or move on. Only plain inflections ("chairs") count as a match; likely mishearings are deliberately *not* treated as matches.
- **Sharing is off until the person turns it on**, per category, in Settings. Recordings are private unless each is approved.
- **Nothing is sent to a caregiver by Saykind.** It hands a call or a message to the phone; it cannot tell whether either happened and never claims it did. Real alerts would need caregiver accounts, a server, a stored consent record and an SMS/push provider (keys server-side). The data model in `lib/saykind/log.ts` is designed to move there.
- **Recording real conversations** starts only after an explicit tap and two consent ticks, shows a recording bar and Stop throughout, and stops if the page leaves the screen (a web page cannot record in the background). Nothing is transcribed, analyzed or uploaded. Laws on recording differ by place.
- **Tested** in desktop Chrome with a fake microphone and camera and a stand-in for the AI provider, plus the real provider for the recorded audio and a chat turn. **Not yet tested on a real iPhone or Android phone:** microphone and camera permission prompts, recording formats, sound after recording on iOS, safe areas, and screen readers.

## How it is built

`next.config.ts` aliases `react-native` to `react-native-web`; `types/react-native.d.ts` holds the small set of typings used (the real React Native typings clash with browser types, so `react-native` is not installed). The café and the exercise-independent chrome around it are plain DOM and CSS; the screens in `components/saykind/` are React Native components. Both share one page.

| Layer | Where |
| --- | --- |
| Controllers: `useExercise`, `useDiscovery`, `useCafe`, `usePhrases`, `useCaregiverContact`, `useCaregiverReport` | `lib/saykind/controllers/`, exported from `lib/saykind/index.ts` |
| Audio, recording, practice record, settings, saved recordings, progress | `lib/word-audio.ts`, `lib/use-audio-recorder.ts`, `lib/saykind/*` |
| Server routes and spend protection | `app/api/*`, `lib/server/*` |
| Temporary UI (replace freely) | `components/saykind/*` |
| The café (artwork, bob and mouth unchanged) | `components/cafe/*` |

### Audio

Words and phrases play ready-made recordings from `public/audio/words`: `<id>.mp3` (made once with the app's server voice) and `<id>-slow.mp3` for the snail. The slow file is the normal recording time-stretched with ffmpeg's `atempo` (pitch preserved, not lowered). Asking the voice model to "speak slowly" was tried and was unreliable, so it isn't used. Every file was checked by transcribing it back. Remake or add them with `FFMPEG=/path/to/ffmpeg node scripts/generate-word-audio.mjs http://localhost:3000`. The barista speaks live from the server.

### Spending protection

`lib/server/guard.ts` limits provider requests per visitor per minute and per day, and for the whole app per hour; short-line text-to-speech is cached in memory. Defaults are in `.env.example`.

### Progressive web app

`app/manifest.ts` and `public/icons` allow adding to the home screen. There is no service worker, so nothing (including voice) is cached offline.
