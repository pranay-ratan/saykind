'use client';

import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { CheckIcon, MicIcon, PlayIcon, RestartIcon } from '@/components/cafe/icons';
import { MicButton, type MicVisual } from '@/components/saykind/kit';
import { usePractice, type Subject } from '@/lib/saykind/use-practice';
import { CAMERA_CONFIG } from '../../config/camera';
import { cropFrame } from '../../core/camera/frames';
import { logPracticeEvent, type PracticeEventType } from '../../core/practiceLog';
import { getSyllables } from '../../core/pronunciation';
import { speak, type TtsProvider } from '../../core/speech';
import { needsConfirmation } from '../../core/vision/confirmObject';
import { confirmObject } from '../../core/vision/detectObjects';
import type { DetectedObject } from '../../core/vision/types';
import { WordCard } from '../WordCard';
import { useAutoStop } from './useAutoStop';

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
  /** Called once the person has played or recorded the word. */
  onPracticed?: () => void;
}

const MAX_TYPED_WORD = 30;
/** Boxes from Perceptron's native box mode carry no confidence and arrive as 1: those get a confirm call. */
const PLACEHOLDER_CONFIDENCE = 1;
const MAX_CANDIDATES = 4;
/** The microphone: at least 96 px, the primary action, bottom centre of the sheet. */
const MIC_SIZE = 96;
const LEVEL = 2;

function cleanTypedWord(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ').slice(0, MAX_TYPED_WORD);
}

function unique(words: readonly string[]): string[] {
  return [...new Set(words.filter((word) => word.length > 0))];
}

/** The same shape Level 1 practices: the server voice says free words, and plain plurals count as the word. */
function subjectFor(word: string): Subject {
  return { id: `camera-${word.replace(/\s+/g, '-')}`, text: word, accepted: [word, `${word}s`], audioKey: null };
}

