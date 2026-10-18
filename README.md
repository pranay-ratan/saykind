# Saykind

A calm, untimed place for adults with aphasia to practice everyday words and use them in real conversations. A website that feels like a phone app: Next.js, TypeScript, React, and React Native Web (no Expo, no native project). It opens in a normal browser on iPhone Safari, Android Chrome and desktop.

**It opens straight into Level 1, Exercise 1** (a chair: hear it, hear it slowly with the snail, say it). A small menu button reaches all four levels and never disturbs progress.

> **For the UI team:** read `docs/UI_INTEGRATION.md`. The functionality is in `lib/saykind/` (controllers, no visuals); the current screens in `components/saykind/` are temporary and meant to be replaced. The café artwork must not change.

## Status

Each line says what has been checked and how. **WORKING** means it ran in a real browser or in tests as described; **PROTOTYPE** means it is built but not proven end to end; **NOT DONE** means it does not exist. Nothing has been tried on a real phone, and the browser suite uses mocks for every provider.

| Area | Status | What was checked |
| --- | --- | --- |
| Level 1 word practice (Dev's screens) | **WORKING** | Browser suite: opens, axe, layout at 375px and 1280px. The flip card was **not** put on Level 1: Dev's layout would have to be replaced (the card is used on the Level 2 sheet). |
| Level 1 adaptive difficulty | **PROTOTYPE** | Rules and route tested. Level changes are saved but do not yet choose different words (the word list has no levels). |
| Level 2 live camera and practice card | **PROTOTYPE** | Fake camera and mocked detection in Chrome: tap an object, play or record its word. Not run with a real camera. The live loop uses Perceptron's native box mode (measured live at about 0.7 to 1.2 s per frame on 2026-10-18); detect calls wait 15 s and retry once; a rejected model name falls back to `PERCEPTRON_MODEL`. See `docs/PERCEPTRON.md`. |
| Flow: Welcome, Level 1, menu, Level 2, back, café | **WORKING** | Browser test. Every level is open from the menu (the levels are a path, not a gate) and Level 2 is optional: its start screen has Skip, and Back and Next: the café. Completing a word still marks Level 2 done. `NEXT_PUBLIC_UNLOCK_ALL_LEVELS=false` restores the old gate. |
| Café voice conversation (mic, Scribe, Claude, ElevenLabs voice) | **PROTOTYPE** | Whole loop in a browser with mocks: greeting, fragments, change of mind, empty turn, picture answers, order complete, device-voice fallback. Live latency and lip-sync with the real services are not verified. |
| Café session saved to the practice log | **WORKING** | Unit and browser tests. |
| Session report for the doctor | **PROTOTYPE** | Assembly, template fallback, language rules, preview, transcript switch (off by default), Email link, Share, Download PDF, Copy, saved list and Delete: tested with mocks. One live call to Claude with sample numbers returned a valid report. Email goes through the person's own mail app; server-side email is **NOT DONE**. |
| Caregiver view: Spotlight Cards, soft cards, Count Up on counts | **WORKING** | Browser audit. |
| Café menu panel and buttons on the Saykind tokens | **WORKING** | Browser audit at 375px and 1280px. |
| UI rules audit (tokens, 20px text, 64px targets, no red, layout) | **WORKING** | `tests/e2e/audit.mjs` finds 0 findings on 13 screens at 375px and 1280px. It checks computed styles, not a person's eyes. The café scene art and Dev's illustrations were not touched. |
| Reduced motion (Welcome, Level 1, Level 2) | **WORKING** | No running animation and no canvas in the browser test. |
| Accessibility (axe, WCAG A and AA) | **WORKING** | No serious or critical findings on Welcome, Level 1, café, café end, caregiver view, Get Help, Level 2 and the report. Axe does not replace testing with a screen reader. |
| Spoken-audio credit guard | **WORKING** in tests | Daily budget and reset tested. |
| Provider check scripts | `check:env` **WORKING**; `check:elevenlabs` and `check:perceptron` **not run in this build** | See [`docs/SETUP.md`](docs/SETUP.md). |
| Caregiver view on another device, accounts, consent record | **NOT DONE** | Everything is on the device. |

## Privacy

- **Providers:** ElevenLabs (the barista's voice and listening to the person), Anthropic (the café conversation, and writing the doctor report), Perceptron (Level 2 photos). OpenAI is an optional fallback and is never required.
- **Audio and photos pass through ElevenLabs, Anthropic and Perceptron only to get a result.** Our servers keep nothing: two in-memory caches of spoken lines and a daily character counter, none of which holds anything a person said or photographed.
- **Reports** are written by Anthropic from compact counts and short words (no audio, no images, no conversation text), and are **stored only on the device**. They are shared **only when the person taps** Email, Share, Download PDF or Copy. The conversation transcript is left out unless the person switches it on.
- **On the device:** the practice log, café sessions, progress, settings (caregiver and doctor details) and saved reports are kept in the browser's storage on that device.
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
npm run test:e2e                                 # browser suites: smoke, flow, conversation, report, motion, UI audit (needs a build served at BASE_URL)
```

## Environment variables

Every variable is in `.env.example`, marked REQUIRED or OPTIONAL. Keys are read only on the server.

| Variable | Required when | Get it from |
| --- | --- | --- |
| `OPENAI_API_KEY` | Optional. A fallback only, used when no ElevenLabs or Claude key is set, or when chosen with a `*_PROVIDER` variable | https://platform.openai.com/api-keys |
| `PERCEPTRON_API_KEY` | Level 2 with the default provider | https://docs.perceptron.inc |
| `GEMINI_API_KEY` | `VISION_PROVIDER=gemini` | https://aistudio.google.com/app/apikey |
| `ELEVENLABS_API_KEY` | The café's spoken audio and listening (needs Text to Speech and Speech to Text permission) | https://elevenlabs.io |
| `ANTHROPIC_API_KEY` | The café's conversation (Claude is the default) and the doctor report (a template is used without it) | https://console.anthropic.com/ |
| `ELEVENLABS_VOICE_ID` | Optional for the café (the premade voice `JBFqnCBsd6RMkjVDRZzb` is used; library voices need a paid ElevenLabs plan); required for Level 2 speech when `TTS_PROVIDER=elevenlabs` | ElevenLabs voice library |

Optional with defaults: `VISION_PROVIDER` (perceptron), `PERCEPTRON_MODEL`, `PERCEPTRON_MODEL_LIVE`, `PERCEPTRON_MODEL_CONFIRM`, `PERCEPTRON_BOX_MODE`, `GEMINI_MODEL`, `TTS_PROVIDER` (browser), `TTS_PREWARM_SECRET`, `LIVE_MAX_CALLS`, `LIVE_INTERVAL_MS`, `ADAPTIVE_PROVIDER` (rules), `CLAUDE_MODEL` (claude-haiku-5-5), and the OpenAI and rate-limit settings from Dev's original template.

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
- Fonts: Atkinson Hyperlegible Next and Bricolage Grotesque (both SIL Open Font License), self-hosted in `app/fonts` and loaded by `next/font/local`. See `app/fonts/README.md`.
- Perceptron (vision), ElevenLabs (speech), Anthropic (conversation and adaptive), OpenAI (optional fallback), Google Gemini (development fallback).
- Level 2 camera, merge, Welcome screen and adaptive engine: this repository's owner, with an AI coding assistant.

The key is read only on the server (`lib/server/openai.ts`) and never reaches the browser. The microphone and camera need **https** (or `localhost`); this repo publishes and tunnels nothing, so decide how to serve it over https separately.

## The four levels

| Level | What it is | Status |
| --- | --- | --- |
| 1. Learn Objects | Chair, Cookie, Mug, Hat, Table, Lamp: picture, word, syllables and IPA, speaker, snail (slow), speaking practice, unlimited tries, continue | **Working** |
| 2. Discover Objects | The live camera at `/level-2` (Back to levels, Next: the café), or Dev's Discover screen | **Prototype** (see the status table) |
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
