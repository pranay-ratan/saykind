import type { ReactNode } from 'react';

export interface WordCardProps {
  word: string;
  imageSrc: string;
  syllables: string[];
  onPlayNormal: () => void;
  onPlaySlow: () => void;
  onRecordStart: () => void;
  onRecordStop: () => void;
  isRecording: boolean;
  lastRecording?: string;
  onReplayLast?: () => void;
}

const FOCUS_RING = 'focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-sky-600';
const BIG_BUTTON = `min-h-[64px] flex items-center justify-center gap-2 rounded-xl text-xl font-medium transition-colors ${FOCUS_RING}`;

function PhotoPlaceholder({ word }: { word: string }): ReactNode {
  return (
    <div role="img" aria-label={`Photo of ${word} is loading`} className="w-full h-full bg-stone-200 animate-pulse" />
  );
}

export function WordCard({
  word,
  imageSrc,
  syllables,
  onPlayNormal,
  onPlaySlow,
  onRecordStart,
  onRecordStop,
  isRecording,
  lastRecording,
  onReplayLast,
}: WordCardProps) {
  return (
    <div className="flex flex-col items-center gap-6 p-6 w-full max-w-md mx-auto">
      <div className="relative w-full aspect-square rounded-2xl overflow-hidden bg-stone-100">
        {imageSrc ? (
          // eslint-disable-next-line @next/next/no-img-element -- data URL crop from the live camera
          <img src={imageSrc} alt={word} className="w-full h-full object-cover" />
        ) : (
          <PhotoPlaceholder word={word} />
        )}
      </div>

      <div className="text-center">
        <h2 className="text-4xl font-bold text-stone-900 mb-2">{word}</h2>
        <p className="text-xl text-stone-600" aria-label={`Sounds: ${syllables.join(', ')}`}>
          {syllables.join(' • ')}
        </p>
      </div>

      <div className="flex gap-4 w-full">
        <button
          type="button"
          onClick={onPlayNormal}
          className={`flex-1 ${BIG_BUTTON} bg-stone-900 text-white hover:bg-stone-800 active:bg-stone-700`}
          aria-label={`Say ${word} at normal speed`}
        >
          <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
          </svg>
          Speaker
        </button>

        <button
          type="button"
          onClick={onPlaySlow}
          className={`flex-1 ${BIG_BUTTON} bg-stone-100 text-stone-900 hover:bg-stone-200 active:bg-stone-300`}
          aria-label={`Say ${word} slowly`}
        >
          <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M20.5 3l-.16.03L15 5.1 9 3 3.36 4.9c-.21.07-.36.25-.36.48V20.5c0 .28.22.5.5.5l.16-.03L9 18.9l6 2.1 5.64-1.9c.21-.07.36-.25.36-.48V3.5c0-.28-.22-.5-.5-.5zM15 19l-6-2.11V5l6 2.11V19z" />
          </svg>
          Snail
        </button>
      </div>

      <div className="w-full">
        {isRecording ? (
          <button
            type="button"
            onClick={onRecordStop}
            className={`w-full ${BIG_BUTTON} bg-stone-900 text-white hover:bg-stone-800 active:bg-stone-700`}
            aria-label="Stop recording"
          >
            <span className="w-4 h-4 bg-white rounded-full animate-pulse motion-reduce:animate-none" aria-hidden="true" />
            Listening… Stop
          </button>
        ) : (
          <button
            type="button"
            onClick={onRecordStart}
            className={`w-full ${BIG_BUTTON} bg-stone-100 text-stone-900 hover:bg-stone-200 active:bg-stone-300`}
            aria-label="Record your pronunciation"
          >
            <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
              <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
            </svg>
            Record
          </button>
        )}

        {lastRecording && onReplayLast && (
          <button
            type="button"
            onClick={onReplayLast}
            className={`w-full mt-3 ${BIG_BUTTON} bg-stone-50 text-stone-700 hover:bg-stone-100 active:bg-stone-200`}
            aria-label="Replay your recording"
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z" />
            </svg>
            Replay your try
          </button>
        )}
      </div>
    </div>
  );
}
