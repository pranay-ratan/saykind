# Authorship and the 70/30 rule

The hackathon rule is that at most 30% of the code may predate the event. This note records what git can and cannot show.

## What git shows

- The repository has 21 commits. The earliest is `4409a83` ("VERSION A: baseline = Saykind as deployed"), committed 2026-10-17 at 19:36 Pacific. That is after the 12:30 Pacific event cutoff.
- **Commits before 12:30 Pacific: 0.** Git therefore shows **0 lines added before the cutoff**. This is a fact about the history, not a finding about the code.
- Git cannot show what existed before this history was created. The baseline commit is labelled "as deployed", so most of the baseline code probably predates the event, but the commit timestamps do not prove it.

## Lines added, all non-merge commits (text files)

| Author label in git | Lines added |
| --- | --- |
| `Saykind local` (baseline and the React Bits experiment work) | 31,249 |
| `Pranay Ratan` (Level 2 merge, Phase 2 to 4 commits) | 8,177 |
| `Devvrat Vaishnav` (docs and env template) | 71 |

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
