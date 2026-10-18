export interface LiveGateInput {
  active: boolean;
  sheetOpen: boolean;
  tabVisible: boolean;
  online: boolean;
  requestInFlight: boolean;
  callsUsed: number;
  maxCalls: number;
  videoReady: boolean;
}

export type LiveBlockReason =
  | 'inactive'
  | 'sheet-open'
  | 'tab-hidden'
  | 'offline'
  | 'busy'
  | 'budget'
  | 'no-video';

/** Returns why a live detection may not run right now, or null when it may. Checked in a fixed order. */
export function liveBlockReason(input: LiveGateInput): LiveBlockReason | null {
  if (!input.active) return 'inactive';
  if (input.sheetOpen) return 'sheet-open';
  if (!input.tabVisible) return 'tab-hidden';
  if (!input.online) return 'offline';
  if (input.requestInFlight) return 'busy';
  if (input.callsUsed >= input.maxCalls) return 'budget';
  if (!input.videoReady) return 'no-video';
  return null;
}

/**
 * A detection is worth a call when the scene changed, or when the scene has been
 * unchanged for staleMs (a fallback in case the change check missed something).
 */
export function shouldDetect(options: {
  sceneChanged: boolean;
  msSinceLastCall: number;
  hasCalledBefore: boolean;
  staleMs: number;
}): boolean {
  if (!options.hasCalledBefore) return true;
  return options.sceneChanged || options.msSinceLastCall >= options.staleMs;
}
