# Authorship and the 70/30 rule

The hackathon rule is that at most 30% of the code may predate the event. This note records what git can and cannot show.

## What git shows

- The repository has 17 commits before the commit that adds this update. The earliest is `4409a83` ("VERSION A: baseline = Saykind as deployed"), committed 2026-10-17 at 19:36 Pacific. That is after the 12:30 Pacific event cutoff.
- **Commits before 12:30 Pacific: 0.** Git therefore shows **0 lines added before the cutoff**. This is a fact about the history, not a finding about the code.
- Git cannot show what existed before this history was created. The baseline commit is labelled "as deployed", so most of the baseline code probably predates the event, but the commit timestamps do not prove it.

## Lines added, all non-merge commits (text files, `package-lock.json` excluded; counted at the commit before this update)

| Author label in git | Lines added |
| --- | --- |
| `Saykind local` (baseline and the React Bits experiment work) | 13,249 |
| `Pranay Ratan` (Level 2 merge, Phases A to E, Phase F steps 0 to 6 except this commit) | 12,001 |
| `Devvrat Vaishnav` (docs and env template) | 25 |

`Saykind local` is the author label recorded in the commits, not a verified person. Confirm with Dev which person that identity belongs to.

## The 20 largest tracked files (excluding the lockfile, audio, images and fonts)

Line counts are at HEAD. "Introduced by" is the commit that first added the file.

| # | File | Lines | Introduced by | Likely origin |
| --- | --- | --- | --- | --- |
| 1 | `app/globals.css` | 2888 | baseline `4409a83` | Pre-existing (baseline). Café scene CSS and the bright theme block. |
| 2 | `components/reactbits/VoicePill.tsx` | 611 | baseline `4409a83` | Pre-existing (baseline). React Bits component. |
| 3 | `components/reactbits/SoftAurora.tsx` | 595 | copied in `d764bf0` | Written by React Bits, originally vendored on the experiment branch (`8906262`). Copied, not written here. |
| 4 | `components/reactbits/ClickSpark.tsx` | 489 | baseline `4409a83` | Pre-existing (baseline). React Bits component. |
| 5 | `components/reactbits/SplitText.tsx` | 465 | copied in `d764bf0` | Same as #3: copied from the experiment branch. |
| 6 | `components/reactbits/BlurText.tsx` | 444 | baseline `4409a83` | Pre-existing (baseline). React Bits component. |
| 7 | `components/cafe/Art.tsx` | 411 | baseline `4409a83` | Pre-existing (baseline). Café artwork. |
| 8 | `src/ui/level2/LiveCamera.tsx` | 398 | merge `14f16ed` | Written during the event (Level 2). |
| 9 | `src/ui/level2/ObjectSheet.tsx` | 321 | merge `14f16ed` | Written during the event (Level 2). |
| 10 | `lib/server/barista.ts` | 278 | baseline `4409a83` | Pre-existing (baseline). Café barista server code. |
| 11 | `lib/use-conversation.ts` | 277 | baseline `4409a83` | Pre-existing (baseline). |
| 12 | `components/saykind/DiscoverView.tsx` | 272 | baseline `4409a83` | Pre-existing (baseline). Dev's Level 2 "Discover" screen. |
| 13 | `lib/use-audio-recorder.ts` | 269 | baseline `4409a83` | Pre-existing (baseline). |
| 14 | `components/saykind/level1/Level1View.tsx` | 268 | baseline `4409a83` | Pre-existing (baseline). |
| 15 | `components/saykind/SessionView.tsx` | 262 | baseline `4409a83` | Pre-existing (baseline). |
| 16 | `components/cafe/CafeExperience.tsx` | 251 | baseline `4409a83` | Pre-existing (baseline). Café code. |
| 17 | `components/cafe/icons.tsx` | 247 | baseline `4409a83` | Pre-existing (baseline). Café icons. |
| 18 | `lib/saykind/use-practice.ts` | 232 | baseline `4409a83` | Pre-existing (baseline). |
| 19 | `lib/saykind/controllers/use-exercise.ts` | 232 | baseline `4409a83` | Pre-existing (baseline). |
| 20 | `components/saykind/kit.tsx` | 228 | baseline `4409a83` | Pre-existing (baseline). |

Summary for the 20 files: 16 are baseline (pre-existing per git, unverifiable as pre-event), 2 are copied React Bits components, and 2 are written during the event (the Level 2 live camera). The Level 2 camera also includes smaller files outside this top 20 (vision, camera, speech, tests), all written during the event.

## What is not verified

- Whether any baseline file predates 12:30 Pacific. The history cannot show it. Dev can confirm from their own records.
- The 70/30 result. By git timestamps the pre-event share is 0%. By the "as deployed" label it is probably high. Neither reading has been checked against Dev's records.

## Phases A to E (all committed after the baseline, attributed to the repository owner in git)

Everything below was written or changed after the `4409a83` baseline commit. Git attributes these commits to the repository owner's identity. None of it is claimed as written before the event.

