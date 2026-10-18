# Level 2 (Discover objects): integration guide

> The function to call with a result is `useDiscovery().receiveDiscovery({ image, label, confidence?, correctedLabel?, syllables? })`; see `docs/UI_INTEGRATION.md` section 3. The notes below describe the camera screen and the optional recogniser contract.

Another teammate is building object recognition. This repository only provides the **camera screen and the contract**; it does not recognise anything.

## What exists

- `components/saykind/DiscoverView.tsx`: the screen. It asks for the camera only when the person taps "Open camera", shows a live view, takes **one still when the person presses the shutter** (nothing is captured automatically), stops the camera straight away, and hands the still to the recogniser.
- `lib/saykind/discover.ts`: the interface (`ObjectRecognizer`, `RecognitionResult`) and `registerRecognizer()`.
- Once a result comes back, the person gets exactly the Level 1 learning screen for it: the photo they took as the picture, the written word, normal audio, the snail (slow) audio, syllables, speaking practice, retries, and the practice record.

## The contract

```ts
import { registerRecognizer } from "@/lib/saykind/discover";

registerRecognizer({
  async identify(image: Blob, { signal }) {
    // image is a JPEG. Call your model or your server route (keep any API keys on the server).
    return { status: "ok", label: "Table", syllables: ["ta", "ble"], confidence: 0.82, alternatives: ["Desk", "Counter"] };
    // or { status: "none" }, or { status: "unavailable", reason: "offline" }
  },
});
```

- Return `status: "ok"` with a plain `label` (a single everyday word is best). If `confidence` is below 0.6, or you give `alternatives`, the screen asks "Is this a table?" and offers the alternatives; it never shows the number.
- `syllables` is optional. If you omit it, the word is shown as one part; do not invent syllable splits.
- Audio: if no recording exists for the label, the app asks the server's voice (`/api/speak`, style `word`) and plays it at normal or slow speed. Nothing for you to do.
- Privacy: the photo stays in the browser unless **your** recogniser sends it somewhere. If it does, say so on screen.

## Browser notes

- `getUserMedia` for the camera needs https (or `localhost`), exactly like the microphone.
- iOS Safari: request the camera from a tap (we do), and use `playsInline` on the video (we do).
- Camera permission denied, no camera, and insecure page each have their own plain message in the screen.

## Without a recogniser

The screen says "Object recognition isn't connected yet" and lets the person choose what they photographed from the five Level 1 objects or type a word, so the rest can be reviewed and demonstrated honestly.
