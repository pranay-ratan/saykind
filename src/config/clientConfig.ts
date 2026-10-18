import { readLiveLimits, type LiveLimits } from './camera';

export type TtsProviderName = 'browser' | 'elevenlabs';

/** Only numbers and the TTS mode cross to the browser. Keys stay in process.env. */
export interface ClientConfig extends LiveLimits {
  ttsProvider: TtsProviderName;
}

export function buildClientConfig(env: Readonly<Record<string, string | undefined>>): ClientConfig {
  return {
    ...readLiveLimits(env),
    ttsProvider: env.TTS_PROVIDER === 'elevenlabs' ? 'elevenlabs' : 'browser',
  };
}
