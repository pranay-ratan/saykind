'use client';

import type { ChangeEvent } from 'react';
import type { CameraStatus } from '../../core/camera/useCamera';

interface StartScreenProps {
  status: CameraStatus;
  photoBusy: boolean;
  photoMessage: string | null;
  onOpenCamera: () => void;
  onChoosePhoto: (file: File) => void;
}

const PRIMARY_BUTTON = 'min-h-[80px] min-w-[240px] rounded-2xl bg-[#9A442D] px-8 text-2xl font-semibold text-white shadow-lg hover:bg-[#7F3823] active:bg-[#6B2F1C] focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-sky-400 disabled:opacity-60';
const SECONDARY_LABEL = 'flex min-h-[64px] cursor-pointer items-center justify-center rounded-xl bg-stone-800 px-6 text-xl font-medium text-white hover:bg-stone-700 active:bg-stone-600 focus-within:outline-4 focus-within:outline-offset-2 focus-within:outline-sky-400';

function PermissionSteps() {
  return (
    <div className="max-w-md rounded-2xl bg-stone-800 p-5 text-lg text-stone-100 space-y-3">
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

/** Shown until the camera is live. Also the home for the photo fallback. */
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
      {explanation && <p className="max-w-md text-xl text-stone-200">{explanation}</p>}
      {photoMessage && (
        <p role="status" className="max-w-md text-xl text-stone-200">
          {photoMessage}
        </p>
      )}
      {busy && (
        <p role="status" className="text-xl text-stone-200">
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
    </div>
  );
}
