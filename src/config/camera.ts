/**
 * Every tunable for Level 2 lives here. Client and server both import this file,
 * so it must never hold secrets. Env-driven values are read via readLiveLimits().
 */
export const CAMERA_CONFIG = {
  // Frame capture for live detection
  maxFrameWidth: 640,
  jpegQuality: 0.7,

  // Frame capture for the object sheet (crop source)
  cropSourceMaxSide: 1024,
  cropPaddingRatio: 0.12,

  // Scene change detection (32x32 grayscale signature, mean abs diff on 0..1)
  signatureSize: 32,
  sceneChangeThreshold: 0.04,
  sceneStaleMs: 8000,

  // Detection results
  maxObjects: 6,
  confidenceThreshold: 0.4,
  lowConfidenceThreshold: 0.5,
  duplicateIouThreshold: 0.6,
  trackMatchIouThreshold: 0.3,
  /** A matched box that moved less than this (fraction of the frame, on any edge) keeps its old position. */
  stableMoveRatio: 0.015,

  // Overlay
  boxPersistMs: 2500,
  noObjectHintMs: 6000,
  pruneTickMs: 250,

  // Settings choices offered in the settings sheet
  intervalChoicesMs: [1000, 1500, 3000] as const,
  voiceRateChoices: [0.7, 1.0, 1.3] as const,
  slowRate: 0.5,
  normalRate: 1.0,

  // Client networking
  detectClientTimeoutMs: 30000,
} as const;

/** Server-side limits for /api/detect and /api/tts. */
export const SERVER_LIMITS = {
  detectTimeoutMs: 12000,
  detectRetries: 1,
  maxImageBytes: 2 * 1024 * 1024,
  detectRequestsPerMinute: 60,
  maxSpeechChars: 60,
  speechCacheEntries: 300,
  speechCacheTtlMs: 30 * 60 * 1000,
  elevenLabsMinSpeed: 0.7,
  elevenLabsMaxSpeed: 1.2,
  defaultLiveMaxCalls: 150,
  defaultLiveIntervalMs: 1500,
} as const;

export interface LiveLimits {
  liveMaxCalls: number;
  liveIntervalMs: number;
}

export function readLiveLimits(env: Readonly<Record<string, string | undefined>>): LiveLimits {
  return {
    liveMaxCalls: parsePositiveInt(env.LIVE_MAX_CALLS, SERVER_LIMITS.defaultLiveMaxCalls),
    liveIntervalMs: parsePositiveInt(env.LIVE_INTERVAL_MS, SERVER_LIMITS.defaultLiveIntervalMs),
  };
}

function parsePositiveInt(raw: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(raw ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}
