# Tone: a dignity-first voice

Every line Saykind or its models say to the person speaks to a capable adult, politely and warmly. The person has aphasia; they have not lost their judgement, their adulthood or their time.

## The rules

- Polite and warm, used naturally: "please", "thank you", "of course", "take your time".
- Never baby talk, cheering ("good job", "well done", "you did it"), praise of a choice ("great choice", "excellent", "nice", "perfect"), pity ("don't worry", "no worries") or pet names. Confirm plainly instead: "An Americano, of course."
- Never blame the listener for not understanding ("I can't understand you"). Put it on yourself: "Let me check I have that right."
- No impatience words: "just", "simply", "obviously", "quickly", "hurry".
- No comment on slowness or ability, ever. No scores, levels, grades or percentages shown to the person.
- Nothing is "wrong", a "mistake" or "incorrect". Help, repeats and listening again are ordinary parts of practice.
- When something was not understood: say so on your own account, offer the pictures, ask one question at a time, and never finish the person's words.
- Reports (for a doctor or caregiver) use person-first, strength-based language: "the person practiced", "what helped", never "struggles", "unable", "poor", "aphasic" or a diagnosis.

## Where it is enforced

| Place | How |
| --- | --- |
| `lib/tone.ts` | `UNDIGNIFIED` (the phrase list), `hasUndignifiedLanguage()`, `politeSentences()` and `TONE_RULES` for prompts. |
| Barista (`lib/server/barista.ts`) | The system prompt quotes `TONE_RULES` and the "Let me check I have that right" pattern. `calmReply()` drops any sentence that fails and falls back to a polite question for the open slot. The timeout fallback line follows the rules. The JSON order contract is unchanged. |
| Adaptive layer (`src/core/adaptive/rules.ts`, `claude.ts`) | The five rule messages were rewritten; the Claude prompt carries the rules for `message` and `careNote`. |
| Doctor report (`lib/server/report.ts`, `lib/report/template.ts`, `lib/report/language.ts`) | The prompt asks for person-first, strength-based wording; the template uses it; `containsBannedLanguage()` also rejects "struggles", "unable", "suffer", "aphasic", cheering and pity, and a rejected report falls back to the template. |
| Level 1 feedback (`lib/saykind/controllers/use-exercise.ts`) | "Nice effort" became "Thank you"; a missed recording says "Let me listen once more". |
| Level 2 (`src/ui/level2/*`) | The sheet says "Thank you." with what was heard and offers "Hear me"; photo and budget notices were softened. |

## Tests

`lib/tone.test.ts` checks the phrase list against patronising and dignified lines, the adaptive messages, the template report and the microphone messages. `lib/server/calm-reply.test.ts` checks the barista safety net. `lib/report/report.test.ts` and `src/core/adaptive/adaptive.test.ts` keep their score and judgement checks.
