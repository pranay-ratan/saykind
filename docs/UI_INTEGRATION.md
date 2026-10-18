# Saykind: connecting the UI to the functionality

**Two layers, kept apart on purpose.**

| Layer | Folder | Owner | Rule |
| --- | --- | --- | --- |
| Functionality (controllers, audio, recording, speech-to-text, AI, progress, practice record, caregiver data) | `lib/saykind/` (and `lib/*.ts`, `app/api/*`) | functionality | No colours, layouts or components in here. Returns plain values and functions. |
| Temporary UI (bright, plain) | `components/saykind/` | **replace freely** | Pure presentation. Every value comes from a controller; every button calls a controller function. |
| Café | `components/cafe/` | shared | **`CafeScene.tsx` and the `.scene*` / `.barista*` CSS must not change** (original artwork, layering, bob and mouth). The controls around it can be replaced. |

The hooks only import React and browser APIs (no React Native), so **any** component can use them: React Bits components, plain DOM, or React Native Web. Everything is `"use client"`.

```ts
import { useExercise, OBJECTS, useCafe, usePhrases, useDiscovery, useCaregiverContact, useCaregiverReport } from "@/lib/saykind";
```

Nothing was deleted that others might use: the old welcome and hub screens are gone (the app now opens into the exercise), but the previous version is in this repository's git history.

---

## 1. App flow (what `components/saykind/SaykindApp.tsx` does)

1. Opens **straight into Level 1, Exercise 1** (Chair). No welcome screen, no level picker, no start button.
2. A small menu button (top left) opens the four levels (`LevelMenu.tsx`). Opening and closing it changes nothing.
3. Every level's state lives in a controller created once in `SaykindApp`, so screens can unmount without losing anything. Level 1's position is also saved (`lib/saykind/progress.ts`), so it survives level switches **and page reloads**.
4. The first press anywhere unlocks sound for the visit (iPhone Safari requires a tap); the café's `start()` and the menu items are themselves taps.

## 2. Level 1 and Level 2: `useExercise`

```ts
const x = useExercise({ id: "level1", level: 1, items: OBJECTS });
```

State (read these):

| Field | Meaning |
| --- | --- |
| `currentWord` | the `LearnItem`: `{ id, text, syllables, ipa?, stressed?, startsWith, art }` |
| `currentExerciseIndex`, `total`, `progress` (0 to 1), `completedIds`, `isFinished`, `isFirst`, `isLast` | position |
| `pronunciation` | `{ text, syllables, stressed?, ipa?, startsWith }` for the help UI |
| `isPlayingAudio`, `isPlayingSlowAudio` | which sound is playing right now |
| `isRecording`, `isProcessing`, `isRequestingMic` | microphone states |
| `micLevelRef` | attach to an element wrapping the mic button: the live voice level is written to it as CSS variable `--level` (0 to 1), e.g. `transform: scale(calc(1 + var(--level) * .3))` |
| `latestFeedback` | `null`, or `{ kind, title, detail, heard, recognition, caveat, canConfirm }` |
| `attemptCount` | recording attempts at this word this visit |
| `syllablesShown`, `firstSoundShown` | optional help currently on |

Actions (call these from buttons):

| Button | Call |
| --- | --- |
| Speaker | `x.playPronunciation()` |
| Snail | `x.playSlowPronunciation()` |
| Microphone | `x.toggleRecording()` (or `startRecording()` / `stopRecording()`) |
| Try again | `x.retryWord()` |
| "That's what I said" (when `latestFeedback.canConfirm`) | `x.confirmHeard()` |
| Continue / Finish | `x.continueToNextWord()` (works with or without a recording; never needs a pass) |
| Skip | `x.skipWord()` |
| Syllables / First sound chips | `x.toggleSyllables()` / `x.toggleFirstSound()` |
| Back | `x.previousWord()`, `x.goToWord(i)`, `x.restart()` |

**Feedback rules (please keep).** The controller never grades speech. It reports only what the computer *heard*, with a caveat, and never says "perfect", "correct" or "wrong". `latestFeedback.kind` is `heard-match | heard-different | nothing-heard | check-failed | mic-problem`; render `title`, `detail` and (when not null) `caveat`. Recording only ends when the person stops it: no timer, no silence cut-off.

