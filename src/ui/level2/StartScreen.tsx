'use client';

import type { ChangeEvent } from 'react';
import type { CameraStatus } from '../../core/camera/useCamera';
import { NEXT_AFTER_LEVEL2 } from '@/lib/saykind/unlock';

interface StartScreenProps {
  status: CameraStatus;
  photoBusy: boolean;
  photoMessage: string | null;
  onOpenCamera: () => void;
  onChoosePhoto: (file: File) => void;
}

const PRIMARY_BUTTON = 'min-h-[80px] min-w-[240px] rounded-[2rem] bg-deep-coral px-8 text-2xl font-semibold text-white shadow-lg hover:opacity-90 focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-deep-teal disabled:opacity-60';
const SECONDARY_LABEL = 'flex min-h-[64px] cursor-pointer items-center justify-center rounded-full border-2 border-cream bg-cream px-6 text-xl font-bold text-plum hover:opacity-90 focus-within:outline-4 focus-within:outline-offset-2 focus-within:outline-deep-teal';

function PermissionSteps() {
  return (
    <div className="max-w-md rounded-[2rem] bg-cream p-6 text-xl text-plum space-y-3">
      <p>Camera access is off for this site.</p>
      <p>
        <strong>iPhone:</strong> open Settings, find your browser, and turn Camera on.
      </p>
      <p>
        <strong>Android:</strong> open your browser&apos;s Settings, then Site settings, then Camera, and allow it for this site.
      </p>
    </div>
  );
}

function explanationFor(status: CameraStatus): string | null {
  if (status === 'unavailable') return 'We could not find a camera on this device. You can choose a photo instead.';
  if (status === 'error') return 'The camera did not start. Try again, or choose a photo instead.';
  return null;
}

/** Shown until the camera is live. Also the home for the photo fallback. Level 2 is optional: Skip goes on to the café. */
export function StartScreen({ status, photoBusy, photoMessage, onOpenCamera, onChoosePhoto }: StartScreenProps) {
  const explanation = explanationFor(status);
  const busy = status === 'starting' || photoBusy;

  function handleFileChange(event: ChangeEvent<HTMLInputElement>): void {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (file) onChoosePhoto(file);
  }

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-8 p-6 text-center">
      <h1 className="text-4xl font-semibold text-white">Look around you</h1>

      {status === 'denied' && <PermissionSteps />}
      {explanation && <p className="max-w-md text-xl text-cream">{explanation}</p>}
      {photoMessage && (
        <p role="status" className="max-w-md text-xl text-cream">
          {photoMessage}
        </p>
      )}
      {busy && (
        <p role="status" className="text-xl text-cream">
          {photoBusy ? 'Looking at your photo…' : 'Starting the camera…'}
        </p>
      )}

      <button type="button" onClick={onOpenCamera} disabled={busy} className={PRIMARY_BUTTON}>
        {status === 'idle' ? 'Open camera' : 'Try the camera again'}
      </button>

      <label className={SECONDARY_LABEL}>
        <input
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileChange}
          disabled={busy}
          className="sr-only"
        />
        Choose a photo instead
      </label>

      {/* A plain link on purpose: a full page load stops the camera and lets the app open the café. */}
      <a href={NEXT_AFTER_LEVEL2} className={SECONDARY_LABEL} aria-label="Skip Level 2 and go to the café">
        Skip
      </a>

      <p className="rounded-full bg-cream/90 px-4 py-2 text-xl text-plum" aria-label="Objects are found by Perceptron">
        Perceptron
      </p>
    </div>
  );
}
