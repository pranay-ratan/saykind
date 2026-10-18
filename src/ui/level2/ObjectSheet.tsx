'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { CAMERA_CONFIG } from '../../config/camera';
import { cropFrame } from '../../core/camera/frames';
import { logPracticeEvent, type PracticeEventType } from '../../core/practiceLog';
import { getSyllables } from '../../core/pronunciation';
import { speak, type TtsProvider } from '../../core/speech';
import type { DetectedObject } from '../../core/vision/types';
import { WordCard } from '../WordCard';

export interface ObjectSelection {
  id: number;
  object: DetectedObject;
  alternatives: readonly string[];
}

interface ObjectSheetProps {
  selection: ObjectSelection;
  /** High-resolution frame the crop is taken from. Resolves to null if none is available. */
  loadCropSource: () => Promise<string | null>;
  autoSpeak: boolean;
  voiceRate: number;
  ttsProvider: TtsProvider;
  visionProvider?: string;
  onClose: () => void;
}

const MAX_TYPED_WORD = 30;
const RECORDER_MIME_TYPES = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/webm'] as const;

function pickRecorderMimeType(): string | undefined {
  if (typeof MediaRecorder === 'undefined' || typeof MediaRecorder.isTypeSupported !== 'function') return undefined;
  return RECORDER_MIME_TYPES.find((type) => MediaRecorder.isTypeSupported(type));
}

function cleanTypedWord(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ').slice(0, MAX_TYPED_WORD);
}

