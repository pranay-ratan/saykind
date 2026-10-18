# The café conversation

Mic, then `/api/transcribe` (ElevenLabs Scribe), then `/api/converse` (Claude), then `/api/speak` (ElevenLabs voice, lip-synced), looping until the order is complete.

## What exists (audited)

| Piece | Where | State |
|---|---|---|
| Greeting | `GREETING` in `lib/menu.ts`, spoken by `lib/use-conversation.ts` | Working |
| Multi-turn flow | `lib/use-conversation.ts` (speaking, yourTurn, recording, thinking, ended) | Working. A turn ends only when the person taps; nothing is timed |
| Changes of mind | `applyUpdates` in `lib/order.ts` plus the prompt | Working |
| Menu validation | The server owns the order: only menu ids are accepted, a mismatching reply is corrected once | Working |
| Order complete | `order.finished`, phase `ended`, closing line, then the **See my report** button (no timer) | Working |
| Menu and Help pictures | `components/cafe/ItemSheet.tsx` calls `choose()` on the same conversation | Working |
| Device-voice fallback | `lib/use-barista-voice.ts`: if the server voice fails the device voice reads the line, and if that cannot start within 3 seconds the line stays as a caption | Working |
| Session object | `lib/cafe-session.ts`, held in memory by `useConversation`, written to the practice log as a `cafe_session` event on confirm or exit | Added |

## The session

`{ turns: [{ who, text, ts }], order, helpRequests, menuHelpUsed, followUpsNeeded, startedAt, endedAt }`

- `helpRequests`: times the Help sheet was opened.
- `menuHelpUsed`: the menu pictures were opened, or an answer was given by tapping.
- `followUpsNeeded`: turns where the barista could not make out the answer and asked again.
- It is written once, when the order is confirmed (`completed: true`) or when the person leaves or starts again (`completed: false`). Visits with no spoken or tapped answer are not recorded. Stored on this device only.

## The barista prompt

The JSON order contract is unchanged. The prompt now also asks for: short sentences, one question at a time, fragments accepted, a short confirm-back, never finishing or correcting the person's words, never "perfect", no scores, no hurrying. An unclear or empty turn gets one gentle question and a pointer to the menu pictures. As a safety net, `calmReply` in `lib/server/barista.ts` drops any sentence that contains "perfect", "wrong", "incorrect", "mistake", "score", "good job" or "well done".

## Tests

`lib/cafe-session.test.ts`, `lib/server/barista-turn.test.ts`, `lib/server/calm-reply.test.ts` (unit) and `tests/e2e/conversation.mjs` (browser, mocked speech, transcription and Claude): a full order with a fragmented utterance, a change of mind, an empty turn, a picture answer, the complete state, the logged session, and the failed-voice fallback.
