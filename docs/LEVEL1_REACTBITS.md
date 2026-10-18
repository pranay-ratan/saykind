# Level 1 redesign experiment: Chair, built with React Bits

**Scope: Level 1, the Chair exercise only.** Every other word in Level 1, and Levels 2, 3 and 4, the caregiver view and the café are untouched. The previous screen is still what those use. The project before this experiment is in this repository's history, and is the `main` branch.

## What was chosen, and why

React Bits (https://reactbits.dev) is a copy-in library: you copy a component's source into your project. These four were picked after looking at the live demos in a real browser (screenshots) and reading each component's source and dependencies. They share one idea: **small, calm, purposeful motion that reports what is really happening**, never decoration on top of the word.

| Component | Docs | Where it is used | Why it fits |
| --- | --- | --- | --- |
| **Voice Pill** (Micro) | https://reactbits.dev/micro/voice-pill | The microphone | One tap turns the mic into a capsule with a live waveform and a stop square: a voice-memo pattern adults already know, so recording state is obvious. The waveform is driven by the app's real recorder level (never simulated). No timer is shown. |
| **Status Mark** (Micro) | https://reactbits.dev/micro/status-mark | The progress row (dashed ring = to come, partial arc = this word, tick = practiced); the "checking" spinner; the tick when the computer heard the word | One consistent visual language for progress and results. A tick is only ever shown when the computer actually heard the word; other results use a neutral speech-bubble mark, never a cross. |
| **Blur Text** (Text Animations) | https://reactbits.dev/text-animations/blur-text | The word | The word resolves into focus once, in about half a second, when an exercise appears, then it is perfectly still and high contrast. |
| **Click Spark** (Animations) | https://reactbits.dev/animations/click-spark | The result card | A few small green and amber sparks, fired by code (not by every tap), only when the computer heard the word. |

**Looked at and rejected** (live demos viewed): Star Border (a twinkling star circling a button, distracting), Shiny Text (a sheen that greys out the word as it sweeps, bad for legibility), Counter, Stepper (a heavy wizard with an icon dependency), Slosh Gauge, Flip Card. Hold Button, Sling Button, Spring Check and Rubber Segment were viewed and judged not useful here. **Only read, not viewed:** Split Text, Shuffle, Text Type, Animated Content, Fade Content, Staggered Menu, Pill Nav, Spotlight Card, Magnet, Glare Hover, Specular Button, Border Glow, Glass Surface and the rest of the catalogue: judged from their descriptions and dependencies only (several need `gsap`, which was not worth adding).

Everything else on the screen (layout, buttons, the chair illustration, the Nunito typeface, colours) is plain, simple CSS in our own code.

## Where things are

| | |
| --- | --- |
| The redesigned screen | `components/saykind/level1/Level1View.tsx` (presentation only) |
| The chair illustration | `components/saykind/level1/ChairArt.tsx` |
| Vendored React Bits source | `components/reactbits/` (`BlurText`, `StatusMark`, `ClickSpark` unmodified; `VoicePill` patched) |
| The switch that limits it to the Chair | `REDESIGNED_WORDS` in `components/saykind/SaykindApp.tsx` |
| Logic (unchanged) | `lib/saykind/controllers/use-exercise.ts` (`ExerciseController`) |

`Level1View` receives the same `ExerciseController` as before and calls the same functions (`playPronunciation`, `playSlowPronunciation`, `toggle/start/stopRecording`, `retryWord`, `confirmHeard`, `continueToNextWord`, `skipWord`, help toggles). Recording, audio, slow audio, speech recognition, feedback wording, progress and the practice record are exactly as they were, and the same accessible names are kept ("Hear Chair", "Hear it slowly", "Tap to speak", "Finish speaking", "Continue", "Try again").

## The one change to a React Bits component (Voice Pill)

Voice Pill ships with its own microphone engine (it opens a second `getUserMedia` stream, or fakes bars). We already own a working recorder and must not fake feedback, so Voice Pill was patched (every change is marked `SAYKIND PATCH` in the file):

1. Its two icons are inline SVGs, so the `@hugeicons` packages are not installed.
2. **Controlled mode:** with the `listening` prop it never opens a microphone and never starts or stops itself; it only draws the state it is given and reports taps via `onPressStart` / `onPressStop` (from the click, which counts as a user activation on iPhone).
3. `getLevel` supplies the real input level from our recorder.

## Dependencies added

`motion` (^12, the animation library Blur Text and Status Mark use). Nothing else. The `Nunito` font (via `next/font`, self-hosted) was added for the rounded friendly headline type.

## License

React Bits is MIT + Commons Clause: free to use inside an application (this is that), but the components themselves may not be sold or redistributed on their own. Their copyright headers are kept at the top of each vendored file.

## Reduced motion

If the device asks for reduced motion: Blur Text shows the word at once, Status Mark's arcs and spinner are static, Click Spark is switched off, and our own entrance animations are removed. The word, the pronunciation and every control look identical.

## Rolling it out, or rolling it back

* **Approve:** add the other word ids to `REDESIGNED_WORDS` (or make the check `true`). `Level1View` is currently written around the chair's picture, so the other objects need their illustration swapped in (`level1/ChairArt` is the only chair-specific part).
* **Reject:** set `REDESIGNED_WORDS` to `[]`. The previous screen returns immediately; delete `components/saykind/level1` and `components/reactbits` if you want the code gone too.
