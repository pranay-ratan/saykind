import { CAMERA_CONFIG } from '../config/camera';

export interface Level2Settings {
  liveDetection: boolean;
  intervalMs: number;
  autoSpeak: boolean;
  voiceRate: number;
}

export const SETTINGS_STORAGE_KEY = 'saykind_level2_settings';

export function defaultSettings(defaultIntervalMs: number): Level2Settings {
  return {
    liveDetection: true,
    intervalMs: defaultIntervalMs,
    autoSpeak: true,
    voiceRate: CAMERA_CONFIG.normalRate,
  };
}

function pickChoice<T extends number>(value: unknown, choices: readonly T[], fallback: T): T {
  return typeof value === 'number' && (choices as readonly number[]).includes(value) ? (value as T) : fallback;
}

/** Reads saved settings. Bad or missing fields fall back to the defaults, field by field. */
export function loadSettings(defaults: Level2Settings): Level2Settings {
  try {
    const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return defaults;
    const saved: unknown = JSON.parse(raw);
    if (typeof saved !== 'object' || saved === null) return defaults;
    const record = saved as Record<string, unknown>;
    return {
      liveDetection: typeof record.liveDetection === 'boolean' ? record.liveDetection : defaults.liveDetection,
      intervalMs: pickChoice(record.intervalMs, CAMERA_CONFIG.intervalChoicesMs, defaults.intervalMs),
      autoSpeak: typeof record.autoSpeak === 'boolean' ? record.autoSpeak : defaults.autoSpeak,
      voiceRate: pickChoice(record.voiceRate, CAMERA_CONFIG.voiceRateChoices, defaults.voiceRate),
    };
  } catch (error) {
    console.warn('Saved settings could not be read', error);
    return defaults;
  }
}

export function saveSettings(settings: Level2Settings): void {
  try {
    window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch (error) {
    console.warn('Settings could not be saved', error);
  }
}
