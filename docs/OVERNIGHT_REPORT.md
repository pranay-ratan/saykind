# Overnight report (2026-10-18)

Branch `overnight` from `main` (`pre-overnight` tag = `be11d46`). Pushed to `saykind` after every step. `origin` was never pushed. Written from the git history and the test logs, not from memory.

At 07:05 the owner reprioritised: dignity-first voice first, then Step 7a (Perceptron fast box mode and attribution), Step 6 (Level 2 microphone), Step 5 (Level 2 start screen); Steps 2, 8, 9, L and "Find it" were skipped on purpose. Per step: typecheck, lint, unit tests, commit, push. The full browser suites ran once before the merge.

## What changed, per step

| Step | Commit | Status | What changed |
| --- | --- | --- | --- |
| 0 (preliminary) | `5086f41` | WORKING | Atkinson Hyperlegible Next and Bricolage Grotesque are self-hosted in `app/fonts` (SIL OFL, latin, variable) through `next/font/local`. A build no longer needs Google Fonts (the sandbox had no access, and `next/font/google` could not size a fallback for Atkinson). |
| 1 Levels are a path | `4969971` | WORKING | `NEXT_PUBLIC_UNLOCK_ALL_LEVELS` defaults to true; Level 2 is labelled Optional; Skip on the Level 2 start screen; Skip and "Next: the café" land in the café waiting on Start. `tests/e2e/flow.mjs` proves Welcome, the menu and the café are reachable without `/level-2`. |
| 3 Welcome | `10a799a` | WORKING | Full-screen Soft Aurora (scale 2.2, band 0.8, brightness 0.85, wrapper 0.75, inert, still gradient under reduced motion). Three rows: logo middle, tagline and Start lower third in the safe area, no other text. `tests/e2e/welcome.mjs` (21 checks, cumulative layout shift 0 at 375px, 1280px and reduced motion). |
| 4 Level 1 first-screen shift | `80f9fe2` | PROTOTYPE (not reproduced) | Measured with `tests/e2e/level1-shift.mjs` (PerformanceObserver layout-shift plus 100 ms position samples for 2 s after Start): zero shift at 375px, 375px on slow 3G, 1280px, second word, 375x560, against both the production build and `next dev`. Saved state is read synchronously; fonts are loaded before Start. The only cause consistent with "slides down" on a phone is the dynamic viewport, so `.app` and `.frame` use `100svh`, and both fonts now have metric-matched fallbacks (`size-adjust` 99.36% and 112.88%). Not verified on a real phone. |
| Dignity-first voice | `42e5c50` | WORKING | `lib/tone.ts` phrase list and `politeSentences()`; the barista prompt carries the rules and `calmReply()` drops any failing sentence (JSON contract unchanged); adaptive messages and prompt, report prompt, template and language check rewritten person-first; Level 1 "Thank you" / "Let me listen once more"; Level 2 notices softened. `lib/tone.test.ts`, `calm-reply.test.ts`. `docs/TONE.md`. |
| 7a Perceptron fast box mode | `34a6934` | PROTOTYPE (mocked in the browser, measured live once) | Native `point_box` markup with `reasoning_effort: none` (0.6 to 1.2 s per frame measured live against 2.6 s for the JSON prompt); `PERCEPTRON_MODEL_LIVE` and `PERCEPTRON_MODEL_CONFIRM` with a remembered fallback to `PERCEPTRON_MODEL` on 404 `model_not_found`; `PERCEPTRON_BOX_MODE`; `?debug=1` shows model, mode, latency and box count; Perceptron chip on the start screen; `docs/PERCEPTRON.md`. `isaac-0.3-fast` never launched (404), so both slots default to `perceptron-mk1.5`. |
| 6 Level 2 microphone | `3322b5f` | WORKING (fake microphone) | The sheet uses `usePractice(2, …)`, the exact Level 1 recorder, level meter, `/api/transcribe` and log. 96 px MicButton bottom centre, tap to start and stop, auto-stop after 2.5 s of silence or 15 s (`src/core/autoStop.ts`), "Thank you" with what was heard, "Hear me". The voice pill is gone. `tests/e2e/level2-mic.mjs` with Chrome's fake microphone: the level moves, a transcribe request is sent, Hear me appears. Root cause of the old bug: a separate MediaRecorder with no level meter or transcription behind the small pill. |
| 5 Level 2 start screen | `586789d` | WORKING (375px and 1280px in the audit and axe) | Cream with a soft glow, Back top left, "Hear this" speaker, large Camera and Photo cards (single words, icons), Skip, Perceptron chip. Camera denied, missing or failed: one icon and at most four words, Photo stays. |

Reverted steps: none. Skipped on the owner's instruction: Step 2 (copy audit; a read-only audit workflow ran and its proposals were not applied), "Find it", Step 8 (café did-you-mean), Step 9 (Devpost, screenshots), Step L.

## Final checks before the merge

Unit tests: 23 files, 205 tests passed. Typecheck and lint clean. Secrets scan clean (no `.env*` or `.claude/settings.local.json` tracked). Full browser run on the final build: smoke 13, welcome 21, level1-shift 12, level2-mic 9, flow 15, conversation 10, report 15, motion 3, UI audit 13 screens at 375px and 13 at 1280px with 0 findings; every suite passed. While the branch was being built, the owner uploaded a smaller square logo straight to `saykind/main` (`aa74251`, `public/saykind-logo.png` only). That commit was merged into `overnight` (`bd6d617`, no conflicts), the Welcome logo box was made square (`5b68904`), and the build, typecheck, lint, unit tests and the Welcome and smoke suites were rerun on the result before `main` was fast-forwarded to `overnight` and pushed to `saykind`.

## Not verified

- Nothing was run on a real phone: the `100svh` change, the microphone and the camera on iOS and Android.
- Perceptron was called live only from a script (`docs/PERCEPTRON.md` has the numbers); the Level 2 page itself ran with mocked detection.
- The confirm call for a tapped object (JSON mode with a confidence) is supported by the server (`purpose: "confirm"`) but the sheet does not use it yet; low-confidence boxes still come only from JSON mode.
- The dignity filter is a word list: it catches the listed phrases, not every possible slight.

## Environment variables for Vercel (names only)

Required for the default setup: `ELEVENLABS_API_KEY`, `ANTHROPIC_API_KEY`, `PERCEPTRON_API_KEY`.
Optional: `ELEVENLABS_VOICE_ID`, `CLAUDE_MODEL`, `PERCEPTRON_MODEL`, `PERCEPTRON_MODEL_LIVE`, `PERCEPTRON_MODEL_CONFIRM`, `PERCEPTRON_BOX_MODE`, `NEXT_PUBLIC_UNLOCK_ALL_LEVELS` (build time; leave unset or `true`).