**Adding a word.** Add an entry to `OBJECTS` in `lib/saykind/items.ts` (syllables, IPA, accepted forms, art), draw or add its picture, then run `node scripts/generate-word-audio.mjs http://localhost:3000` with `FFMPEG=/path/to/ffmpeg` to make `public/audio/words/<id>.mp3` and `<id>-slow.mp3`. Keep `accepted` to plain inflections only: never add likely mishearings, they would make the app say "matches" wrongly. `LearnItem.art` can be a drawn object (`{kind:"object"}`), a photo URL (`{kind:"photo", uri}`), or a café picture; to use an image file, add a case in `components/saykind/Art.tsx`.

**Slow audio.** The snail plays `<id>-slow.mp3`: the normal recording time-stretched by ffmpeg `atempo` (pitch preserved, about 1.6x longer for words, 1.35x for phrases). Asking the voice model itself to "speak slowly" was tried and was unreliable, so it was dropped. If a slow file is missing, `lib/word-audio.ts` falls back to the normal one at 0.72 speed with `preservesPitch = true`. Pitch is never lowered. Every slow file was checked by transcribing it back.

**Pronunciation data.** Syllables are standard dictionary divisions; IPA is General American. Have a speech-language pathologist review them before clinical use.

## 3. Level 2: `useDiscovery` (for the camera teammate)

```ts
const discovery = useDiscovery();
discovery.receiveDiscovery({ image: photoUrl, label: "table", confidence: 0.82, correctedLabel: undefined, syllables: ["ta", "ble"] });
// discovery.hasObject === true; render the SAME exercise screen with discovery.exercise
```

`receiveDiscovery` takes: the captured image URL, the identified label, optional confidence, an optional `correctedLabel` (wins over `label`), optional syllables. Level 2 then **is** Level 1: same `ExerciseController`, same audio, slow audio, recording, feedback and record. Built-in words reuse their ready-made recordings; unknown words are spoken by the server voice (slow = pitch-preserved rate). `clearDiscovery()` resets.

The recogniser itself is yours: implement `ObjectRecognizer` and call `registerRecognizer(...)` (`lib/saykind/discover.ts`), or skip it and call `receiveDiscovery` directly. `components/saykind/DiscoverView.tsx` is a working camera + confirm/correct screen you can reuse or replace. The camera opens only on a tap and takes one still on the shutter; needs https or localhost. See also `docs/LEVEL2_INTEGRATION.md`.

## 4. Level 3: `useCafe`

```ts
const cafe = useCafe();                 // conversation + menu data
const item = useMenuItem(ref);           // pronunciation practice for ONE menu item (same engine as Level 1)
```

`cafe` exposes: `phase`, `caption`, `messages[]` (`{id, role: "barista" | "patient", text, via}`), `order`, `slot` (the question being asked, or `"none"`), `isBaristaSpeaking`, `isRecording`, `isProcessing`, `isMyTurn`, `notice`, `acknowledgement`, `unclearStreak`, `micLevelRef`, and `menu: { drinks, pastries, sizes, temperatures, currentChoices, currentQuestion }` (each a `MenuWord`: `{ id, name, syllables, startsWith, sentence, accepted, price?, slot }`).

Actions: `start({whenReady?})` (call from a tap), `toggleMic()`, `choose(slot, choice)` (select an item **without speaking**), `hearBaristaAgain()`, `dismissNotice()`, `exit()`.

Menu item: `item.playItem(word)`, `item.playItemSlowly(word)`, `item.practiceItem(word)` (record / stop), plus `item.status`, `item.outcome`, `item.listening`, `item.slowListening`. The menu is an overlay inside the café, so the order and dialogue are never lost when it opens (`components/cafe/ItemSheet.tsx`). `choose` is only valid on the person's turn for the question being asked (`word.slot === cafe.slot`); the temporary sheet disables it otherwise.

After the order: `useOrderCard(order)` gives `{ hasOrder, sentence, lines, play, playSlowly, ... }` for a "use this in a real café" card.

## 5. Level 4: `usePhrases`