export function ObjectSheet({
  selection,
  loadCropSource,
  autoSpeak,
  voiceRate,
  ttsProvider,
  visionProvider,
  onClose,
  onPracticed,
}: ObjectSheetProps) {
  const { object, alternatives } = selection;
  const [word, setWord] = useState(object.label);
  const [crop, setCrop] = useState('');
  const [isLowConfidence, setIsLowConfidence] = useState(object.confidence < CAMERA_CONFIG.lowConfidenceThreshold);
  const [showChoices, setShowChoices] = useState(false);
  const [typedWord, setTypedWord] = useState('');
  /** The confirm call's answer: its label first, then its alternatives. Empty until it answers, or when not needed. */
  const [confirmed, setConfirmed] = useState<string[]>([]);
  const confirmedRef = useRef(false);

  const spokenRef = useRef(false);
  const levelRef = useRef<HTMLDivElement>(null);
  // Exactly the Level 1 path: the same recorder (with its live level), the same /api/transcribe check, the same log.
  const practice = usePractice(LEVEL, levelRef);
  const subject = useMemo(() => subjectFor(word), [word]);
  const { status, outcome, lastAttempt, problemText } = practice;

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
    onPracticed?.();
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

  // A box from native box mode has no real confidence: ask Perceptron what the crop is, once, and offer
  // "Is it a ___?" only when the answer is unsure or differs from the box's label. Failures change nothing.
  useEffect(() => {
    if (!crop || object.confidence < PLACEHOLDER_CONFIDENCE || confirmedRef.current) return;
    confirmedRef.current = true;
    let cancelled = false;
    confirmObject({ imageDataUrl: crop })
      .then((result) => {
        if (cancelled) return;
        if (result.label !== object.label || needsConfirmation(result)) {
          setConfirmed(unique([result.label, ...result.alternatives]));
          setIsLowConfidence(true);
        }
      })
      .catch((error: unknown) => console.warn('The object could not be checked', error));
    return () => {
      cancelled = true;
    };
  }, [crop, object.confidence, object.label]);

  // Speak once on open. The ref guards against a second run from React's dev-mode effect replay.
  useEffect(() => {
    if (!autoSpeak || spokenRef.current) return;
    spokenRef.current = true;
    say(word, voiceRate, 'identified');
    // eslint-disable-next-line react-hooks/exhaustive-deps -- speak exactly once when the sheet opens
  }, [autoSpeak]);

  // A finished recording counts as practice, in the camera's own log as well as the shared one.
  const loggedResultRef = useRef<Outcome | null>(null);
  useEffect(() => {
    if (status !== 'result' || !outcome || loggedResultRef.current === outcome) return;
    loggedResultRef.current = outcome;
    if (outcome.recognition !== 'error') {
      logEvent('attempt', word);
      onPracticed?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- log each new outcome once
  }, [status, outcome]);

  // Tap to start, tap to stop; silence or the ceiling stops it too.
  const stopRecording = () => {
    if (status === 'recording') void practice.toggle(subject);
  };
  useAutoStop({ active: status === 'recording', levelRef, onStop: stopRecording });

  function pressMic(): void {
    if (status === 'recording') {
      void practice.toggle(subject);
    } else if (status === 'idle') {
      void practice.toggle(subject);
    } else if (status === 'result') {
      practice.another();
      void practice.toggle(subject);
    }
  }

  function hearMe(): void {
    if (!lastAttempt) return;
    void new Audio(lastAttempt.url).play().catch((error: unknown) => console.warn('Replay was blocked', error));
  }

  function chooseWord(next: string): void {
    setIsLowConfidence(false);
    setShowChoices(false);
    if (next === word) return;
    practice.reset(subject);
    setWord(next);
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
  /** What to offer: the confirm call's label first, then its alternatives, then the box's own label and neighbours. */
  const candidates = unique([...confirmed, word, ...otherLabels]).slice(0, MAX_CANDIDATES);
  const mic: MicVisual = status === 'recording' ? 'recording' : status === 'processing' ? 'processing' : 'ready';
  const heard = outcome?.heard.replace(/[.!?]+$/, '') ?? '';

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-plum/40">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="object-sheet-title"
        className="w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-t-[2rem] bg-cream p-6 pb-10 shadow-2xl motion-safe:animate-[sheet-up_300ms_ease-out]"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 id="object-sheet-title" className="text-2xl font-semibold text-plum">
            Practice
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[64px] px-5 rounded-full border-2 border-deep-teal bg-cream text-plum text-xl font-bold hover:bg-lavender/25 focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-deep-teal"
          >
            Back to looking
          </button>
        </div>

        {isLowConfidence && (
          <div className="mb-6 rounded-[2rem] border border-plum/25 bg-cream p-5">
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
                <p className="mb-4 text-2xl font-bold text-plum">Is it a {candidates[0]}?</p>
                <div className="grid grid-cols-2 gap-3">
                  {candidates.map((candidate) => (
                    <button
                      key={candidate}
                      type="button"
                      onClick={() => chooseWord(candidate)}
                      className="min-h-[64px] rounded-full bg-deep-teal px-4 text-xl font-bold text-white hover:opacity-90 focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-deep-teal"
                    >
                      {candidate}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setShowChoices(true)}
                    className="min-h-[64px] rounded-full border-2 border-deep-teal bg-cream px-4 text-xl font-bold text-plum hover:bg-lavender/25 focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-deep-teal"
                  >
                    Other
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
          onRecordStart={pressMic}
          onRecordStop={stopRecording}
          isRecording={status === 'recording'}
          recordControl={null}
          onSaidIt={(said) => {
            // Self-reported: the person ticked "I said it". Nothing is scored.
            if (said) logEvent('self-reported', word);
          }}
        />

        {/* The microphone: the Level 1 recorder and its live ring, large, bottom centre. */}
        <div className="mt-2 flex flex-col items-center gap-2">
          <MicButton state={mic} size={MIC_SIZE} levelRef={levelRef} busy={practice.requesting} onPress={pressMic} />
          <p role="status" aria-live="polite" className="flex min-h-[32px] items-center gap-2 text-xl font-bold text-muted">
            {status === 'recording' ? (
              <>
                <ListeningIcon />
                Listening
              </>
            ) : status === 'processing' ? (
              'One moment'
            ) : status === 'result' ? (
              <>
                <RestartIcon className="size-6" />
                Again
              </>
            ) : (
              <>
                <MicIcon className="size-6" />
                Say it
              </>
            )}
          </p>

          {status === 'result' && (
            <div className="flex w-full flex-col items-center gap-3">
              {outcome?.recognition === 'error' ? (
                <p className="text-center text-xl text-plum">{problemText ?? 'Allow the microphone'}</p>
              ) : (
                <div className="flex items-center gap-3 rounded-[2rem] bg-cream px-5 py-3 text-xl font-bold text-plum" style={{ border: 'var(--card-border)', boxShadow: 'var(--card-shadow)' }}>
                  <span className="flex size-9 items-center justify-center rounded-full bg-deep-teal text-white" aria-hidden="true">
                    <CheckIcon className="size-5" />
                  </span>
                  <span>
                    Thank you.
                    {heard ? <span className="block text-base font-normal text-muted">I heard “{heard}”</span> : null}
                  </span>
                </div>
              )}
              {lastAttempt && (
                <button
                  type="button"
                  onClick={hearMe}
                  className="flex min-h-[64px] min-w-[200px] items-center justify-center gap-2 rounded-full bg-deep-coral px-6 text-xl font-bold text-white hover:opacity-90 focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-deep-teal"
                >
                  <PlayIcon className="size-6" />
                  Hear me
                </button>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

type Outcome = NonNullable<ReturnType<typeof usePractice>['outcome']>;

/** Calm sound waves: the sheet is listening. */
function ListeningIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
      <path d="M4 10v4M8 7v10M12 4v16M16 7v10M20 10v4" />
    </svg>
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
      <p className="text-xl text-plum">What is it?</p>
      {alternatives.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          {alternatives.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => onChoose(option)}
              className="min-h-[64px] rounded-full bg-deep-teal text-white text-xl font-bold hover:opacity-90 focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-deep-teal"
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
          className="flex-1 min-h-16 rounded-full border border-plum/25 px-4 text-xl text-plum"
        />
        <button
          type="submit"
          className="min-h-16 px-4 rounded-full border-2 border-deep-teal bg-cream text-plum text-xl font-bold hover:bg-lavender/25 focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-deep-teal"
        >
          Use
        </button>
      </form>
    </div>
  );
}
