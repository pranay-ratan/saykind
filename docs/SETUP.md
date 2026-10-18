# Setup: every placeholder in Saykind

This page lists everything you need to fill in or add, where it goes, and what breaks without it. Nothing here is a secret. Keys go only in the places named below.

## Where environment values go

- **Local:** a file named `.env.local` in the project root, next to `package.json`. Create it with `cp .env.example .env.local`. It is git-ignored, so keys you paste there are never committed.
- **Vercel:** Project > Settings > Environment Variables. Add each name for the environments you deploy to, then redeploy.
- **Check what is set:** `npm run check:env` prints every variable as SET or MISSING. It never prints a value.

The app starts without any key. A missing key shows a calm message in the feature that needs it.

## Environment variables

| Name | What it is | Where to get it | Required? | What breaks without it |
| --- | --- | --- | --- | --- |
| `ELEVENLABS_API_KEY` | ElevenLabs key for the café's spoken voice and listening | https://elevenlabs.io (Profile > API keys). Needs **Text to Speech** and **Speech to Text** permission. | **Required** for the café | The café can't speak or hear. Users see "The voice service isn't set up yet." If the key is present but lacks permission, users see the permission message. |
| `ELEVENLABS_VOICE_ID` | Which ElevenLabs voice speaks | ElevenLabs voice library: copy a voice's ID | Optional | The default stock voice `JBFqnCBsd6RMkjVDRZzb` is used. **Level 2's own speech route (`/api/tts`) needs this set**, because it has no default. |
| `ELEVENLABS_MAX_CHARS_PER_DAY` | Daily cap on characters sent to ElevenLabs for the café (in memory, resets at UTC midnight) | You choose | Optional (default `30000`) | Nothing breaks. Past the cap, lines are read by the device voice. |
| `ELEVENLABS_STT_MODEL` | ElevenLabs speech-to-text model | ElevenLabs docs | Optional (default `scribe_v1`) | Nothing breaks. |
| `ANTHROPIC_API_KEY` | Claude key for the café conversation | https://console.anthropic.com/ | **Required** for the café conversation (Claude is the default) | The barista can't reply. Users see "The voice service isn't set up yet." |
| `CLAUDE_MODEL` | Claude model name | Anthropic models overview | Optional (default `claude-haiku-5-5`) | If Anthropic rejects the name, set `claude-sonnet-5-5`. |
| `SPEAK_PROVIDER` | Force `elevenlabs` or `openai` for spoken audio | You choose | Optional | Defaults to ElevenLabs when its key is set, otherwise OpenAI. |
| `TRANSCRIBE_PROVIDER` | Force `elevenlabs` or `openai` for listening | You choose | Optional | Same as above. |
| `CONVERSE_PROVIDER` | Force `claude` or `openai` for the conversation | You choose | Optional | Defaults to Claude when its key is set, otherwise OpenAI. |
| `OPENAI_API_KEY` | OpenAI key, a fallback only | https://platform.openai.com/api-keys | Optional | Nothing breaks while ElevenLabs and Claude keys are set. |
| `OPENAI_STT_MODEL`, `OPENAI_CHAT_MODEL`, `OPENAI_TTS_MODEL`, `OPENAI_TTS_VOICE`, `OPENAI_BASE_URL` | OpenAI model, voice and endpoint overrides | OpenAI docs | Optional | Defaults are used. |
| `RATE_LIMIT_PER_MINUTE`, `DAILY_LIMIT_PER_CLIENT`, `HOURLY_LIMIT_GLOBAL` | Spending limits per visitor and per app | You choose | Optional (defaults `90`, `600`, `2000`) | Defaults are used. |
| `VISION_PROVIDER` | Level 2 detector: `perceptron` or `gemini` | You choose | Optional (default `perceptron`) | Nothing breaks. |
| `PERCEPTRON_API_KEY` | Perceptron key for Level 2 object detection | https://docs.perceptron.inc | **Required** for Level 2 (default detector) | Level 2 can't detect objects. The page says so calmly. |
| `PERCEPTRON_MODEL` | Perceptron model name | Perceptron docs | Optional (default `perceptron-mk1.5`) | **Speed option:** set `PERCEPTRON_MODEL=isaac-0.3-fast` if detection feels slow. Each detect call waits up to 15 seconds and is retried once on a timeout; boxes already on screen stay and a calm "Looking again." line shows. |
| `GEMINI_API_KEY` | Gemini key, development fallback for Level 2 | https://aistudio.google.com/app/apikey | Required **only** when `VISION_PROVIDER=gemini` | Gemini detection is unavailable. |
| `GEMINI_MODEL` | Gemini model name | Google AI docs | Optional (default `gemini-2.5-flash`) | Default is used. |
| `TTS_PROVIDER` | Level 2 spoken audio: `browser` or `elevenlabs` | You choose | Optional (default `browser`, no key needed) | `elevenlabs` also needs `ELEVENLABS_API_KEY` and `ELEVENLABS_VOICE_ID`. |
| `TTS_PREWARM_SECRET` | Secret that unlocks `GET /api/tts?prewarm=1`, which pre-generates practice-word audio (spends credits) | Generate one (below) | Optional | The prewarm route stays closed. Nothing else changes. |
| `LIVE_MAX_CALLS` | Level 2 detection calls per session before "Keep looking" | You choose | Optional (default `150`) | Default is used. |
| `LIVE_INTERVAL_MS` | Default time between Level 2 checks, in milliseconds | You choose | Optional (default `1500`) | Default is used. |
| `ADAPTIVE_PROVIDER` | Level 1 difficulty adjuster: `rules` or `claude` | You choose | Optional (default `rules`, no key needed) | With `claude`, the key is `ANTHROPIC_API_KEY`. Any error falls back to the rules. |
| `NEXT_PUBLIC_UNLOCK_ALL_LEVELS` | `true` (the default) keeps every level open from the menu, with Level 2 optional; `false` opens the café and phrases only after Level 2 is practiced on this device | You choose | Optional (default `true`) | Nothing breaks. With `false`, Levels 3 and 4 show "Opens after Level 2" until a word is practiced on /level-2. Set at build time on Vercel, so redeploy after changing it. |