`phrases`, `groups`, `selected`, `select(id | null)`, `play(p)`, `playSlowly(p)`, `playAloud(p, slow?)` (for another person; recorded as such), `showCard(p)`, `toggleRecording(p)` + `attempt` / `isRecording` / `isProcessing` / `micLevelRef` for optional speaking practice. Phrases live in `lib/saykind/phrases.ts`; audio via the same generator script (the script reads that file).

**Recording a real conversation (`components/saykind/SessionView.tsx`).** The rules are the feature, keep them in any redesign: starts only after an explicit tap and two consent ticks (the microphone is untouched before that); a clear recording indicator and Stop the whole time; it stops itself if the page leaves the screen (a web page cannot record in the background) and says so; nothing is transcribed, analyzed or uploaded; saving and sharing are separate explicit choices.

## 6. Caregiver

* `useCaregiverContact()`: `caregiver { name, phone, hasPhone }`, `summary` (editable draft), `note`, `refreshSummary()` (call when opening), `setSummary(text)`, `callCaregiver()`, `openMessage()`, `copySummary()`, `shareSummary()`. It hands a `tel:` or `sms:` link to the phone. **It cannot send anything or know if anything arrived, and no UI may claim otherwise.** Showing the draft for the person to read and edit is the "approve what is shared" step.
* `useCaregiverReport()`: already filtered by what the person authorized: `sharing`, `isAnythingShared`, `totals`, `words`, `mayBenefitFromPractice`, `helpRequests`, `sharedSamples`, `playSample(id)`, `reportText()`. Label every "computer heard" as uncertain; there are no scores.
* Sharing choices: `useSettings()`, `setCaregiver(name, phone)`, `setShareCategory("progress" | "assistance" | "audio" | "helpRequests", on)`, `setKeepPracticeAudio(on)`. Everything defaults to off.

**Prototype status.** Practice data lives in this browser (localStorage; IndexedDB for recordings), so the caregiver view at `/caregiver` only works on the same device. Real delivery would need caregiver accounts, a server, a stored consent record and an SMS/push provider called from a server route (keys server-side).

## 7. The practice record

`logEvent` / `useLog` (`lib/saykind/log.ts`) record, per exercise: word id and text, timestamp, retry number, attempt duration, what recognition returned (`heard`, `recognition: matches | differs | nothing | error`), normal and slow replays, help uses, and how the word ended (`heard-match | self-confirmed | skipped | continued`). A recording is saved only if "Keep my practice recordings" is on. `summarise(events)` makes per-word totals. Recognition is stored as uncertain; it is never a clinical result.

## 8. Backend endpoints (all keys stay on the server)

| Endpoint | Use |
| --- | --- |
| `GET /api/status` | is the voice service configured |
| `POST /api/transcribe` | multipart `audio` -> `{ text }` (speech to text) |
| `POST /api/converse` | the barista's turn: `{ history, order, patient, tapped?, unclearStreak }` -> `{ reply, order, nextSlot, unclearStreak }` |
| `POST /api/speak` | `{ text, style?: "word" }` -> mp3 (cached; style `word` is the clear single-word voice) |
| `/audio/words/*.mp3` | ready-made recordings (`<id>.mp3`, `<id>-slow.mp3`, `phrase-<id>(.mp3 | -slow.mp3)`) |

Requests are rate-limited per visitor and for the whole app (`lib/server/guard.ts`).

## 9. What works, and what is only a prototype

| Feature | Status |
| --- | --- |
| Exercise-first entry, menu, saved progress | Working |
| Level 1: all six objects, speaker, snail, syllables/IPA, recording, feedback, retry, continue, record | Working (tested in desktop Chrome with a fake mic) |
| Level 2: camera, confirm/correct, hand-off to the Level 1 exercise | Camera and hand-off working; **object recognition is not built** |
| Level 3: café, AI barista, menu pronunciation, select without speaking | Working; the barista voice and conversation call the real provider |
| Level 4: phrases, slow audio, show/play aloud, practice, consented recording, review/save/share | Working |
| Contact caregiver | Opens the phone's call screen or messaging app only; **no delivery, no confirmation** |
| Caregiver report | Prototype, same device only |
| Everything on a real iPhone or Android phone | **Not yet tested** |

## 10. Checks

`npx tsc --noEmit`, `npm run lint`, `npm run build`. The scripted browser test used while building lives outside the repo; the manual checklist for a real phone is in the README.