**Written in this work (new files):**
- Café server: `lib/server/voice/` (ElevenLabs speech and transcription, speech helper with credit guard, transcribe helper), `lib/server/llm/` (Claude conversation, barista output contract, provider dispatcher), `lib/server/providers.ts` (provider choice and key names)
- Adaptive: `src/core/adaptive/` (types, closeness, rules, Claude adapter), `app/api/adapt/`, `lib/adaptive-client.ts`, `lib/saykind/controllers/use-adaptive.ts`
- Welcome screen: `components/saykind/WelcomeView.tsx`
- Tests: `lib/server/voice-llm.test.ts`, `src/core/adaptive/adaptive.test.ts`, `src/core/camera/geometry.test.ts`, `tests/e2e/smoke.mjs`
- Scripts: `scripts/check-elevenlabs.mjs`, `scripts/check-env.mjs`
- Docs: `docs/SETUP.md`, `docs/AUTHORSHIP.md` (this file)

**Copied from Dev's experiment branch (`origin/experiment/react-bits-full-ui`), file only, not merged:**
- `components/reactbits/SoftAurora.tsx`, `SplitText.tsx`, `FlipCard.tsx`, `SpringCheck.tsx`, `hugeicons-shim.tsx`, `Orb.tsx`, `CountUp.tsx`
- Those files were written by the React Bits authors and vendored by Dev's team in the experiment branch. They are not the repository owner's work.

**Changed in existing files:** the café server routes, the barista's model call (now provider-neutral), the guard (now per capability), the status route, the client voice hook (device-voice fallback), `WordCard`, the Level 2 overlay and start screen, the caregiver sheet and report, the level menu scrim, the Level 1 controller and screen (message line only), `.env.example`, `README.md`.

**Honest limits**
- Git shows no commits before 12:30 Pacific, so the 70/30 split cannot be measured from history. This section describes what was added after the baseline. It does not show what predates the event.
- The flip card is on the Level 2 object sheet, not on Dev's Level 1 screen.
- The Puppeteer suite is a smoke run with mocks, not full coverage.
- Nothing above has been run against live ElevenLabs, Anthropic or Perceptron services.


## Phase F (steps 0 to 6)

Written after the baseline, by the repository owner's identity in git, with an AI coding assistant doing the typing under direction. Not claimed as pre-event work.

**New:** the session report (`lib/report/*`, `lib/server/report.ts`, `app/api/report/`, `components/report/*`, `app/report/print/`), the café session object (`lib/cafe-session.ts`), level unlocking and return markers (`lib/saykind/unlock.ts`), Level 2 Back and Next buttons (`src/ui/level2/FlowButtons.tsx`), `components/reactbits/SpotlightCard.tsx` (written for this app in the pattern of the React Bits Spotlight Card, **not copied from the package**), the browser suites `tests/e2e/{helpers,flow,conversation,report,motion,audit,run}.mjs`, and `docs/{CAFE_CONVERSATION,REPORTS}.md`.

**Changed in existing files:** the barista prompt and a language safety net (`lib/server/barista.ts`), the conversation hook (session, device-voice start guard), the café end state (a "See my report" button instead of a timer), the café controls and menu panel CSS (`app/globals.css`, tokens only, short-phone compaction removed), the shared kit sizes and tokens, Dev's Level 1 screens (sizes and colour values only, layout kept), Level 2 classes (tokens), the Welcome logo, the caregiver view (Spotlight Cards), Settings (doctor fields), the ElevenLabs default voice and its 402 message, the detect timeout and retry.

## Overnight branch (2026-10-18)

Written after Phase F by the repository owner's identity in git, with an AI coding assistant doing the typing under direction; see `docs/OVERNIGHT_REPORT.md` for the step list and commits. Not claimed as pre-event work.

**Copied, not written:** `app/fonts/*.woff2` are the Google Fonts files for Atkinson Hyperlegible Next and Bricolage Grotesque (SIL OFL, licences beside them).

**New files written here:** `lib/tone.ts` and its test, `docs/TONE.md`, `src/core/autoStop.ts` and its test, `src/ui/level2/useAutoStop.ts`, `src/core/vision/parseAnnotations.ts` and its test, `src/core/vision/runDetection.test.ts`, `docs/PERCEPTRON.md`, `tests/e2e/{welcome,level1-shift,level2-mic}.mjs`, `app/fonts/README.md`.

**Changed:** the Welcome screen, the Level 2 start screen and object sheet (now on the Level 1 recorder), the Perceptron adapter and detection runner, the barista prompt and reply filter, the adaptive messages, the report prompt and template, the unlock default, `app/layout.tsx` (local fonts), the viewport height in `app/globals.css`, the flow and audit suites, and the env template and setup docs.

**Honest limits**
- Dev's Level 1 screen was not given the Flip Card, because that would replace his layout.
- Nothing in Phase F has been run against live ElevenLabs or Perceptron. `/api/report` was called once against live Anthropic with sample numbers.
- The 70/30 question is still not answerable from git.