### Generate `TTS_PREWARM_SECRET`

```bash
openssl rand -hex 16
```

Paste the output into `.env.local` as `TTS_PREWARM_SECRET=`, then send the same value in an `x-prewarm-secret` header when you call `GET /api/tts?prewarm=1`.

## Non-environment placeholders

| Placeholder | File and line | What it is | What to do | What breaks without it |
| --- | --- | --- | --- | --- |
| Logo image | `public/saykind-logo.png` (file missing); the reserved slot is `components/saykind/WelcomeView.tsx:47` | The Saykind logo for the Welcome screen | Add a PNG at `public/saykind-logo.png`, then show it above the headline with `mix-blend-mode: multiply` | Nothing. The space is reserved, so there is no layout shift. |
| Empty-state item | `lib/saykind/controllers/use-discovery.ts:21`, `:38`, `:44` (`PLACEHOLDER`) | Internal empty item used before a photo is taken | No action | None. It is code, not a value to set. |
| Caregiver name hint | `components/saykind/SettingsView.tsx:66` ("For example, Sam") | Hint text in a field | Replace with any hint you like | None. |
| Caregiver phone hint | `components/saykind/SettingsView.tsx:67` ("For the call button") | Hint text in a field | Same | None. |
| Discover word field hint | `components/saykind/DiscoverView.tsx:246` ("Or type a word") | Hint text in a field | Same | None. |
| Level 2 typed-word hint | `src/ui/level2/ObjectSheet.tsx:309` ("Type the word") | Hint text in a field | Same | None. |
| Photo loading placeholder | `src/ui/WordCard.tsx:19` (`PhotoPlaceholder`) | Shown while a crop loads | No action | None. |
| Test fixtures | `lib/server/voice-llm.test.ts` (`test-key`, `SECRET-VALUE-123`) | Fake keys used by the unit tests to check that keys are never printed | No action. These are not real keys. | None. |
| Key blanks | `.env.example` (every `KEY=` line) | Blank keys in the template | Fill them in `.env.local` | See the variable table above. |

## Checks you can run

- `npm run check:env`: which variables are SET or MISSING. Values are never printed.
- `npm run check:elevenlabs`: one tiny text-to-speech call, then speech-to-text on the audio. Prints PASS or FAIL for each step. A 401 or 403 means the key lacks the Text to Speech or Speech to Text permission.
- `npm run check:perceptron -- path/to/photo.jpg`: one live Perceptron call. Prints the raw reply, the boxes on the 0 to 1 scale, and the latency.

## What has been checked in this repository

- `check:env` was run against the template and the local `.env.local`. It reports the three keys the default setup needs and says the app still starts.
- `check:elevenlabs`: **not run.** No ElevenLabs key is set. It prints the setup message and exits, which was confirmed.
- `check:perceptron`: **skipped.** `PERCEPTRON_API_KEY` is not set and no test image was supplied, so there is no box format or latency to record here yet.
- The ElevenLabs and Claude code paths are covered by unit tests that stub the network. They have not been run against the live services, so latency, lip-sync timing and free-plan limits are unverified.

## Vercel

1. Import the repository at https://vercel.com/new.
2. Project > Settings > Environment Variables: add the names above that you use.
3. Deployments > Redeploy.
4. Open the preview URL on a phone at `/level-2`. The camera and microphone need that `https` address.


## Troubleshooting the browser suites

- `npm run test:e2e` needs a production build served at `BASE_URL` (`npm run build && npm start`, default `http://localhost:3000`) and Chrome (`CHROME_PATH`).
- If a CSS change does not show up in a build, delete `.next` and build again (`rm -rf .next`). Turbopack can serve a stale stylesheet from its cache.
- `tests/e2e/audit.mjs` prints every screen that breaks a UI rule. It checks 20px text, 64px targets, red colours, white or coral text on coral, and sideways overflow at `AUDIT_WIDTH` (375 or 1280).

## Reports and the doctor's email

A report uses `ANTHROPIC_API_KEY` and `CLAUDE_MODEL`; without a key a fixed template is used. The doctor's name and email are entered in Settings (or in the report preview) and stay on the device. **Server-side email is planned and not built**: "Email to my doctor" opens the person's own mail app. See [`docs/REPORTS.md`](REPORTS.md).

## Vercel: variable names to set

`ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID` (optional; default is the premade voice `JBFqnCBsd6RMkjVDRZzb`), `ANTHROPIC_API_KEY`, `CLAUDE_MODEL` (optional), `PERCEPTRON_API_KEY`, `PERCEPTRON_MODEL` (optional), `NEXT_PUBLIC_UNLOCK_ALL_LEVELS` (optional, build time; leave unset or `true` so every level stays open).
