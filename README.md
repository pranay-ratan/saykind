# Saykind

A calm, untimed place for adults with aphasia to practice everyday words and use them in real conversations. A website that feels like a phone app: Next.js, TypeScript, React, and React Native Web (no Expo, no native project). It opens in a normal browser on iPhone Safari, Android Chrome and desktop.

**It opens straight into Level 1, Exercise 1** (a chair: hear it, hear it slowly with the snail, say it). A small menu button reaches all four levels and never disturbs progress.

> **For the UI team:** read `docs/UI_INTEGRATION.md`. The functionality is in `lib/saykind/` (controllers, no visuals); the current screens in `components/saykind/` are temporary and meant to be replaced. The café artwork must not change.

## Run it

```bash
cp .env.example .env.local     # put your OpenAI key in .env.local (server-side only)
npm install
npm run dev                    # http://localhost:3000
```

Production-like: `npm run build && npm start`. Checks: `npm run lint`, `npx tsc --noEmit`.

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