export function ObjectSheet({
  selection,
  loadCropSource,
  autoSpeak,
  voiceRate,
  ttsProvider,
  visionProvider,
  onClose,
}: ObjectSheetProps) {
  const { object, alternatives } = selection;
  const [word, setWord] = useState(object.label);
  const [crop, setCrop] = useState('');
  const [isLowConfidence, setIsLowConfidence] = useState(object.confidence < CAMERA_CONFIG.lowConfidenceThreshold);
  const [showChoices, setShowChoices] = useState(false);
  const [typedWord, setTypedWord] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [lastAttemptUrl, setLastAttemptUrl] = useState('');
  const [micNote, setMicNote] = useState('');

  const spokenRef = useRef(false);
  const mountedRef = useRef(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const attemptUrlRef = useRef('');

  function logEvent(type: PracticeEventType, eventWord: string): void {
    logPracticeEvent({
      word: eventWord,
      source: 'camera',
      type,
      confidence: object.confidence,
      provider: visionProvider,
      ts: Date.now(),
    });
  }

  function say(text: string, rate: number, type: PracticeEventType): void {
    void speak(text, { rate, provider: ttsProvider });
    logEvent(type, text);
  }

  // Crop the photo once per opened sheet. The selection is a snapshot, so the
  // crop stays put even though the live view keeps moving behind it.
  useEffect(() => {
    let cancelled = false;
    loadCropSource()
      .then((source) => (source ? cropFrame(source, object, CAMERA_CONFIG.cropPaddingRatio) : null))
      .then((cropped) => {
        if (!cancelled && cropped) setCrop(cropped);
      })
      .catch((error: unknown) => console.warn('Object photo could not be prepared', error));
    return () => {
      cancelled = true;
    };
  }, [loadCropSource, object]);

  // Speak once on open. The ref guards against a second run from React's dev-mode effect replay.
  useEffect(() => {
    if (!autoSpeak || spokenRef.current) return;
    spokenRef.current = true;
    say(word, voiceRate, 'identified');
    // eslint-disable-next-line react-hooks/exhaustive-deps -- speak exactly once when the sheet opens
  }, [autoSpeak]);

  // Release the mic and the last recording when the sheet closes.
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
      streamRef.current?.getTracks().forEach((track) => track.stop());
      if (attemptUrlRef.current) URL.revokeObjectURL(attemptUrlRef.current);
    };
  }, []);

  function replaceAttempt(url: string): void {
    if (attemptUrlRef.current) URL.revokeObjectURL(attemptUrlRef.current);
    attemptUrlRef.current = url;
    setLastAttemptUrl(url);
  }

  async function startRecording(): Promise<void> {
    if (typeof MediaRecorder === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setMicNote('Recording is not available on this device.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = pickRecorderMimeType();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      const chunks: Blob[] = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.push(event.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        recorderRef.current = null;
        if (!mountedRef.current) return;

        setIsRecording(false);
        if (chunks.length === 0) return;
        replaceAttempt(URL.createObjectURL(new Blob(chunks, { type: recorder.mimeType || 'audio/webm' })));
        logEvent('attempt', word);
      };

      streamRef.current = stream;
      recorderRef.current = recorder;
      recorder.start();
      setMicNote('');
      setIsRecording(true);
    } catch (error) {
      console.warn('Microphone could not start', error);
      setMicNote('The microphone is not available. Check your settings and try again.');
    }
  }

  function stopRecording(): void {
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
  }

  function replayAttempt(): void {
    if (!lastAttemptUrl) return;
    void new Audio(lastAttemptUrl).play().catch((error: unknown) => console.warn('Replay was blocked', error));
  }

  function chooseWord(next: string): void {
    setWord(next);
    setIsLowConfidence(false);
    setShowChoices(false);
    logEvent('corrected', next);
    say(next, voiceRate, 'identified');
  }

  function handleTypedSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const next = cleanTypedWord(typedWord);
    if (next) {
      setTypedWord('');
      chooseWord(next);
    }
  }

  const syllables = getSyllables(word);
  const otherLabels = alternatives.filter((item) => item !== word);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-stone-900/40">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="object-sheet-title"
        className="w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-t-3xl bg-stone-50 p-6 pb-10 shadow-2xl motion-safe:animate-[sheet-up_300ms_ease-out]"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 id="object-sheet-title" className="text-2xl font-semibold text-stone-900">
            Practice
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[64px] px-5 rounded-xl bg-stone-200 text-stone-900 text-xl font-medium hover:bg-stone-300 focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-sky-600"
          >
            Back to looking
          </button>
        </div>

        {isLowConfidence && (
          <div className="mb-6 rounded-2xl border border-stone-300 bg-white p-5">
            {showChoices ? (
              <ChoicePanel
                alternatives={otherLabels}
                typedWord={typedWord}
                onTypedChange={setTypedWord}
                onTypedSubmit={handleTypedSubmit}
                onChoose={chooseWord}
              />
            ) : (
              <>
                <p className="text-xl text-stone-800 mb-4">
                  I think this might be a <strong>{word}</strong>. Is that right?
                </p>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setIsLowConfidence(false)}
                    className="flex-1 min-h-[64px] rounded-xl bg-stone-900 text-white text-xl font-medium hover:bg-stone-800 focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-sky-600"
                  >
                    Yes
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowChoices(true)}
                    className="flex-1 min-h-[64px] rounded-xl bg-stone-200 text-stone-900 text-xl font-medium hover:bg-stone-300 focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-sky-600"
                  >
                    Not quite
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        <WordCard
          word={word}
          imageSrc={crop}
          syllables={syllables}
          onPlayNormal={() => say(word, voiceRate, 'replay')}
          onPlaySlow={() => say(word, CAMERA_CONFIG.slowRate, 'slow')}
          onRecordStart={() => void startRecording()}
          onRecordStop={stopRecording}
          isRecording={isRecording}
          lastRecording={lastAttemptUrl}
          onReplayLast={replayAttempt}
        />

        {micNote && (
          <p role="status" className="text-center text-lg text-stone-700">
            {micNote}
          </p>
        )}
        {isRecording && (
          <p role="status" className="text-center text-lg text-stone-700">
            Listening. Tap Stop when you are done.
          </p>
        )}
      </section>
    </div>
  );
}

interface ChoicePanelProps {
  alternatives: readonly string[];
  typedWord: string;
  onTypedChange: (value: string) => void;
  onTypedSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onChoose: (word: string) => void;
}

function ChoicePanel({ alternatives, typedWord, onTypedChange, onTypedSubmit, onChoose }: ChoicePanelProps) {
  return (
    <div className="space-y-4">
      <p className="text-xl text-stone-800">What is it?</p>
      {alternatives.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          {alternatives.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => onChoose(option)}
              className="min-h-[64px] rounded-xl bg-stone-900 text-white text-xl font-medium hover:bg-stone-800 focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-sky-600"
            >
              {option}
            </button>
          ))}
        </div>
      )}
      <form onSubmit={onTypedSubmit} className="flex gap-2">
        <label className="sr-only" htmlFor="typed-word">
          Type the word
        </label>
        <input
          id="typed-word"
          value={typedWord}
          onChange={(event) => onTypedChange(event.target.value)}
          maxLength={MAX_TYPED_WORD}
          placeholder="Type the word"
          className="flex-1 min-h-[56px] rounded-xl border border-stone-300 px-4 text-lg text-stone-900"
        />
        <button
          type="submit"
          className="min-h-[56px] px-4 rounded-xl bg-stone-200 text-stone-900 text-lg font-medium hover:bg-stone-300 focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-sky-600"
        >
          Use
        </button>
      </form>
    </div>
  );
}
