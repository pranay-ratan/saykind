export type TtsProvider = 'browser' | 'elevenlabs';

export interface SpeakOptions {
  rate: number;
  provider: TtsProvider;
}

const MAX_CACHED_CLIPS = 60;
const clipCache = new Map<string, Blob>();
let currentAudio: HTMLAudioElement | null = null;
let currentAudioUrl: string | null = null;

/**
 * Speaks text. Returns false when nothing could play (no browser support, or
 * the server clip failed and the browser fallback is unavailable).
 */
export async function speak(text: string, options: SpeakOptions): Promise<boolean> {
  if (options.provider === 'elevenlabs') {
    const played = await speakWithServerClip(text, options.rate);
    if (played) return true;
    return speakWithBrowser(text, options.rate);
  }
  return speakWithBrowser(text, options.rate);
}

export function cancelSpeech(): void {
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
  stopCurrentAudio();
}

/** Browser voices load asynchronously. Asking early makes the first speak pick an English voice. */
export function prepareVoices(): void {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  window.speechSynthesis.getVoices();
}

function speakWithBrowser(text: string, rate: number): boolean {
  if (typeof window === 'undefined' || !window.speechSynthesis) return false;

  cancelSpeech();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = rate;

  const voices = window.speechSynthesis.getVoices();
  const voice = voices.find((candidate) => candidate.lang.toLowerCase().startsWith('en')) ?? voices[0];
  if (voice) utterance.voice = voice;

  window.speechSynthesis.speak(utterance);
  return true;
}

async function speakWithServerClip(text: string, rate: number): Promise<boolean> {
  const key = `${text}|${rate.toFixed(2)}`;
  const cached = clipCache.get(key);
  const clip = cached ?? (await fetchClip(text, rate));
  if (!clip) return false;

  if (!cached) rememberClip(key, clip);
  return playClip(clip);
}

async function fetchClip(text: string, rate: number): Promise<Blob | null> {
  try {
    const response = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, rate }),
    });
    if (!response.ok) return null;
    return await response.blob();
  } catch (error) {
    console.warn('Spoken audio request failed', error);
    return null;
  }
}

function rememberClip(key: string, clip: Blob): void {
  clipCache.set(key, clip);
  if (clipCache.size > MAX_CACHED_CLIPS) {
    const oldestKey = clipCache.keys().next().value;
    if (oldestKey !== undefined) clipCache.delete(oldestKey);
  }
}

function playClip(clip: Blob): boolean {
  stopCurrentAudio();
  const url = URL.createObjectURL(clip);
  const audio = new Audio(url);
  currentAudio = audio;
  currentAudioUrl = url;

  audio.onended = () => {
    if (currentAudioUrl === url) stopCurrentAudio();
  };

  audio.play().catch((error: unknown) => {
    console.warn('Audio playback was blocked or failed', error);
    if (currentAudioUrl === url) stopCurrentAudio();
  });
  return true;
}

function stopCurrentAudio(): void {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio = null;
  }
  if (currentAudioUrl) {
    URL.revokeObjectURL(currentAudioUrl);
    currentAudioUrl = null;
  }
}
