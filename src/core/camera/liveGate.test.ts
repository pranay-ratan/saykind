import { describe, expect, it } from 'vitest';
import { liveBlockReason, shouldDetect, type LiveGateInput } from './liveGate';

const OPEN: LiveGateInput = {
  active: true,
  sheetOpen: false,
  tabVisible: true,
  online: true,
  requestInFlight: false,
  callsUsed: 0,
  maxCalls: 150,
  videoReady: true,
};

describe('liveBlockReason', () => {
  it('lets a detection run when every gate is open', () => {
    expect(liveBlockReason(OPEN)).toBeNull();
  });

  it('blocks when the loop is inactive', () => {
    expect(liveBlockReason({ ...OPEN, active: false })).toBe('inactive');
  });

  it('blocks while the object sheet is open', () => {
    expect(liveBlockReason({ ...OPEN, sheetOpen: true })).toBe('sheet-open');
  });

  it('blocks while the tab is hidden', () => {
    expect(liveBlockReason({ ...OPEN, tabVisible: false })).toBe('tab-hidden');
  });

  it('blocks while offline', () => {
    expect(liveBlockReason({ ...OPEN, online: false })).toBe('offline');
  });

  it('blocks while a request is in flight', () => {
    expect(liveBlockReason({ ...OPEN, requestInFlight: true })).toBe('busy');
  });

  it('blocks once the session budget is used up', () => {
    expect(liveBlockReason({ ...OPEN, callsUsed: 150 })).toBe('budget');
  });

  it('blocks until the video has frames', () => {
    expect(liveBlockReason({ ...OPEN, videoReady: false })).toBe('no-video');
  });

  it('reports the first closed gate when several are closed', () => {
    expect(liveBlockReason({ ...OPEN, sheetOpen: true, tabVisible: false })).toBe('sheet-open');
  });
});

describe('shouldDetect', () => {
  it('always runs the first detection', () => {
    expect(
      shouldDetect({ sceneChanged: false, msSinceLastCall: 0, hasCalledBefore: false, staleMs: 8000 }),
    ).toBe(true);
  });

  it('runs when the scene changed', () => {
    expect(
      shouldDetect({ sceneChanged: true, msSinceLastCall: 500, hasCalledBefore: true, staleMs: 8000 }),
    ).toBe(true);
  });

  it('skips a static scene until the stale window has passed', () => {
    const options = { sceneChanged: false, hasCalledBefore: true, staleMs: 8000 };
    expect(shouldDetect({ ...options, msSinceLastCall: 7999 })).toBe(false);
    expect(shouldDetect({ ...options, msSinceLastCall: 8000 })).toBe(true);
  });
});
