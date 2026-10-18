"use client";

import { useHeld, usePresence } from "@/lib/use-presence";
import { CheckIcon, SpeakerIcon } from "./icons";

/** A small "Got it" badge: their meaning got through. Based on the validated order, never on transcription. */
function Acknowledgement({ text }: { text: string | null }) {
  const held = useHeld(text);
  const presence = usePresence(!!text);
  if (!presence.mounted || !held) return null;
  return (
    <div className="ack" data-presence="pop" data-state={presence.state} role="status">
      <span className="ack-check" aria-hidden="true">
        <CheckIcon />
      </span>
      <span>
        <span className="sr-only">Understood: </span>
        {held}
      </span>
    </div>
  );
}

type DialogueProps = {
  caption: string;
  show: boolean;
  /** True while the barista's voice is actually playing. */
  speaking: boolean;
  canReplay: boolean;
  onReplay: () => void;
  acknowledgement: string | null;
};

/**
 * What the barista says, as a calm bubble anchored beneath him. The words are
 * the content; there is no per-word animation, so they stay easy to read.
 */
export default function Dialogue({ caption, show, speaking, canReplay, onReplay, acknowledgement }: DialogueProps) {
  const held = useHeld(caption);
  const presence = usePresence(show && !!caption);
  if (!presence.mounted || !held) return null;

  return (
    <div className="dialogue" data-presence="rise" data-state={presence.state}>
      <Acknowledgement text={acknowledgement} />
      <div className="bubble">
        <div className="bubble-body">
          <p className="bubble-name" aria-hidden="true">
            Sam
            <span className="speaking" data-active={speaking}>
              <span />
              <span />
              <span />
            </span>
          </p>
          <p key={held} className="bubble-text" aria-hidden="true">
            {held}
          </p>
        </div>
        <button type="button" className="icon-button" onClick={onReplay} disabled={!canReplay} aria-label="Hear that again">
          <SpeakerIcon className="size-6" />
        </button>
      </div>
    </div>
  );
}
