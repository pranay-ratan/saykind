# Perceptron in Level 2

Level 2 points the phone's camera at the room, asks Perceptron what is there, and draws a box with a word on each object. Everything below was checked against docs.perceptron.inc and one live run on 2026-10-18; nothing is claimed beyond that.

## Models

| Name | Status (2026-10-18) | Use here |
| --- | --- | --- |
| `perceptron-mk1.5` | The current model on the API (text, image, video, audio; function calling; native annotations). | Default for both slots. |
| `perceptron-mk1` | Also listed by the API. | Not used. |
| `isaac-0.1`, `isaac-0.2-*` | Retired from the Perceptron API: 404 `model_not_found`. | Not used. |
| `isaac-0.3-fast` | Never launched (removed from the SDK in its PR #90). A live call answers `404 {"error":{"code":"model_not_found"}}`. | Not used. |

Two slots: `PERCEPTRON_MODEL_LIVE` (the camera loop) and `PERCEPTRON_MODEL_CONFIRM` (a tapped object, where a confidence matters). Each defaults to `PERCEPTRON_MODEL` (default `perceptron-mk1.5`). When the API rejects a name (404, `model_not_found` or `model_renamed`), the server remembers the name for the rest of the process and uses `PERCEPTRON_MODEL` instead, straight away, without a visible failure (`src/core/vision/runDetection.ts`).

## Request shape

Endpoint: `POST https://api.perceptron.inc/v1/chat/completions`, `Authorization: Bearer <PERCEPTRON_API_KEY>`. The key is read on the server only.

**Box mode (the live loop, default):** Perceptron's native annotations, no reasoning, a small token budget.

```json
{
  "model": "perceptron-mk1.5",
  "messages": [{ "role": "user", "content": [
    { "type": "image_url", "image_url": { "url": "data:image/jpeg;base64,..." } },
    { "type": "text", "text": "Point out up to 6 everyday objects in this photo with one point_box each. Use a common lowercase noun (1 or 2 words) as the mention." }
  ]}],
  "max_completion_tokens": 320,
  "temperature": 0,
  "reasoning_effort": "none",
  "vision_config": { "annotation_format": "box" }
}
```

The reply's `message.content` is markup, one tag per object, for example:

```
<point_box mention="chair"> (150,657) (475,1000) </point_box>
<point_box mention="mouse"> (411,575) (456,594) </point_box>
```

**JSON mode (`PERCEPTRON_BOX_MODE=json`):** the older prompt (`src/core/vision/prompt.ts`) that asks for a JSON array of `{label, confidence, box}`; `temperature: 0`, `max_completion_tokens: 600`.

**Confirm call (a tapped object, `purpose: "confirm"` on `POST /api/detect`):** the crop of the tapped box, on the `PERCEPTRON_MODEL_CONFIRM` slot, with a strict JSON schema answer (`src/core/vision/confirmObject.ts`):

```json
{
  "model": "perceptron-mk1.5",
  "messages": [{ "role": "user", "content": [
    { "type": "image_url", "image_url": { "url": "data:image/jpeg;base64,..." } },
    { "type": "text", "text": "What is the main everyday object in this photo? Answer with one common lowercase noun (1 or 2 words), up to 2 alternative nouns, and your confidence from 0 to 1." }
  ]}],
  "max_completion_tokens": 200,
  "temperature": 0,
  "reasoning_effort": "none",
  "response_format": { "type": "json_schema", "json_schema": { "name": "object_name", "strict": true, "schema": { "type": "object", "additionalProperties": false, "required": ["label", "alternatives", "confidence"], "properties": { "label": { "type": "string" }, "alternatives": { "type": "array", "items": { "type": "string" }, "maxItems": 2 }, "confidence": { "type": "number", "minimum": 0, "maximum": 1 } } } } }
}
```

The reply is `{"label": "mug", "alternatives": ["cup"], "confidence": 0.42}` (measured live at about 0.7 s). The sheet asks "Is it a mug?" with big buttons for the label, the alternatives and the box's own word only when the confidence is under 0.5 or the label differs from the box; otherwise nothing changes. The same timeout, retry and rejected-model fallback apply.

## Normalization

- Native coordinates are integers on a 0 to 1000 grid, origin top-left, top-left corner then bottom-right (docs: concepts/coordinates). `src/core/vision/parseAnnotations.ts` reads every `point_box` with a `mention`; a box with no mention cannot be named and is skipped. The markup carries no confidence, so these boxes count as confidence 1 and the sheet never asks "Is that right?" for them; a confirm call (JSON mode) is what carries a confidence.
- `src/core/vision/normalize.ts` maps 0 to 1000 (or 0 to 1, or pixels when the frame size is known) to 0..1, drops boxes under the confidence threshold, merges near-duplicates with the same label (IoU over 0.6) and keeps at most 6. Labels are lowercased, brackets removed ("glass (drink container)" becomes "glass"), at most two words.
- The overlay (`src/core/camera/layout.ts`) maps 0..1 boxes onto the `object-fit: cover` video. A front camera mirrors the boxes with the preview.

## Throttling

- Client (`src/core/camera/useLiveDetection.ts`): one call at a time; every `LIVE_INTERVAL_MS` (1.5 s by default, 1 s or 3 s from Settings) only when the tab is visible, the sheet is closed, the device is online, the budget (`LIVE_MAX_CALLS`, default 150 per session) is not used up, and the 32x32 scene signature changed by more than 0.04 (or 8 s passed). Frames are 640 px JPEG at quality 0.7.
- Server (`app/api/detect/route.ts`): 60 requests per minute per address, bodies over about 2.7 MB refused, a 15 s timeout per provider call with one retry on timeouts and 5xx, 429 from Perceptron answered as a calm "resting" notice.
- Perceptron's own defaults (docs: guides/scaling): about 300 chat completions per minute per organisation, a 120 s request budget, bodies up to 20 MiB.

## Measured on 2026-10-18 (one laptop, 640x427 photos, `perceptron-mk1.5`)

| Call | Latency | Result |
| --- | --- | --- |
| JSON prompt (old live loop) | 2563 ms | 6 objects with confidences |
| Box mode, `reasoning_effort: none` | 644 to 1193 ms | 1 to 6 boxes, labels in `mention` |
| Box mode, `reasoning_effort: minimal` or `low` | 1500 to 1700 ms | the budget went to reasoning: `finish_reason: length`, no boxes |
| `POST /v1/detect` (the managed detector, pixel boxes) | 6802 ms (with categories) to 15829 ms (without) | too slow for a live loop; not used |
| JSON schema confirm ("what is this object", label + 2 alternatives + confidence) | 697 ms | `{"label":"pagoda","alternatives":["temple"],"confidence":0.95}` |

## Fallbacks

1. A rejected model name: fallback to `PERCEPTRON_MODEL` (above).
2. A box-mode reply with no markup: tried as JSON; plain prose means nothing seen.
3. Timeouts and 5xx: one retry, then "Trying again." while the boxes already on screen stay.
4. `VISION_PROVIDER=gemini`: a development-only fallback using the JSON prompt.

## Not done

- "Find it" (speak a Level 1 word, sweep the camera until Perceptron finds it) is not built.
- Nothing has been run on a real phone.

Perceptron is credited on the Level 2 start screen and in the README.
