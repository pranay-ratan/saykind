# Putting Saykind on the internet (Vercel, no GitHub)

Why: iPhone Safari only allows the microphone on an **https** page. `http://<laptop IP>:3100` can never get the mic; a hosted https URL can.

**Deployed 2026-10-17 to https://saykind.vercel.app (Vercel project `saykind`, team dev-2d94). Updates: `npm run deploy`.**
`vercel.json` sets `framework: nextjs` (a CLI-created project defaults to "Other", which served a 404).

## What is already prepared in the code (local only)
- `maxDuration = 60` on the three AI routes (the hosted function limit).
- Uploads are capped at 4 MB (hosts refuse ~4.5 MB); a too-long recording shows the existing "too long" message.
- Spend guard keys visitors by `x-vercel-forwarded-for` (set by Vercel, can't be faked by the visitor).
- Headers: `Permissions-Policy: microphone=(self), camera=(self)` (keeps the mic available to our pages), no framing, no referrer leaks, `noindex`.
- `.vercelignore`: `.env*`, `docs`, `scripts`, and the unused reference image are never uploaded.
- `package.json`: `engines.node = 24.x`, and `npm run deploy`.
- No code refers to localhost or a LAN address (checked). The browser only calls relative `/api/...` paths.

## One-time setup (needs approval)
1. `npx vercel@64.5.0 login` (browser sign-in).
2. `npx vercel@64.5.0 link` to a project (new `saykind`, or the project already linked in `.vercel/`).
3. Put the key in Vercel's server-side environment (never in the browser, never in a file that gets uploaded):
   `vercel env add OPENAI_API_KEY production` (paste the value when prompted; it is not echoed).
4. `npm run deploy` (= `vercel deploy --prod`). It uploads the source minus `.vercelignore` to a **private** Vercel project and builds there.

## Every later update
```
npm run build && npm start     # try it locally first
npm run deploy                 # publish; the production URL does not change
```
Then refresh the page on the phone.

## Cost protection (honest version)
- Practice words are ready-made mp3 files: they never call the AI.
- Only transcription, the barista chat and the barista voice cost money.
- The in-app limits (per minute, per day, per hour) live **in memory of each hosted instance**, so on Vercel they slow abuse but are not a hard cap.
- The hard cap is on the OpenAI side: use a dedicated key in a dedicated OpenAI project with a monthly budget.
- Optional: an access code, or a longer-term limiter backed by a shared store. Not built yet.

## Privacy
- Practice log, settings, progress, saved recordings and caregiver details live only in the browser (localStorage / IndexedDB). They are never uploaded by the app.
- A recording leaves the phone only when the person finishes a turn: phone -> our `/api/transcribe` -> OpenAI -> text back. We do not store or log the audio.
- Vercel keeps ordinary request logs (path, status, IP), not request bodies. OpenAI handles API data under its own policy.
- The `/caregiver` page is a public route but only ever shows the data stored in the visitor's own browser.

## Real iPhone first test (to be done by the owner; nothing here is verified yet)
1. Open the https link in Safari. Tap the mic: Safari should ask once for permission.
2. Level 1 Chair: tap the speaker (normal), then the snail (slow). Check both are audible with the silent switch off.
3. Record "chair". Confirm the level bar moves, then stop. Check "I heard ..." appears.
4. Continue to the next word; reload the page and confirm the progress is kept.
5. Level 3 café: the barista speaks; answer by voice; order a drink.
6. Anything that fails: note the screen, what you tapped, and the message.
