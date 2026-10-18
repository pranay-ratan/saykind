'use client';

import type { ChangeEvent, ReactNode } from 'react';
import { BackIcon, CameraIcon, SpeakerIcon } from '@/components/cafe/icons';
import { NEXT_AFTER_LEVEL2, RETURN_FROM_LEVEL2 } from '@/lib/saykind/unlock';
import { playWord } from '@/lib/word-audio';
import type { CameraStatus } from '../../core/camera/useCamera';

interface StartScreenProps {
  status: CameraStatus;
  photoBusy: boolean;
  photoMessage: string | null;
  onOpenCamera: () => void;
  onChoosePhoto: (file: File) => void;
}

const TITLE = 'Look around you';

/** Lavender top right, peach bottom left: glows only, on the cream page. */
const GLOW =
  'radial-gradient(70% 55% at 100% 0%, rgba(191,165,212,0.45), transparent 70%), radial-gradient(70% 55% at 0% 100%, rgba(246,201,176,0.45), transparent 70%)';

const CARD =
  'flex min-h-[168px] w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-[2rem] bg-white text-plum focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-deep-teal disabled:opacity-60';
const CARD_STYLE = { border: 'var(--card-border)', boxShadow: 'var(--card-shadow)' } as const;
const ROUND =
  'flex size-16 items-center justify-center rounded-full bg-white text-plum focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-deep-teal';
const LINK =
  'flex min-h-[64px] items-center justify-center rounded-full bg-white px-8 text-xl font-bold text-plum focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-deep-teal';

/** One icon and at most four words for whatever is in the way; the Photo card always stays. */
function noticeFor(status: CameraStatus, photoBusy: boolean): { icon: ReactNode; text: string } | null {
  if (photoBusy) return { icon: <PhotoIcon className="size-7" />, text: 'Looking at your photo' };
  if (status === 'starting') return { icon: <CameraIcon className="size-7" />, text: 'Starting the camera' };
  if (status === 'denied') return { icon: <CameraOffIcon className="size-7" />, text: 'Allow the camera' };
  if (status === 'unavailable') return { icon: <CameraOffIcon className="size-7" />, text: 'No camera found' };
  if (status === 'error') return { icon: <CameraOffIcon className="size-7" />, text: 'Camera did not start' };
  return null;
}

/**
 * Shown until the camera is live, and the home for the photo fallback. Back sits top left, two large cards offer
 * Camera and Photo in single words, Skip goes on to the café (Level 2 is optional), and Perceptron is credited.
 */
export function StartScreen({ status, photoBusy, photoMessage, onOpenCamera, onChoosePhoto }: StartScreenProps) {
  const notice = noticeFor(status, photoBusy);
  const busy = status === 'starting' || photoBusy;

  function handleFileChange(event: ChangeEvent<HTMLInputElement>): void {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (file) onChoosePhoto(file);
  }

  return (
    <div className="absolute inset-0 flex flex-col overflow-y-auto bg-cream text-plum" style={{ backgroundImage: GLOW }}>
      <header
        className="flex items-center justify-between px-4"
        style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}
      >
        {/* A plain link on purpose: a full page load lets the app open the menu. */}
        <a href={RETURN_FROM_LEVEL2} className={ROUND} style={CARD_STYLE} aria-label="Back to levels">
          <BackIcon className="size-7" />
        </a>
        <button
          type="button"
          className={ROUND}
          style={CARD_STYLE}
          aria-label="Hear this"
          onClick={() => void playWord(null, TITLE)}
        >
          <SpeakerIcon className="size-7" />
        </button>
      </header>

      <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center gap-5 px-5 pt-4" style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom, 0px))' }}>
        <h1 className="font-display text-[2rem] font-bold leading-tight">{TITLE}</h1>

        {(notice || photoMessage) && (
          <p role="status" className="flex items-center gap-3 rounded-full bg-white px-5 py-3 text-xl" style={CARD_STYLE}>
            {notice?.icon}
            {notice?.text ?? photoMessage}
          </p>
        )}

        <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2">
          <button type="button" onClick={onOpenCamera} disabled={busy} className={CARD} style={CARD_STYLE}>
            <span className="flex size-20 items-center justify-center rounded-full bg-deep-coral text-white" aria-hidden="true">
              <CameraIcon className="size-10" />
            </span>
            <span className="text-2xl font-bold">Camera</span>
          </button>

          <label className={`${CARD} focus-within:outline-4 focus-within:outline-offset-2 focus-within:outline-deep-teal`} style={CARD_STYLE}>
            <input type="file" accept="image/*" capture="environment" onChange={handleFileChange} disabled={busy} className="sr-only" />
            <span className="flex size-20 items-center justify-center rounded-full bg-deep-teal text-white" aria-hidden="true">
              <PhotoIcon className="size-10" />
            </span>
            <span className="text-2xl font-bold">Photo</span>
          </label>
        </div>

        {/* A plain link on purpose: a full page load stops the camera and lets the app open the café. */}
        <a href={NEXT_AFTER_LEVEL2} className={LINK} style={CARD_STYLE} aria-label="Skip Level 2 and go to the café">
          Skip
        </a>

        <p className="mt-auto rounded-full px-4 py-2 text-xl text-muted" aria-label="Objects are found by Perceptron">
          Perceptron
        </p>
      </main>
    </div>
  );
}

/** A picture in a frame. */
function PhotoIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="4" width="18" height="16" rx="3" />
      <circle cx="9" cy="10" r="2" />
      <path d="M21 16l-5-5-8 8" />
    </svg>
  );
}

/** A camera with a line through it. */
function CameraOffIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 8h3l1.6-2.4h6.8L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z" />
      <circle cx="12" cy="13.2" r="3.6" />
      <path d="M4 4l16 16" />
    </svg>
  );
}
