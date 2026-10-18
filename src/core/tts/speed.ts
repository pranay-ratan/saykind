import { SERVER_LIMITS } from '../../config/camera';

export const MIN_RATE = 0.5;
export const MAX_RATE = 1.5;

export function clampRate(rate: number): number {
  return Math.min(MAX_RATE, Math.max(MIN_RATE, rate));
}

/**
 * ElevenLabs accepts speed 0.7 to 1.2. Rates outside that range are clamped,
 * so the snail (0.5) plays at 0.7 and the fastest setting (1.3) plays at 1.2.
 */
export function rateToElevenLabsSpeed(rate: number): number {
  const { elevenLabsMinSpeed, elevenLabsMaxSpeed } = SERVER_LIMITS;
  return Math.min(elevenLabsMaxSpeed, Math.max(elevenLabsMinSpeed, rate));
}

export function isValidSpeechText(text: unknown): text is string {
  return typeof text === 'string' && text.trim().length > 0 && text.trim().length <= SERVER_LIMITS.maxSpeechChars;
}
