'use client';

import { NEXT_AFTER_LEVEL2, RETURN_FROM_LEVEL2 } from '@/lib/saykind/unlock';

interface FlowButtonsProps {
  /** True once the person has played or recorded a word, so the next step is offered. */
  canContinue: boolean;
}

const BUTTON =
  'flex min-h-[64px] flex-1 items-center justify-center rounded-full px-6 text-center text-xl font-semibold focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-deep-teal';

/* Plain links on purpose: a full page load stops the camera and lets the app read where the person is coming from. */

/** The way out of Level 2: back to the level menu, and on to the café once a word has been practiced. */
export function FlowButtons({ canContinue }: FlowButtonsProps) {
  return (
    <nav
      aria-label="Level navigation"
      className="absolute inset-x-4 z-30 mx-auto flex max-w-lg gap-3"
      style={{ bottom: 'max(1rem, env(safe-area-inset-bottom))' }}
    >
      <a href={RETURN_FROM_LEVEL2} className={`${BUTTON} bg-cream text-plum`}>
        Back to levels
      </a>
      {canContinue && (
        <a href={NEXT_AFTER_LEVEL2} className={`${BUTTON} bg-deep-coral text-white`}>
          Next: the café
        </a>
      )}
    </nav>
  );
}
